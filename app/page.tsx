"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg";
const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
]);

type GenerateSuccess =
  | {
      ok: true;
      mode: "local";
      graphId: string;
      rendererGraph: unknown;
    }
  | {
      ok: true;
      mode: "remote";
      graphId: string;
    };

type GenerateFailure = {
  ok: false;
  error?: { code?: string; message?: string };
};

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot).toLowerCase();
}

function prettyMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const disabled = busy || files.length === 0;

  const fileLabel = useMemo(() => {
    if (files.length === 0) return "No files selected";
    if (files.length === 1) return files[0].name;
    return `${files.length} files selected`;
  }, [files]);

  function validate(selected: File[]): { ok: true } | { ok: false; message: string } {
    if (selected.length === 0) {
      return { ok: false, message: "Please choose at least one file." };
    }

    for (const file of selected) {
      const ext = getExtension(file.name);
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return { ok: false, message: `Unsupported file type: ${file.name}` };
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          ok: false,
          message: `File exceeds 25MB (${prettyMb(file.size)}): ${file.name}`,
        };
      }
    }

    return { ok: true };
  }

  function onSelect(fileList: FileList | null) {
    const selected = fileList ? Array.from(fileList) : [];
    const verdict = validate(selected);
    if (!verdict.ok) {
      setError(verdict.message);
      return;
    }

    setError(null);
    setFiles(selected);
  }

  async function onGenerate() {
    const verdict = validate(files);
    if (!verdict.ok) {
      setError(verdict.message);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const form = new FormData();
      for (const file of files) {
        form.append("files", file, file.name);
      }
      if (topic.trim()) {
        form.append("topic", topic.trim());
      }

      const res = await fetch("/api/kg/generate", {
        method: "POST",
        body: form,
      });

      const payload = (await res.json().catch(() => null)) as
        | GenerateSuccess
        | GenerateFailure
        | null;

      if (!payload) {
        setError("Backend returned an invalid response.");
        return;
      }

      if (payload.ok !== true) {
        const message = payload.error?.message || "Failed to generate graph.";
        setError(message);
        return;
      }

      if (payload.mode === "local") {
        sessionStorage.setItem(`kg:graph:${payload.graphId}`, JSON.stringify(payload.rendererGraph));
      }

      router.push(`/graphs/${encodeURIComponent(payload.graphId)}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Upload request failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.2), transparent 45%), radial-gradient(circle at 90% 90%, rgba(16,185,129,0.16), transparent 40%), #04070f",
        color: "#e2e8f0",
        fontFamily: "'Sora','DM Sans','Segoe UI',sans-serif",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.3)",
          background: "rgba(15,23,42,0.78)",
          boxShadow: "0 20px 80px rgba(2,6,23,0.45)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 32, margin: 0 }}>Knowledge Graph Uploader</h1>
        <p style={{ marginTop: 10, color: "#94a3b8", lineHeight: 1.6 }}>
          Upload study files, forward each one as a gzip file, and open the generated graph.
        </p>

        <label style={{ display: "block", marginTop: 20 }}>
          <span style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#cbd5e1" }}>
            Topic (optional)
          </span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Week 4: Systems and Graphs"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.6)",
              color: "#f8fafc",
              padding: "10px 12px",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: 16 }}>
          <span style={{ display: "block", marginBottom: 8, fontSize: 13, color: "#cbd5e1" }}>
            Files
          </span>
          <input
            type="file"
            multiple
            accept={ACCEPT}
            onChange={(e) => onSelect(e.target.files)}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px dashed rgba(148,163,184,0.45)",
              background: "rgba(2,6,23,0.55)",
              color: "#f8fafc",
              padding: "12px",
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{fileLabel}</div>
        </label>

        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
          Accepted: .pdf, .docx, .pptx, .txt, .png, .jpg, .jpeg (max 25MB each)
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              borderRadius: 10,
              border: "1px solid rgba(248,113,113,0.5)",
              background: "rgba(127,29,29,0.35)",
              color: "#fecaca",
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={disabled}
          style={{
            marginTop: 18,
            borderRadius: 10,
            border: "1px solid rgba(16,185,129,0.6)",
            background: disabled ? "rgba(30,41,59,0.7)" : "rgba(16,185,129,0.18)",
            color: disabled ? "#64748b" : "#d1fae5",
            padding: "10px 16px",
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Generating..." : "Generate Knowledge Graph"}
        </button>
      </section>
    </main>
  );
}
