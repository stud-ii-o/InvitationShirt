import { useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";
import { toBlob } from "html-to-image";
import trikotUrl from "/Trikot.svg?url";

const CANVAS_W = 430;
const CANVAS_H = 932;

export default function ExportOnly({
  answers,
  onDone,
}: {
  answers: Answers;
  onDone?: () => void;
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState("");
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  // 1) Load SVG + bake theme & visibility directly into SVG string
useEffect(() => {
  const bakeSvg = (raw: string) => {
    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return raw;

    const paintGroup = (group: Element, color: string) => {
      const nodes = group.querySelectorAll<SVGElement>(
        "path, rect, circle, polygon, ellipse"
      );
      nodes.forEach((el) => {
        el.setAttribute("fill", color);
        (el as any).style.fill = color;
      });
    };

    // Apply fills
    for (const [layerId, color] of Object.entries(theme.fills)) {
      const g = svg.querySelector(`#${CSS.escape(layerId)}`);
      if (!g) continue;
      paintGroup(g, color);
    }

    // Remove ALL inactive pattern layers (hard remove)
    for (const [layerId, visible] of Object.entries(theme.visibility)) {
      const g = svg.querySelector(`#${CSS.escape(layerId)}`);
      if (!g) continue;
      if (!visible) g.remove();
    }

    return new XMLSerializer().serializeToString(doc);
  };

  fetch(trikotUrl)
    .then((r) => r.text())
    .then((raw) => setSvgText(bakeSvg(raw)))
    .catch((e) => {
      console.error("Failed to load SVG:", e);
      setError("Could not load the shirt template.");
    });
}, [trikotUrl, theme]);

// 3) Mark as ready once SVG exists in DOM + fonts likely available
useEffect(() => {
  if (!svgText) return;

  const run = async () => {
    const node = exportRef.current;
    if (!node) return;

    // wait until SVG is in DOM
    for (let i = 0; i < 60; i++) {
      if (node.querySelector("svg")) break;
      await new Promise((r) => requestAnimationFrame(r));
    }

    // Ensure fonts (Safari)
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await document.fonts.load('200 34px "Satoshi"');
      await document.fonts.load('700 italic 43px "Satoshi"');
      await document.fonts.load('700 normal 172px "Saint"');
      if (document.fonts?.ready) await document.fonts.ready;
    } catch {
      console.warn("Font load warning");
    }

    // settle frames
    node.getBoundingClientRect();
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    setReady(true);
  };

  run();
}, [svgText]);

  const saveBlobEverywhere = async (blob: Blob, fileName: string) => {
    // Best on mobile: share sheet (iOS + Android where supported)
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "2nd May, 8PM" });
        return "shared";
      } catch {
        // ignore and fallback
      }
    }

    const url = URL.createObjectURL(blob);

    // Try normal download (works on many desktop + some Android browsers)
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();

    // On iOS / some mobile browsers download attribute may be ignored.
    // Open in new tab so the user can "Save Image".
    // (Do this only if download likely did nothing)
    setTimeout(() => {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        // If popup blocked, at least keep url alive briefly
      }
      // revoke later (keep enough time for new tab)
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, 250);

    return "downloaded";
  };

  const handleExportClick = async () => {
    setError(null);
    setExporting(true);

    try {
      const node = exportRef.current;
      if (!node) throw new Error("Export node missing");

      // Ensure fonts (again) right before snapshot
      try {
        if (document.fonts?.ready) await document.fonts.ready;
        await document.fonts.load('200 34px "Satoshi"');
        await document.fonts.load('700 italic 43px "Satoshi"');
        await document.fonts.load('700 italic 172px "Saint"');
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {}

      node.getBoundingClientRect();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f1f2f2",
      });

      if (!blob) throw new Error("Blob is null");

      const fileName = `invitation-shirt-${answers.name || "export"}.png`;
      await saveBlobEverywhere(blob, fileName);

      onDone?.();
    } catch (e: any) {
      console.error(e);
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

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
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 16, marginBottom: 10 }}>
          {ready ? "Ready to download." : "Preparing your Invitation Shirt…"}
        </div>

        {error && (
          <div style={{ color: "#b00020", fontSize: 14, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleExportClick}
          disabled={!ready || exporting}
          style={{
            width: 240,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.2)",
            background: !ready || exporting ? "rgba(0,0,0,0.15)" : "#111",
            color: "#fff",
            fontWeight: 700,
            cursor: !ready || exporting ? "not-allowed" : "pointer",
          }}
        >
          {exporting ? "Exporting…" : "Download PNG"}
        </button>
      </div>

      {/* Invisible-but-rendered export layer (must be IN viewport) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity: 0.01, // important: iOS needs it not fully invisible
          pointerEvents: "none",
        }}
      >
        <div
          ref={exportRef}
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            position: "relative",
            overflow: "hidden",
            background: "#f1f2f2",
          }}
        >
          {/* SVG */}
          <div
            ref={wrapRef}
            style={{ position: "absolute", inset: 0 }}
            dangerouslySetInnerHTML={{ __html: svgText }}
          />

          {/* TEXT OVERLAY */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              fontFamily: "Satoshi",
              fontWeight: 200,
              color: "#000",
            }}
          >
            <div style={{ position: "absolute", top: 18, left: 17, lineHeight: 1.05 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                <span style={{ fontSize: 34 }}>Hello</span>
                <span style={{ fontSize: 43, fontStyle: "italic", fontWeight: 700 }}>
                  {answers.name}
                </span>
              </div>

              <div style={{ fontSize: 34, marginTop: 9 }}>
                Here is your personalised Invitation Shirt
              </div>
            </div>
          </div>

          {/* BACK PRINT */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 588,
              transform: "translateX(-50%)",
              width: 258,
              pointerEvents: "none",
              color: "#000",
            }}
          >
            <div
              style={{
                fontFamily: "Saint",
                fontSize: 172,
                fontStyle: "normal",
                fontWeight: 700,
                lineHeight: 1,
                textAlign: "left",
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
                lineHeight: 3.5,
                textAlign: "center",
                marginBottom: 9,
              }}
            >
              {answers.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}