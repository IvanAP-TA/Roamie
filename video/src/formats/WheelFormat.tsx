import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CtaScene } from "../scenes/CtaScene";
import { C, DialNeedleAndHub, DialTicks, DISPLAY, labelColor, ramp, SANS, sliceColor, Sky } from "../theme";
import { budgetLabel, Chip, Credits, Hook, monthsLabel, PhotoBackground, Sfx, Soundtrack, useFit, type Lang, type VideoPlace } from "./shared";

export type WheelProps = {
  readonly lang: Lang;
  readonly hook: string;
  readonly spinTitle: string;
  readonly places: readonly VideoPlace[];
  /** Points per place: the slices' sizes */
  readonly points: readonly number[];
  readonly winner: number;
  readonly bestTime: string;
  readonly credits: readonly string[];
  /** Background track in public/music; none = silent */
  readonly music?: string;
};

/** Intro, spin, reveal, end card. 60 + 150 + 105 + 105 − 3 × 10 = 390 frames (13 s). */
export const WHEEL_DURATION = 390;

const R = 380;
/** Pegs around the rim: each one that passes the pointer makes a tick. */
const PEGS = 16;
const spinAngle = (frame: number, end: number) => interpolate(frame, [10, 120], [0, end], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.12, 0.7, 0.18, 1) });

/** The frames where a peg passes the pointer, at most one tick every two frames (the fast start would be a buzz). */
const tickFrames = (end: number) => {
  const frames: number[] = [];
  for (let f = 11; f <= 120; f++) {
    const passed = Math.floor(spinAngle(f, end) / (360 / PEGS)) > Math.floor(spinAngle(f - 1, end) / (360 / PEGS));
    if (passed && (frames.length === 0 || f - frames[frames.length - 1] >= 2)) frames.push(f);
  }
  return frames;
};
const CX = 540;
const CY = 1060;

/** The four places as a 2×2 mosaic under the hook. */
const Intro: React.FC<WheelProps> = ({ hook, places }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 8 }}>
        {places.map((p, i) => (
          <div key={p.name} style={{ position: "relative", overflow: "hidden", opacity: ramp(frame, i * 4, i * 4 + 10) }}>
            <Img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 60], [1.12, 1]) }} />
            <div style={{ position: "absolute", left: 28, bottom: 28, fontFamily: DISPLAY, fontWeight: 600, fontSize: 56, color: C.ink, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>{p.name}</div>
          </div>
        ))}
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,12,0.8) 0%, rgba(20,8,12,0) 45%)" }} />
      <Hook text={hook} top={140} />
    </AbsoluteFill>
  );
};

const slicePath = (from: number, to: number) => {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${CX + R * Math.cos(rad)} ${CY + R * Math.sin(rad)}`;
  };
  return `M ${CX} ${CY} L ${point(from)} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to)} Z`;
};

const WheelLabel: React.FC<{ readonly name: string; readonly mid: number; readonly flip: boolean; readonly arc: number; readonly color: string }> = ({ name, mid, flip, arc, color }) => {
  // The label runs across its slice: the narrower the slice, the smaller it gets.
  const size = useFit(name, Math.min(R * 0.62, arc), 50);
  const y = CY - R * 0.6;
  return (
    <g transform={`rotate(${mid} ${CX} ${CY})`}>
      <text x={CX} y={y} fill={color} fontFamily={DISPLAY} fontWeight={600} fontSize={size} textAnchor="middle" dominantBaseline="middle" transform={flip ? `rotate(180 ${CX} ${y})` : undefined}>
        {name}
      </text>
    </g>
  );
};

/** The wheel: slices sized by points, five turns, the winner under the pointer. Also the story's last word (StoryFormat). */
export const Spin: React.FC<Pick<WheelProps, "spinTitle" | "places" | "points" | "winner">> = ({ spinTitle, places, points, winner }) => {
  const frame = useCurrentFrame();
  const total = points.reduce((a, b) => a + b, 0);
  const slices = points.reduce<{ from: number; to: number }[]>((acc, p) => {
    const from = acc[acc.length - 1]?.to ?? 0;
    return [...acc, { from, to: from + (p / total) * 360 }];
  }, []);
  const winnerCenter = (slices[winner].from + slices[winner].to) / 2;
  const end = 5 * 360 - winnerCenter;
  const rotation = spinAngle(frame, end);
  const landed = ramp(frame, 120, 134);

  return (
    <Sky>
      <Sfx sound="whoosh" />
      {tickFrames(end).map((f) => (
        <Sfx key={f} sound="tick" at={f} />
      ))}
      <Hook text={spinTitle} top={170} />
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <circle cx={CX} cy={CY} r={R + 30} fill={C.paper} />
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <DialTicks cx={CX} cy={CY} r={R} />
          {slices.map((s, i) => (
            <path key={i} d={slicePath(s.from, s.to)} fill={sliceColor(i, slices.length)} stroke={C.paper} strokeWidth={6} opacity={i !== winner ? 1 - 0.35 * landed : 1} />
          ))}
          {slices.map((s, i) => {
            const mid = (s.from + s.to) / 2;
            const rest = (((mid + end) % 360) + 360) % 360;
            // Chord at the label's radius, so the name never crosses into the next slice.
            const arc = 2 * R * 0.6 * Math.sin(((s.to - s.from) * Math.PI) / 360) * 0.9;
            return <WheelLabel key={i} name={places[i].name} mid={mid} flip={rest > 90 && rest < 270} arc={Math.max(arc, 160)} color={labelColor(sliceColor(i, slices.length))} />;
          })}
        </g>
        <DialNeedleAndHub cx={CX} cy={CY} r={R} />
      </svg>
    </Sky>
  );
};

/** The pick, full screen: its photo, name, a true line from the guide, when to go and the budget. */
const Reveal: React.FC<WheelProps> = ({ places, winner, bestTime, lang }) => {
  const frame = useCurrentFrame();
  const place = places[winner];
  const nameSize = useFit(`${place.name}!`, 920, 150);
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <Sfx sound="ding" />
      <PhotoBackground src={place.photo} />
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 230 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: nameSize, lineHeight: 1, color: C.ink, opacity: ramp(frame, 0, 10), scale: interpolate(ramp(frame, 0, 16), [0, 1], [0.8, 1]) }}>{place.name}!</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: C.sun, marginTop: 14, opacity: ramp(frame, 6, 18) }}>{place.country}</div>
        <div style={{ fontSize: 46, lineHeight: 1.3, color: C.ink, marginTop: 26, opacity: ramp(frame, 14, 28) }}>{place.line}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 34 }}>
          <Chip opacity={ramp(frame, 26, 36)}>
            {bestTime}: {monthsLabel(place.months, lang)}
          </Chip>
          <Chip opacity={ramp(frame, 32, 42)}>{budgetLabel(place.budget, lang)}</Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const WheelFormat: React.FC<WheelProps> = (props) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Soundtrack music={props.music} durationInFrames={WHEEL_DURATION} />
      <TransitionSeries>
      <TransitionSeries.Sequence name="Intro" durationInFrames={60} premountFor={fps}>
        <Intro {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Spin" durationInFrames={150} premountFor={fps}>
        <Spin {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Reveal" durationInFrames={105} premountFor={fps}>
        <Reveal {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="End" durationInFrames={105} premountFor={fps}>
        <CtaScene lang={props.lang} share />
        <Credits credits={props.credits} lang={props.lang} />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
