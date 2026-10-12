# Video automatici per i social

Tre volte a settimana (lunedì, mercoledì e venerdì alle 16:00 UTC) GitHub Actions:

1. **sceglie** formato e mete dalle guide di Roamie (`plan.mjs`);
2. **scrive** titolo e didascalia con l'AI di Mistral (`copy.mjs`);
3. **genera** il video con Remotion e lo **controlla** (`run.mjs`);
4. te lo **manda su Telegram** con i testi pronti, da pubblicare a mano con la musica, e/o lo **pubblica** da solo sui social collegati (`publish/`);
5. **salva lo storico** sul branch `social-history`, che serve a non ripetersi.

## Le barriere

- **Formati:** tre (la ruota decide, dove andare a [mese], A o B?). Mai lo stesso due volte di fila, e nessuno più di due volte negli ultimi quattro post.
- **Mete:** nessuna riproposta prima di 30 giorni (21 solo se proprio non c’è alternativa: con le 66 mete attuali e 3 post a settimana non succede). I confronti A/B non si ripetono mai. Un mese non torna prima di 200 giorni.
- **Fatti:** nomi, paesi, mesi migliori, budget, frasi e foto vengono solo dalle guide. L'AI scrive solo il titolo d'apertura e due frasi di didascalia.
- **Testi dell'AI:** vengono scartati se:
  - contengono numeri inventati, prezzi, link, hashtag, maiuscole urlate o parole proibite ("imperdibile", "garantito"…);
  - sono nella lingua sbagliata;
  - somigliano troppo a un post precedente (confronto sulle sequenze di parole).
  
  L'AI ha tre tentativi; se fallisce, si usa una frase scritta a mano non ancora usata di recente.
- **Hashtag, link, crediti delle foto e invito finale:** scelti dal codice, mai dall'AI.
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

### 3. YouTube Shorts

1. Su [Google Cloud Console](https://console.cloud.google.com/) crea un progetto e abilita **YouTube Data API v3**.
2. In **OAuth consent screen** scegli "External", aggiungi lo scope `youtube.upload` e poi **pubblica l'app ("In production")**. In modalità "Testing" il token scade dopo 7 giorni.
3. In **Client** crea un client di tipo **Applicazione web**, con URI di reindirizzamento autorizzato `https://developers.google.com/oauthplayground`.
4. Ottieni un refresh token per il tuo canale, ad esempio con l'[OAuth Playground](https://developers.google.com/oauthplayground): ingranaggio → "Use your own OAuth credentials", scope `https://www.googleapis.com/auth/youtube.upload`.
5. **Secrets:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

Finché Google non verifica l'app, i video caricati via API restano **privati**. La verifica si chiede dalla stessa console ("API audit"). Nel frattempo puoi impostare la variabile `YOUTUBE_PRIVACY` = `private` per rendere esplicito questo stato.

### 4. Instagram Reels

1. L'account Instagram deve essere **Business o Creator** e collegato a una **Pagina Facebook**.
2. Su [developers.facebook.com](https://developers.facebook.com/) crea un'app di tipo "Business" con i permessi `instagram_basic`, `instagram_content_publish`, `pages_show_list` e `pages_read_engagement`. Per pubblicare sul **tuo** account basta l'app in modalità sviluppo, con te come amministratore.
3. Con il Graph API Explorer:
   - genera un **token utente a lunga durata**;
   - chiama `GET /me/accounts`, che dà il token della Pagina, uno che **non scade**;
   - chiama `GET /{page-id}?fields=instagram_business_account`, che dà l'id Instagram.
4. **Secrets:** `INSTAGRAM_USER_ID` (l'id Instagram) e `INSTAGRAM_ACCESS_TOKEN` (il token della Pagina).

Facoltativo: la variabile `META_GRAPH_VERSION` (predefinita `v24.0`). Aggiornala quando Meta ritira la versione.

### 5. TikTok

1. Su [developers.tiktok.com](https://developers.tiktok.com/) crea un'app con il prodotto **Content Posting API** e lo scope `video.publish`.
2. Autorizza il tuo account e salva il **refresh token** (vale un anno).
3. **Secrets:** `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`.

Finché TikTok non approva l'app, i post possono essere solo **privati** (`SELF_ONLY`). Dopo l'approvazione imposta la variabile `TIKTOK_PRIVACY` = `PUBLIC_TO_EVERYONE`.

### 6. Accendere

- **Variabile** `SOCIAL_PUBLISH` = `on`.
- **Variabile** `VIDEO_LANG` = `it` (oppure `en`).

Ogni social senza chiavi viene saltato, gli altri pubblicano lo stesso.

## Provare a mano

- **Da GitHub:** Actions → Social videos → Run workflow.
- **In locale (senza pubblicare):**

  ```bash
  cd video
  node --experimental-strip-types automation/run.mjs
  ```

## Rinnovi

- **YouTube e Instagram:** con le impostazioni sopra, i token non scadono.
- **TikTok:** il refresh token va rinnovato una volta l'anno.
- **Se un social smette di pubblicare:** lo vedi nel riepilogo dell'esecuzione su GitHub, con il motivo.
