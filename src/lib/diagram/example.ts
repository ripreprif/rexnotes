import type { DiagramDSL } from "@/types/diagram-schema";

// Data contoh manual untuk menguji converter + layout,
// sebelum kita sambungkan ke Gemini di Chat 3.
export const exampleDiagram: DiagramDSL = {
  nodes: [
    { id: "root", type: "ellipse", label: "Supervised Learning" },
    { id: "classification", type: "rectangle", label: "Classification" },
    { id: "regression", type: "rectangle", label: "Regression" },
    { id: "contoh", type: "text", label: "contoh: spam detection" },
  ],
  edges: [
    { from: "root", to: "classification" },
    { from: "root", to: "regression" },
    { from: "classification", to: "contoh", label: "contoh" },
  ],
};