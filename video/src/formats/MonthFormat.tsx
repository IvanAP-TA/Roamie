import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CtaScene } from "../scenes/CtaScene";
import { C, DISPLAY, ramp, SANS } from "../theme";
import { budgetLabel, Chip, Credits, Hook, moodLabel, PhotoBackground, Sfx, Soundtrack, useFit, type Lang, type VideoPlace } from "./shared";

export type MonthProps = {
  readonly lang: Lang;
  readonly hook: string;
  readonly places: readonly VideoPlace[];
  readonly credits: readonly string[];
  /** Background track in public/music; none = silent */
  readonly music?: string;
};

/** Intro, three places, end card. 60 + 3 × 90 + 105 − 4 × 10 = 395 frames (13 s). */
export const MONTH_DURATION = 395;

/** The hook over the three photos stacked as strips. */
const Intro: React.FC<MonthProps> = ({ hook, places }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 8 }}>
        {places.map((p, i) => (
          <div key={p.name} style={{ overflow: "hidden", opacity: ramp(frame, i * 5, i * 5 + 12) }}>
            <Img src={p.photo} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 60], [1.1, 1]) }} />
          </div>
        ))}
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,12,0.85) 0%, rgba(20,8,12,0.2) 55%, rgba(20,8,12,0) 100%)" }} />
      <Hook text={hook} top={160} />
    </AbsoluteFill>
  );
};

/** One place: number, name, country, the guide's line, moods and budget. */
const PlaceCard: React.FC<{ readonly place: VideoPlace; readonly index: number; readonly lang: Lang }> = ({ place, index, lang }) => {
  const frame = useCurrentFrame();
  const nameSize = useFit(place.name, 920, 130);
  return (
    <AbsoluteFill style={{ fontFamily: SANS }}>
      <Sfx sound="whoosh" />
      <PhotoBackground src={place.photo} />
      <div style={{ position: "absolute", left: 80, right: 80, bottom: 220 }}>
        <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 90, color: C.sun, opacity: ramp(frame, 0, 10) }}>{index + 1}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: nameSize, lineHeight: 1, color: C.ink, opacity: ramp(frame, 4, 14), translate: `0px ${interpolate(ramp(frame, 4, 18), [0, 1], [30, 0])}px` }}>
          {place.name}
        </div>
        <div style={{ fontSize: 40, fontWeight: 600, color: C.sun, marginTop: 12, opacity: ramp(frame, 8, 18) }}>{place.country}</div>
        <div style={{ fontSize: 44, lineHeight: 1.3, color: C.ink, marginTop: 22, opacity: ramp(frame, 14, 28) }}>{place.line}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
          {place.moods.slice(0, 2).map((m, i) => (
            <Chip key={m} opacity={ramp(frame, 24 + i * 4, 34 + i * 4)}>
              {moodLabel(m, lang)}
            </Chip>
          ))}
          <Chip opacity={ramp(frame, 32, 42)}>{budgetLabel(place.budget, lang)}</Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MonthFormat: React.FC<MonthProps> = (props) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Soundtrack music={props.music} durationInFrames={MONTH_DURATION} />
      <TransitionSeries>
      <TransitionSeries.Sequence name="Intro" durationInFrames={60} premountFor={fps}>
        <Intro {...props} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Place 1" durationInFrames={90} premountFor={fps}>
        <PlaceCard place={props.places[0]} index={0} lang={props.lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Place 2" durationInFrames={90} premountFor={fps}>
        <PlaceCard place={props.places[1]} index={1} lang={props.lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 10 })} />
      <TransitionSeries.Sequence name="Place 3" durationInFrames={90} premountFor={fps}>
        <PlaceCard place={props.places[2]} index={2} lang={props.lang} />
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
