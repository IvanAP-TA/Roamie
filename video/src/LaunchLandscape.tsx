import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "./copy";
import { LaunchVideo } from "./LaunchVideo";
import { C, DISPLAY, ramp, SANS } from "./theme";

/**
 * The launch video in 16:9, for the Play Store listing and YouTube: the vertical video plays in a phone on the right,
 * while the left side says what each scene is about. Same length as the vertical one (687 frames ≈ 23 s).
 */
export const LAUNCH_LANDSCAPE_DURATION = 687;

const CAPTIONS: Record<SceneProps["lang"], { from: number; to: number; kicker: string; title: string; em?: string }[]> = {
  en: [
    { from: 0, to: 112, kicker: "The problem", title: "The group chat", em: "never decides." },
    { from: 112, to: 205, kicker: "Step 1", title: "Everyone proposes", em: "their places." },
    { from: 205, to: 298, kicker: "Step 2", title: "Vote with", em: "10 points each." },
    { from: 298, to: 466, kicker: "Step 3", title: "Let the wheel", em: "pick the trip." },
    { from: 466, to: 574, kicker: "Then", title: "Plan it", em: "together." },
    { from: 574, to: 687, kicker: "Free · no app to install", title: "Try it at", em: "roamie.org" },
  ],
  it: [
    { from: 0, to: 112, kicker: "Il problema", title: "La chat di gruppo", em: "non decide mai." },
    { from: 112, to: 205, kicker: "Passo 1", title: "Ognuno propone", em: "le sue mete." },
    { from: 205, to: 298, kicker: "Passo 2", title: "Votate con", em: "10 punti a testa." },
    { from: 298, to: 466, kicker: "Passo 3", title: "La ruota", em: "sceglie il viaggio." },
    { from: 466, to: 574, kicker: "Poi", title: "Organizzate", em: "insieme." },
    { from: 574, to: 687, kicker: "Gratis · niente da installare", title: "Provala su", em: "roamie.org" },
  ],
};

const PHONE_SCALE = 0.48;

export const LaunchLandscape: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const caption = CAPTIONS[lang].find((c) => frame >= c.from && frame < c.to) ?? CAPTIONS[lang][CAPTIONS[lang].length - 1];
  const shown = ramp(frame, caption.from + 2, caption.from + 16) * (1 - ramp(frame, caption.to - 8, caption.to - 1));
  const music = (f: number) => 0.5 * interpolate(f, [0, 12, durationInFrames - 40, durationInFrames - 4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #ff8e6b 0%, #e06a3c 34%, #c24e27 58%, #6e2c44 100%)", fontFamily: SANS, color: C.ink }}>
      <Audio src={staticFile("music/wheel-1-vlog-v2.mp3")} volume={music} />
      <div style={{ position: "absolute", left: 1180, top: 120, width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,231,184,0.55) 0%, rgba(255,231,184,0) 62%)" }} />
      <svg viewBox="0 0 1920 260" style={{ position: "absolute", left: 0, bottom: 0, width: 1920, height: 260 }} preserveAspectRatio="none">
        <path d="M0 80 C 320 20 640 20 960 80 S 1600 140 1920 70 V260 H0 Z" fill="#8e3a4c" opacity=".55" />
        <path d="M0 150 C 320 100 640 100 960 150 S 1600 200 1920 140 V260 H0 Z" fill="#6e2c44" opacity=".85" />
        <path d="M0 210 C 320 175 640 175 960 210 S 1600 245 1920 200 V260 H0 Z" fill="#4f2037" />
      </svg>

      <div style={{ position: "absolute", left: 130, top: 120, display: "flex", alignItems: "center", gap: 18, fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 52 }}>
        <Img src={staticFile("logo.png")} style={{ width: 70, height: 70, borderRadius: 18 }} />
        roamie
      </div>

      <div style={{ position: "absolute", left: 130, top: 360, width: 900, opacity: shown, translate: `0px ${interpolate(shown, [0, 1], [24, 0])}px` }}>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: C.sun }}>{caption.kicker}</div>
        <div style={{ marginTop: 18, fontFamily: DISPLAY, fontWeight: 600, fontSize: 112, lineHeight: 1.02, textShadow: "0 4px 30px rgba(60,20,30,0.35)" }}>
          {caption.title}
          <br />
          <span style={{ fontStyle: "italic", color: C.sun }}>{caption.em}</span>
        </div>
      </div>

      {/* The vertical launch video, inside a phone. */}
      <div
        style={{
          position: "absolute",
          left: 1250,
          top: (1080 - 1920 * PHONE_SCALE) / 2 - 14,
          width: 1080 * PHONE_SCALE + 28,
          height: 1920 * PHONE_SCALE + 28,
          borderRadius: 64,
          background: "#1f1418",
          boxShadow: "0 40px 90px rgba(40,10,20,0.55)",
          padding: 14,
        }}
      >
        <div style={{ width: 1080 * PHONE_SCALE, height: 1920 * PHONE_SCALE, borderRadius: 50, overflow: "hidden", position: "relative" }}>
          <div style={{ width: 1080, height: 1920, transform: `scale(${PHONE_SCALE})`, transformOrigin: "top left", position: "absolute" }}>
            <LaunchVideo lang={lang} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
