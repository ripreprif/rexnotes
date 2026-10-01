"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  callApi,
  type ProjectDetailResponse,
  type ProjectListResponse,
  type ProjectSummary,
  type ProjectVersion,
} from "@/lib/api-client";

const SIDEBAR_WIDTH = 300;

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  // Project dan versi yang sedang tampil di canvas (untuk penanda aktif).
  activeProjectId: string | null;
  activeVersionId: string | null;
  // Naik setiap kali ada Save berhasil, supaya daftar diambil ulang.
  refreshKey: number;
  // true saat halaman utama sibuk (Generate/Save) supaya klik diabaikan.
  disabled: boolean;
  // Dipanggil sebelum membuka project/versi lain. Return false untuk
  // membatalkan (misal pengguna memilih tetap di diagram yang sekarang).
  canOpen: () => boolean;
  onOpenVersion: (project: ProjectSummary, version: ProjectVersion) => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function describeError(err: unknown): { message: string; needsLogin: boolean } {
  return {
    message:
      err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi sebentar.",
    needsLogin: err instanceof ApiError && err.status === 401,
  };
}

const cardStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 14px",
  borderRadius: 10,
  background: "white",
  cursor: "pointer",
  font: "inherit",
} as const;

export default function HistorySidebar({
  open,
  onClose,
  activeProjectId,
  activeVersionId,
  refreshKey,
  disabled,
  canOpen,
  onOpenVersion,
}: HistorySidebarProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  // Cache detail project (berisi semua versi) supaya klik kedua tidak fetch lagi.
  const [details, setDetails] = useState<Record<string, ProjectDetailResponse>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  // Ambil daftar project setiap sidebar dibuka dan setiap selesai Save.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadProjects() {
      try {
        const data = await callApi<ProjectListResponse>("/api/projects");
        if (cancelled) return;
        setProjects(data.projects);
        // Versi yang ada di cache bisa sudah usang setelah Save, jadi dibuang.
        setDetails({});
        setExpandedId(null);
        setError(null);
        setNeedsLogin(false);
      } catch (err) {
        if (cancelled) return;
        const info = describeError(err);
        setError(info.message);
        setNeedsLogin(info.needsLogin);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  async function fetchDetail(id: string): Promise<ProjectDetailResponse> {
    const cached = details[id];
    if (cached) return cached;

    const detail = await callApi<ProjectDetailResponse>(
      `/api/projects/${encodeURIComponent(id)}`
    );
    setDetails((prev) => ({ ...prev, [id]: detail }));
    return detail;
  }

  async function handleProjectClick(project: ProjectSummary) {
    if (disabled || openingId) return;

    const isActive = project.id === activeProjectId;

    // Klik kartu yang sedang terbuka: tutup daftar versinya.
    if (expandedId === project.id) {
      setExpandedId(null);
      return;
    }
    if (!isActive && !canOpen()) return;

    setOpeningId(project.id);
    setError(null);
    setNeedsLogin(false);

    try {
      const detail = await fetchDetail(project.id);

      // Project lain: muat versi terbarunya ke canvas (versions sudah
      // terurut terbaru dulu dari endpoint). Project yang sudah aktif
      // cukup membuka daftar versinya.
      if (!isActive) {
        const latest = detail.versions[0];
        if (!latest) {
          throw new Error("Project ini belum punya versi yang tersimpan.");
        }
        onOpenVersion(detail.project, latest);
      }
      setExpandedId(project.id);
    } catch (err) {
      const info = describeError(err);
      setError(info.message);
      setNeedsLogin(info.needsLogin);
    } finally {
      setOpeningId(null);
    }
  }

  function handleVersionClick(detail: ProjectDetailResponse, version: ProjectVersion) {
    if (disabled || version.id === activeVersionId) return;
    if (!canOpen()) return;
    onOpenVersion(detail.project, version);
  }

  return (
    <aside
      aria-hidden={!open}
      style={{
        width: open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        overflow: "hidden",
        visibility: open ? "visible" : "hidden",
        transition: "width 0.2s ease, visibility 0.2s",
        background: "#f5f5f4",
        borderRight: open ? "1px solid #e5e5e5" : "none",
      }}
    >
      {/* Lebar isi dikunci supaya teks tidak "melipat" saat panel bergeser. */}
      <div
        style={{
          width: SIDEBAR_WIDTH,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 8px",
          }}
        >
          <h2 style={{ margin: 0, color: "#f97316", fontSize: 24, lineHeight: 1.1 }}>
            Catatan kamu
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup daftar catatan"
            style={{
              display: "flex",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#f97316",
              padding: 0,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
            </svg>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
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

          {listLoading && <p style={{ margin: 0, fontSize: 14 }}>Sedang mengambil catatan kamu...</p>}

          {!listLoading && !error && projects.length === 0 && (
            <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
              Belum ada catatan tersimpan. Buat diagram, lalu klik Simpan.
            </p>
          )}

          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isExpanded = expandedId === project.id;
            const detail = details[project.id];

            return (
              <div key={project.id}>
                <button
                  onClick={() => handleProjectClick(project)}
                  aria-expanded={isExpanded}
                  style={{
                    ...cardStyle,
                    border: `1.5px solid ${isActive ? "#f97316" : "#d4d4d4"}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {project.title}
                  </div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
                    {openingId === project.id
                      ? "Membuka..."
                      : `Terakhir diedit: ${formatDate(project.updated_at)}`}
                  </div>
                </button>

                {isExpanded && detail && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      margin: "6px 0 0 12px",
                    }}
                  >
                    {detail.versions.map((version) => {
                      const isActiveVersion = version.id === activeVersionId;
                      return (
                        <button
                          key={version.id}
                          onClick={() => handleVersionClick(detail, version)}
                          style={{
                            textAlign: "left",
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "none",
                            background: isActiveVersion ? "#ffedd5" : "transparent",
                            color: "#333",
                            cursor: "pointer",
                            font: "inherit",
                            fontSize: 13,
                          }}
                        >
                          Versi {version.version_number}
                          <span style={{ color: "#777" }}>
                            {" "}
                            ({formatDate(version.created_at)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
