import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CtaScene } from "../scenes/CtaScene";
import { C, DISPLAY, ramp, SANS } from "../theme";
import { budgetLabel, Credits, Hook, monthsLabel, moodLabel, Sfx, Soundtrack, useFit, type Lang, type VideoPlace } from "./shared";

export type VersusProps = {
  readonly lang: Lang;
  readonly hook: string;
  readonly a: VideoPlace;
  readonly b: VideoPlace;
  /** Row labels: budget, best time, vibe */
  readonly rows: readonly [string, string, string];
  readonly question: string;
  readonly credits: readonly string[];
  /** Background track in public/music; none = silent */
  readonly music?: string;
};

/** Split + rows, question, end card. 210 + 75 + 105 − 2 × 10 = 370 frames (12 s). */
export const VERSUS_DURATION = 370;

const Half: React.FC<{ readonly place: VideoPlace; readonly side: "top" | "bottom" }> = ({ place, side }) => {
  const frame = useCurrentFrame();
  const nameSize = useFit(place.name, 900, 110);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, height: 960, [side]: 0, overflow: "hidden" }}>
      <Img src={place.photo} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 210], [1.12, 1]) }} />
      <AbsoluteFill style={{ background: side === "top" ? "linear-gradient(180deg, rgba(20,8,12,0.35), rgba(20,8,12,0.75))" : "linear-gradient(0deg, rgba(20,8,12,0.35), rgba(20,8,12,0.75))" }} />
      <div style={{ position: "absolute", left: 80, right: 80, [side === "top" ? "top" : "bottom"]: 140, color: C.ink }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: nameSize, lineHeight: 1 }}>{place.name}</div>
        <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 600, color: C.sun, marginTop: 8 }}>{place.country}</div>
      </div>
    </div>
  );
};

/** The two places split top/bottom, "VS" in the middle, then the comparison rows appear over each half. */
const Compare: React.FC<VersusProps> = ({ hook, a, b, rows, lang }) => {
  const frame = useCurrentFrame();
  const facts = (p: VideoPlace) => [budgetLabel(p.budget, lang), monthsLabel(p.months, lang), p.moods.slice(0, 2).map((m) => moodLabel(m, lang)).join(" · ")];
  const Row: React.FC<{ readonly place: VideoPlace; readonly top: number }> = ({ place, top }) => (
    <div style={{ position: "absolute", left: 80, right: 80, top, display: "flex", flexDirection: "column", gap: 14 }}>
      {facts(place).map((value, i) => (
        <div
          key={rows[i]}
          style={{
            opacity: ramp(frame, 60 + i * 18, 72 + i * 18),
            translate: `${interpolate(ramp(frame, 60 + i * 18, 76 + i * 18), [0, 1], [-40, 0])}px 0px`,
            fontFamily: SANS,
            fontSize: 40,
            color: C.ink,
            background: "rgba(20,8,12,0.55)",
            borderRadius: 24,
            padding: "12px 24px",
            alignSelf: "flex-start",
          }}
        >
          <span style={{ color: C.sun, fontWeight: 700 }}>{rows[i]}</span> · {value}
        </div>
      ))}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <Half place={a} side="top" />
      <Half place={b} side="bottom" />
      <div
        style={{
          position: "absolute",
          top: 960 - 80,
          left: 540 - 80,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${C.coral}, ${C.primary})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 72,
          color: C.ink,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          scale: interpolate(ramp(frame, 8, 22), [0, 1], [0, 1]),
        }}
      >
        vs
      </div>
      <Row place={a} top={420} />
      <Row place={b} top={1240} />
      <div style={{ opacity: 1 - ramp(frame, 50, 60) }}>
        <Hook text={hook} top={130} />
      </div>
    </AbsoluteFill>
  );
};

/** The question to the viewer: comments are what the algorithm rewards. */
const Question: React.FC<VersusProps> = ({ question, a, b }) => {
  const frame = useCurrentFrame();
  const size = useFit(question, 920, 110);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.night}, #5a2a45 60%, #b8475a)`, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <Sfx sound="whoosh" volume={0.45} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: size, color: C.ink, opacity: ramp(frame, 0, 12), padding: "0 80px" }}>{question}</div>
      <div style={{ display: "flex", gap: 30, marginTop: 50, fontFamily: SANS, fontSize: 52, fontWeight: 700, opacity: ramp(frame, 10, 22) }}>
        <span style={{ background: C.coral, borderRadius: 999, padding: "16px 40px", color: C.ink }}>{a.name}</span>
        <span style={{ background: C.paper, borderRadius: 999, padding: "16px 40px", color: C.dark }}>{b.name}</span>
      </div>
    </AbsoluteFill>
  );
};

export const VersusFormat: React.FC<VersusProps> = (props) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Soundtrack music={props.music} durationInFrames={VERSUS_DURATION} />
      <TransitionSeries>
      <TransitionSeries.Sequence name="Compare" durationInFrames={210} premountFor={fps}>
        <Compare {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Question" durationInFrames={75} premountFor={fps}>
        <Question {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="End" durationInFrames={105} premountFor={fps}>
        <CtaScene lang={props.lang} />
        <Credits credits={props.credits} lang={props.lang} />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
