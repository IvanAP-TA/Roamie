import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { C, DISPLAY, SANS } from "../theme";
import { type Lang, type VideoPlace } from "./shared";

/**
 * The "chat" carousel: a group chat stuck on a real problem (automation/stories.mjs), told over six slides the way
 * slideshows that work on TikTok and Instagram are built: one person and a conflict in the hook, the chat going nowhere
 * over three slides, then how the vote ends on Roamie, then "send it to your group".
 *
 * One still per frame. 4:5 (1080 × 1350) for Instagram and Facebook; `tall` renders 9:16 (1080 × 1920) for TikTok's
 * photo mode, which shows anything shorter with bars. Text stays out of the top 10% and the bottom 20%, where the apps
 * put their own buttons and captions.
 */
export type ChatCarouselProps = {
  readonly lang: Lang;
  /** The cover's line: one person in the chat and what they keep doing (written by the AI, checked). */
  readonly hook: string;
  readonly chat: readonly { readonly who: string; readonly text: string }[];
  /** Days into the chat for the three chat slides, e.g. [1, 9, 23] */
  readonly days: readonly [number, number, number];
  /** How Roamie gets the group out of it, in two lines. */
  readonly fix: readonly [string, string];
  readonly places: readonly VideoPlace[];
  readonly by: readonly string[];
  readonly points: readonly number[];
  readonly winner: number;
  /** The end slide's line, e.g. "Send this to the group chat that never decides" */
  readonly question: string;
  readonly credits: readonly string[];
  readonly tall?: boolean;
};

export const CHAT_SLIDES = 6;

export const chatCarouselMetadata: CalculateMetadataFunction<ChatCarouselProps> = ({ props }) => ({
  durationInFrames: CHAT_SLIDES,
  width: 1080,
  height: props.tall ? 1920 : 1350,
});

const T = {
  it: { day: (n: number) => `Giorno ${n}`, group: "Viaggio 🌍", seen: "Visualizzato da 6", vote: "Poi su Roamie:", points: "punti", by: "proposta da", picked: "La ruota ha scelto", free: "Gratis, senza app da installare" },
  en: { day: (n: number) => `Day ${n}`, group: "Trip 🌍", seen: "Seen by 6", vote: "Then on Roamie:", points: "points", by: "proposed by", picked: "The wheel picked", free: "Free, no app to install" },
};

/** Lines of about four words, so the hook reads at a glance and never runs edge to edge. */
export function breakLines(text: string, perLine = 4): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += perLine) lines.push(words.slice(i, i + perLine).join(" "));
  // A last line of one word looks orphaned: it joins the line before.
  if (lines.length > 1 && !lines[lines.length - 1].includes(" ")) lines[lines.length - 2] += ` ${lines.pop()}`;
  return lines;
}

