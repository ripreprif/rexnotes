import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { DiagramDSL, DiagramEdge, DiagramNode } from "@/types/diagram-schema";
import { computeLayout, type LayoutBox } from "./layout";

type ExcalidrawSkeleton = Parameters<typeof convertToExcalidrawElements>[0][number];
export type ExcalidrawElements = ReturnType<typeof convertToExcalidrawElements>;

interface Point {
  x: number;
  y: number;
}

function boxCenter(box: LayoutBox): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Menghitung titik di tepi sebuah box yang mengarah ke titik "towards".
 * Dipakai supaya panah berhenti tepat di garis tepi kotak, bukan di tengah kotak.
 */
function edgePointTowards(box: LayoutBox, towards: Point): Point {
  const center = boxCenter(box);
  const dx = towards.x - center.x;
  const dy = towards.y - center.y;

  if (dx === 0 && dy === 0) return center;

  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function nodeToSkeleton(node: DiagramNode, box: LayoutBox): ExcalidrawSkeleton {
  if (node.type === "text") {
    return {
      id: node.id,
      type: "text",
      x: box.x,
      y: box.y,
      text: node.label,
    };
  }

  return {
    id: node.id,
    type: node.type,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    label: { text: node.label },
  };
}

function edgeToSkeleton(
  edge: DiagramEdge,
  layout: Record<string, LayoutBox>
): ExcalidrawSkeleton | null {
  const fromBox = layout[edge.from];
  const toBox = layout[edge.to];
  if (!fromBox || !toBox) return null; // id tidak ditemukan di layout, lewati

  const fromCenter = boxCenter(fromBox);
  const toCenter = boxCenter(toBox);

  // Titik mulai panah = tepi kotak "from" ke arah kotak "to".
  // Titik akhir panah = tepi kotak "to" ke arah kotak "from".
  const start = edgePointTowards(fromBox, toCenter);
  const end = edgePointTowards(toBox, fromCenter);

  return {
    type: "arrow",
    x: start.x,
    y: start.y,
    // "points" relatif terhadap x,y di atas — ini yang bikin panah
    // benar-benar menggambar garis sepanjang jarak asli antar node.
    points: [
      [0, 0],
      [end.x - start.x, end.y - start.y],
    ],
    start: { id: edge.from },
    end: { id: edge.to },
    ...(edge.label ? { label: { text: edge.label } } : {}),
  };
}

export function dslToExcalidrawElements(dsl: DiagramDSL): ExcalidrawElements {
  const layout = computeLayout(dsl);

  const nodeSkeletons = dsl.nodes.map((node) => nodeToSkeleton(node, layout[node.id]));
  const edgeSkeletons = dsl.edges
    .map((edge) => edgeToSkeleton(edge, layout))
    .filter((skeleton): skeleton is ExcalidrawSkeleton => skeleton !== null);

  return convertToExcalidrawElements([...nodeSkeletons, ...edgeSkeletons], {
    regenerateIds: false,
  });
}