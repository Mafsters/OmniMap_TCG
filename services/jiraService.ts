
import { GoogleGenAI, Type } from "@google/genai";
import { RoadmapItem, Status, Priority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKeys: string;
}

export const fetchJiraIssues = async (config: JiraConfig): Promise<any[]> => {
  const { domain, email, apiToken, projectKeys } = config;
  const jql = `project IN (${projectKeys}) AND status != Done`;
  const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`;

  // Note: Direct browser calls to Jira often require a CORS proxy or Atlassian Connect.
  // We simulate the fetch structure but users may need a local proxy in enterprise environments.
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${email}:${apiToken}`)}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Jira API returned ${response.status}`);
  }

  const data = await response.json();
  return data.issues || [];
};

export const mapJiraToRoadmap = async (jiraIssues: any[], currentGoals: any[]): Promise<RoadmapItem[]> => {
  if (jiraIssues.length === 0) return [];

  const prompt = `Map these Jira issues to our Roadmap format.
  Jira Issues: ${JSON.stringify(jiraIssues.slice(0, 10).map(i => ({
    key: i.key,
    summary: i.fields.summary,
    description: i.fields.description?.content?.[0]?.content?.[0]?.text || '',
    status: i.fields.status.name,
    priority: i.fields.priority.name,
    assignee: i.fields.assignee?.displayName || 'Unassigned'
  })))}
  
  Available Strategic Pillars (Goal IDs): ${JSON.stringify(currentGoals.map(g => ({ id: g.id, title: g.title })))}
  
  Return a JSON array of objects that match our RoadmapItem interface. 
  Rules:
  1. Map Jira status to one of: "Not Started", "In Progress", "Done", "Blocked", "Paused".
  2. Map Jira priority to: Low, Medium, High, or Critical.
  3. Assign each issue to the most relevant Strategic Pillar ID.
  4. Set department as "Product" or "Tech" based on project context.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              goalId: { type: Type.STRING },
              owner: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              department: { type: Type.STRING },
              status: { type: Type.STRING },
              priority: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              progress: { type: Type.NUMBER },
              jiraId: { type: Type.STRING },
              jiraUrl: { type: Type.STRING }
            },
            required: ["title", "goalId", "status", "priority", "department"]
          }
        }
      }
    });

    const items = JSON.parse(response.text || '[]');
    return items.map((item: any) => ({
      ...item,
      id: item.id || `jira-${item.jiraId || Math.random().toString(36).substr(2, 5)}`,
      tags: ['jira-sync'],
      startDate: item.startDate || new Date().toISOString().split('T')[0],
      endDate: item.endDate || '2026-12-31',
      progress: item.progress || 0
    }));
  } catch (error) {
    console.warn("Gemini Jira mapping failed (likely quota), using basic fallback mapping:", error);
    
    // Fallback: Map manually if AI fails
    return jiraIssues.map((issue: any) => ({
      id: `jira-${issue.key}`,
      jiraId: issue.key,
      // Construct a rough URL if domain is available in context, or leave empty
      jiraUrl: ``, 
      title: issue.fields.summary,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || 'Imported from Jira',
      owner: issue.fields.assignee?.displayName || 'Unassigned',
      status: Status.NOT_STARTED,
      priority: Priority.MEDIUM,
      department: 'Tech',
      goalId: currentGoals[0]?.id || '1', // Default to first goal
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      tags: ['jira-sync', 'fallback-mapped'],
      progress: 0
    }));
  }
};
