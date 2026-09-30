import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/projects — Save
 *
 * Body: { title: string, elements: unknown, promptUsed?: string, projectId?: string }
 *
 * `projectId` opsional: kalau dikirim dan valid, hanya menambah baris baru
 * di diagram_versions untuk project yang sudah ada. Kalau tidak dikirim,
 * dibuatkan project baru dulu. version_number dihitung otomatis oleh
 * trigger database (lihat supabase/schema.sql), jadi tidak perlu dikirim
 * dari sini.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Kamu harus login untuk menyimpan project." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body request harus JSON valid." },
      { status: 400 }
    );
  }

  const { title, elements, promptUsed, projectId } = body as {
    title?: unknown;
    elements?: unknown;
    promptUsed?: unknown;
    projectId?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "Field 'title' wajib diisi." },
      { status: 400 }
    );
  }
  if (elements === undefined || elements === null) {
    return NextResponse.json(
      { error: "Field 'elements' wajib diisi." },
      { status: 400 }
    );
  }

  try {
    let resolvedProjectId: string;

    if (typeof projectId === "string" && projectId.length > 0) {
      // Save ke project yang sudah ada. RLS otomatis menolak (hasil kosong)
      // kalau project ini ternyata bukan milik user yang sedang login,
      // jadi 404 di sini sudah cukup aman tanpa perlu pengecekan tambahan.
      const { data: existingProject, error: fetchError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .single();

      if (fetchError || !existingProject) {
        return NextResponse.json(
          { error: "Project tidak ditemukan." },
          { status: 404 }
        );
      }
      resolvedProjectId = existingProject.id;
    } else {
      // Project baru.
      const { data: newProject, error: insertProjectError } = await supabase
        .from("projects")
        .insert({ title, user_id: user.id })
        .select("id")
        .single();

      if (insertProjectError || !newProject) {
        throw insertProjectError ?? new Error("Gagal membuat project baru.");
      }
      resolvedProjectId = newProject.id;
    }

    // diagram_versions SELALU baris baru — tidak pernah menimpa versi lama.
    const { data: newVersion, error: insertVersionError } = await supabase
      .from("diagram_versions")
      .insert({
        project_id: resolvedProjectId,
        scene_data: elements,
        prompt_used: typeof promptUsed === "string" ? promptUsed : null,
      })
      .select("id, version_number")
      .single();

    if (insertVersionError || !newVersion) {
      throw insertVersionError ?? new Error("Gagal menyimpan versi diagram.");
    }

    return NextResponse.json({
      projectId: resolvedProjectId,
      versionId: newVersion.id,
      versionNumber: newVersion.version_number,
    });
  } catch (error) {
    console.error("Gagal menyimpan project:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan project. Coba lagi sebentar." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects — List (untuk halaman History)
 *
 * Mengembalikan daftar project milik user yang sedang login, diurutkan
 * dari yang terakhir diedit. Tidak perlu filter user_id manual — RLS
 * sudah membatasi hasil query ke baris milik auth.uid().
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Kamu harus login untuk melihat riwayat." },
      { status: 401 }
    );
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil daftar project:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil riwayat." },
      { status: 500 }
    );
  }

  return NextResponse.json({ projects });
}