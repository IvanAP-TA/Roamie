import type { BudgetLevel, Mood } from '@/lib/types'
import type { Localized } from './meta'

/** Guide bodies. Imported only by the guide page (its own lazy chunk) and the prerenderer. */

export interface GuidePlace {
  key: string
  name: Localized
  /** ISO 3166-1 alpha-2; the country name is localized with Intl.DisplayNames */
  countryCode: string
  lat: number
  lng: number
  moods: Mood[]
  budget: BudgetLevel
  /** Best months, 1–12 */
  months: number[]
  text: Localized
}

export interface GuideStep {
  title: Localized
  body: Localized
}

export interface GuideContent {
  intro: Localized
  places: GuidePlace[]
  steps: GuideStep[]
}

const same = (name: string): Localized => ({ it: name, en: name, es: name })

export const GUIDE_CONTENT: Record<string, GuideContent> = {
  'how-to': {
    intro: {
      it: 'Il momento più delicato di un viaggio tra amici non è la partenza, ma la decisione. Ecco un metodo semplice per scegliere insieme, rispettando budget e gusti di tutti.',
      en: "The trickiest part of a trip with friends isn't the journey, it's the decision. Here is a simple method to choose together while respecting everyone's budget and tastes.",
      es: 'El momento más delicado de un viaje con amigos no es la salida, sino la decisión. Aquí tienes un método sencillo para elegir juntos respetando el presupuesto y los gustos de todos.',
    },
    places: [],
    steps: [
      {
        title: { it: 'Parlate di budget prima delle mete', en: 'Talk budget before destinations', es: 'Hablad de presupuesto antes que de destinos' },
        body: {
          it: 'Chiedete a ognuno una cifra massima, anche in forma anonima, e partite dalla più bassa. Evita che chi spende meno si senta costretto a seguire gli altri o a rinunciare.',
          en: 'Ask everyone for a maximum figure, anonymously if needed, and start from the lowest. It stops anyone with less to spend from feeling pushed along or left out.',
          es: 'Pedid a cada uno una cifra máxima, aunque sea de forma anónima, y partid de la más baja. Así nadie que gaste menos se siente obligado a seguir al resto o a quedarse fuera.',
        },
      },
      {
        title: { it: 'Fissate una finestra di date', en: 'Fix a window of dates', es: 'Fijad una ventana de fechas' },
        body: {
          it: 'Raccogliete le disponibilità di tutti e scegliete una finestra, non un giorno preciso: i prezzi dei voli cambiano molto anche spostandosi di uno o due giorni.',
          en: "Collect everyone's availability and choose a window rather than exact days: flight prices can change a lot by shifting a day or two.",
          es: 'Reunid la disponibilidad de todos y elegid una ventana, no un día concreto: los precios de los vuelos cambian mucho con uno o dos días de diferencia.',
        },
      },
      {
        title: { it: 'Ognuno propone le sue mete', en: 'Everyone proposes their destinations', es: 'Cada uno propone sus destinos' },
        body: {
          it: 'Date a tutti lo spazio per proporre, con una foto e due righe su cosa si aspettano. Su Roamie ogni meta mostra anche il clima medio e il periodo migliore per andarci.',
          en: 'Give everyone room to propose, with a photo and a couple of lines on what they expect. On Roamie each destination also shows the average climate and the best time to go.',
          es: 'Dejad que todos propongan, con una foto y un par de líneas sobre lo que esperan. En Roamie cada destino muestra además el clima medio y la mejor época para ir.',
        },
      },
      {
        title: { it: 'Votate a punti, non a maggioranza', en: 'Vote with points, not by majority', es: 'Votad con puntos, no por mayoría' },
        body: {
          it: 'Con 10 punti a testa da distribuire, chi ha una preferenza forte può concentrarli e chi è indeciso li divide. Il risultato rispecchia il gruppo meglio di un semplice sì o no.',
          en: 'With 10 points each to spread, people with a strong preference can concentrate them and undecided ones can split them. The result reflects the group better than a simple yes or no.',
          es: 'Con 10 puntos cada uno para repartir, quien tiene una preferencia fuerte puede concentrarlos y quien duda los reparte. El resultado refleja mejor al grupo que un simple sí o no.',
        },
      },
      {
        title: { it: 'In caso di stallo, lasciate decidere la sorte', en: "If you're stuck, let chance decide", es: 'Si os atascáis, que decida la suerte' },
        body: {
          it: 'Se due o tre mete sono vicine, una ruota pesata sui punti sceglie in modo trasparente: chi ha raccolto più punti ha più probabilità, e nessuno può accusare gli altri di aver forzato la scelta.',
          en: 'When two or three destinations are close, a wheel weighted by points picks transparently: more points means better odds, and nobody can accuse anyone of forcing the choice.',
          es: 'Si dos o tres destinos están igualados, una ruleta ponderada por los puntos elige con transparencia: más puntos, más probabilidades, y nadie puede acusar a otro de haber forzado la elección.',
        },
      },
      {
        title: { it: 'Dividete i compiti e tenete tutto in un posto', en: 'Split the tasks and keep everything in one place', es: 'Repartid tareas y tenedlo todo en un sitio' },
        body: {
          it: 'Assegnate a ciascuno qualcosa da prenotare o da portare, e salvate i link di voli, alloggi e biglietti in un unico posto condiviso. Meno messaggi persi nella chat, meno sorprese alla partenza.',
          en: 'Give each person something to book or bring, and save links to flights, stays and tickets in one shared place. Fewer messages lost in the chat, fewer surprises on departure day.',
          es: 'Asignad a cada uno algo que reservar o llevar, y guardad los enlaces de vuelos, alojamientos y entradas en un único sitio compartido. Menos mensajes perdidos en el chat, menos sorpresas al salir.',
        },
      },
    ],
  },

  'long-weekends': {
    intro: {
      it: 'Tre o quattro giorni bastano per una città europea, se la meta è vicina e si gira bene a piedi. Abbiamo scelto città con voli frequenti, quartieri vivi la sera e cose da fare per gusti diversi.',
      en: 'Three or four days are enough for a European city, as long as it is close and walkable. We picked cities with frequent flights, lively neighbourhoods at night and things to do for different tastes.',
      es: 'Tres o cuatro días bastan para una ciudad europea si el destino está cerca y se recorre bien a pie. Hemos elegido ciudades con vuelos frecuentes, barrios animados por la noche y planes para gustos distintos.',
    },
    steps: [],
    places: [
      {
        key: 'lisbon',
        name: { it: 'Lisbona', en: 'Lisbon', es: 'Lisboa' },
        countryCode: 'PT',
        lat: 38.7223,
        lng: -9.1393,
        moods: ['culture', 'food_wine', 'nightlife'],
        budget: 2,
        months: [4, 5, 6, 9, 10],
        text: {
          it: 'Sette colli, tram gialli e miradouros per il tramonto: si gira bene a piedi e in tram. La sera il Bairro Alto e il Cais do Sodré mettono d’accordo anche i gruppi più eterogenei.',
          en: 'Seven hills, yellow trams and miradouros for sunset: easy to explore on foot and by tram. At night Bairro Alto and Cais do Sodré keep even the most mixed groups happy.',
          es: 'Siete colinas, tranvías amarillos y miradores para el atardecer: se recorre fácil a pie y en tranvía. Por la noche, el Bairro Alto y el Cais do Sodré contentan a grupos de todo tipo.',
        },
      },
      {
        key: 'valencia',
        name: same('Valencia'),
        countryCode: 'ES',
        lat: 39.4699,
        lng: -0.3763,
        moods: ['relax', 'food_wine', 'culture'],
        budget: 2,
        months: [3, 4, 5, 6, 9, 10],
        text: {
          it: 'Città e spiaggia nello stesso weekend: la Città delle Arti e delle Scienze, il parco del Turia da fare in bici e la paella dove è nata. Clima mite quasi tutto l’anno.',
          en: 'City and beach in one weekend: the City of Arts and Sciences, the Turia park by bike and paella where it was born. Mild weather almost all year round.',
          es: 'Ciudad y playa en el mismo fin de semana: la Ciudad de las Artes y las Ciencias, el jardín del Turia en bici y la paella donde nació. Clima suave casi todo el año.',
        },
      },
      {
        key: 'budapest',
        name: same('Budapest'),
        countryCode: 'HU',
        lat: 47.4979,
        lng: 19.0402,
        moods: ['culture', 'nightlife', 'relax'],
        budget: 1,
        months: [4, 5, 6, 9, 10, 12],
        text: {
          it: 'Terme storiche da condividere, i ruin bar del quartiere ebraico e il Parlamento illuminato sul Danubio. Prezzi più bassi della maggior parte delle capitali europee.',
          en: 'Historic baths to share, the ruin bars of the Jewish Quarter and Parliament lit up on the Danube. Prices below most European capitals.',
          es: 'Balnearios históricos para compartir, los ruin bars del barrio judío y el Parlamento iluminado sobre el Danubio. Precios por debajo de la mayoría de capitales europeas.',
        },
      },
      {
        key: 'krakow',
        name: { it: 'Cracovia', en: 'Kraków', es: 'Cracovia' },
        countryCode: 'PL',
        lat: 50.0647,
        lng: 19.945,
        moods: ['culture', 'food_wine', 'nightlife'],
        budget: 1,
        months: [5, 6, 7, 8, 9, 12],
        text: {
          it: 'Una delle piazze medievali più grandi d’Europa, il quartiere di Kazimierz pieno di locali e cucina polacca a prezzi onesti. Da qui si visita anche la miniera di sale di Wieliczka.',
          en: "One of Europe's largest medieval squares, the Kazimierz district full of bars, and Polish food at honest prices. It is also the base for visiting the Wieliczka salt mine.",
          es: 'Una de las plazas medievales más grandes de Europa, el barrio de Kazimierz lleno de bares y cocina polaca a precios honestos. Desde aquí también se visita la mina de sal de Wieliczka.',
        },
      },
      {
        key: 'naples',
        name: { it: 'Napoli', en: 'Naples', es: 'Nápoles' },
        countryCode: 'IT',
        lat: 40.8518,
        lng: 14.2681,
        moods: ['food_wine', 'culture'],
        budget: 1,
        months: [4, 5, 6, 9, 10],
        text: {
          it: 'Pizza, caffè e sfogliatelle a ogni angolo, i vicoli del centro storico e il Vesuvio sullo sfondo. Con un giorno in più si aggiungono Pompei, Procida o la Costiera Amalfitana.',
          en: 'Pizza, coffee and sfogliatelle on every corner, the alleys of the old town and Vesuvius in the background. With an extra day, add Pompeii, Procida or the Amalfi Coast.',
          es: 'Pizza, café y sfogliatelle en cada esquina, los callejones del centro histórico y el Vesubio al fondo. Con un día más se suman Pompeya, Procida o la Costa Amalfitana.',
        },
      },
      {
        key: 'copenhagen',
        name: { it: 'Copenaghen', en: 'Copenhagen', es: 'Copenhague' },
        countryCode: 'DK',
        lat: 55.6761,
        lng: 12.5683,
        moods: ['culture', 'food_wine', 'relax'],
        budget: 3,
        months: [5, 6, 7, 8, 9],
        text: {
          it: 'Si gira tutto in bici, d’estate ci si tuffa nei bagni pubblici del porto e si mangia bene nei mercati coperti. Più cara della media: dividere un appartamento conviene.',
          en: 'You get around by bike, swim in the harbour baths in summer and eat well in the food halls. Pricier than average, so sharing an apartment pays off.',
          es: 'Todo se recorre en bici, en verano uno se baña en las piscinas del puerto y se come bien en los mercados cubiertos. Más cara que la media: compensa compartir apartamento.',
        },
      },
    ],
  },

  budget: {
    intro: {
      it: 'Quando nel gruppo i budget sono diversi, la meta giusta è quella dove nessuno deve rinunciare a qualcosa. Queste destinazioni hanno alloggi, cibo e trasporti economici una volta arrivati.',
      en: 'When budgets in the group differ, the right destination is one where nobody has to miss out. These places have cheap stays, food and transport once you arrive.',
      es: 'Cuando en el grupo hay presupuestos distintos, el destino adecuado es aquel donde nadie tiene que renunciar a nada. Estos lugares tienen alojamiento, comida y transporte baratos una vez allí.',
    },
    steps: [],
    places: [
      {
        key: 'sofia',
        name: same('Sofia'),
        countryCode: 'BG',
        lat: 42.6977,
        lng: 23.3219,
        moods: ['culture', 'adventure'],
        budget: 1,
        months: [5, 6, 9, 10],
        text: {
          it: 'Una capitale compatta con cattedrali ortodosse, fontane di acqua minerale calda e il monte Vitosha a mezz’ora dal centro. Mangiare fuori costa poco anche per gruppi numerosi.',
          en: 'A compact capital with Orthodox cathedrals, hot mineral water fountains and Mount Vitosha half an hour from the centre. Eating out is cheap even for big groups.',
          es: 'Una capital compacta con catedrales ortodoxas, fuentes de agua mineral caliente y el monte Vitosha a media hora del centro. Comer fuera es barato incluso para grupos grandes.',
        },
      },
      {
        key: 'vilnius',
        name: same('Vilnius'),
        countryCode: 'LT',
        lat: 54.6872,
        lng: 25.2797,
        moods: ['culture', 'nature'],
        budget: 1,
        months: [5, 6, 7, 8, 9],
        text: {
          it: 'Un centro storico barocco patrimonio UNESCO, la repubblica autoproclamata di Užupis e laghi e castelli poco lontano, come Trakai. Poco turistica e con prezzi contenuti.',
          en: 'A UNESCO-listed baroque old town, the self-proclaimed republic of Užupis, and lakes and castles nearby such as Trakai. Not overrun by tourists and reasonably priced.',
          es: 'Un casco antiguo barroco patrimonio de la UNESCO, la república autoproclamada de Užupis y lagos y castillos cerca, como Trakai. Poco turística y con precios contenidos.',
        },
      },
      {
        key: 'ksamil',
        name: same('Ksamil'),
        countryCode: 'AL',
        lat: 39.7686,
        lng: 19.9996,
        moods: ['relax', 'nature'],
        budget: 1,
        months: [6, 7, 9],
        text: {
          it: 'Acqua turchese e isolotti raggiungibili a nuoto, a pochi chilometri dal sito archeologico di Butrinto. A giugno e settembre si trovano case per gruppi a prezzi molto bassi.',
          en: 'Turquoise water and islets you can swim to, a few kilometres from the ancient site of Butrint. In June and September group houses are very affordable.',
          es: 'Agua turquesa e islotes a los que se llega nadando, a pocos kilómetros del yacimiento de Butrinto. En junio y septiembre hay casas para grupos a precios muy bajos.',
        },
      },
      {
        key: 'istanbul',
        name: { it: 'Istanbul', en: 'Istanbul', es: 'Estambul' },
        countryCode: 'TR',
        lat: 41.0082,
        lng: 28.9784,
        moods: ['culture', 'food_wine', 'nightlife'],
        budget: 1,
        months: [4, 5, 9, 10, 11],
        text: {
          it: 'Bazar, moschee, traghetti sul Bosforo al prezzo di un biglietto dell’autobus e cibo di strada ovunque. Tanta città da dividere tra chi ama la storia e chi preferisce i locali di Karaköy.',
          en: 'Bazaars, mosques, ferries across the Bosphorus for the price of a bus ticket and street food everywhere. Plenty to share out between history lovers and fans of the bars in Karaköy.',
          es: 'Bazares, mezquitas, ferris por el Bósforo al precio de un billete de autobús y comida callejera por todas partes. Mucha ciudad para repartir entre amantes de la historia y fans de los bares de Karaköy.',
        },
      },
      {
        key: 'marrakech',
        name: { it: 'Marrakech', en: 'Marrakech', es: 'Marrakech' },
        countryCode: 'MA',
        lat: 31.6295,
        lng: -7.9811,
        moods: ['culture', 'adventure', 'food_wine'],
        budget: 1,
        months: [3, 4, 5, 10, 11],
        text: {
          it: 'Un riad tutto per il gruppo, la piazza Jemaa el-Fna al tramonto e gite nel deserto di Agafay o sull’Atlante. Meglio evitare i mesi più caldi dell’estate.',
          en: 'A riad all to yourselves, Jemaa el-Fna square at sunset and trips to the Agafay desert or the Atlas mountains. Best avoided in the hottest summer months.',
          es: 'Un riad solo para el grupo, la plaza Jemaa el-Fna al atardecer y excursiones al desierto de Agafay o al Atlas. Mejor evitar los meses más calurosos del verano.',
        },
      },
      {
        key: 'hanoi',
        name: same('Hanoi'),
        countryCode: 'VN',
        lat: 21.0278,
        lng: 105.8342,
        moods: ['food_wine', 'culture', 'adventure'],
        budget: 1,
        months: [3, 4, 10, 11, 12],
        text: {
          it: 'Il volo è l’unica spesa importante: poi cibo di strada, hotel e trasporti costano pochissimo. Da qui partono le crociere nella baia di Ha Long e i treni verso nord.',
          en: 'The flight is the only big expense: after that, street food, hotels and transport cost very little. It is the starting point for Ha Long Bay cruises and trains to the north.',
          es: 'El vuelo es el único gasto importante: después, la comida callejera, los hoteles y el transporte cuestan muy poco. Desde aquí salen los cruceros por la bahía de Ha Long y los trenes hacia el norte.',
        },
      },
    ],
  },

  'summer-sea': {
    intro: {
      it: 'In gruppo il mare rende di più: una casa condivisa costa meno di tante camere e le serate diventano parte del viaggio. Se potete evitate agosto: giugno e settembre sono più economici e meno affollati.',
      en: 'The seaside works better as a group: a shared house costs less than several rooms and the evenings become part of the trip. Avoid August if you can; June and September are cheaper and quieter.',
      es: 'En grupo el mar rinde más: una casa compartida cuesta menos que varias habitaciones y las noches se convierten en parte del viaje. Evitad agosto si podéis: junio y septiembre son más baratos y tranquilos.',
    },
    steps: [],
    places: [
      {
        key: 'paros',
        name: same('Paros'),
        countryCode: 'GR',
        lat: 37.0853,
        lng: 25.15,
        moods: ['relax', 'nightlife', 'nature'],
        budget: 2,
        months: [6, 7, 9],
        text: {
          it: 'Villaggi bianchi, spiagge per tutti i gusti e traghetti rapidi per Antiparos e Naxos. Più tranquilla di Mykonos, ma con abbastanza locali a Naoussa per le serate.',
          en: 'White villages, beaches for every taste and quick ferries to Antiparos and Naxos. Calmer than Mykonos, with enough bars in Naoussa for evenings out.',
          es: 'Pueblos blancos, playas para todos los gustos y ferris rápidos a Antiparos y Naxos. Más tranquila que Mykonos, pero con bastantes bares en Naoussa para las noches.',
        },
      },
      {
        key: 'lagos',
        name: same('Lagos'),
        countryCode: 'PT',
        lat: 37.1028,
        lng: -8.673,
        moods: ['relax', 'nature', 'nightlife'],
        budget: 2,
        months: [6, 7, 8, 9],
        text: {
          it: 'Scogliere dorate, grotte da visitare in kayak e un centro vivace la sera. Una buona base per esplorare la costa dell’Algarve con un’auto a noleggio in comune.',
          en: 'Golden cliffs, sea caves to explore by kayak and a lively town centre at night. A good base for exploring the Algarve coast with a shared hire car.',
          es: 'Acantilados dorados, cuevas para visitar en kayak y un centro animado por la noche. Buena base para recorrer la costa del Algarve con un coche de alquiler compartido.',
        },
      },
      {
        key: 'hvar',
        name: same('Hvar'),
        countryCode: 'HR',
        lat: 43.1729,
        lng: 16.4411,
        moods: ['relax', 'nightlife'],
        budget: 3,
        months: [6, 7, 8, 9],
        text: {
          it: 'Baie raggiungibili in barca, le isole Pakleni davanti al porto e una movida estiva famosa in tutta la Dalmazia. Noleggiare una barca in gruppo abbassa il costo a testa.',
          en: 'Bays reached by boat, the Pakleni islands off the harbour and summer nightlife famous across Dalmatia. Hiring a boat as a group brings the cost per person down.',
          es: 'Calas a las que se llega en barco, las islas Pakleni frente al puerto y una vida nocturna veraniega famosa en toda Dalmacia. Alquilar un barco en grupo reduce el coste por persona.',
        },
      },
      {
        key: 'menorca',
        name: { it: 'Minorca', en: 'Menorca', es: 'Menorca' },
        countryCode: 'ES',
        lat: 39.9496,
        lng: 4.1104,
        moods: ['relax', 'nature', 'family'],
        budget: 2,
        months: [6, 7, 9],
        text: {
          it: 'Calette di acqua trasparente collegate dal Camí de Cavalls, un sentiero che fa il giro dell’isola. Ritmi lenti, ideale per gruppi che cercano il mare più delle discoteche.',
          en: 'Crystal-clear coves linked by the Camí de Cavalls, a path that circles the island. Slow pace, ideal for groups after the sea rather than clubs.',
          es: 'Calas de agua transparente unidas por el Camí de Cavalls, un sendero que rodea la isla. Ritmo tranquilo, ideal para grupos que buscan mar más que discotecas.',
        },
      },
      {
        key: 'salento',
        name: same('Salento'),
        countryCode: 'IT',
        lat: 40.0559,
        lng: 17.9925,
        moods: ['relax', 'food_wine', 'nightlife'],
        budget: 2,
        months: [6, 7, 9],
        text: {
          it: 'Due mari a pochi chilometri di distanza, masserie da affittare in tanti, pizzica e sagre d’estate. Gallipoli e Otranto sono le basi più comode per spostarsi tra le spiagge.',
          en: 'Two seas a few kilometres apart, farmhouses to rent as a big group, pizzica music and summer food festivals. Gallipoli and Otranto are the handiest bases for the beaches.',
          es: 'Dos mares a pocos kilómetros, masserie para alquilar entre muchos, pizzica y fiestas populares en verano. Gallipoli y Otranto son las bases más cómodas para moverse entre playas.',
        },
      },
      {
        key: 'budva',
        name: same('Budva'),
        countryCode: 'ME',
        lat: 42.2911,
        lng: 18.8403,
        moods: ['relax', 'nightlife', 'culture'],
        budget: 1,
        months: [6, 7, 9],
        text: {
          it: 'Una città vecchia fortificata sul mare, spiagge lunghe e locali aperti fino a tardi. A mezz’ora c’è la baia di Kotor, da non perdere.',
          en: 'A walled old town on the sea, long beaches and bars open until late. The Bay of Kotor, half an hour away, is not to be missed.',
          es: 'Un casco antiguo amurallado junto al mar, playas largas y bares abiertos hasta tarde. A media hora está la bahía de Kotor, imprescindible.',
        },
      },
    ],
  },

  nature: {
    intro: {
      it: 'Un viaggio nella natura unisce il gruppo: si cammina insieme, si mangia in rifugio e ci si stanca allo stesso modo. Scegliete percorsi adatti a chi è meno allenato e tenete un giorno libero per il meteo.',
      en: 'A nature trip brings a group together: you walk together, eat in mountain huts and get tired the same way. Pick routes that suit the least fit and keep a spare day for the weather.',
      es: 'Un viaje de naturaleza une al grupo: se camina juntos, se come en refugios y todos acaban igual de cansados. Elegid rutas para quien está menos en forma y guardad un día libre por el tiempo.',
    },
    steps: [],
    places: [
      {
        key: 'dolomites',
        name: { it: 'Dolomiti', en: 'Dolomites', es: 'Dolomitas' },
        countryCode: 'IT',
        lat: 46.5747,
        lng: 11.6717,
        moods: ['nature', 'adventure'],
        budget: 2,
        months: [6, 7, 8, 9],
        text: {
          it: 'Rifugi dove fermarsi a pranzo, sentieri per tutti i livelli e panorami come il Seceda o le Tre Cime di Lavaredo. Val Gardena e Alta Badia sono basi comode per un gruppo.',
          en: 'Mountain huts for lunch, trails for every level and views like Seceda or the Tre Cime di Lavaredo. Val Gardena and Alta Badia are handy bases for a group.',
          es: 'Refugios donde parar a comer, senderos de todos los niveles y vistas como el Seceda o las Tre Cime di Lavaredo. Val Gardena y Alta Badia son bases cómodas para un grupo.',
        },
      },
      {
        key: 'madeira',
        name: same('Madeira'),
        countryCode: 'PT',
        lat: 32.6669,
        lng: -16.9241,
        moods: ['nature', 'adventure', 'relax'],
        budget: 2,
        months: [4, 5, 6, 9, 10],
        text: {
          it: 'Le levadas, canali d’irrigazione con sentieri a fianco, attraversano foreste di alloro e scogliere. Clima primaverile tutto l’anno e alba sul Pico do Arieiro.',
          en: 'The levadas, irrigation channels with paths alongside, cross laurel forests and cliffs. Spring-like weather all year and sunrise on Pico do Arieiro.',
          es: 'Las levadas, canales de riego con senderos al lado, atraviesan bosques de laurisilva y acantilados. Clima primaveral todo el año y amanecer en el Pico do Arieiro.',
        },
      },
      {
        key: 'lofoten',
        name: { it: 'Isole Lofoten', en: 'Lofoten Islands', es: 'Islas Lofoten' },
        countryCode: 'NO',
        lat: 68.2342,
        lng: 14.5683,
        moods: ['nature', 'adventure'],
        budget: 3,
        months: [6, 7, 8],
        text: {
          it: 'Montagne che scendono a picco nel mare, villaggi di pescatori con i rorbuer rossi e il sole di mezzanotte d’estate. Serve un’auto: dividerla nel gruppo conviene.',
          en: 'Mountains dropping straight into the sea, fishing villages with red rorbuer cabins and the midnight sun in summer. You need a car, so sharing one makes sense.',
          es: 'Montañas que caen a pico sobre el mar, pueblos pesqueros con rorbuer rojos y el sol de medianoche en verano. Hace falta coche: compartirlo en el grupo compensa.',
        },
      },
      {
        key: 'skye',
        name: { it: 'Isola di Skye', en: 'Isle of Skye', es: 'Isla de Skye' },
        countryCode: 'GB',
        lat: 57.4125,
        lng: -6.1964,
        moods: ['nature', 'adventure'],
        budget: 2,
        months: [5, 6, 9],
        text: {
          it: 'Il Quiraing, le Fairy Pools e l’Old Man of Storr in pochi chilometri, con un meteo che cambia ogni ora. A maggio e settembre ci sono meno moscerini e meno folla.',
          en: 'The Quiraing, the Fairy Pools and the Old Man of Storr within a few miles, with weather that changes by the hour. May and September bring fewer midges and fewer crowds.',
          es: 'El Quiraing, las Fairy Pools y el Old Man of Storr a pocos kilómetros, con un tiempo que cambia cada hora. En mayo y septiembre hay menos mosquitos y menos gente.',
        },
      },
      {
        key: 'picos',
        name: same('Picos de Europa'),
        countryCode: 'ES',
        lat: 43.351,
        lng: -5.13,
        moods: ['nature', 'adventure', 'food_wine'],
        budget: 1,
        months: [5, 6, 7, 9],
        text: {
          it: 'La Ruta del Cares, i laghi di Covadonga e paesi dove si mangia fabada e si beve sidro. Meno conosciuti delle Alpi e più economici.',
          en: 'The Cares Trail, the Covadonga lakes and villages serving fabada and cider. Less known than the Alps, and cheaper.',
          es: 'La Ruta del Cares, los lagos de Covadonga y pueblos donde se come fabada y se bebe sidra. Menos conocidos que los Alpes y más económicos.',
        },
      },
      {
        key: 'bled',
        name: same('Bled'),
        countryCode: 'SI',
        lat: 46.3683,
        lng: 14.1146,
        moods: ['nature', 'relax', 'adventure'],
        budget: 2,
        months: [5, 6, 7, 9],
        text: {
          it: 'Il lago con l’isolotto e la chiesa, la gola di Vintgar e il parco del Triglav a due passi. D’estate si aggiungono rafting e canyoning sul fiume Soča.',
          en: 'The lake with its island church, Vintgar Gorge and Triglav National Park close by. In summer, add rafting and canyoning on the Soča river.',
          es: 'El lago con su islote e iglesia, la garganta de Vintgar y el parque del Triglav al lado. En verano se suman rafting y barranquismo en el río Soča.',
        },
      },
    ],
  },

  food: {
    intro: {
      it: 'Ci sono viaggi in cui i musei possono aspettare. In queste città il cibo è il motivo per partire, e ordinare tanti piatti da dividere è il modo migliore per assaggiare tutto.',
      en: 'On some trips the museums can wait. In these cities food is the reason to go, and ordering lots of dishes to share is the best way to taste everything.',
      es: 'Hay viajes en los que los museos pueden esperar. En estas ciudades la comida es el motivo del viaje, y pedir muchos platos para compartir es la mejor forma de probarlo todo.',
    },
    steps: [],
    places: [
      {
        key: 'bologna',
        name: same('Bologna'),
        countryCode: 'IT',
        lat: 44.4949,
        lng: 11.3426,
        moods: ['food_wine', 'culture'],
        budget: 2,
        months: [4, 5, 6, 9, 10],
        text: {
          it: 'Tortellini, mortadella e osterie sotto i portici, con Modena e Parma a meno di un’ora di treno per aceto balsamico e Parmigiano. Un corso di sfoglia in gruppo è un classico.',
          en: 'Tortellini, mortadella and taverns under the porticoes, with Modena and Parma under an hour away by train for balsamic vinegar and Parmigiano. A group pasta class is a classic.',
          es: 'Tortellini, mortadela y tabernas bajo los pórticos, con Módena y Parma a menos de una hora en tren para el vinagre balsámico y el Parmigiano. Un curso de pasta en grupo es un clásico.',
        },
      },
      {
        key: 'san-sebastian',
        name: same('San Sebastián'),
        countryCode: 'ES',
        lat: 43.3183,
        lng: -1.9812,
        moods: ['food_wine', 'relax'],
        budget: 3,
        months: [5, 6, 7, 8, 9],
        text: {
          it: 'Il giro dei pintxos da un bar all’altro è fatto apposta per i gruppi, e la spiaggia della Concha è in pieno centro. Tra le città con più stelle Michelin per abitante.',
          en: 'Hopping from bar to bar for pintxos is made for groups, and La Concha beach is right in town. One of the cities with the most Michelin stars per resident.',
          es: 'Ir de pintxos de bar en bar está hecho para grupos, y la playa de la Concha está en pleno centro. Una de las ciudades con más estrellas Michelin por habitante.',
        },
      },
      {
        key: 'lyon',
        name: { it: 'Lione', en: 'Lyon', es: 'Lyon' },
        countryCode: 'FR',
        lat: 45.764,
        lng: 4.8357,
        moods: ['food_wine', 'culture'],
        budget: 2,
        months: [4, 5, 6, 9, 10],
        text: {
          it: 'Considerata la capitale gastronomica di Francia: bouchon tradizionali, il mercato coperto Les Halles Paul Bocuse e i vini del Beaujolais e della Valle del Rodano a portata di gita.',
          en: "Often called France's food capital: traditional bouchons, the Les Halles Paul Bocuse food hall, and Beaujolais and Rhône Valley wines within day-trip range.",
          es: 'Considerada la capital gastronómica de Francia: bouchons tradicionales, el mercado cubierto Les Halles Paul Bocuse y los vinos del Beaujolais y del valle del Ródano a un paso.',
        },
      },
      {
        key: 'oaxaca',
        name: same('Oaxaca'),
        countryCode: 'MX',
        lat: 17.0732,
        lng: -96.7266,
        moods: ['food_wine', 'culture'],
        budget: 1,
        months: [1, 2, 3, 10, 11, 12],
        text: {
          it: 'Sette tipi di mole, mezcal da degustare nei palenques e mercati pieni di colori. Tra fine ottobre e inizio novembre il Día de Muertos rende il viaggio indimenticabile.',
          en: 'Seven kinds of mole, mezcal tastings at the palenques and colourful markets. Around the turn of October and November, Día de Muertos makes the trip unforgettable.',
          es: 'Siete tipos de mole, mezcal para catar en los palenques y mercados llenos de color. Entre finales de octubre y principios de noviembre, el Día de Muertos hace el viaje inolvidable.',
        },
      },
      {
        key: 'osaka',
        name: same('Osaka'),
        countryCode: 'JP',
        lat: 34.6937,
        lng: 135.5023,
        moods: ['food_wine', 'nightlife', 'culture'],
        budget: 2,
        months: [3, 4, 5, 10, 11],
        text: {
          it: 'Il motto locale è kuidaore, mangiare fino a rovinarsi: takoyaki e okonomiyaki a Dotonbori, izakaya economiche e Kyoto e Nara a meno di un’ora.',
          en: 'The local motto is kuidaore, eat until you drop: takoyaki and okonomiyaki in Dotonbori, cheap izakayas, and Kyoto and Nara less than an hour away.',
          es: 'El lema local es kuidaore, comer hasta arruinarse: takoyaki y okonomiyaki en Dotonbori, izakayas baratas y Kioto y Nara a menos de una hora.',
        },
      },
      {
        key: 'tbilisi',
        name: { it: 'Tbilisi', en: 'Tbilisi', es: 'Tiflis' },
        countryCode: 'GE',
        lat: 41.7151,
        lng: 44.8271,
        moods: ['food_wine', 'culture', 'nightlife'],
        budget: 1,
        months: [5, 6, 9, 10],
        text: {
          it: 'Khachapuri, khinkali e vino fatto in anfore di terracotta secondo una tradizione millenaria. Le cantine della Kakheti sono una gita perfetta per il gruppo.',
          en: 'Khachapuri, khinkali and wine made in clay amphorae following a tradition thousands of years old. The wineries of Kakheti make a perfect group day trip.',
          es: 'Khachapuri, khinkali y vino elaborado en ánforas de barro según una tradición milenaria. Las bodegas de Kajetia son una excursión perfecta para el grupo.',
        },
      },
    ],
  },

  nightlife: {
    intro: {
      it: 'Per un viaggio di gruppo che ruota intorno alle serate servono locali per tutti i gusti, trasporti notturni e un posto dove recuperare il giorno dopo. Queste città hanno tutto.',
      en: 'A group trip built around nights out needs venues for every taste, late-night transport and somewhere to recover the next day. These cities have it all.',
      es: 'Un viaje en grupo que gira en torno a las noches necesita locales para todos los gustos, transporte nocturno y un sitio donde recuperarse al día siguiente. Estas ciudades lo tienen todo.',
    },
    steps: [],
    places: [
      {
        key: 'berlin',
        name: { it: 'Berlino', en: 'Berlin', es: 'Berlín' },
        countryCode: 'DE',
        lat: 52.52,
        lng: 13.405,
        moods: ['nightlife', 'culture'],
        budget: 2,
        months: [5, 6, 7, 8, 9],
        text: {
          it: 'Club techno aperti per tutto il weekend, bar a Kreuzberg e Friedrichshain e storia a ogni angolo di giorno. All’ingresso dei club i gruppi numerosi fanno bene a dividersi.',
          en: 'Techno clubs open all weekend long, bars in Kreuzberg and Friedrichshain and history on every corner by day. Large groups do better splitting up at club doors.',
          es: 'Clubes de techno abiertos todo el fin de semana, bares en Kreuzberg y Friedrichshain e historia en cada esquina de día. En la puerta de los clubes, a los grupos grandes les conviene separarse.',
        },
      },
      {
        key: 'barcelona',
        name: { it: 'Barcellona', en: 'Barcelona', es: 'Barcelona' },
        countryCode: 'ES',
        lat: 41.3874,
        lng: 2.1686,
        moods: ['nightlife', 'culture', 'relax'],
        budget: 2,
        months: [5, 6, 9, 10],
        text: {
          it: 'Si cena tardi, si esce ancora più tardi e il giorno dopo si recupera in spiaggia. Gaudí, il Born e il Gòtic accontentano anche chi nel gruppo non ama fare le ore piccole.',
          en: "Dinner is late, going out even later, and the next day you recover on the beach. Gaudí, El Born and the Gothic Quarter win over anyone in the group who isn't a night owl.",
          es: 'Se cena tarde, se sale aún más tarde y al día siguiente se recupera en la playa. Gaudí, el Born y el Gòtic contentan también a quien en el grupo no es de trasnochar.',
        },
      },
      {
        key: 'belgrade',
        name: { it: 'Belgrado', en: 'Belgrade', es: 'Belgrado' },
        countryCode: 'RS',
        lat: 44.7866,
        lng: 20.4489,
        moods: ['nightlife', 'food_wine'],
        budget: 1,
        months: [5, 6, 7, 8, 9],
        text: {
          it: 'D’estate la notte si passa sugli splavovi, i locali galleggianti sulla Sava e sul Danubio. Prezzi bassi e un’accoglienza calorosa per i gruppi.',
          en: 'In summer, nights are spent on the splavovi, floating clubs on the Sava and the Danube. Low prices and a warm welcome for groups.',
          es: 'En verano la noche se pasa en los splavovi, locales flotantes sobre el Sava y el Danubio. Precios bajos y una acogida calurosa para los grupos.',
        },
      },
      {
        key: 'amsterdam',
        name: same('Amsterdam'),
        countryCode: 'NL',
        lat: 52.3676,
        lng: 4.9041,
        moods: ['nightlife', 'culture'],
        budget: 3,
        months: [4, 5, 6, 9],
        text: {
          it: 'Canali da girare in barca, brown café storici, club e festival quasi ogni weekend d’estate. Gli alloggi costano: conviene prenotare presto e in tanti.',
          en: 'Canals to explore by boat, historic brown cafés, clubs and festivals almost every summer weekend. Accommodation is pricey, so book early and share.',
          es: 'Canales para recorrer en barco, brown cafés históricos, clubes y festivales casi todos los fines de semana de verano. El alojamiento es caro: conviene reservar pronto y compartir.',
        },
      },
      {
        key: 'ibiza',
        name: same('Ibiza'),
        countryCode: 'ES',
        lat: 38.9067,
        lng: 1.4206,
        moods: ['nightlife', 'relax'],
        budget: 3,
        months: [6, 7, 8, 9],
        text: {
          it: 'I superclub più famosi del mondo, ma anche calette tranquille a nord e tramonti a Cala Comte. Una villa in gruppo spesso costa meno di tante camere d’albergo separate.',
          en: "The world's most famous superclubs, but also quiet coves in the north and sunsets at Cala Comte. A group villa often costs less than several separate hotel rooms.",
          es: 'Los superclubs más famosos del mundo, pero también calas tranquilas en el norte y atardeceres en Cala Comte. Una villa en grupo suele costar menos que varias habitaciones de hotel.',
        },
      },
      {
        key: 'prague',
        name: { it: 'Praga', en: 'Prague', es: 'Praga' },
        countryCode: 'CZ',
        lat: 50.0755,
        lng: 14.4378,
        moods: ['nightlife', 'culture'],
        budget: 1,
        months: [4, 5, 6, 9, 10, 12],
        text: {
          it: 'Birra tra le più economiche d’Europa, club su più piani e un centro storico da favola da vedere di giorno. Perfetta per gli addii al celibato e al nubilato, ma non solo.',
          en: "Some of Europe's cheapest beer, multi-storey clubs and a fairytale old town to see by day. Perfect for stag and hen parties, but not only.",
          es: 'Cerveza de las más baratas de Europa, discotecas de varias plantas y un casco antiguo de cuento para ver de día. Perfecta para despedidas de soltero, pero no solo.',
        },
      },
    ],
  },

  winter: {
    intro: {
      it: "L'inverno non è solo settimana bianca: c'è chi insegue l'aurora, chi cerca i mercatini e chi scappa al sole. Qui trovate un'idea per ogni tipo di gruppo.",
      en: "Winter isn't just ski week: some chase the aurora, some want Christmas markets and some escape to the sun. Here is an idea for every kind of group.",
      es: 'El invierno no es solo semana de esquí: hay quien persigue la aurora, quien busca mercadillos y quien se escapa al sol. Aquí hay una idea para cada tipo de grupo.',
    },
    steps: [],
    places: [
      {
        key: 'rovaniemi',
        name: same('Rovaniemi'),
        countryCode: 'FI',
        lat: 66.5039,
        lng: 25.7294,
        moods: ['nature', 'adventure', 'family'],
        budget: 3,
        months: [1, 2, 3, 12],
        text: {
          it: 'Sul circolo polare artico: safari con gli husky, motoslitte e notti in cottage di vetro a caccia di aurore. Prenotare le escursioni in gruppo abbassa molto i costi.',
          en: 'On the Arctic Circle: husky safaris, snowmobiles and nights in glass cabins chasing the aurora. Booking excursions as a group cuts costs a lot.',
          es: 'En el círculo polar ártico: safaris con huskies, motos de nieve y noches en cabañas de cristal buscando auroras. Reservar las excursiones en grupo abarata mucho.',
        },
      },
      {
        key: 'tromso',
        name: same('Tromsø'),
        countryCode: 'NO',
        lat: 69.6492,
        lng: 18.9553,
        moods: ['nature', 'adventure'],
        budget: 3,
        months: [1, 2, 3, 11, 12],
        text: {
          it: 'Una delle città migliori per l’aurora boreale, con fiordi, balene in inverno e una vita serale sorprendente per la latitudine. Da fine novembre a metà gennaio il sole non sorge.',
          en: "One of the best cities for the northern lights, with fjords, whales in winter and surprisingly lively evenings for its latitude. From late November to mid-January the sun doesn't rise.",
          es: 'Una de las mejores ciudades para ver la aurora boreal, con fiordos, ballenas en invierno y una vida nocturna sorprendente para su latitud. De finales de noviembre a mediados de enero el sol no sale.',
        },
      },
      {
        key: 'vienna',
        name: { it: 'Vienna', en: 'Vienna', es: 'Viena' },
        countryCode: 'AT',
        lat: 48.2082,
        lng: 16.3738,
        moods: ['culture', 'food_wine', 'romantic'],
        budget: 2,
        months: [1, 2, 11, 12],
        text: {
          it: 'Mercatini di Natale con vin brulé, caffè storici e concerti. A gennaio e febbraio c’è la stagione dei balli, un’esperienza diversa da fare tutti insieme.',
          en: 'Christmas markets with mulled wine, historic coffee houses and concerts. January and February bring ball season, something different to do together.',
          es: 'Mercadillos de Navidad con vino caliente, cafés históricos y conciertos. En enero y febrero llega la temporada de bailes, una experiencia distinta para hacer juntos.',
        },
      },
      {
        key: 'tenerife',
        name: same('Tenerife'),
        countryCode: 'ES',
        lat: 28.2916,
        lng: -16.6291,
        moods: ['relax', 'nature', 'adventure'],
        budget: 2,
        months: [1, 2, 3, 11, 12],
        text: {
          it: 'Temperature primaverili anche in inverno, il vulcano Teide da salire e cieli perfetti per osservare le stelle. Voli economici da molte città europee.',
          en: 'Spring temperatures even in winter, the Teide volcano to climb and perfect skies for stargazing. Cheap flights from many European cities.',
          es: 'Temperaturas primaverales incluso en invierno, el volcán Teide para subir y cielos perfectos para ver las estrellas. Vuelos baratos desde muchas ciudades europeas.',
        },
      },
      {
        key: 'cappadocia',
        name: same('Cappadocia'),
        countryCode: 'TR',
        lat: 38.6431,
        lng: 34.8289,
        moods: ['romantic', 'adventure', 'nature'],
        budget: 1,
        months: [1, 2, 3, 4, 10, 11],
        text: {
          it: 'Mongolfiere all’alba sopra i camini delle fate, hotel scavati nella roccia e, d’inverno, la neve che imbianca le valli. Meno affollata e più economica fuori stagione.',
          en: 'Hot-air balloons at dawn over the fairy chimneys, cave hotels carved into the rock and, in winter, snow on the valleys. Quieter and cheaper out of season.',
          es: 'Globos al amanecer sobre las chimeneas de hadas, hoteles excavados en la roca y, en invierno, nieve en los valles. Menos concurrida y más barata fuera de temporada.',
        },
      },
      {
        key: 'livigno',
        name: same('Livigno'),
        countryCode: 'IT',
        lat: 46.5386,
        lng: 10.1356,
        moods: ['adventure', 'nature', 'nightlife'],
        budget: 2,
        months: [1, 2, 3, 12],
        text: {
          it: 'Piste per tutti i livelli, snowpark e un après-ski vivace. È zona extradoganale, quindi carburante e acquisti costano meno.',
          en: 'Slopes for every level, snow parks and lively après-ski. It is a duty-free zone, so fuel and shopping cost less.',
          es: 'Pistas de todos los niveles, snowparks y un après-ski animado. Es zona libre de impuestos, así que el combustible y las compras cuestan menos.',
        },
      },
    ],
  },
}
