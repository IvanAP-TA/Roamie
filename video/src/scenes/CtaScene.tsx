import { CanvasImage, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, Sky } from "../theme";

/** The ending: the logo, the promise and where to go. */
export const CtaScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];
  const { fps } = useVideoConfig();
  const logo = ramp(frame, 0, 18);

  return (
    <Sky>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <CanvasImage
          src={staticFile("logo.png")}
          premountFor={fps}
          style={{ width: 220, height: 220, borderRadius: 56, opacity: logo, scale: interpolate(logo, [0, 1], [0.6, 1]) }}
        />
        <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 150, marginTop: 40, opacity: ramp(frame, 8, 24) }}>roamie</div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 84,
            lineHeight: 1.08,
            margin: "40px 90px 0",
            opacity: ramp(frame, 18, 34),
            translate: `0px ${interpolate(ramp(frame, 18, 36), [0, 1], [30, 0])}px`,
          }}
        >
          {copy.tagline[0]}
          <br />
          {copy.tagline[1]}
        </div>
        <div
          style={{
            marginTop: 90,
            fontSize: 64,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${C.coral}, ${C.primary})`,
            borderRadius: 999,
            padding: "26px 64px",
            opacity: ramp(frame, 34, 48),
            scale: interpolate(ramp(frame, 34, 52), [0, 1], [0.8, 1]),
          }}
        >
          roamie.org
        </div>
        <div style={{ marginTop: 44, fontSize: 44, fontWeight: 600, color: C.muted, opacity: ramp(frame, 48, 62) }}>{copy.perks}</div>
      </div>
    </Sky>
  );
};
