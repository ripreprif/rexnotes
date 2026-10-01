"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasHandle, CanvasScene } from "@/components/DiagramCanvas";
import HistorySidebar from "@/components/HistorySidebar";
import PromptInput from "@/components/PromptInput";
import type { ExcalidrawElements } from "@/lib/diagram/converter";
import {
  ApiError,
  callApi,
  type GenerateResponse,
  type ProjectSummary,
  type ProjectVersion,
  type SaveProjectResponse,
} from "@/lib/api-client";

const DiagramCanvas = dynamic(() => import("@/components/DiagramCanvas"), {
  ssr: false,
});

type BusyAction = "generate" | "save" | null;

const BUSY_TEXT: Record<Exclude<BusyAction, null>, string> = {
  generate: "Sedang membuat diagram. Mohon tunggu sebentar...",
  save: "Sedang menyimpan...",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

// Judul project baru diambil dari baris pertama catatan pengguna.
function deriveTitle(prompt: string): string {
  const firstLine =
    prompt
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  if (!firstLine) return "Diagram tanpa judul";
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}

const buttonStyle = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "white",
  color: "#333",
  cursor: "pointer",
  fontSize: 14,
} as const;

function messageStyle(background: string, color: string) {
  return {
    background,
    color,
    padding: "8px 16px",
    borderRadius: 8,
    boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
    maxWidth: "min(520px, calc(100% - 32px))",
    textAlign: "center",
    fontSize: 14,
    pointerEvents: "auto",
  } as const;
}

