import { useEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";

export default function ShirtPreview({ answers }: { answers: Answers }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState("");

  // Theme aus Textlänge berechnen
  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  // SVG laden (empfohlen: public/Trikot.svg)
  useEffect(() => {
    fetch("/Trikot.svg")
      .then((r) => r.text())
      .then(setSvgText)
      .catch((e) => {
        console.error("Failed to load SVG:", e);
      });
  }, []);

  // Theme anwenden sobald SVG da ist
useEffect(() => {
  const wrap = wrapRef.current;
  if (!wrap) return;

  const svg = wrap.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return;

  // Hilfsfunktion: überschreibt Fill wirklich überall
  const paintGroup = (group: Element, color: string) => {
    const nodes = group.querySelectorAll<SVGElement>("path, rect, circle, polygon, ellipse");
    nodes.forEach((el) => {
      el.setAttribute("fill", color);
      (el as any).style.fill = color; // <-- überschreibt inline style
    });
  };

  // fills
  for (const [layerId, color] of Object.entries(theme.fills)) {
    const g = svg.getElementById(layerId) as SVGGElement | null;
    if (!g) continue;
    paintGroup(g, color);
  }

  // visibility
  for (const [layerId, visible] of Object.entries(theme.visibility)) {
    const g = svg.getElementById(layerId) as SVGGElement | null;
    if (!g) continue;
    (g as any).style.display = visible ? "" : "none";
  }
}, [svgText, theme]);

  return (
    <div
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

      {/* TEXT OVERLAY full screen (DEIN LAYOUT) */}
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

      {/* BACK PRINT (DEIN LAYOUT) */}
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
    </div>
  );
}