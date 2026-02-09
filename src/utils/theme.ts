import type { Theme } from "../types";

/* ---------- helpers ---------- */

function normalizeNote(note: string) {
  return note.replace(/\s+/g, " ").trim();
}

function normalizedLength(note: string) {
  return note.replace(/\s+/g, "").length;
}

function hashStringUint32(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mix32(x: number) {
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

// deterministic RNG from a uint32 seed
function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickShuffled<T>(arr: T[], seed: number) {
  // Fisher–Yates shuffle with deterministic RNG, pick first
  const a = arr.slice();
  const r = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a[0];
}

/* ---------- theme logic ---------- */

export function buildThemeFromNote(note: string): Theme {
  const n = normalizeNote(note);
  const cleanLength = normalizedLength(n);
  const seed = hashStringUint32(n);

  const sub = (salt: number) => {
    const s = Math.imul(salt >>> 0, 0x85ebca6b) >>> 0;
    return mix32((seed ^ 0x9e3779b9 ^ s) >>> 0);
  };

  // NOTE: second sleeve entry in your code was invalid (two rgba strings in one string).
  // Use a real palette of valid single color strings:
  const sleeveColors = [
    "rgba(255, 255, 255, 0.6)",
    "rgba(163, 165, 167, 0.6)",
    "rgba(0, 0, 0, 0)"
  ];

  const collarColors = ["#7415e6", "#ffff00", "#005614", "#ff0037"];
  const sideColors   = ["#7415e6", "#ffff00", "#005614", "#ff0037"];
  const middleColors = ["rgba(255, 255, 255, 0)"];

  // Pick via shuffled-bag (more even distribution across notes)
  const sleeve = pickShuffled(sleeveColors, sub(101));
  const collar = pickShuffled(collarColors, sub(202));
  const side   = pickShuffled(sideColors,   sub(303));
  const middle = pickShuffled(middleColors, sub(404));

  const patternOn = cleanLength > 2;
  const patternIndex = sub(6) & 3;

  const visibility: Record<string, boolean> = {
    "layer-muster-1": false,
    "layer-muster-2": false,
    "layer-muster-3": false,
    "layer-muster-4": false,
  };

  if (patternOn) visibility[`layer-muster-${patternIndex + 1}`] = true;

  return {
    fills: {
      "layer-aermel": sleeve,
      "layer-kragen": collar,
      "layer-seiten": side,
      "layer-mitte": middle,
    },
    visibility,
  };
}