"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Halaman login sederhana pakai Magic Link — wiring sementara untuk
 * uji coba end-to-end fitur Save/History, sama seperti input di
 * page.tsx pada Chat 3 yang belum dipisah jadi komponen tersendiri.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSendMagicLink() {
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMessage("");

    try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
    });

    if (error) {
      console.error("Supabase error:", error);
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  } catch (err) {
    console.error("Error tak terduga:", err);
    setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan.");
    setStatus("error");
  }
}

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      <h1 style={{ color: "#f97316" }}>RexNotes</h1>
      <p>Masuk pakai email kami kirim link login, tanpa password.</p>

      {status === "sent" ? (
        <p>Link login sudah dikirim ke {email}. Cek inbox kamu.</p>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            style={{
              width: 280,
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />
          <button
            onClick={handleSendMagicLink}
            disabled={status === "sending"}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#f97316",
              color: "white",
              cursor: "pointer",
            }}
          >
            {status === "sending" ? "Mengirim..." : "Kirim Link Login"}
          </button>
          {status === "error" && (
            <p style={{ color: "#991b1b" }}>Gagal mengirim link: {errorMessage}</p>
          )}
        </>
      )}
    </div>
  );
}
