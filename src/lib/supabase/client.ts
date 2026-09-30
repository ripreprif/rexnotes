import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk dipakai di komponen client ("use client"),
 * misalnya halaman login. Sesi yang dibuat di sini otomatis disimpan
 * sebagai cookie oleh @supabase/ssr, sehingga bisa dibaca lagi oleh
 * createSupabaseServerClient() di API routes.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}