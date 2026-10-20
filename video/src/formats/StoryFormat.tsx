import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CtaScene } from "../scenes/CtaScene";
import { C, DISPLAY, ramp, SANS, Sky, Title } from "../theme";
import { Credits, Hook, Sfx, Soundtrack, useFit, type Lang, type VideoPlace } from "./shared";

export type StoryProps = {
  readonly lang: Lang;
  readonly hook: string;
  /** The group chat that gets stuck (a hand-written scenario, automation/stories.mjs); the last message is the viewer's. */
  readonly chat: readonly { readonly who: string; readonly text: string }[];
  /** How Roamie gets the group out of it, in two lines. */
  readonly fix: readonly [string, string];
  /** Three places from one guide, each proposed by someone in the chat. */
  readonly places: readonly VideoPlace[];
  readonly by: readonly string[];
  readonly points: readonly number[];
  /** The place with the most points. */
  readonly winner: number;
  readonly labels: { readonly proposedBy: string; readonly points: string; readonly decided: string };
  readonly credits: readonly string[];
  /** Background track in public/music; none = silent */
  readonly music?: string;
};

/** Chat, the way out, the vote, end card. 150 + 60 + 150 + 105 − 3 × 10 = 435 frames (14.5 s). */
export const STORY_DURATION = 435;

/** When each message pops in, in frames from the start of the chat. */
const AT = [22, 42, 60, 78, 100];

/** The hook over the group chat where the trip gets stuck. */
const Chat: React.FC<Pick<StoryProps, "hook" | "chat">> = ({ hook, chat }) => {
  const frame = useCurrentFrame();
  return (
    <Sky>
      <Hook text={hook} top={150} />
      <div style={{ position: "absolute", top: 600, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 24 }}>
        {chat.slice(0, AT.length).map((m, i) => {
          const mine = i === chat.length - 1;
          const shown = ramp(frame, AT[i], AT[i] + 10);
          return (
            <div
              key={`${m.who}-${m.text}`}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: 780,
                opacity: shown,
                scale: interpolate(shown, [0, 1], [0.85, 1]),
                translate: `0px ${interpolate(shown, [0, 1], [30, 0])}px`,
                transformOrigin: mine ? "right bottom" : "left bottom",
                background: mine ? C.coral : "rgba(255,248,241,0.14)",
                borderRadius: 44,
                borderBottomLeftRadius: mine ? 44 : 12,
                borderBottomRightRadius: mine ? 12 : 44,
                padding: "22px 36px",
              }}
            >
              <Sfx sound="tick" at={AT[i]} />
              {!mine && <div style={{ fontSize: 32, fontWeight: 700, color: C.sun, marginBottom: 4 }}>{m.who}</div>}
              <div style={{ fontSize: 50, fontWeight: 500, lineHeight: 1.15 }}>{m.text}</div>
            </div>
          );
        })}
      </div>
    </Sky>
  );
};

/** The turn: what changes with Roamie. */
const Fix: React.FC<Pick<StoryProps, "fix">> = ({ fix }) => {
  const frame = useCurrentFrame();
  return (
    <Sky>
      <Sfx sound="whoosh" />
      <Title frame={frame} at={2} top={700} size={112}>
        {fix[0]}
        <br />
        <span style={{ color: C.sun }}>{fix[1]}</span>
      </Title>
    </Sky>
  );
};

/** When the points start counting, and when the winner is called. */
const COUNT = [36, 80];
const DECIDED = 96;

/** One proposal: photo, name, who proposed it, its points counting up, then the winner called. */
const ProposalCard: React.FC<{ readonly place: VideoPlace; readonly by: string; readonly points: number; readonly max: number; readonly index: number; readonly win: boolean; readonly labels: StoryProps["labels"] }> = ({
  place,
  by,
  points,
  max,
  index,
  win,
  labels,
}) => {
  const frame = useCurrentFrame();
  const nameSize = useFit(place.name, 640, 84);
  const enter = ramp(frame, index * 8, index * 8 + 16);
  const counted = interpolate(frame, COUNT, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const called = ramp(frame, DECIDED, DECIDED + 12);
  return (
    <div
      style={{
        position: "relative",
        height: 430,
        borderRadius: 44,
        overflow: "hidden",
        opacity: enter * (win ? 1 : interpolate(called, [0, 1], [1, 0.42])),
        translate: `${interpolate(enter, [0, 1], [140, 0])}px 0px`,
        scale: win ? interpolate(called, [0, 1], [1, 1.04]) : 1,
        boxShadow: win ? `0 0 0 ${Math.round(called * 8)}px ${C.coral}, 0 30px 80px rgba(20,8,12,${0.5 * called})` : "none",
      }}
    >
      <Img src={place.photo} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,12,0.1) 0%, rgba(20,8,12,0.82) 100%)" }} />
      <div style={{ position: "absolute", left: 44, right: 44, bottom: 40, fontFamily: SANS, color: C.ink }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: nameSize, lineHeight: 1 }}>{place.name}</div>
        <div style={{ fontSize: 34, fontWeight: 600, color: C.sun, marginTop: 10 }}>
          {place.country} · {labels.proposedBy} {by}
        </div>
        <div style={{ marginTop: 22, height: 14, borderRadius: 999, background: "rgba(255,248,241,0.2)", overflow: "hidden" }}>
          <div style={{ width: `${(100 * counted * points) / max}%`, height: "100%", borderRadius: 999, background: win ? C.coral : C.sun }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 34, right: 34, fontFamily: SANS, fontSize: 40, fontWeight: 700, background: C.paper, color: C.dark, borderRadius: 999, padding: "10px 28px" }}>
        {Math.round(counted * points)} {labels.points}
      </div>
      {win && (
        <div
          style={{
            position: "absolute",
            top: 34,
            left: 34,
            fontFamily: SANS,
            fontSize: 40,
            fontWeight: 700,
            background: C.coral,
            color: C.ink,
            borderRadius: 999,
            padding: "10px 30px",
            opacity: called,
            scale: interpolate(called, [0, 1], [1.6, 1]),
            rotate: "-4deg",
          }}
        >
          {labels.decided}
        </div>
      )}
    </div>
  );
};

/** The group proposes, votes with points, and the most voted place wins. */
const Vote: React.FC<Pick<StoryProps, "places" | "by" | "points" | "winner" | "labels">> = ({ places, by, points, winner, labels }) => {
  const max = Math.max(...points);
  return (
    <Sky>
      <Sfx sound="whoosh" />
      <Sfx sound="ding" at={DECIDED} />
      <div style={{ position: "absolute", top: 230, left: 70, right: 70, display: "flex", flexDirection: "column", gap: 34 }}>
        {places.slice(0, 3).map((place, i) => (
          <ProposalCard key={place.name} place={place} by={by[i]} points={points[i]} max={max} index={i} win={i === winner} labels={labels} />
        ))}
      </div>
    </Sky>
  );
};

export const StoryFormat: React.FC<StoryProps> = (props) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Soundtrack music={props.music} durationInFrames={STORY_DURATION} />
      <TransitionSeries>
        <TransitionSeries.Sequence name="Chat" durationInFrames={150} premountFor={fps}>
          <Chat hook={props.hook} chat={props.chat} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 10 })} />
        <TransitionSeries.Sequence name="Fix" durationInFrames={60} premountFor={fps}>
          <Fix fix={props.fix} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 10 })} />
        <TransitionSeries.Sequence name="Vote" durationInFrames={150} premountFor={fps}>
          <Vote places={props.places} by={props.by} points={props.points} winner={props.winner} labels={props.labels} />
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
