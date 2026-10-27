import { AbsoluteFill, Img, staticFile, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { C, DISPLAY, SANS } from "../theme";
import { budgetLabel, Chip, monthsLabel, moodLabel, useFit, type Lang, type VideoPlace } from "./shared";

/**
 * A carousel for Instagram and TikTok: one still per frame, rendered as an image sequence (4:5, 1080 × 1350).
 * Frame 0 is the cover, then one slide per place, then the end slide.
 */
export type CarouselProps = {
  readonly lang: Lang;
  /** The cover's title */
  readonly hook: string;
  /** Small line above it: the theme or the month, e.g. "Viaggio low cost · 5 mete" */
  readonly kicker: string;
  readonly places: readonly VideoPlace[];
  /** The end slide's question */
  readonly question: string;
  readonly bestTime: string;
  readonly credits: readonly string[];
  /** The "signs" carousel (automation/signs.mjs): one sign per place slide instead of the place's details */
  readonly signs?: readonly string[];
  /** …and how a group gets out of it, on the end slide */
  readonly fix?: string;
};

export const CAROUSEL_WIDTH = 1080;
export const CAROUSEL_HEIGHT = 1350;

export const carouselMetadata: CalculateMetadataFunction<CarouselProps> = ({ props }) => ({ durationInFrames: props.places.length + 2 });

const Brand: React.FC<{ readonly dark?: boolean }> = ({ dark = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 44, color: dark ? C.dark : C.ink }}>
    <Img src={staticFile("logo.png")} style={{ width: 54, height: 54, borderRadius: 14 }} />
    roamie
  </div>
);

const Counter: React.FC<{ readonly index: number; readonly total: number }> = ({ index, total }) => (
  <div style={{ position: "absolute", top: 54, right: 60, fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.ink, background: "rgba(20,8,12,0.5)", borderRadius: 999, padding: "8px 22px" }}>
    {index}/{total}
  </div>
);

const Cover: React.FC<CarouselProps> = ({ hook, kicker, places, lang }) => (
  <AbsoluteFill style={{ background: C.night, fontFamily: SANS }}>
    <Img src={places[0].photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,12,0.78) 0%, rgba(20,8,12,0.35) 48%, rgba(20,8,12,0.9) 100%)" }} />
    <div style={{ position: "absolute", top: 60, left: 70 }}>
      <Brand />
    </div>
    <div style={{ position: "absolute", top: 230, left: 70, right: 70 }}>
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: C.sun }}>{kicker}</div>
      <div style={{ marginTop: 22, fontFamily: DISPLAY, fontWeight: 600, fontSize: 104, lineHeight: 1.04, color: C.ink, textShadow: "0 4px 30px rgba(0,0,0,0.35)" }}>{hook}</div>
    </div>
    <div style={{ position: "absolute", left: 70, right: 70, bottom: 70, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 14 }}>
        {places.slice(1, 5).map((p) => (
          <Img key={p.name} src={p.photo} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 22, border: `4px solid ${C.paper}` }} />
        ))}
      </div>
      <Chip>{lang === "it" ? "Scorri →" : "Swipe →"}</Chip>
    </div>
  </AbsoluteFill>
);

