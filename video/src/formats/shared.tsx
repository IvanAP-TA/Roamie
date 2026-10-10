import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, fontsReady, ramp, SANS } from "../theme";

export type Lang = "it" | "en";

/** A place as the automation passes it (see automation/plan.mjs): facts from Roamie's guides. */
export type VideoPlace = {
  readonly name: string;
  readonly country: string;
  readonly photo: string;
  readonly line: string;
  readonly moods: readonly string[];
  readonly budget: 1 | 2 | 3;
  readonly months: readonly number[];
};

const MOODS: Record<Lang, Record<string, string>> = {
  it: { culture: "Cultura", food_wine: "Cibo e vino", nightlife: "Nightlife", relax: "Relax", adventure: "Avventura", nature: "Natura", family: "Famiglia", romantic: "Romantico" },
  en: { culture: "Culture", food_wine: "Food & wine", nightlife: "Nightlife", relax: "Relax", adventure: "Adventure", nature: "Nature", family: "Family", romantic: "Romantic" },
};
export const moodLabel = (mood: string, lang: Lang) => MOODS[lang][mood] ?? mood;

const BUDGET: Record<Lang, string[]> = { it: ["", "Economica", "Nella media", "Cara"], en: ["", "Cheap", "Mid-range", "Pricey"] };
export const budgetLabel = (budget: number, lang: Lang) => `${"€".repeat(budget)} · ${BUDGET[lang][budget]}`;

/** [4, 5, 6, 9, 10] → "apr–giu, set–ott": consecutive months as ranges, in the video's language. */
export function monthsLabel(months: readonly number[], lang: Lang): string {
  const name = (m: number) => new Intl.DateTimeFormat(lang, { month: "short" }).format(new Date(2026, m - 1, 15)).replace(".", "");
  const sorted = [...months].sort((a, b) => a - b);
  const ranges: number[][] = [];
  for (const m of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && m === last[last.length - 1] + 1) last.push(m);
    else ranges.push([m]);
  }
  return ranges.map((r) => (r.length > 1 ? `${name(r[0])}–${name(r[r.length - 1])}` : name(r[0]))).join(", ");
}

/**
 * The largest font size (up to `max`) at which `text` fits on one line of `width` pixels, measured once the fonts
 * are loaded, so no name or hook can run off the screen whatever the automation passes in.
 */
export function useFit(text: string, width: number, max: number, family = DISPLAY, weight = "600"): number {
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender(`Fitting "${text}"`));
  useEffect(() => {
    void fontsReady.then(() => {
      const { fontSize } = fitText({ text, withinWidth: width, fontFamily: family, fontWeight: weight });
      setSize(Math.min(max, Math.floor(fontSize)));
      continueRender(handle);
    });
  }, [text, width, max, family, weight, handle]);
  return size ?? max;
}

/** A full-bleed photo with a slow push-in and a dark gradient at the bottom for the text. */
export const PhotoBackground: React.FC<{ readonly src: string; readonly zoom?: number }> = ({ src, zoom = 0.08 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 150], [1, 1 + zoom], { extrapolateRight: "clamp" }) }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,12,0.55) 0%, rgba(20,8,12,0) 30%, rgba(20,8,12,0) 45%, rgba(20,8,12,0.88) 100%)" }} />
    </AbsoluteFill>
  );
};

/** A pill of text, as in the app. */
export const Chip: React.FC<{ readonly children: React.ReactNode; readonly opacity?: number; readonly dark?: boolean }> = ({ children, opacity = 1, dark = false }) => (
  <span
    style={{
      opacity,
      fontFamily: SANS,
      fontSize: 38,
      fontWeight: 600,
      background: dark ? "rgba(20,8,12,0.55)" : C.paper,
      color: dark ? C.ink : C.dark,
      borderRadius: 999,
      padding: "12px 28px",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** The hook: one or two lines, big, the first thing anyone sees. */
export const Hook: React.FC<{ readonly text: string; readonly at?: number; readonly top?: number }> = ({ text, at = 0, top = 180 }) => {
  const frame = useCurrentFrame();
  const shown = ramp(frame, at, at + 12);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 80,
        right: 80,
        fontFamily: DISPLAY,
        fontWeight: 600,
        fontSize: 92,
        lineHeight: 1.05,
        color: C.ink,
        textShadow: "0 4px 30px rgba(0,0,0,0.35)",
        opacity: shown,
        translate: `0px ${interpolate(shown, [0, 1], [30, 0])}px`,
      }}
    >
      {text}
    </div>
  );
};

/** Who took the photos (CC licences ask for it), small at the bottom of the last scene. */
export const Credits: React.FC<{ readonly credits: readonly string[]; readonly lang: Lang }> = ({ credits, lang }) => (
  <div style={{ position: "absolute", bottom: 70, left: 80, right: 80, textAlign: "center", fontFamily: SANS, fontSize: 24, lineHeight: 1.35, color: "rgba(255,248,241,0.6)" }}>
    {lang === "it" ? "Foto" : "Photos"}: {credits.join(" · ")} · Wikimedia Commons
  </div>
);
