import { Easing, interpolate, useCurrentFrame } from "remotion";
import { COPY, type SceneProps } from "../copy";
import { C, DISPLAY, ramp, SLICES, Sky, Title } from "../theme";
import { POINTS } from "./PointsScene";

const R = 400;
const CX = 540;
const CY = 1080;
const WINNER = 0;

/** A slice of the wheel, angles in degrees clockwise from the top. */
const slicePath = (from: number, to: number) => {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${CX + R * Math.cos(rad)} ${CY + R * Math.sin(rad)}`;
  };
  return `M ${CX} ${CY} L ${point(from)} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to)} Z`;
};

/** Undecided? The wheel spins, slices sized by points, and stops on the pick. */
export const WheelScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame();
  const copy = COPY[lang];
  const total = POINTS.reduce((a, b) => a + b, 0);
  const slices = POINTS.reduce<{ from: number; to: number }[]>((acc, p) => {
    const from = acc[acc.length - 1]?.to ?? 0;
    return [...acc, { from, to: from + (p / total) * 360 }];
  }, []);
  const winnerCenter = (slices[WINNER].from + slices[WINNER].to) / 2;
  // Five full turns, landing with the winner's middle under the pointer.
  const rotation = interpolate(frame, [18, 128], [0, 5 * 360 - winnerCenter], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.12, 0.7, 0.18, 1),
  });
  const landed = ramp(frame, 128, 142);

  return (
    <Sky>
      <Title frame={frame} at={0} top={170}>
        {copy.wheel[0]}
        <br />
        <span style={{ fontStyle: "italic", color: C.sun }}>{copy.wheel[1]}</span>
      </Title>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <circle cx={CX} cy={CY} r={R + 22} fill="rgba(255,248,241,0.92)" />
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          {slices.map((s, i) => (
            <path key={i} d={slicePath(s.from, s.to)} fill={SLICES[i]} stroke={C.paper} strokeWidth={8} opacity={landed > 0 && i !== WINNER ? 1 - 0.35 * landed : 1} />
          ))}
          {slices.map((s, i) => {
            const mid = (s.from + s.to) / 2;
            // Where the label ends up once the wheel stops: in the lower half it's turned over, so it reads upright.
            const rest = (((mid + 5 * 360 - winnerCenter) % 360) + 360) % 360;
            const flip = rest > 90 && rest < 270;
            const y = CY - R * 0.6;
            return (
              <g key={i} transform={`rotate(${mid} ${CX} ${CY})`}>
                <text
                  x={CX}
                  y={y}
                  fill={C.ink}
                  fontFamily={DISPLAY}
                  fontWeight={600}
                  fontSize={52}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={flip ? `rotate(180 ${CX} ${y})` : undefined}
                >
                  {copy.places[i].name}
                </text>
              </g>
            );
          })}
        </g>
        <circle cx={CX} cy={CY} r={78} fill={C.paper} />
        <circle cx={CX} cy={CY} r={30} fill={C.sun} />
        <path d={`M ${CX - 50} ${CY - R - 70} L ${CX + 50} ${CY - R - 70} L ${CX} ${CY - R + 26} Z`} fill={C.sun} stroke={C.paper} strokeWidth={8} />
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 210,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 120,
          opacity: landed,
          scale: interpolate(landed, [0, 1], [0.7, 1]),
        }}
      >
        {copy.places[WINNER].name}!
      </div>
    </Sky>
  );
};
