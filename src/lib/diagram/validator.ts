import { z } from "zod";
import type { DiagramDSL } from "@/types/diagram-schema";

const nodeTypeSchema = z.enum(["rectangle", "diamond", "ellipse", "text"]);

const diagramNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeSchema,
  label: z.string().min(1),
});

const diagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const diagramDSLSchema = z.object({
  nodes: z.array(diagramNodeSchema).min(1),
  edges: z.array(diagramEdgeSchema),
});

export class DiagramValidationError extends Error {
  issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "DiagramValidationError";
    this.issues = issues;
  }
}

/**
 * Memvalidasi balasan mentah dari Gemini terhadap struktur DiagramDSL.
 * Melempar DiagramValidationError kalau tidak sesuai, supaya route.ts
 * bisa kasih pesan error yang jelas ke pengguna (bukan crash).
 */
export function validateDiagramDSL(data: unknown): DiagramDSL {
  const result = diagramDSLSchema.safeParse(data);

  if (!result.success) {
    throw new DiagramValidationError(
      "Balasan AI tidak sesuai format diagram yang diharapkan.",
      result.error.issues
    );
  }

  // Validasi tambahan yang tidak bisa dicek zod saja:
  // setiap edge.from/edge.to harus merujuk ke id node yang benar-benar ada.
  const nodeIds = new Set(result.data.nodes.map((n) => n.id));
  const invalidEdge = result.data.edges.find(
    (e) => !nodeIds.has(e.from) || !nodeIds.has(e.to)
  );
  if (invalidEdge) {
    throw new DiagramValidationError(
      `AI membuat edge yang merujuk ke id node yang tidak ada: ${JSON.stringify(invalidEdge)}`,
      []
    );
  }

  return result.data;
}