"use client";

import { useState } from "react";

interface PromptInputProps {
  // Dipanggil dengan teks yang sudah di-trim saat pengguna menekan
  // tombol Generate atau Enter.
  onSubmit: (prompt: string) => void;
  // true saat proses Generate sedang berjalan (mengubah label tombol).
  loading?: boolean;
  // true saat aksi lain sedang berjalan (Save / buka versi) supaya
  // input tidak bisa dipakai bersamaan.
  disabled?: boolean;
}

export default function PromptInput({
  onSubmit,
  loading = false,
  disabled = false,
}: PromptInputProps) {
  const [text, setText] = useState("");
  const blocked = loading || disabled;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || blocked) return;
    onSubmit(trimmed);
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        width: "calc(100% - 32px)",
        maxWidth: 640,
        background: "white",
        padding: 12,
        borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter = kirim, Shift+Enter = baris baru (berguna untuk catatan panjang).
          // isComposing dicek supaya Enter saat memilih kata di keyboard
          // ponsel/IME tidak ikut mengirim.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ketik catatan yang mau diubah jadi diagram..."
        rows={2}
        disabled={blocked}
        style={{
          flex: 1,
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: 8,
          resize: "none",
          font: "inherit",
        }}
      />
      <button
        onClick={submit}
        disabled={blocked || text.trim().length === 0}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: blocked || text.trim().length === 0 ? "#fdba74" : "#f97316",
          color: "white",
          cursor: blocked ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? "Membuat..." : "Generate"}
      </button>
    </div>
  );
}
