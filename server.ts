import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// 1. Endpoint: Generate study task recommendations based on topic/existing goals
app.post("/api/gemini/recommend-tasks", async (req, res) => {
  try {
    const { topic, existingTasksCount } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic or study goal is required" });
    }

    const ai = getAI();
    const prompt = `Act as a supportive, highly strategic personal study coach. Based on the study topic/goal: "${topic}" and knowing the user already has ${existingTasksCount} tasks on their schedule, suggest 3-5 hyper-focused, actionable, and specific tasks that they should plan. For each task, provide:
1. Title (short and clear, e.g., "Read Chapter 4 of Physics")
2. Description (one-sentence tactical detail)
3. Subject/Category (e.g., "Physics", "Math", "General")
4. Priority (high, medium, or low)
5. Estimated Pomodoros (number of 25-minute sessions needed, between 1 and 4)
6. Actionable study recommendation / coaching advice (one-sentence advice, e.g., "Review formula sheet first to save time").

Return the output as a valid JSON object matching the requested schema. Ensure the recommendations are realistic and immediately actionable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  priority: { type: Type.STRING, description: "Must be 'high', 'medium', or 'low'" },
                  estimatedPomodoros: { type: Type.INTEGER },
                  aiRecommendation: { type: Type.STRING }
                },
                required: ["title", "description", "subject", "priority", "estimatedPomodoros", "aiRecommendation"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/gemini/recommend-tasks:", error);
    res.status(500).json({ error: error.message || "Failed to generate task recommendations" });
  }
});

// 2. Endpoint: Prioritize existing tasks and provide a strategic study plan
app.post("/api/gemini/prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "A list of tasks is required" });
    }

    if (tasks.length === 0) {
      return res.json({ studyPlan: "You have no pending tasks. Add some tasks or ask me for study recommendations to get started!", prioritizedTaskIds: [] });
    }

    const ai = getAI();
    const tasksSummary = tasks.map(t => 
      `- ID: ${t.id}, Title: ${t.title}, Subject: ${t.subject}, Priority: ${t.priority}, Due Date: ${t.dueDate}, Completed: ${t.completed}, Estimated Pomodoros: ${t.estimatedPomodoros}`
    ).join("\n");

    const prompt = `Review this user's list of tasks, deadlines, and priorities:\n${tasksSummary}\n\nAct as a proactive study strategist. Provide a structured, cohesive study plan (2-3 paragraphs max) that highlights which task is the absolute top priority to prevent missing upcoming deadlines, how they should space their Pomodoro sessions, and dynamic study coaching advice. Also, output the list of task IDs in the exact recommended sequence of execution. Keep your plan highly encouraging, clean, and beautifully formatted (you can use markdown).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studyPlan: { type: Type.STRING, description: "Highly supportive markdown-based study advice and strategy." },
            prioritizedTaskIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["studyPlan", "prioritizedTaskIds"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/gemini/prioritize:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize tasks" });
  }
});

// 3. Endpoint: Generate custom study flashcards from a topic or selected note
app.post("/api/gemini/generate-flashcards", async (req, res) => {
  try {
    const { sourceText, topic } = req.body;
    const ai = getAI();

    let contentToAnalyze = "";
    if (sourceText) {
      contentToAnalyze = `the following notes:\n"${sourceText}"`;
    } else if (topic) {
      contentToAnalyze = `the general study topic: "${topic}"`;
    } else {
      return res.status(400).json({ error: "Either sourceText or topic is required to generate flashcards" });
    }

    const prompt = `Create a set of 5 to 8 high-quality study flashcards based on ${contentToAnalyze}.
Each flashcard should have:
- front: A clear, concise question, term, or concept to test memory.
- back: A crisp, accurate answer or explanation.

Ensure the questions are engaging and cover the most important concepts.
Provide a descriptive title and brief description for this flashcard set.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["title", "description", "cards"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-flashcards:", error);
    res.status(500).json({ error: error.message || "Failed to generate flashcards" });
  }
});

// 4. Endpoint: Summarize / synthesize notes with actionable key takeaways
app.post("/api/gemini/summarize-note", async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const ai = getAI();
    const prompt = `Analyze this student note titled "${title || "Untitled"}" and generate a high-value synthesis:
"${content}"

Provide:
1. A concise, professional summary (2-3 sentences).
2. 3-4 bullet points of high-yield key takeaways.
3. 1 tactical "Study Hint" (how to study or apply this knowledge).

Format the entire output as a beautiful, clean HTML or Markdown string for the user to view.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/summarize-note:", error);
    res.status(500).json({ error: error.message || "Failed to summarize note" });
  }
});

// 5. Endpoint: Generate dynamic Multiple-Choice Quiz from a note
app.post("/api/gemini/generate-quiz", async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Note content is required" });
    }

    const ai = getAI();
    const prompt = `Generate a high-quality multiple choice quiz with exactly 5 questions to test comprehension on the following study notes titled "${title || "Untitled"}":
"${content}"

Each question must contain:
1. A clear question statement.
2. 4 distinct options (labeled A, B, C, D).
3. The index or letter of the correct answer.
4. A brief, helpful explanation of why that option is correct.

Ensure the questions test actual understanding, not just shallow recall.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizTitle: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctOptionIndex: { type: Type.INTEGER, description: "Index of the correct answer (0 to 3)" },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
              }
            }
          },
          required: ["quizTitle", "questions"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-quiz:", error);
    res.status(500).json({ error: error.message || "Failed to generate quiz" });
  }
});

// Setup Vite Dev Server / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
