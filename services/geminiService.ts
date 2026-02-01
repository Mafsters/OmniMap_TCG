
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

/** Suggested goal from an objective; optionally matches an existing goal by id */
export interface SuggestGoalResult {
  goalTitle: string;
  goalDescription: string;
  /** If the objective clearly matches an existing goal, its id; otherwise omit */
  matchedGoalId?: string;
}

/**
 * Suggests a StrategicGoal (title + description) from a free-text objective,
 * and optionally indicates if it matches an existing goal.
 */
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
1. Propose a short goal title (e.g. "Launch Merch Store") and a 1-2 sentence goal description.
2. If this objective clearly refers to ONE of the existing goals above, set matchedGoalId to that goal's id exactly. Otherwise omit matchedGoalId.

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
  } catch (error: any) {
    console.error("suggestGoalFromObjective failed:", error);
    return { goalTitle: objective.slice(0, 50), goalDescription: objective, matchedGoalId: undefined };
  }
};

/** Result of breaking down an objective into a goal + tasks with suggested owners */
export interface BreakDownResult {
  goalId?: string;
  goalTitle?: string;
  goalDescription?: string;
  tasks: Partial<RoadmapItem>[];
}

/**
 * Breaks down an objective into a suggested goal (if new) and multiple RoadmapItem-like tasks,
 * with suggested owner names from the given employee list (role/department/team).
 */
export const breakDownObjective = async (
  objective: string,
  existingGoals: StrategicGoal[],
  employees: Employee[]
): Promise<BreakDownResult> => {
  const goalsContext = existingGoals.length
    ? existingGoals.map(g => `id: ${g.id}, title: "${g.title}"`).join('\n')
    : 'No existing goals.';
  const peopleContext = employees.length
    ? employees.map(e => `name: "${e.name}", department: ${e.department}, role: ${e.role}${e.team ? `, team: ${e.team}` : ''}`).join('\n')
    : 'No employees listed.';

  const prompt = `You are a program manager. Break the following objective into a single goal and concrete tasks with owners.

Objective: "${objective}"

Existing goals (use one of these if the objective fits; otherwise suggest a new goal):
${goalsContext}

People (use exact "name" as owner for each task; pick the best fit by department/role):
${peopleContext}

Return JSON with:
- goalId: use an existing goal id if this objective fits one, otherwise omit.
- goalTitle: short goal title (if new goal).
- goalDescription: 1-2 sentences (if new goal).
- tasks: array of objects. Each object must have: title, description, department, owner (exact name from People list), priority (one of: Low, Medium, High, Critical). Optionally: team (string).

If no employees exist, set owner to "Unassigned" for each task.`;

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
  } catch (error: any) {
    console.error("breakDownObjective failed:", error);
    return { tasks: [] };
  }
};
