import dagre from "@dagrejs/dagre";
import type { DiagramDSL } from "@/types/diagram-schema";

export interface LayoutBox {
  x: number; // posisi kiri-atas (bukan tengah)
  y: number;
  width: number;
  height: number;
}

export type LayoutResult = Record<string, LayoutBox>;

const MIN_WIDTH = 160;
const MAX_WIDTH = 320;
const NODE_HEIGHT = 80;
const CHAR_WIDTH = 10; // perkiraan lebar per karakter untuk font default Excalidraw
const PADDING_X = 50;

/**
 * Perkiraan ukuran node berdasarkan panjang teks label, supaya node dengan
 * label panjang tidak "nabrak" node tetangganya. Ini cuma estimasi kasar
 * (bukan pengukuran font presisi) — cukup untuk MVP.
 */
function estimateNodeSize(label: string): { width: number; height: number } {
  const estimatedWidth = label.length * CHAR_WIDTH + PADDING_X;
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, estimatedWidth));
  return { width, height: NODE_HEIGHT };
}

/**
 * Menghitung posisi (x, y) tiap node dari sebuah DiagramDSL memakai dagre,
 * supaya node tidak saling tumpuk dan tersusun rapi berdasarkan relasinya.
 */
export function computeLayout(dsl: DiagramDSL): LayoutResult {
  const g = new dagre.graphlib.Graph();

  // rankdir "TB" = top-to-bottom, cocok untuk flowchart/mind map umum.
  // nodesep = jarak antar-node dalam satu level (kiri-kanan).
  // ranksep = jarak antar-level (atas-bawah).
  g.setGraph({ rankdir: "TB", nodesep: 100, ranksep: 140 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of dsl.nodes) {
    g.setNode(node.id, estimateNodeSize(node.label));
  }

  for (const edge of dsl.edges) {
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  // dagre mengembalikan x,y sebagai titik TENGAH node.
  // Excalidraw butuh x,y sebagai titik KIRI-ATAS, jadi kita konversi di sini.
  const result: LayoutResult = {};
  for (const node of dsl.nodes) {
    const pos = g.node(node.id);
    result[node.id] = {
      x: pos.x - pos.width / 2,
      y: pos.y - pos.height / 2,
      width: pos.width,
      height: pos.height,
    };
  }

  return result;
}