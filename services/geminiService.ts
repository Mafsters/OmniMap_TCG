
import { GoogleGenAI, Type } from "@google/genai";
import { RoadmapItem, AIInsight, StrategicGoal, MonthlyUpdate, ItemUpdate, Employee } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeRoadmap = async (
  items: RoadmapItem[], 
  goals: StrategicGoal[],
  updates: MonthlyUpdate[],
  itemUpdates: ItemUpdate[]
): Promise<AIInsight[]> => {
  // Optimization: Don't call API if no data
  if (!items || items.length === 0) {
    return [{ 
      type: 'summary', 
      message: 'Add items to your roadmap to generate AI insights.', 
      impactLevel: 'low' 
    }];
  }

  // 1. Prepare Goals Context
  const goalsContext = goals.map(g => `${g.id}: ${g.title}`).join(', ');

  // 2. Prepare Recent Text Updates (Limit to last 15 to save tokens, prioritizing recent negative sentiment)
  const allUpdates = [
    ...updates.map(u => ({ ...u, type: 'Goal Update' })), 
    ...itemUpdates.map(u => ({ ...u, type: 'Item Update', goalId: u.itemId })) // Mapping itemId to goalId for simplicity in prompt
  ];
  
  // Sort by date descending
  const recentUpdates = allUpdates
    .sort((a, b) => {
       const dateA = 'createdAt' in a ? new Date(a.createdAt).getTime() : new Date(a.updatedAt).getTime();
       const dateB = 'createdAt' in b ? new Date(b.createdAt).getTime() : new Date(b.updatedAt).getTime();
       return dateB - dateA;
    })
    .slice(0, 20)
    .map(u => {
      const date = 'createdAt' in u ? u.createdAt : u.updatedAt;
      return `[${u.type}] Date: ${date}, Health: ${'status' in u ? u.status : u.health}, Text: "${u.content}"`;
    })
    .join('\n');

  const prompt = `You are a sophisticated Program Manager AI. Analyze the following Roadmap Data and RECENT TEXT UPDATES to identify risks, conflicts, and insights.

  STRATEGIC CONTEXT (GOALS):
  ${goalsContext}

  ROADMAP ITEMS:
  ${JSON.stringify(items.map(i => ({ title: i.title, owner: i.owner, start: i.startDate, end: i.endDate, status: i.status })))}

  RECENT TEXT UPDATES (Scan these for hidden risks!):
  ${recentUpdates}

  INSTRUCTIONS:
  1. **Scan Text for Risks**: Look specifically at the "Text" fields in the updates. Are there mentions of "delay", "blocked", "waiting", "risk", "vendor", "hiring", or "tech debt"?
  2. **Identify Contradictions**: If an item Status is "Green" or "In Progress" but the Text says "We are blocked", flag this as a high impact risk.
  3. **Resource/Timing Conflicts**: Look for owners with too many overlapping items.
  4. **Output**: Return a JSON array of 3-5 insights.
  
  JSON Schema:
  Array of objects: {
    "type": "conflict" | "suggestion" | "summary" | "alignment_gap" | "hidden_risk",
    "message": "Concise, actionable insight text.",
    "impactLevel": "high" | "medium" | "low"
  }`;

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
              type: { type: Type.STRING },
              message: { type: Type.STRING },
              impactLevel: { type: Type.STRING }
            },
            required: ["type", "message", "impactLevel"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);

    // Specific handling for Quota/Rate Limit errors
    if (
      error.status === 429 || 
      error.code === 429 || 
      (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')))
    ) {
      return [{ 
        type: 'summary', 
        message: '✨ AI Insights Paused: Usage limit reached. The analysis will resume automatically when quota replenishes.', 
        impactLevel: 'low' 
      }];
    }

    return [{ 
      type: 'summary', 
      message: 'Unable to generate insights at this moment.', 
      impactLevel: 'low' 
    }];
  }
};

