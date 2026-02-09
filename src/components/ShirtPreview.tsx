import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Answers } from "../types";
import { buildThemeFromNote } from "../utils/theme";
import { toPng } from "html-to-image";
import trikotUrl from "/Trikot.svg?url";

const CANVAS_W = 430;
const CANVAS_H = 932;

export default function ShirtPreview({ answers }: { answers: Answers }) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [svgText, setSvgText] = useState("");
  const [scale, setScale] = useState(1);

  const theme = useMemo(() => buildThemeFromNote(answers.note), [answers.note]);

  // Fit fixed canvas (430×932) into viewport
  useLayoutEffect(() => {
    const update = () => {
      const padding = 24;

      // optional safe-area vars (set in CSS)
      const top =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--sat")
        ) || 0;
      const bottom =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--sab")
        ) || 0;

      const vw = window.innerWidth - padding * 2;
      const vh = window.innerHeight - padding * 2 - top - bottom;

      const s = Math.min(vw / CANVAS_W, vh / CANVAS_H);
      setScale(s);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Load SVG
  useEffect(() => {
    fetch(trikotUrl)
      .then((r) => r.text())
      .then(setSvgText)
      .catch((e) => console.error("Failed to load SVG:", e));
  }, []);

  // Apply theme to injected SVG
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

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    // hide elements marked noexport
    const hidden: Array<{ el: HTMLElement; prev: string }> = [];
    node.querySelectorAll<HTMLElement>("[data-noexport]").forEach((el) => {
      hidden.push({ el, prev: el.style.display });
      el.style.display = "none";
    });

    // export at scale(1) so image is stable
    const oldTransform = node.style.transform;
    node.style.transform = "scale(1)";

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#f1f2f2",
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `invitation-shirt-${answers.name || "export"}.png`;
      a.click();
    } finally {
      node.style.transform = oldTransform;
      hidden.forEach(({ el, prev }) => (el.style.display = prev));
    }
  }

  return (
    // STAGE
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(163,165,167,0.15)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {/* CANVAS (fixed 430×932, scaled only) */}
      <div
        ref={exportRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "relative",
          overflow: "hidden",
          background: "#f1f2f2",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* SVG */}
        <div
          ref={wrapRef}
          style={{ position: "absolute", inset: 0 }}
          dangerouslySetInnerHTML={{ __html: svgText }}
        />

        {/* TEXT OVERLAY (px = stable across devices) */}
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
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 24,
              lineHeight: 1.05,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 34 }}>Hello</span>
              <span
                style={{
                  fontSize: 43,
                  fontStyle: "italic",
                  fontWeight: 700,
                }}
              >
                {answers.name}
              </span>
            </div>

            <div style={{ fontSize: 34, marginTop: 10 }}>
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
              marginBottom: 10,
            }}
          >
            {answers.name}
          </div>
        </div>

        {/* EXPORT BUTTON */}
        <button
          data-noexport
          onClick={handleExportPng}
          style={{
            position: "absolute",
            left: 16,
            bottom: 14,
            zIndex: 9999,
            padding: "5px 15px",
            borderRadius: 15,
            border: "1px solid rgba(0,0,0,1)",
            background: "rgba(255,255,255,0.63)",
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
          }}
        >
          save png
        </button>
      </div>
    </div>
  );
}