export default function Home() {
  const canvasRef = useRef<CanvasHandle | null>(null);

  const [scene, setScene] = useState<CanvasScene | undefined>(undefined);

  // State project aktif:
  // projectId null        = belum pernah disimpan, Save berikutnya membuat project baru.
  // projectId berisi uuid = Save berikutnya menambah versi ke project tersebut.
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
  // Versi yang sedang tampil di canvas (null kalau hasil Generate yang belum disimpan).
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  // Catatan terakhir yang dipakai Generate, disimpan sebagai prompt_used.
  const [lastPrompt, setLastPrompt] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Naik setiap Save berhasil, memberi tahu sidebar untuk mengambil ulang daftar.
  const [refreshKey, setRefreshKey] = useState(0);

  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCanvasReady = useCallback((handle: CanvasHandle) => {
    canvasRef.current = handle;
  }, []);

  // Pesan sukses hilang sendiri setelah beberapa detik.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function resetMessages() {
    setError(null);
    setNotice(null);
    setNeedsLogin(false);
  }

  function showError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      setNeedsLogin(true);
    }
    setError(
      err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi sebentar."
    );
  }

  function canvasHasContent(): boolean {
    return (canvasRef.current?.getElements().length ?? 0) > 0;
  }

  // Generate: catatan jadi diagram. projectId sengaja TIDAK di-reset di sini,
  // supaya Save setelah Generate ulang tetap jadi versi baru di project yang sama.
  async function handleGenerate(prompt: string) {
    if (busy) return;
    resetMessages();
    setBusy("generate");

    try {
      const data = await callApi<GenerateResponse>("/api/generate", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ prompt }),
      });
      setScene({ kind: "dsl", dsl: data.dsl });
      setLastPrompt(prompt);
      setActiveVersionId(null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  }

  // Save: ambil isi canvas saat ini (termasuk hasil edit manual), kirim ke server.
  async function handleSave() {
    if (busy) return;
    resetMessages();

    const elements = canvasRef.current?.getElements() ?? [];
    if (elements.length === 0) {
      setError("Belum ada diagram untuk disimpan. Buat diagram dulu.");
      return;
    }

    // Endpoint mewajibkan title di setiap Save, jadi project lanjutan
    // tetap mengirim judul yang sudah ada.
    const title = projectTitle ?? deriveTitle(lastPrompt);
    setBusy("save");

    try {
      const data = await callApi<SaveProjectResponse>("/api/projects", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title,
          elements,
          promptUsed: lastPrompt || undefined,
          projectId: projectId ?? undefined,
        }),
      });
      setProjectId(data.projectId);
      setProjectTitle(title);
      setActiveVersionId(data.versionId);
      setRefreshKey((key) => key + 1);
      setNotice(`Tersimpan sebagai versi ${data.versionNumber}.`);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  }

  // Mulai dari awal: kosongkan canvas dan lepaskan project aktif.
  function handleNewProject() {
    if (busy) return;
    if (
      canvasHasContent() &&
      !window.confirm("Diagram yang belum disimpan akan hilang. Lanjutkan?")
    ) {
      return;
    }
    resetMessages();
    setProjectId(null);
    setProjectTitle(null);
    setActiveVersionId(null);
    setLastPrompt("");
    setScene({ kind: "elements", elements: [] });
  }

  // Dipanggil sidebar sebelum membuka project/versi lain. Peringatan hanya
  // muncul untuk diagram yang belum pernah disimpan sama sekali.
  function confirmOpenSaved(): boolean {
    if (!canvasHasContent() || projectId !== null) return true;
    return window.confirm("Diagram yang belum disimpan akan hilang. Lanjutkan?");
  }

  // Dipanggil sidebar saat pengguna memilih satu versi. Project aktif
  // berpindah ke project tersebut, jadi Save berikutnya menambah versi di sana.
  function handleOpenVersion(project: ProjectSummary, version: ProjectVersion) {
    resetMessages();
    if (!Array.isArray(version.scene_data)) {
      setError("Data diagram ini tidak bisa dibuka.");
      return;
    }
    setScene({
      kind: "elements",
      elements: version.scene_data as ExcalidrawElements,
    });
    setProjectId(project.id);
    setProjectTitle(project.title);
    setActiveVersionId(version.id);
    setLastPrompt(version.prompt_used ?? "");
  }

  const busyText = busy ? BUSY_TEXT[busy] : null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <HistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeProjectId={projectId}
        activeVersionId={activeVersionId}
        refreshKey={refreshKey}
        disabled={busy !== null}
        canOpen={confirmOpenSaved}
        onOpenVersion={handleOpenVersion}
      />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            height: 52,
            padding: "0 16px",
            borderBottom: "1px solid #e5e5e5",
            background: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Tutup daftar catatan" : "Buka daftar catatan"}
              style={{
                display: "flex",
                padding: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#333",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <strong style={{ color: "#f97316", fontSize: 20 }}>RexNotes</strong>
            <span
              style={{
                color: "#666",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {projectTitle ?? "Project baru"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleNewProject} disabled={busy !== null} style={buttonStyle}>
              Project baru
            </button>
            <button
              onClick={handleSave}
              disabled={busy !== null}
              style={{
                ...buttonStyle,
                background: busy === "save" ? "#fdba74" : "#f97316",
                border: "none",
                color: "white",
              }}
            >
              {busy === "save" ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </header>

        {/* Area canvas. Pesan dan kotak input diposisikan relatif terhadap area
            ini (bukan layar), jadi tetap rapi saat sidebar terbuka. */}
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <DiagramCanvas scene={scene} onReady={handleCanvasReady} />

          <div
            style={{
              position: "absolute",
              top: 80,
              left: 0,
              right: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            {busyText && <div style={messageStyle("#ffedd5", "#9a3412")}>{busyText}</div>}
            {notice && <div style={messageStyle("#dcfce7", "#166534")}>{notice}</div>}
            {error && (
              <div style={messageStyle("#fee2e2", "#991b1b")}>
                {error}
                {needsLogin && (
                  <>
                    {" "}
                    <Link href="/login" style={{ color: "#991b1b", fontWeight: 600 }}>
                      Masuk dulu di sini
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <PromptInput
            onSubmit={handleGenerate}
            loading={busy === "generate"}
            disabled={busy !== null}
          />
        </div>
      </div>
    </div>
  );
}
