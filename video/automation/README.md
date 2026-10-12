# Post automatici per i social

Ogni giorno feriale alle 16:00 UTC GitHub Actions prepara un post dalle guide di Roamie:

- **lunedì, mercoledì e venerdì un video** (Reel, Short, TikTok) con musica ed effetti sonori;
- **martedì e giovedì un carosello** di immagini (Instagram, TikTok): copertina, una slide per meta, slide finale.

Per ogni post il bot:

1. **sceglie** formato e mete (`plan.mjs`);
2. **scrive** titolo e didascalia con l'AI di Mistral (`copy.mjs`);
3. **genera** il video o le slide con Remotion e li **controlla** (`run.mjs`);
4. te li **manda su Telegram** con i testi pronti e li **pubblica** da solo sui social collegati (`publish/`);
5. **salva lo storico** sul branch `social-history`, che serve a non ripetersi.

## Le barriere

- **Formati:** tre (la ruota decide, dove andare a [mese], A o B?). Mai lo stesso due volte di fila, e nessuno più di due volte negli ultimi quattro post.
- **Caroselli:** 5 mete (4 se le regole ne lasciano meno) da una guida o al meglio in un mese. Una meta non torna in un carosello prima di 30 giorni, né il giorno dopo un video che l'ha mostrata (7 giorni); una guida aspetta 35 giorni.
- **Mete:** nessuna riproposta prima di 30 giorni (21 solo se proprio non c’è alternativa: con le 66 mete attuali e 3 post a settimana non succede). I confronti A/B non si ripetono mai. Un mese non torna prima di 200 giorni.
- **Fatti:** nomi, paesi, mesi migliori, budget, frasi e foto vengono solo dalle guide. L'AI scrive solo il titolo d'apertura e due frasi di didascalia.
- **Testi dell'AI:** vengono scartati se:
  - contengono numeri inventati, prezzi, link, hashtag, maiuscole urlate o parole proibite ("imperdibile", "garantito"…);
  - sono nella lingua sbagliata;
  - somigliano troppo a un post precedente (confronto sulle sequenze di parole).
  
  L'AI ha tre tentativi; se fallisce, si usa una frase scritta a mano non ancora usata di recente.
- **Hashtag, link, crediti delle foto e invito finale:** scelti dal codice, mai dall'AI.
- **Musica:** ogni formato ha i suoi brani (in `public/music`, provenienza in `SOURCES.md`). Un formato non riusa il brano della volta precedente. Sopra ci sono effetti sonori generati dal codice: il tic della ruota, il "ding" della meta e il "whoosh" ai cambi di scena.
- **Foto:** quelle satellitari, mappe, bandiere e loghi sono escluse. Per ogni foto c'è il credito della licenza, nel video e nella didascalia.
- **Video:** viene controllato prima di pubblicare (dimensione e durata esatta). Se un controllo fallisce, non si pubblica nulla.
- **Interruttore generale:** finché la variabile `SOCIAL_PUBLISH` non vale `on`, ogni esecuzione è una prova. Il video si scarica dalla pagina dell'esecuzione (Artifacts).

## Cosa configurare (una volta)

In GitHub → Settings → Secrets and variables → Actions.

### 1. AI (consigliata)

**Secret** `MISTRAL_API_KEY`: la stessa chiave che hai messo su Supabase. Senza, si usano solo le frasi scritte a mano: funziona, ma è meno vario.

### 2. Il kit su Telegram (per pubblicare a mano, con la musica)

I suoni di tendenza di TikTok e Instagram si possono aggiungere solo dentro le app, non via API. Per questo il bot può fermarsi prima della pubblicazione e mandarti su Telegram il video e i testi già pronti, ognuno copiabile con un tocco. Tu salvi il video, lo carichi dall'app, scegli il suono e incolli i testi.

