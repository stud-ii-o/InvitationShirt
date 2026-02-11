import { useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";
import { toBlob } from "html-to-image";
import trikotUrl from "/Trikot.svg?url";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

/* -------------------- FONT LOADER (Safari-safe) -------------------- */
async function ensureFont(
  family: string,
  url: string,
  descriptors?: FontFaceDescriptors
) {
  try {
    if ([...document.fonts].some((f) => f.family === family)) return;
    const face = new FontFace(family, `url(${url})`, descriptors);
    const loaded = await face.load();
    document.fonts.add(loaded);
  } catch (e) {
    console.warn("Font load failed:", family, e);
  }
}
/* ------------------------------------------------------------------ */

export default function ExportOnly({
  answers,
  onDone,
}: {
  answers: Answers;
  onDone?: () => void; // use this as "Back to landing"
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [rawSvg, setRawSvg] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileName = useMemo(
    () => `invitation-shirt-${answers.name || "export"}.png`,
    [answers.name]
  );

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  /* cleanup preview url */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* -------------------- 1) LOAD SVG -------------------- */
  useEffect(() => {
    fetch(trikotUrl)
      .then((r) => r.text())
      .then(setRawSvg)
      .catch((e) => {
        console.error(e);
        setError("Could not load shirt template.");
      });
  }, []);

  /* -------------------- 2) PROCESS SVG STRING -------------------- */
  const processedSvg = useMemo(() => {
    if (!rawSvg) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return rawSvg;

    const paintGroup = (group: Element, color: string) => {
      group
        .querySelectorAll<SVGElement>("path, rect, circle, polygon, ellipse")
        .forEach((el) => {
          el.setAttribute("fill", color);
          (el as any).style.fill = color;
        });
    };

    // Apply fills
    for (const [layerId, color] of Object.entries(theme.fills)) {
      const el = svg.querySelector(`#${CSS.escape(layerId)}`);
      if (!el) continue;
      paintGroup(el, color);
    }

    // Find active pattern id from theme.visibility (the one with true)
    const activePatternBase =
      Object.entries(theme.visibility).find(([, v]) => v)?.[0] ?? null;

    // Remove all other patterns, keep only active (incl. Illustrator suffix ids)
    const patternNodes = Array.from(
      svg.querySelectorAll<SVGElement>("[id]")
    ).filter((n) => n.id.startsWith("layer-muster-"));

    patternNodes.forEach((node) => {
      const keep =
        activePatternBase &&
        (node.id === activePatternBase ||
          node.id.startsWith(activePatternBase + "_"));
      if (!keep) node.parentNode?.removeChild(node);
    });

    return new XMLSerializer().serializeToString(doc);
  }, [rawSvg, theme]);

  /* -------------------- 3) PREPARE (FONTS + SVG READY) -------------------- */
  useEffect(() => {
    if (!processedSvg) return;

    const run = async () => {
      const node = exportRef.current;
      if (!node) return;

      // Wait for SVG in DOM
      for (let i = 0; i < 80; i++) {
        if (node.querySelector("svg")) break;
        await new Promise((r) => requestAnimationFrame(r));
      }

      const base = import.meta.env.BASE_URL;

      await ensureFont("Satoshi", `${base}fonts/Satoshi-Regular.otf`, {
        weight: "100 900",
        style: "normal",
      });

      await ensureFont("Saint", `${base}fonts/Saint-Regular.ttf`, {
        weight: "700",
        style: "normal",
      });

      if (document.fonts?.ready) await document.fonts.ready;

      node.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      setReady(true);
    };

    run();
  }, [processedSvg]);

  /* -------------------- 4) CREATE PREVIEW (auto when ready) -------------------- */
  const createPreview = async () => {
    const node = exportRef.current;
    if (!node) return;

    setBusy(true);
    setError(null);

    try {
      if (document.fonts?.ready) await document.fonts.ready;

      node.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f1f2f2",
      });

      if (!blob) throw new Error("Blob is null");

      const url = URL.createObjectURL(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } catch (e) {
      console.error(e);
      setError("Preview generation failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // auto-generate once
  useEffect(() => {
    if (!ready) return;
    if (previewUrl) return;
    if (busy) return;
    createPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* -------------------- 5) SHARE -------------------- */
  const sharePreview = async () => {
    if (!previewUrl) return;

    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "2nd May, 8pm" });
        return;
      }

      // fallback: open image tab so user can save
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.warn(e);
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  /* -------------------- UI -------------------- */
  const showLoader = !previewUrl;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f1f2f2",
        display: "grid",
        placeItems: "center",
        fontFamily: "Satoshi",
        fontSize: 14,
        padding: 0,
        paddingTop: 10,
        paddingBottom: 20,
      }}
    >
      <div style={{ textAlign: "center", width: "min(560px, 92vw)" }}>
        {showLoader ? (
          <div style={{ opacity: 0.75 }}>
            {error ? error : "Preparing your invitation…"}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
            <img
              src={previewUrl}
              alt="Invitation Shirt Preview"
              style={{
                width: "min(440px, 92vw)",
                height: "auto",
                borderRadius: 0,
                background: "#f1f2f2",
                boxShadow: "0px 0px 30px rgba(0,0,0,0.30)",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <a
                href={previewUrl}
                download={fileName}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "#111",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Download PNG
              </a>

              <button
                onClick={sharePreview}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#fff",
                  color: "#111",
                  fontFamily: "Satoshi",
                          fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Share
              </button>

              <button
                onClick={() => onDone?.()}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#fff",
                  color: "#111",
                  fontWeight: 700,
                  fontFamily: "Satoshi",
                          fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EXPORT CANVAS (must be visible-ish for iOS) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity: 0.01,
          pointerEvents: "none",
        }}
      >
        <div
          ref={exportRef}
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            position: "relative",
            background: "#f1f2f2",
            overflow: "hidden",
          }}
        >
          {/* SVG (processed!) */}
          <div
            style={{ position: "absolute", inset: 0 }}
            dangerouslySetInnerHTML={{ __html: processedSvg }}
          />

          {/* TEXT */}
          <div style={{ position: "absolute", inset: 0, color: "#000" }}>
            {/* Header: Hello + Name on one line */}
            <div style={{ position: "absolute", top: 100, left: 17 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 75 }}>Hello</span>
                <span style={{ fontSize: 75, fontWeight: 700, fontStyle: "italic" }}>
                  {answers.name}
                </span>
              </div>

              <div style={{ fontSize: 75, marginTop: 16, lineHeight: 1 }}>
                Here is your personalised Invitation Shirt
              </div>
            </div>

            {/* Back print */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 540,
                transform: "translateX(-50%)",
                width: 520,
              }}
            >
              <div
                style={{
                  fontFamily: "Saint",
                  fontSize: 300,
                  fontWeight: 700,
                  lineHeight: 1,
                  transform: "translateX(160px)",
                }}
              >
                {answers.age}
              </div>

              <div
                style={{
                  fontFamily: "Satoshi",
                  fontSize: 100,
                  fontStyle: "italic",
                  fontWeight: 700,
                  textAlign: "center",
                  marginTop: 390,
                }}
              >
                {answers.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}