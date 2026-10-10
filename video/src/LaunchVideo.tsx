import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { ChatScene } from "./scenes/ChatScene";
import { CtaScene } from "./scenes/CtaScene";
import { PlanScene } from "./scenes/PlanScene";
import { PointsScene } from "./scenes/PointsScene";
import { ProposeScene } from "./scenes/ProposeScene";
import { WheelScene } from "./scenes/WheelScene";
import type { SceneProps } from "./copy";

/** Roamie's launch video: chat chaos → proposals → points → the wheel → the plan → roamie.org. */
export const LaunchVideo: React.FC<SceneProps> = ({ lang }) => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Chat" durationInFrames={120} premountFor={fps}>
        <ChatScene lang={lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Proposte" durationInFrames={105} premountFor={fps}>
        <ProposeScene lang={lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Punti" durationInFrames={105} premountFor={fps}>
        <PointsScene lang={lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Ruota" durationInFrames={180} premountFor={fps}>
        <WheelScene lang={lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 12 })} />
      <TransitionSeries.Sequence name="Itinerario" durationInFrames={120} premountFor={fps}>
        <PlanScene lang={lang} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
      <TransitionSeries.Sequence name="Chiusura" durationInFrames={120} premountFor={fps}>
        <CtaScene lang={lang} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