const Shade: React.FC<{ readonly from?: number }> = ({ from = 0.25 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,6,8,${from + 0.35}) 0%, rgba(10,6,8,${from}) 45%, rgba(10,6,8,0.85) 100%)` }} />
);

/** The hook over a real photo, 30% from the top, big enough to read in a scroll. */
const Cover: React.FC<ChatCarouselProps> = ({ hook, places }) => {
  const { height } = useVideoConfig();
  // About 6% of the height, but never so big that a line of five words runs past the edges.
  const size = Math.round(Math.min(height * 0.055, 76));
  return (
    <AbsoluteFill style={{ background: C.night, fontFamily: SANS }}>
      <Img src={places[0].photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Shade />
      <div style={{ position: "absolute", top: height * 0.3, left: 70, right: 70, textAlign: "center" }}>
        {breakLines(hook).map((line) => (
          <div key={line} style={{ fontWeight: 700, fontSize: size, lineHeight: 1.18, color: "#fff", textShadow: "0 3px 18px rgba(0,0,0,0.85)" }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** A phone chat: the group's name on top, then the messages so far; `upTo` of them, the last one the viewer's. */
const ChatSlide: React.FC<ChatCarouselProps & { readonly upTo: number; readonly day: number; readonly last: boolean }> = ({ lang, chat, upTo, day, last }) => {
  const { height } = useVideoConfig();
  const t = T[lang];
  const shown = chat.slice(0, upTo);
  // The 9:16 slide is taller, not wider: the chat grows with it, so the screen doesn't look half empty.
  const k = height / 1350;
  return (
    <AbsoluteFill style={{ background: "#efe7de", fontFamily: SANS }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.1 + 90, background: "#2b1d17", display: "flex", alignItems: "flex-end", padding: "0 50px 26px", gap: 22 }}>
        <div style={{ width: 66, height: 66, borderRadius: 33, background: C.coral, color: "#fff", fontSize: 34 * k, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>7</div>
        <div style={{ color: "#fff" }}>
          <div style={{ fontSize: 38 * k, fontWeight: 700 }}>{t.group}</div>
          <div style={{ fontSize: 26 * k, opacity: 0.7 }}>{chat.slice(0, 4).map((m) => m.who).join(", ")}…</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: height * 0.1 + 130, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ background: "rgba(43,29,23,0.12)", color: "#5d4b42", fontSize: 28 * k, fontWeight: 600, borderRadius: 999, padding: "8px 26px" }}>{t.day(day)}</span>
      </div>
      <div style={{ position: "absolute", top: height * 0.1 + 210, left: 50, right: 50, display: "flex", flexDirection: "column", gap: 22 * k }}>
        {shown.map((m, i) => {
          const mine = i === chat.length - 1;
          return (
            <div
              key={`${m.who}-${m.text}`}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: 820,
                background: mine ? "#ffd9c7" : "#fff",
                borderRadius: 30,
                borderTopLeftRadius: mine ? 30 : 6,
                borderTopRightRadius: mine ? 6 : 30,
                padding: `${18 * k}px ${30 * k}px`,
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              }}
            >
              {!mine && <div style={{ fontSize: 28 * k, fontWeight: 700, color: ["#c24e27", "#3f7a78", "#6b4a6e", "#b5791f"][i % 4], marginBottom: 4 }}>{m.who}</div>}
              <div style={{ fontSize: 44 * k, lineHeight: 1.2, color: "#1f1418" }}>{m.text}</div>
            </div>
          );
        })}
        {last && <div style={{ alignSelf: "flex-end", fontSize: 26 * k, color: "#8a7a70", marginTop: -8 }}>{T[lang].seen}</div>}
      </div>
    </AbsoluteFill>
  );
};

/** How it ends on Roamie: the places as the group voted them, the one with the most points picked. */
const VoteSlide: React.FC<ChatCarouselProps> = ({ lang, fix, places, by, points, winner }) => {
  const { height } = useVideoConfig();
  const t = T[lang];
  const max = Math.max(...points);
  const k = height / 1350;
  return (
    <AbsoluteFill style={{ background: C.night, fontFamily: SANS, color: C.ink }}>
      <Img src={places[winner].photo} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
      <Shade from={0.35} />
      <div style={{ position: "absolute", top: height * 0.1 + 40, left: 70, right: 70 }}>
        <div style={{ fontSize: 36 * k, fontWeight: 700, color: C.sun }}>{t.vote}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 70 * k, lineHeight: 1.08, marginTop: 10 }}>
          {fix[0]} {fix[1]}
        </div>
      </div>
      <div style={{ position: "absolute", top: height * 0.1 + 330 * k, left: 60, right: 60, background: C.paper, color: C.dark, borderRadius: 40, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 26 * k }}>
        {places.map((p, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Img src={p.photo} style={{ width: 104 * k, height: 104 * k, borderRadius: 24, objectFit: "cover" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 42 * k, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 26 * k, color: "#7a6a60" }}>
                {t.by} {by[i]}
              </div>
              <div style={{ marginTop: 10, height: 14, borderRadius: 7, background: "#efe2d4" }}>
                <div style={{ width: `${(points[i] / max) * 100}%`, height: "100%", borderRadius: 7, background: i === winner ? C.coral : "#d8b9a2" }} />
              </div>
            </div>
            <div style={{ fontSize: 36 * k, fontWeight: 700, color: i === winner ? C.primary : "#7a6a60" }}>
              {points[i]} <span style={{ fontSize: 24 * k }}>{t.points}</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 6, textAlign: "center", fontSize: 34 * k, fontWeight: 700, color: C.primary }}>
          🎡 {t.picked} {places[winner].name}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndSlide: React.FC<ChatCarouselProps> = ({ lang, question, credits }) => {
  const { height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${C.coral} 0%, ${C.primary} 55%, #6e2c44 100%)`, fontFamily: SANS, color: C.ink, alignItems: "center", textAlign: "center" }}>
      <div style={{ position: "absolute", top: height * 0.26, left: 90, right: 90 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 84, lineHeight: 1.08 }}>{question}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 70 }}>
          <Img src={staticFile("logo.png")} style={{ width: 64, height: 64, borderRadius: 16 }} />
          <span style={{ fontSize: 56, fontWeight: 700 }}>roamie.org</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 32, fontWeight: 600, opacity: 0.85 }}>{T[lang].free}</div>
      </div>
      <div style={{ position: "absolute", bottom: height * 0.2 + 10, left: 80, right: 80, fontSize: 22, lineHeight: 1.35, opacity: 0.7 }}>
        {lang === "it" ? "Foto" : "Photos"}: {credits.join(" · ")} · Wikimedia Commons
      </div>
    </AbsoluteFill>
  );
};

export const ChatCarousel: React.FC<ChatCarouselProps> = (props) => {
  const frame = useCurrentFrame();
  const n = props.chat.length;
  if (frame === 0) return <Cover {...props} />;
  // Three moments of the same chat: it starts, it drags on, it dies with the viewer's own message.
  if (frame === 1) return <ChatSlide {...props} upTo={2} day={props.days[0]} last={false} />;
  if (frame === 2) return <ChatSlide {...props} upTo={Math.min(4, n - 1)} day={props.days[1]} last={false} />;
  if (frame === 3) return <ChatSlide {...props} upTo={n} day={props.days[2]} last />;
  if (frame === 4) return <VoteSlide {...props} />;
  return <EndSlide {...props} />;
};
