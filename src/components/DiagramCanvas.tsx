"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { DiagramDSL } from "@/types/diagram-schema";
import { dslToExcalidrawElements } from "@/lib/diagram/converter";

// Tipe API Excalidraw diambil dari tipe prop excalidrawAPI itu sendiri,
// supaya tidak bergantung ke path import internal yang bisa berubah antar versi.
type ExcalidrawAPI = NonNullable<Parameters<NonNullable<ComponentProps<typeof Excalidraw>["excalidrawAPI"]>>[0]>;

interface DiagramCanvasProps {
  dsl?: DiagramDSL;
}

export default function DiagramCanvas({ dsl }: DiagramCanvasProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);

  useEffect(() => {
    if (!dsl || !excalidrawAPI) return;

    const elements = dslToExcalidrawElements(dsl);

    // updateScene() ini yang menggantikan initialData — cara BENAR untuk
    // memasukkan elemen baru ke canvas yang sudah kadung mount.
    excalidrawAPI.updateScene({ elements });

    // Auto-zoom/scroll supaya hasil generate langsung kelihatan penuh,
    // tidak perlu pengguna cari-cari di canvas.
    excalidrawAPI.scrollToContent(elements, { fitToContent: true });
  }, [dsl, excalidrawAPI]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />
    </div>
  );
}