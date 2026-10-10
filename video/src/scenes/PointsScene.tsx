import { interpolate, useCurrentFrame } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, SLICES, Sky, Title } from "../theme";

export const POINTS = [14, 9, 7, 5];

/** Ten points each: the bars fill up and the counters run. */
export const PointsScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];
  const max = Math.max(...POINTS);

  return (
    <Sky>
      <Title frame={frame} at={0} top={170}>
        {copy.points[0]}
        <br />
        <span style={{ fontStyle: "italic", color: C.sun }}>{copy.points[1]}</span>
      </Title>
      <div style={{ position: "absolute", top: 560, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 54 }}>
        {copy.places.map((p, i) => {
          const fill = ramp(frame, 16 + i * 6, 62 + i * 6)
          const points = Math.round(POINTS[i] * fill)
          return (
            <div key={p.name} style={{ opacity: ramp(frame, 8 + i * 6, 20 + i * 6) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 64 }}>
                  <span style={{ fontStyle: "italic", color: C.sun, marginRight: 22 }}>{i + 1}</span>
                  {p.name}
                </span>
                <span style={{ fontSize: 52, fontWeight: 700 }}>{points} pt</span>
              </div>
              <div style={{ height: 26, borderRadius: 13, background: "rgba(255,248,241,0.16)", marginTop: 18, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${interpolate(fill, [0, 1], [0, (POINTS[i] / max) * 100])}%`,
                    borderRadius: 13,
                    background: `linear-gradient(90deg, ${C.coral}, ${SLICES[i]})`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ position: "absolute", top: 1330, left: 90, right: 90, fontSize: 48, fontWeight: 600, color: C.muted, opacity: ramp(frame, 70, 84) }}>
        {copy.pointsNote}
      </div>
    </Sky>
  );
};
