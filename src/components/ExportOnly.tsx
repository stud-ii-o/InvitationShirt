import { useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";
import { toBlob } from "html-to-image";
import trikotUrl from "/Trikot.svg?url";

const CANVAS_W = 430;
const CANVAS_H = 932;

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
  onDone?: () => void;
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [rawSvg, setRawSvg] = useState("");
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

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

  /* -------------------- 2) PROCESS SVG STRING (IMPORTANT) -------------------- */
  const processedSvg = useMemo(() => {
    if (!rawSvg) return "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return rawSvg;

    // helper: paint any element with shapes inside
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

    // Find active pattern id from theme.visibility
    const activePatternBase =
      Object.entries(theme.visibility).find(([, v]) => v)?.[0] ?? null;

    // Collect ALL nodes whose id starts with layer-muster-
    // (handles Illustrator suffix ids like layer-muster-1_000000)
    const patternNodes = Array.from(svg.querySelectorAll<SVGElement>("[id]")).filter(
      (n) => n.id.startsWith("layer-muster-")
    );

    // Keep only the active pattern (prefix match), remove all others
    patternNodes.forEach((node) => {
      const keep =
        activePatternBase &&
        (node.id === activePatternBase || node.id.startsWith(activePatternBase + "_"));

      if (!keep) {
        node.parentNode?.removeChild(node);
      }
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
      for (let i = 0; i < 60; i++) {
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

  /* -------------------- 4) SAVE EVERYWHERE -------------------- */
  const saveEverywhere = async (blob: Blob, fileName: string) => {
    const file = new File([blob], fileName, { type: "image/png" });

    // Share sheet first (best on iOS/Android)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "2nd May, 8pm" });
        return;
      } catch {}
    }

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // iOS fallback
    setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 250);
  };

  /* -------------------- 5) EXPORT -------------------- */
  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const node = exportRef.current;
      if (!node) throw new Error("Missing export node");

      if (document.fonts?.ready) await document.fonts.ready;

      node.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f1f2f2",
      });

      if (!blob) throw new Error("Export failed");

      await saveEverywhere(blob, `invitation-shirt-${answers.name || "export"}.png`);
      onDone?.();
    } catch (e) {
      console.error(e);
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* -------------------- RENDER -------------------- */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f1f2f2",
        display: "grid",
        placeItems: "center",
        fontFamily: "Satoshi",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 12 }}>
          {ready ? "Ready to download." : "Preparing your Invitation Shirt…"}
        </div>

        {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}

        <button
          disabled={!ready || exporting}
          onClick={handleExport}
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            border: "none",
            background: ready ? "#111" : "#999",
            color: "#fff",
            fontWeight: 700,
            cursor: ready ? "pointer" : "not-allowed",
          }}
        >
          {exporting ? "Exporting…" : "Download PNG"}
        </button>
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
<div style={{ position: "absolute", top: 18, left: 17, lineHeight: 1.05 }}>
  <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
    <span style={{ fontSize: 34 }}>Hello</span>
    <span style={{ fontSize: 43, fontWeight: 700, fontStyle: "italic" }}>
      {answers.name}
    </span>
  </div>

  <div style={{ fontSize: 34, marginTop: 9 }}>
    Here is your personalised Invitation Shirt
  </div>
</div>

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 588,
                transform: "translateX(-50%)",
                width: 258,
              }}
            >
              <div
                style={{
                  fontFamily: "Saint",
                  fontSize: 172,
                  fontWeight: 700,
                  lineHeight: 1,
                  transform: "translateX(65px)",
                }}
              >
                {answers.age}
              </div>

              <div
                style={{
                  fontFamily: "Satoshi",
                  fontSize: 43,
                  fontStyle: "italic",
                  textAlign: "center",
                  marginTop: 45,
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