1. Su Telegram apri [@BotFather](https://t.me/BotFather), scrivi `/newbot` e scegli un nome. Ti dà un **token**.
2. Apri la chat con il tuo nuovo bot e scrivigli un messaggio qualsiasi.
3. Apri `https://api.telegram.org/bot<TOKEN>/getUpdates` (con il tuo token al posto di `<TOKEN>`) e copia il numero in `"chat":{"id": ...}`.
4. **Secrets:** `TELEGRAM_BOT_TOKEN` (il token) e `TELEGRAM_CHAT_ID` (il numero).

Il kit arriva a ogni esecuzione, anche quando `SOCIAL_PUBLISH` è spento: è il modo consigliato se vuoi mettere tu la musica. Se il kit non arriva, l'esecuzione risulta fallita su GitHub, così te ne accorgi.

### 3. Le immagini dei caroselli

Instagram e TikTok non accettano immagini caricate: le scaricano da un indirizzo pubblico. Il bot le mette su Supabase (funzione `social-media`), che le serve come `roamie.org/social/...` e le cancella dopo 21 giorni.

1. Genera una password lunga e casuale (ad esempio con il generatore del tuo gestore di password, almeno 32 caratteri).
2. Su Supabase → Edge Functions → **Secrets** aggiungi `SOCIAL_UPLOAD_SECRET` con quel valore.
3. Su GitHub aggiungi il **secret** `SOCIAL_UPLOAD_SECRET` con lo **stesso** valore.

Senza, i caroselli arrivano solo su Telegram.

### 4. YouTube Shorts

1. Su [Google Cloud Console](https://console.cloud.google.com/) crea un progetto e abilita **YouTube Data API v3**.
2. In **OAuth consent screen** scegli "External", aggiungi lo scope `youtube.upload` e poi **pubblica l'app ("In production")**. In modalità "Testing" il token scade dopo 7 giorni.
3. In **Client** crea un client di tipo **Applicazione web**, con URI di reindirizzamento autorizzato `https://developers.google.com/oauthplayground`.
4. Ottieni un refresh token per il tuo canale, ad esempio con l'[OAuth Playground](https://developers.google.com/oauthplayground): ingranaggio → "Use your own OAuth credentials", scope `https://www.googleapis.com/auth/youtube.upload`.
5. **Secrets:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

Finché Google non verifica l'app, i video caricati via API restano **privati**. La verifica si chiede dalla stessa console ("API audit"). Nel frattempo puoi impostare la variabile `YOUTUBE_PRIVACY` = `private` per rendere esplicito questo stato.

### 5. Instagram (Reel e caroselli)

1. L'account Instagram deve essere **Business o Creator** e collegato a una **Pagina Facebook**.
2. Su [developers.facebook.com](https://developers.facebook.com/) crea un'app di tipo "Business" con i permessi `instagram_basic`, `instagram_content_publish`, `pages_show_list` e `pages_read_engagement`. Per pubblicare sul **tuo** account basta l'app in modalità sviluppo, con te come amministratore.
3. Con il Graph API Explorer:
   - genera un **token utente a lunga durata**;
   - chiama `GET /me/accounts`, che dà il token della Pagina, uno che **non scade**;
   - chiama `GET /{page-id}?fields=instagram_business_account`, che dà l'id Instagram.
4. **Secrets:** `INSTAGRAM_USER_ID` (l'id Instagram) e `INSTAGRAM_ACCESS_TOKEN` (il token della Pagina).

Facoltativo: la variabile `META_GRAPH_VERSION` (predefinita `v26.0`). Aggiornala quando Meta ritira la versione.

### 6. TikTok

Su TikTok video e caroselli arrivano **in bozza**: ti arriva una notifica nell'app, scegli un suono di tendenza (solo l'app può farlo) e pubblichi incollando la didascalia del kit Telegram. Ci vogliono circa 30 secondi.

L'account deve essere **personale o Creator**, non Business: gli account Business non possono usare i brani di tendenza.

1. Su [developers.tiktok.com](https://developers.tiktok.com/) crea un'app di tipo **Other** con **Login Kit** e **Content Posting API**.
2. Verifica il dominio **roamie.org** (record TXT su Cloudflare, dove sta il DNS): serve ai caroselli, perché TikTok scarica le slide da `roamie.org/social`.
3. Usa il **Sandbox** (la revisione dell'app non serve per caricare sul proprio account): scope `user.info.basic` e `video.upload`, Redirect URI `https://roamie.org/terms`, e il tuo account tra i **Target users**.
4. Autorizza l'account aprendo `https://www.tiktok.com/v2/auth/authorize/?client_key=CLIENT_KEY&response_type=code&scope=user.info.basic,video.upload&redirect_uri=https%3A%2F%2Froamie.org%2Fterms&state=roamie` e scambia il `code` che compare nell'indirizzo con un refresh token (POST a `https://open.tiktokapis.com/v2/oauth/token/` con `grant_type=authorization_code`). Il refresh token vale un anno.
5. **Secrets:** `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` (quelli del sandbox), `TIKTOK_REFRESH_TOKEN`.

Se un giorno vuoi la pubblicazione diretta dei video, senza bozza: scope `video.publish` e variabile `TIKTOK_MODE` = `direct` (finché TikTok non approva l'app, quei post sono solo **privati**; dopo, `TIKTOK_PRIVACY` = `PUBLIC_TO_EVERYONE`). I caroselli restano sempre in bozza.

### 7. Accendere

- **Variabile** `SOCIAL_PUBLISH` = `on`.
- **Variabile** `VIDEO_LANG` = `it` (oppure `en`).

Ogni social senza chiavi viene saltato, gli altri pubblicano lo stesso.

## Provare a mano

- **Da GitHub:** Actions → Social videos → Run workflow. Nel campo "kind" puoi scrivere `video` o `carousel` per forzare il tipo di post.
- **In locale (senza pubblicare):**

  ```bash
  cd video
  node --experimental-strip-types automation/run.mjs
  ```

## Rinnovi

- **YouTube e Instagram:** con le impostazioni sopra, i token non scadono.
- **TikTok:** il refresh token va rinnovato una volta l'anno.
- **Se un social smette di pubblicare:** lo vedi nel riepilogo dell'esecuzione su GitHub, con il motivo.