const PlaceSlide: React.FC<{ readonly place: VideoPlace; readonly index: number; readonly total: number; readonly lang: Lang; readonly bestTime: string }> = ({ place, index, total, lang, bestTime }) => {
  const nameSize = useFit(place.name, 940, 112);
  return (
    <AbsoluteFill style={{ background: C.night, fontFamily: SANS }}>
      <Img src={place.photo} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 800, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, height: 160, background: `linear-gradient(180deg, rgba(31,20,24,0), ${C.night})` }} />
      <Counter index={index + 1} total={total} />
      <div style={{ position: "absolute", top: 690, left: 70, right: 70 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 84, color: C.sun }}>{index}</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: nameSize, lineHeight: 1, color: C.ink }}>{place.name}</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, color: C.sun, marginTop: 10 }}>{place.country}</div>
        <div style={{ fontSize: 40, lineHeight: 1.32, color: C.ink, marginTop: 24 }}>{place.line}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30 }}>
          <Chip>
            {bestTime}: {monthsLabel(place.months, lang)}
          </Chip>
          <Chip>{budgetLabel(place.budget, lang)}</Chip>
          {place.moods.slice(0, 1).map((m) => (
            <Chip key={m} dark>
              {moodLabel(m, lang)}
            </Chip>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A sign of a trip stuck in the chat, over a place's photo: the place is only the backdrop, named small. */
const SignSlide: React.FC<{ readonly sign: string; readonly place: VideoPlace; readonly index: number; readonly total: number }> = ({ sign, place, index, total }) => (
  <AbsoluteFill style={{ background: C.night, fontFamily: SANS }}>
    <Img src={place.photo} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 760, objectFit: "cover" }} />
    <div style={{ position: "absolute", top: 600, left: 0, right: 0, height: 160, background: `linear-gradient(180deg, rgba(31,20,24,0), ${C.night})` }} />
    <Counter index={index + 1} total={total} />
    <div style={{ position: "absolute", top: 700, left: 70, right: 70 }}>
      <span style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: 96, color: C.sun }}>{index}</span>
      <div style={{ marginTop: 12, fontFamily: DISPLAY, fontWeight: 600, fontSize: 74, lineHeight: 1.1, color: C.ink }}>{sign}</div>
    </div>
    <div style={{ position: "absolute", left: 70, bottom: 56, fontSize: 28, fontWeight: 600, color: "rgba(255,248,241,0.6)" }}>
      {place.name} · {place.country}
    </div>
  </AbsoluteFill>
);

const EndSlide: React.FC<CarouselProps> = ({ question, credits, lang, fix }) => (
  <AbsoluteFill style={{ background: `linear-gradient(170deg, ${C.coral} 0%, ${C.primary} 55%, #6e2c44 100%)`, fontFamily: SANS, color: C.ink, alignItems: "center", justifyContent: "center", textAlign: "center", paddingBottom: 60 }}>
    <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 92, lineHeight: 1.06, padding: "0 90px" }}>{question}</div>
    <div style={{ marginTop: 60, fontSize: 42, lineHeight: 1.35, padding: "0 110px", color: "rgba(255,248,241,0.92)" }}>
      {fix ?? (lang === "it" ? "Proponete le mete, votatele con i punti e lasciate scegliere la ruota." : "Propose places, vote with points and let the wheel pick.")}
    </div>
    <div style={{ marginTop: 70, fontSize: 56, fontWeight: 700, background: C.paper, color: C.primary, borderRadius: 999, padding: "22px 60px" }}>roamie.org</div>
    <div style={{ marginTop: 26, fontSize: 32, fontWeight: 600, color: "rgba(255,248,241,0.85)" }}>{lang === "it" ? "Gratis, senza app da installare" : "Free, no app to install"}</div>
    <div style={{ position: "absolute", bottom: 56, left: 80, right: 80, fontSize: 22, lineHeight: 1.35, color: "rgba(255,248,241,0.7)" }}>
      {lang === "it" ? "Foto" : "Photos"}: {credits.join(" · ")} · Wikimedia Commons
    </div>
  </AbsoluteFill>
);

export const CarouselFormat: React.FC<CarouselProps> = (props) => {
  const frame = useCurrentFrame();
  const total = props.places.length + 2;
  if (frame === 0) return <Cover {...props} />;
  if (frame <= props.places.length) {
    const sign = props.signs?.[frame - 1];
    if (sign) return <SignSlide sign={sign} place={props.places[frame - 1]} index={frame} total={total} />;
    return <PlaceSlide place={props.places[frame - 1]} index={frame} total={total} lang={props.lang} bestTime={props.bestTime} />;
  }
  return <EndSlide {...props} />;
};
