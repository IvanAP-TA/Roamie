import { interpolate, useCurrentFrame } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, Sky, Title } from "../theme";

/** Then the plan: the itinerary builds itself, with dates, checklist and map around it. */
export const PlanScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];

  return (
    <Sky>
      <Title frame={frame} at={0} top={170}>
        {copy.plan[0]}
        <br />
        <span style={{ fontStyle: "italic", color: C.sun }}>{copy.plan[1]}</span>
      </Title>
      <div style={{ position: "absolute", top: 520, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 28 }}>
        {copy.days.map((d, i) => {
          const shown = ramp(frame, 12 + i * 12, 30 + i * 12)
          return (
            <div
              key={d.day}
              style={{
                opacity: shown,
                translate: `0px ${interpolate(shown, [0, 1], [40, 0])}px`,
                background: "rgba(255,248,241,0.12)",
                borderRadius: 44,
                padding: "30px 40px",
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 700, color: C.sun, letterSpacing: 3, textTransform: "uppercase" }}>{d.day}</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 56, marginTop: 4 }}>{d.title}</div>
              {d.stops.map((s) => (
                <div key={s} style={{ fontSize: 38, marginTop: 10, color: C.muted, whiteSpace: "pre" }}>
                  {s}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div style={{ position: "absolute", bottom: 200, left: 90, right: 90, display: "flex", flexWrap: "wrap", gap: 18 }}>
        {copy.extras.map((e, i) => (
          <span
            key={e}
            style={{
              opacity: ramp(frame, 56 + i * 6, 68 + i * 6),
              fontSize: 40,
              fontWeight: 600,
              background: C.paper,
              color: C.dark,
              borderRadius: 999,
              padding: "14px 30px",
            }}
          >
            {e}
          </span>
        ))}
      </div>
    </Sky>
  );
};
