"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { DiagramDSL } from "@/types/diagram-schema";

const DiagramCanvas = dynamic(() => import("@/components/DiagramCanvas"), {
  ssr: false,
});

export default function Home() {
  const [dsl, setDsl] = useState<DiagramDSL | undefined>(undefined);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal generate diagram.");
      }

      setDsl(data.dsl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <DiagramCanvas dsl={dsl} />

      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: 8,
          background: "white",
          padding: 12,
          borderRadius: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="Ketik catatan yang mau diubah jadi diagram..."
          style={{ width: 320, padding: "8px 12px", border: "1px solid #060000", borderRadius: 8 }}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#f97316",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Membuat..." : "Generate"}
        </button>
      </div>

      {error && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 16px",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}