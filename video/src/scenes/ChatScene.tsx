import { interpolate, useCurrentFrame } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, Sky, Title } from "../theme";

const AT = [6, 20, 32, 44, 58];

/** The hook: the group chat where nothing ever gets decided. */
export const ChatScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];
  // The last message is the viewer's own.
  const messages = copy.chat.map((m, i) => ({ ...m, mine: i === copy.chat.length - 1, at: AT[i] }));

  return (
    <Sky>
      <div style={{ position: "absolute", top: 260, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 26 }}>
        {messages.map((m) => {
          const shown = ramp(frame, m.at, m.at + 10)
          return (
            <div
              key={m.text}
              style={{
                alignSelf: m.mine ? "flex-end" : "flex-start",
                maxWidth: 760,
                opacity: shown,
                scale: interpolate(shown, [0, 1], [0.85, 1]),
                translate: `0px ${interpolate(shown, [0, 1], [30, 0])}px`,
                transformOrigin: m.mine ? "right bottom" : "left bottom",
                background: m.mine ? C.coral : "rgba(255,248,241,0.14)",
                borderRadius: 44,
                borderBottomLeftRadius: m.mine ? 44 : 12,
                borderBottomRightRadius: m.mine ? 12 : 44,
                padding: "26px 38px",
              }}
            >
              {!m.mine && <div style={{ fontSize: 34, fontWeight: 700, color: C.sun, marginBottom: 6 }}>{m.who}</div>}
              <div style={{ fontSize: 54, fontWeight: 500, lineHeight: 1.15 }}>{m.text}</div>
            </div>
          )
        })}
      </div>
      <Title frame={frame} at={74} top={1270} size={104}>
        {copy.hook[0]}
        <br />
        <span style={{ fontFamily: DISPLAY, fontStyle: "italic", color: C.sun }}>{copy.hook[1]}</span>
      </Title>
    </Sky>
  );
};
