import { GoogleGenAI, Type } from "@google/genai";
import type { DiagramDSL } from "@/types/diagram-schema";
import { DIAGRAM_SYSTEM_PROMPT } from "./prompt";
import { validateDiagramDSL } from "@/lib/diagram/validator";

// SDK otomatis membaca API key dari environment variable GEMINI_API_KEY.
const ai = new GoogleGenAI({});

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

// Schema ini memaksa Gemini SELALU balas JSON dengan bentuk yang tepat
// (controlled generation) — jauh lebih andal dibanding cuma minta lewat teks prompt biasa.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ["rectangle", "diamond", "ellipse", "text"],
          },
          label: { type: Type.STRING },
        },
        required: ["id", "type", "label"],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ["from", "to"],
      },
    },
  },
  required: ["nodes", "edges"],
};

/**
 * Mengirim catatan pengguna ke Gemini, minta balasan sesuai DiagramDSL,
 * lalu memvalidasinya. Melempar error kalau panggilan gagal atau format tidak sesuai.
 */
export async function generateDiagramDSL(userPrompt: string): Promise<DiagramDSL> {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: userPrompt,
    config: {
      systemInstruction: DIAGRAM_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini tidak mengembalikan balasan.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Balasan Gemini bukan JSON valid.");
  }

  return validateDiagramDSL(parsed);
}