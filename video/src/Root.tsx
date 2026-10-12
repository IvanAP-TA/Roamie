import { Composition, Folder } from "remotion";
import { MONTH_DURATION, MonthFormat } from "./formats/MonthFormat";
import { VERSUS_DURATION, VersusFormat } from "./formats/VersusFormat";
import { WHEEL_DURATION, WheelFormat } from "./formats/WheelFormat";
import { LaunchVideo } from "./LaunchVideo";
import { ChatScene } from "./scenes/ChatScene";
import { CtaScene } from "./scenes/CtaScene";
import { PlanScene } from "./scenes/PlanScene";
import { PointsScene } from "./scenes/PointsScene";
import { ProposeScene } from "./scenes/ProposeScene";
import { WheelScene } from "./scenes/WheelScene";

// Vertical 9:16 for Reels, TikTok and Shorts.
// The launch video: 120 + 105 + 105 + 180 + 120 + 120 − (12 × 4 + 15) = 687 frames ≈ 23 s, per language (src/copy.ts).
// The formats under "Social" are what the weekly automation renders (automation/run.mjs passes their props);
// the defaults here are real places from the guides, for previewing in the Studio.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Lancio" component={LaunchVideo} durationInFrames={687} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
      <Composition id="Launch" component={LaunchVideo} durationInFrames={687} fps={30} width={1080} height={1920} defaultProps={{ lang: "en" as const }} />
      <Folder name="Social">
        <Composition
          id="Wheel"
          component={WheelFormat}
          durationInFrames={WHEEL_DURATION}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            lang: "it" as const,
            music: "music/wheel-1-vlog-v2.mp3",
            hook: "4 mete, una ruota: dove andiamo?",
            spinTitle: "Decide la ruota.",
            places: [
              { name: "Lisbona", country: "Portogallo", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg/1920px-Lisboa_-_Portugal_%2852597836992%29.jpg", line: "Sette colli, tram gialli e miradouros per il tramonto: si gira bene a piedi e in tram.", moods: ["culture", "food_wine"], budget: 2 as const, months: [4, 5, 6, 9, 10] },
              { name: "Budapest", country: "Ungheria", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/View_from_Gell%C3%A9rt_Hill_to_the_Danube%2C_Hungary_-_Budapest_%2828493220635%29.jpg/1920px-View_from_Gell%C3%A9rt_Hill_to_the_Danube%2C_Hungary_-_Budapest_%2828493220635%29.jpg", line: "Terme storiche da condividere, i ruin bar del quartiere ebraico e il Parlamento illuminato sul Danubio.", moods: ["nightlife", "relax"], budget: 1 as const, months: [4, 5, 6, 9, 10, 12] },
              { name: "Valencia", country: "Spagna", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Malvarrosa_Beach%2C_Valencia%2C_Spain_%2829812271043%29.jpg/1920px-Malvarrosa_Beach%2C_Valencia%2C_Spain_%2829812271043%29.jpg", line: "Città e spiaggia nello stesso weekend.", moods: ["relax", "food_wine"], budget: 2 as const, months: [3, 4, 5, 6, 9, 10] },
              { name: "Cracovia", country: "Polonia", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG/1920px-Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG", line: "Una delle piazze medievali più grandi d’Europa.", moods: ["culture", "food_wine"], budget: 1 as const, months: [5, 6, 7, 8, 9, 12] },
            ],
            points: [12, 9, 7, 5],
            winner: 1,
            bestTime: "Periodo migliore",
            credits: ["Lisboa – Portugal (CC BY 2.0)", "Budapest (CC BY 2.0)", "Valencia (CC BY 2.0)", "Kraków (CC BY-SA 3.0)"],
          }}
        />
        <Composition
          id="Month"
          component={MonthFormat}
          durationInFrames={MONTH_DURATION}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            lang: "it" as const,
            music: "music/month-1-deep-house-sunset.mp3",
            hook: "3 mete per scappare dal freddo a dicembre",
            places: [
              { name: "Tenerife", country: "Spagna", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Tenerife%2C_Canary_Islands_ESA23970088.jpeg/1920px-Tenerife%2C_Canary_Islands_ESA23970088.jpeg", line: "Temperature primaverili anche in inverno, il vulcano Teide da salire e cieli perfetti per osservare le stelle.", moods: ["relax", "nature"], budget: 2 as const, months: [1, 2, 3, 11, 12] },
              { name: "Budapest", country: "Ungheria", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/View_from_Gell%C3%A9rt_Hill_to_the_Danube%2C_Hungary_-_Budapest_%2828493220635%29.jpg/1920px-View_from_Gell%C3%A9rt_Hill_to_the_Danube%2C_Hungary_-_Budapest_%2828493220635%29.jpg", line: "Terme storiche da condividere, i ruin bar del quartiere ebraico e il Parlamento illuminato sul Danubio.", moods: ["nightlife", "relax"], budget: 1 as const, months: [4, 5, 6, 9, 10, 12] },
              { name: "Cracovia", country: "Polonia", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG/1920px-Sukiennice_and_Main_Market_Square_Krakow_Poland.JPG", line: "Una delle piazze medievali più grandi d’Europa, il quartiere di Kazimierz pieno di locali e cucina polacca a prezzi onesti.", moods: ["culture", "food_wine"], budget: 1 as const, months: [5, 6, 7, 8, 9, 12] },
            ],
            credits: ["Tenerife (CC BY-SA 3.0 IGO)", "Budapest (CC BY 2.0)", "Kraków (CC BY-SA 3.0)"],
          }}
        />
        <Composition
          id="Versus"
          component={VersusFormat}
          durationInFrames={VERSUS_DURATION}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            lang: "it" as const,
            music: "music/versus-1-lofi-vlog-beats.mp3",
            hook: "Weekend con gli amici: quale scegliete?",
            a: { name: "Lisbona", country: "Portogallo", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg/1920px-Lisboa_-_Portugal_%2852597836992%29.jpg", line: "", moods: ["culture", "food_wine"], budget: 2 as const, months: [4, 5, 6, 9, 10] },
            b: { name: "Madeira", country: "Portogallo", photo: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Funchal%2C_Jardins_da_Quinta_Vigia_%28lookout%29.jpg/1920px-Funchal%2C_Jardins_da_Quinta_Vigia_%28lookout%29.jpg", line: "", moods: ["nature", "adventure"], budget: 2 as const, months: [4, 5, 6, 9, 10] },
            rows: ["Budget", "Quando", "Vibe"] as [string, string, string],
            question: "Voi quale scegliete?",
            credits: ["Lisboa (CC BY 2.0)", "Funchal (CC BY-SA 4.0)"],
          }}
        />
      </Folder>
      <Folder name="Scene">
        <Composition id="Chat" component={ChatScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
        <Composition id="Proposte" component={ProposeScene} durationInFrames={105} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
        <Composition id="Punti" component={PointsScene} durationInFrames={105} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
        <Composition id="Ruota" component={WheelScene} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
        <Composition id="Itinerario" component={PlanScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
        <Composition id="Chiusura" component={CtaScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ lang: "it" as const }} />
      </Folder>
    </>
  );
};
