import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/:id — Detail satu project + semua versi diagram_versions-nya.
 *
 * Catatan MVP: scene_data setiap versi ikut dikirim penuh di sini (bukan
 * lewat endpoint terpisah per versi), supaya halaman History bisa langsung
 * memuat diagram begitu user pilih salah satu versi. Trade-off: payload
 * bisa berat kalau versinya sudah banyak — kandidat optimisasi (lazy-load
 * per versi) untuk rencana lanjutan, bukan MVP.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Kamu harus login untuk melihat project ini." },
      { status: 401 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, created_at, updated_at")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    // RLS membuat query di atas mengembalikan kosong kalau project ini
    // bukan milik user yang login, jadi 404 di sini juga menutupi kasus itu
    // tanpa membocorkan bahwa project-nya sebenarnya ada tapi milik orang lain.
    return NextResponse.json(
      { error: "Project tidak ditemukan." },
      { status: 404 }
    );
  }

  const { data: versions, error: versionsError } = await supabase
    .from("diagram_versions")
    .select("id, scene_data, prompt_used, version_number, created_at")
    .eq("project_id", id)
    .order("version_number", { ascending: false });

  if (versionsError) {
    console.error("Gagal mengambil versi diagram:", versionsError);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil riwayat versi." },
      { status: 500 }
    );
  }

  return NextResponse.json({ project, versions });
}