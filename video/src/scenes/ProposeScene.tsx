import { interpolate, useCurrentFrame } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, SLICES, Sky, Title } from "../theme";

/** A postcard: the app's illustrated scene (sky, sun, hills) with the place on it. */
const Postcard: React.FC<{ readonly name: string; readonly country: string; readonly by: string; readonly mood: string; readonly hue: string; readonly label: string }> = ({
  name,
  country,
  by,
  mood,
  hue,
  label,
}) => (
  <div style={{ width: 900, height: 250, borderRadius: 48, overflow: "hidden", position: "relative", background: C.paper, boxShadow: "0 24px 60px rgba(20,8,12,0.35)" }}>
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${hue}, #5a2a45)` }} />
    <svg viewBox="0 0 900 250" style={{ position: "absolute", inset: 0 }}>
      <circle cx="760" cy="70" r="46" fill="rgba(255,236,190,0.75)" />
      <path d="M0 170 C 180 110 320 120 470 175 S 760 130 900 160 V250 H0 Z" fill="rgba(255,248,241,0.18)" />
      <path d="M0 215 C 220 170 380 190 560 220 S 800 200 900 215 V250 H0 Z" fill="rgba(30,10,18,0.35)" />
    </svg>
    <div style={{ position: "absolute", left: 44, top: 34, right: 44 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 76, lineHeight: 1 }}>{name}</div>
      <div style={{ fontSize: 34, marginTop: 10, color: "rgba(255,248,241,0.85)" }}>
        {country} · {mood}
      </div>
    </div>
    <div style={{ position: "absolute", right: 36, bottom: 28, fontSize: 30, fontWeight: 600, background: "rgba(20,8,12,0.35)", borderRadius: 999, padding: "8px 22px" }}>
      {label} {by}
    </div>
  </div>
);

/** Everyone proposes their places: postcards slide in one after the other. */
export const ProposeScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];

  return (
    <Sky>
      <Title frame={frame} at={0} top={170}>
        {copy.propose[0]}
        <br />
        {copy.propose[1]}
      </Title>
      <div style={{ position: "absolute", top: 520, left: 90, display: "flex", flexDirection: "column", gap: 34 }}>
        {copy.places.map((p, i) => {
          const shown = ramp(frame, 14 + i * 12, 34 + i * 12)
          return (
            <div key={p.name} style={{ opacity: shown, translate: `${interpolate(shown, [0, 1], [i % 2 ? 260 : -260, 0])}px 0px`, rotate: `${interpolate(shown, [0, 1], [i % 2 ? 4 : -4, 0])}deg` }}>
              <Postcard {...p} hue={SLICES[i]} label={copy.proposedBy} />
            </div>
          )
        })}
      </div>
    </Sky>
  );
};