export const generateRoadmapItem = async (userInput: string): Promise<Partial<RoadmapItem>> => {
  const prompt = `Generate a structured roadmap item based on this description: "${userInput}".
  Extract the Title, Description, appropriate Department (Product, Marketing, or Operations), specific Sub-Team (e.g. Sales Ops, CRM, SEO, Creative), and a suggested Priority (Low, Medium, High, Critical).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            department: { type: Type.STRING },
            team: { type: Type.STRING },
            priority: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return {};
  }
};

export interface SuggestGoalResult {
  goalTitle: string;
  goalDescription: string;
  matchedGoalId?: string;
}

export const suggestGoalFromObjective = async (
  objective: string,
  existingGoals: StrategicGoal[]
): Promise<SuggestGoalResult> => {
  const goalsContext = existingGoals.length
    ? existingGoals.map(g => `id: ${g.id}, title: "${g.title}"`).join('\n')
    : 'No existing goals.';
  const prompt = `You are a program manager. The user stated this objective: "${objective}"
Existing goals (id and title only):
${goalsContext}
Tasks:
1. Propose a short goal title and a 1-2 sentence goal description.
2. If this objective clearly refers to ONE existing goal above, set matchedGoalId to that goal's id. Otherwise omit matchedGoalId.
Return JSON: { "goalTitle": string, "goalDescription": string, "matchedGoalId": string or omit }`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalTitle: { type: Type.STRING },
            goalDescription: { type: Type.STRING },
            matchedGoalId: { type: Type.STRING }
          },
          required: ["goalTitle", "goalDescription"]
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    return {
      goalTitle: parsed.goalTitle || '',
      goalDescription: parsed.goalDescription || '',
      matchedGoalId: parsed.matchedGoalId || undefined
    };
  } catch (e: any) {
    console.error("suggestGoalFromObjective failed:", e);
    return { goalTitle: objective.slice(0, 50), goalDescription: objective, matchedGoalId: undefined };
  }
};

export interface BreakDownResult {
  goalId?: string;
  goalTitle?: string;
  goalDescription?: string;
  tasks: Partial<RoadmapItem>[];
}

export const breakDownObjective = async (
  projectTitle: string,
  projectDescription: string,
  existingGoals: StrategicGoal[],
  employees: Employee[]
): Promise<BreakDownResult> => {
  const goalsContext = existingGoals.length
    ? existingGoals.map(g => `id: ${g.id}, title: "${g.title}"`).join('\n')
    : 'No existing goals.';
  const peopleContext = employees.length
    ? employees.map(e => {
        const base = `name: "${e.name}", department: ${e.department}, role: ${e.role}`;
        const extra = [e.team && `team: ${e.team}`, e.responsibilities && `what they do: ${e.responsibilities}`].filter(Boolean).join(', ');
        return extra ? `${base}, ${extra}` : base;
      }).join('\n')
    : 'No employees listed.';
  const prompt = `You are a program manager. Break this project into concrete tasks and assign owners from the team list. Use each person's role and "what they do" to pick the best owner for each task; not everyone in a department does the same job.
Project title: "${projectTitle}"
Project description: "${projectDescription}"
Existing goals (optional context): ${goalsContext}
Team (use exact "name" as owner): ${peopleContext}
Return JSON: goalId (optional), goalTitle, goalDescription (if relevant), tasks: array of { title, description, department, owner (exact name from list), priority (Low/Medium/High/Critical), team? }. If no employees or no good fit, set owner to "Unassigned".`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            goalId: { type: Type.STRING },
            goalTitle: { type: Type.STRING },
            goalDescription: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  department: { type: Type.STRING },
                  team: { type: Type.STRING },
                  owner: { type: Type.STRING },
                  priority: { type: Type.STRING }
                },
                required: ["title", "description", "department", "owner", "priority"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    const tasks: Partial<RoadmapItem>[] = Array.isArray(parsed.tasks)
      ? parsed.tasks.map((t: Record<string, string>) => ({
          title: t.title,
          description: t.description,
          department: t.department || 'Operations',
          team: t.team,
          owner: t.owner || 'Unassigned',
          priority: (t.priority as RoadmapItem['priority']) || 'Medium'
        }))
      : [];
    return {
      goalId: parsed.goalId,
      goalTitle: parsed.goalTitle,
      goalDescription: parsed.goalDescription,
      tasks
    };
  } catch (e: any) {
    console.error("breakDownObjective failed:", e);
    return { tasks: [] };
  }
};
