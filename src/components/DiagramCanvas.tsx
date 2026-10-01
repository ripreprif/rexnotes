"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { DiagramDSL } from "@/types/diagram-schema";
import {
  dslToExcalidrawElements,
  type ExcalidrawElements,
} from "@/lib/diagram/converter";

// Tipe API Excalidraw diambil dari tipe prop excalidrawAPI itu sendiri,
// supaya tidak bergantung ke path import internal yang bisa berubah antar versi.
type ExcalidrawAPI = NonNullable<Parameters<NonNullable<ComponentProps<typeof Excalidraw>["excalidrawAPI"]>>[0]>;

// Isi canvas bisa datang dari dua sumber:
// - "dsl": hasil Generate dari AI (dikonversi + auto-layout di sini)
// - "elements": elemen Excalidraw siap pakai (versi lama dari History,
//   atau array kosong untuk mengosongkan canvas)
// Setiap perubahan scene harus membuat OBJEK BARU supaya useEffect terpicu.
export type CanvasScene =
  | { kind: "dsl"; dsl: DiagramDSL }
  | { kind: "elements"; elements: ExcalidrawElements };

// "Pegangan" yang diberikan ke halaman induk. Dipakai Save untuk membaca
// isi canvas saat ini, termasuk hasil edit manual pengguna.
export interface CanvasHandle {
  getElements: () => ReturnType<ExcalidrawAPI["getSceneElements"]>;
}

interface DiagramCanvasProps {
  scene?: CanvasScene;
  onReady?: (handle: CanvasHandle) => void;
}

export default function DiagramCanvas({ scene, onReady }: DiagramCanvasProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);

  // Beri tahu halaman induk begitu canvas siap dibaca.
  useEffect(() => {
    if (!excalidrawAPI) return;
    onReady?.({ getElements: () => excalidrawAPI.getSceneElements() });
  }, [excalidrawAPI, onReady]);

  // Masukkan scene baru ke canvas. Kalau scene sudah ada sebelum canvas
  // selesai mount (misal buka versi dari History), efek ini otomatis
  // jalan lagi begitu excalidrawAPI tersedia.
  useEffect(() => {
    if (!scene || !excalidrawAPI) return;

    const elements =
      scene.kind === "dsl" ? dslToExcalidrawElements(scene.dsl) : scene.elements;

    excalidrawAPI.updateScene({ elements });

    // Auto-zoom hanya kalau ada isinya (canvas kosong tidak perlu di-zoom).
    if (elements.length > 0) {
      excalidrawAPI.scrollToContent(elements, { fitToContent: true });
    }
  }, [scene, excalidrawAPI]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />
    </div>
  );
}
