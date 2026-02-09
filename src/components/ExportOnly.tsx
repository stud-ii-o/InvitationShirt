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

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  // 1) Load SVG
  useEffect(() => {
    fetch(trikotUrl)
      .then((r) => r.text())
      .then(setSvgText)
      .catch((e) => console.error("Failed to load SVG:", e));
  }, []);

  // 2) Apply theme to injected SVG
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const svg = wrap.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    const paintGroup = (group: Element, color: string) => {
      const nodes = group.querySelectorAll<SVGElement>(
        "path, rect, circle, polygon, ellipse"
      );
      nodes.forEach((el) => {
        el.setAttribute("fill", color);
        (el as any).style.fill = color;
      });
    };

    for (const [layerId, color] of Object.entries(theme.fills)) {
      const g = svg.getElementById(layerId) as SVGGElement | null;
      if (!g) continue;
      paintGroup(g, color);
    }

    for (const [layerId, visible] of Object.entries(theme.visibility)) {
      const g = svg.getElementById(layerId) as SVGGElement | null;
      if (!g) continue;
      (g as any).style.display = visible ? "" : "none";
    }
  }, [svgText, theme]);

  // 3) Export once when everything is actually rendered
  useEffect(() => {
    if (!svgText) return;

    const run = async () => {
      const node = exportRef.current;
      if (!node) return;

      // Wait until SVG exists in the export node
      const waitForSvg = async () => {
        for (let i = 0; i < 60; i++) {
          if (node.querySelector("svg")) return true;
          await new Promise((r) => requestAnimationFrame(r));
        }
        return false;
      };

      const ok = await waitForSvg();
      if (!ok) {
        console.error("Export aborted: SVG never appeared in DOM");
        return;
      }

      // Wait for fonts + 2 paint frames
  // Wait for fonts (iOS needs explicit loads) + force layout + 2 paint frames
if (document.fonts?.ready) await document.fonts.ready;

const uiVar = getComputedStyle(document.documentElement)
  .getPropertyValue("--font-ui")
  .trim();

const nameVar = getComputedStyle(document.documentElement)
  .getPropertyValue("--font-name")
  .trim();

// take the first font name from the var (handles '"Font", serif' cases)
const firstFont = (v: string) =>
  v
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");

const uiFont = firstFont(uiVar || "system-ui");
const nameFont = firstFont(nameVar || "system-ui");

// Explicitly load the exact faces/sizes used in the export
try {
  await document.fonts.load(`200 34px "${uiFont}"`);
  await document.fonts.load(`700 43px "${uiFont}"`);
  await document.fonts.load(`700 172px "${nameFont}"`);
} catch (e) {
  console.warn("Font load warning:", e);
}

// Force a reflow so iOS actually applies the font before rasterizing
node.getBoundingClientRect();

// Extra settle frames
await new Promise((r) => requestAnimationFrame(r));
await new Promise((r) => requestAnimationFrame(r));

      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f1f2f2",
      });

      if (!blob) {
        console.error("Export failed: blob is null");
        return;
      }

      const fileName = `invitation-shirt-${answers.name || "export"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // Mobile: share sheet if available
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Invitation Shirt" });
          onDone?.();
          return;
        } catch {
          // fall back to download
        }
      }

      // Download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      onDone?.();
    };

    run();
  }, [svgText, answers.name, onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f1f2f2",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div>Preparing your Invitation Shirt…</div>

      {/* Invisible-but-rendered export layer (must be IN viewport) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {/* This is the exact canvas we export */}
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

          {/* TEXT OVERLAY (px-based) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              fontFamily: "var(--font-ui)",
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
                fontFamily: "var(--font-name)",
                fontSize: 172,
                lineHeight: 1,
                textAlign: "left",
                transform: "translateX(65px)",
              }}
            >
              {answers.age}
            </div>

            <div
              style={{
                fontFamily: "var(--font-ui)",
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