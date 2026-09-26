"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { DiagramDSL } from "@/types/diagram-schema";
import { dslToExcalidrawElements } from "@/lib/diagram/converter";

interface DiagramCanvasProps {
  dsl?: DiagramDSL;
}

export default function DiagramCanvas({ dsl }: DiagramCanvasProps) {
  const elements = dsl ? dslToExcalidrawElements(dsl) : [];

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Excalidraw initialData={{ elements }} />
    </div>
  );
}