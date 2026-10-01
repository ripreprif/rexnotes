import type { DiagramDSL } from "@/types/diagram-schema";

// Tipe response endpoint. Nama field sengaja mengikuti response asli API
// (snake_case untuk data dari database), tanpa transformasi.
export interface ProjectSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  scene_data: unknown;
  prompt_used: string | null;
  version_number: number;
  created_at: string;
}

export interface GenerateResponse {
  dsl: DiagramDSL;
}

export interface SaveProjectResponse {
  projectId: string;
  versionId: string;
  versionNumber: number;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface ProjectDetailResponse {
  project: ProjectSummary;
  versions: ProjectVersion[];
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function readErrorMessage(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "error" in data) {
    const value = (data as { error: unknown }).error;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

/**
 * Memanggil endpoint internal dan selalu melempar ApiError dengan pesan
 * berbahasa sederhana, baik saat server membalas error maupun saat
 * koneksi putus. status 0 berarti request tidak sampai ke server.
 */
export async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(
      "Tidak bisa terhubung ke server. Cek koneksi internet kamu, lalu coba lagi.",
      0
    );
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      readErrorMessage(data) ?? "Terjadi kesalahan. Coba lagi sebentar.",
      res.status
    );
  }

  return data as T;
}
