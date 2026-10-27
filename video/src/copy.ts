/** Every word on screen, per language. The scenes take `lang` and read their lines from here. */
export type Lang = "it" | "en";

export const COPY = {
  it: {
    chat: [
      { who: "Giulia", text: "Dove andiamo quest’estate?" },
      { who: "Marco", text: "Lisbona!!" },
      { who: "Sara", text: "Budapest costa meno" },
      { who: "Luca", text: "Boh, decidete voi" },
      { who: "Tu", text: "…ne riparliamo domani?" },
    ],
    hook: ["Il gruppo", "non decide mai."],
    propose: ["Ognuno propone", "le sue mete"],
    proposedBy: "proposta da",
    places: [
      { name: "Lisbona", country: "Portogallo", by: "Marco", mood: "Cultura · Cibo" },
      { name: "Budapest", country: "Ungheria", by: "Sara", mood: "Nightlife · Relax" },
      { name: "Valencia", country: "Spagna", by: "Giulia", mood: "Mare · Relax" },
      { name: "Cracovia", country: "Polonia", by: "Luca", mood: "Cultura · Low cost" },
    ],
    points: ["10 punti a testa.", "Vince chi convince."],
    pointsNote: "Anche col voto segreto.",
    wheel: ["Ancora indecisi?", "Gira la ruota."],
    plan: ["Poi l’itinerario,", "anche con l’AI"],
    days: [
      { day: "Giorno 1", title: "Alfama e i miradouros", stops: ["10:00  Castello di São Jorge", "19:30  Tramonto a Senhora do Monte"] },
      { day: "Giorno 2", title: "Belém e i pastéis", stops: ["09:30  Monastero dos Jerónimos", "11:30  Pastéis de Belém"] },
      { day: "Giorno 3", title: "Sintra in giornata", stops: ["11:00  Palazzo da Pena"] },
    ],
    extras: ["Date di tutti", "Checklist", "Mappa", "Confronto con l’AI"],
    tagline: ["Il prossimo viaggio", "si decide insieme."],
    perks: "Gratis · Senza pubblicità · Anche senza account",
    share: ["Mandalo alla chat", "che non decide mai."],
  },
  en: {
    chat: [
      { who: "Emma", text: "So where are we going this summer?" },
      { who: "Jake", text: "Lisbon!!" },
      { who: "Sophie", text: "Budapest is cheaper" },
      { who: "Liam", text: "Idk, you guys decide" },
      { who: "You", text: "…talk about it tomorrow?" },
    ],
    hook: ["The group chat", "never decides."],
    propose: ["Everyone proposes", "their places"],
    proposedBy: "proposed by",
    places: [
      { name: "Lisbon", country: "Portugal", by: "Jake", mood: "Culture · Food" },
      { name: "Budapest", country: "Hungary", by: "Sophie", mood: "Nightlife · Relax" },
      { name: "Valencia", country: "Spain", by: "Emma", mood: "Beach · Relax" },
      { name: "Kraków", country: "Poland", by: "Liam", mood: "Culture · Budget" },
    ],
    points: ["10 points each.", "Make your case."],
    pointsNote: "Secret voting, too.",
    wheel: ["Still can’t decide?", "Spin the wheel."],
    plan: ["Then the itinerary,", "with a little AI"],
    days: [
      { day: "Day 1", title: "Alfama and the viewpoints", stops: ["10:00  São Jorge Castle", "19:30  Sunset at Senhora do Monte"] },
      { day: "Day 2", title: "Belém and pastéis", stops: ["09:30  Jerónimos Monastery", "11:30  Pastéis de Belém"] },
      { day: "Day 3", title: "A day in Sintra", stops: ["11:00  Pena Palace"] },
    ],
    extras: ["Everyone’s dates", "Checklist", "Map", "AI comparison"],
    tagline: ["Your next trip,", "decided together."],
    perks: "Free · No ads · No account needed",
    share: ["Send this to the group chat", "that never decides."],
  },
} as const;

export type SceneProps = { readonly lang: Lang };
