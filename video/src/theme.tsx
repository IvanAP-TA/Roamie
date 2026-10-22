import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInstrument } from "@remotion/google-fonts/InstrumentSans";
import type React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";

const fraunces = loadFraunces("normal", { weights: ["600"], subsets: ["latin", "latin-ext"] });
const frauncesItalic = loadFraunces("italic", { weights: ["600"], subsets: ["latin", "latin-ext"] });
const instrument = loadInstrument("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });

/** Resolves once every font is loaded: text is measured (useFit) only after that. */
export const fontsReady = Promise.all([fraunces.waitUntilDone(), frauncesItalic.waitUntilDone(), instrument.waitUntilDone()]);

export const DISPLAY = fraunces.fontFamily;
export const SANS = instrument.fontFamily;

/** Roamie's sunset palette (src/index.css and the story cards in the app). */
export const C = {
  ink: "#fff8f1",
  muted: "rgba(255, 248, 241, 0.72)",
  sun: "#ffd08a",
  coral: "#ff7a5c",
  primary: "#c24e27",
  dusk: "#6b4a6e",
  night: "#1f1418",
  paper: "#fffaf3",
  dark: "#2b1d17",
};

export const SLICES = ["#ff7a5c", "#f4a950", "#6b4a6e", "#c24e27", "#3f7a78"];

// ── The wheel as a sunset dial, the same as the app's (src/components/roulette/RouletteWheel.tsx) ──
const SUNSET = ["#f4a950", "#ff7a5c", "#c24e27", "#8e3a4c", "#6b4a6e"];
const PAPER_RGB = [255, 250, 243];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** The sunset run once around the wheel, every other slice a lighter tint: as in the app. */
export function sliceColor(index: number, count: number): string {
  const t = count > 1 ? (index / count) * (SUNSET.length - 1) : 0;
  const from = Math.floor(t);
  const tone = mix(rgb(SUNSET[from]), rgb(SUNSET[Math.min(from + 1, SUNSET.length - 1)]), t - from);
  return toHex(index % 2 === 1 && count > 1 ? mix(tone, PAPER_RGB, 0.38) : tone);
}

/** Ink or paper, whichever reads better on a slice. */
export function labelColor(fill: string): string {
  const [r, g, b] = rgb(fill).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.36 ? C.dark : C.ink;
}

const dialPoint = (cx: number, cy: number, deg: number, radius: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)] as const;
};

/** The paper bezel's fine ticks, like a compass (inside the turning group, so they turn with the wheel). */
export const DialTicks: React.FC<{ readonly cx: number; readonly cy: number; readonly r: number }> = ({ cx, cy, r }) => (
  <>
    {Array.from({ length: 72 }, (_, i) => {
      const major = i % 6 === 0;
      const [x1, y1] = dialPoint(cx, cy, i * 5, r + 6);
      const [x2, y2] = dialPoint(cx, cy, i * 5, r + (major ? 22 : 15));
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(43,29,23,0.3)" strokeWidth={major ? 3.5 : 1.8} strokeLinecap="round" />;
    })}
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(43,29,23,0.12)" strokeWidth={2} />
  </>
);

/** The needle at the top and the hub with its compass point: the still parts of the dial. */
export const DialNeedleAndHub: React.FC<{ readonly cx: number; readonly cy: number; readonly r: number }> = ({ cx, cy, r }) => {
  const tip = cy - r + 40;
  const top = cy - r - 78;
  return (
    <>
      <circle cx={cx} cy={cy} r={86} fill={C.paper} stroke="rgba(43,29,23,0.12)" strokeWidth={2} />
      <path d={`M ${cx} ${cy - 46} L ${cx + 14} ${cy} L ${cx} ${cy + 46} L ${cx - 14} ${cy} Z`} fill={C.primary} />
      <path d={`M ${cx} ${cy - 46} L ${cx + 14} ${cy} L ${cx} ${cy} Z`} fill="rgba(255,255,255,0.25)" />
      <circle cx={cx} cy={cy} r={8} fill={C.paper} />
      <path d={`M ${cx} ${tip} L ${cx - 30} ${top + 46} L ${cx} ${top} L ${cx + 30} ${top + 46} Z`} fill={C.dark} />
      <path d={`M ${cx} ${tip} L ${cx} ${top} L ${cx + 30} ${top + 46} Z`} fill="rgba(255,255,255,0.12)" />
      <circle cx={cx} cy={top + 46} r={15} fill={C.paper} />
      <circle cx={cx} cy={top + 46} r={7} fill={C.primary} />
    </>
  );
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Ease used for most entrances: fast in, soft landing. */
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 between two frames, clamped and eased. */
export const ramp = (frame: number, from: number, to: number, easing = OUT) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** The sky behind every scene: night at the top, sunset at the bottom, a soft sun and two layers of hills. */
export const Sky: React.FC<{ readonly children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #1f1418 0%, #5a2a45 45%, #b8475a 80%, #ff8a65 100%)", fontFamily: SANS, color: C.ink }}>
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 900,
        right: -260,
        top: 120,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,241,201,0.45) 0%, rgba(255,241,201,0) 65%)",
      }}
    />
    <svg viewBox="0 0 1080 420" style={{ position: "absolute", bottom: 0, width: 1080, height: 420 }}>
      <path d="M0 180 C 220 60 380 70 560 170 S 900 90 1080 150 V420 H0 Z" fill="rgba(122,42,69,0.55)" />
      <path d="M0 300 C 260 200 420 230 620 300 S 940 250 1080 290 V420 H0 Z" fill="rgba(60,22,38,0.75)" />
    </svg>
    {children}
  </AbsoluteFill>
);

/** A big scene title near the top. */
export const Title: React.FC<{ readonly children: React.ReactNode; readonly frame: number; readonly at?: number; readonly top?: number; readonly size?: number }> = ({
  children,
  frame,
  at = 0,
  top = 200,
  size = 96,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 90,
      right: 90,
      fontFamily: DISPLAY,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.04,
      letterSpacing: -1,
      opacity: ramp(frame, at, at + 14),
      translate: `0px ${interpolate(ramp(frame, at, at + 18), [0, 1], [40, 0])}px`,
    }}
  >
    {children}
  </div>
);
