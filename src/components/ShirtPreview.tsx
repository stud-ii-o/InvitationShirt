import { useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";
import { toPng } from "html-to-image";

export default function ShirtPreview({ answers }: { answers: Answers }) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState("");

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}Trikot.svg`)
      .then((r) => r.text())
      .then(setSvgText)
      .catch((e) => console.error("Failed to load SVG:", e));
  }, []);

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

  async function handleExportPng() {
    const node = exportRef.current;
    if (!node) return;

    // Optional: ensure fonts are loaded before rendering
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }

    // Higher pixel ratio = sharper PNG (good for sharing/printing)
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "rgba(163, 165, 167, 0.15)", // match your background
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `invitation-shirt-${answers.name || "export"}.png`;
    a.click();
  }

  return (
    <div
      ref={exportRef}
      style={{
        position: "fixed",
        inset: 0,
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "rgba(163, 165, 167, 0.15)",
      }}
    >
      {/* SVG full screen */}
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
          fontFamily: "var(--font-ui)",
          fontWeight: 200,
          color: "rgba(0, 0, 0)",
        }}
      >
        <div style={{ position: "absolute", top: "2vh", left: "4vw", lineHeight: 1.05 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "2vw" }}>
            <span style={{ fontSize: "8vw" }}>Hello</span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "10vw",
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              {answers.name}
            </span>
          </div>

          <div style={{ fontSize: "8vw", marginTop: "1vh" }}>
            Here is your personalised Invitation Shirt
          </div>
        </div>
      </div>

      {/* BACK PRINT */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "63%",
          transform: "translateX(-50%)",
          width: "60%",
          pointerEvents: "none",
          color: "#000000ff",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-name)",
            fontSize: "40vw",
            lineHeight: 1,
            textAlign: "left",
            letterSpacing: "0em",
            transform: "translateX(15vw)",
          }}
        >
          {answers.age}
        </div>

        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "10vw",
            fontStyle: "italic",
            lineHeight: 3.5,
            textAlign: "center",
            marginBottom: "1vh",
          }}
        >
          {answers.name}
        </div>
      </div>

      {/* EXPORT BUTTON (clickable) */}
      <button
        onClick={handleExportPng}
        style={{
          position: "fixed",
          fontFamily: "var(--font-ui)",
          left: 16,
          bottom: 14,
          zIndex: 9999,
          padding: "5px 15px",
          borderRadius: 15,
          border: "1px solid rgba(0, 0, 0, 1)",
          background: "rgba(255, 255, 255, 0.63)",
          cursor: "pointer",
        }}
      >
        save png
      </button>
    </div>
  );
}