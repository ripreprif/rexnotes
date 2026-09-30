import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client untuk dipakai di server: Route Handler (API routes)
 * dan Server Component. Membaca sesi login dari cookie request, jadi
 * setiap query otomatis "tahu" siapa user yang sedang login (dipakai
 * oleh Row Level Security lewat auth.uid()).
 *
 * PENTING: harus dipanggil ulang di setiap request, jangan disimpan
 * sebagai singleton — instance-nya terikat ke cookie request yang
 * sedang berjalan.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component (bukan Route Handler/Action) —
            // aman diabaikan karena refresh sesi sudah ditangani middleware.ts.
          }
        },
      },
    }
  );
}