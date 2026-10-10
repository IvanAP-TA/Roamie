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
