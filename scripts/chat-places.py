"""The places "Paste the group chat" recognises (src/lib/chatPlaces.ts), from GeoNames (CC BY 4.0, geonames.org):
the world's cities of 100,000 people or more and every capital, with the names they go by in other languages
("Lisbona", "Lisboa"…), each name pointing to the biggest place that has it. Countries come from the app's own country
data and the guides' places are added in the browser.

Writes public/data/chat-places.json, fetched only when someone opens the paste sheet. Run again to refresh:
  python scripts/chat-places.py
"""
import io
import json
import re
import unicodedata
import urllib.request
import zipfile

SOURCE = 'https://download.geonames.org/export/dump/cities15000.zip'
MIN_POPULATION = 100_000

# Place names that are also everyday words in Italian, English or Spanish: in a chat they're far more often the word
# ("como" = like, "nice", "split", "male" = bad…) than the place, so they're never matched.
COMMON_WORDS = set(
    """como nice split reading mobile bath sale male vale orange mira aria bella dove fine santa salt wells sandy
    victoria florida natal pace gela rosario mercedes dolores paz sucre libertad concordia esperanza providence
    independence liberty union aurora phoenix troy hamilton jackson lincoln franklin washington
    marion columbia richmond springfield arlington jefferson madison clinton salem dayton warren lafayette brighton
    hope march may june august nancy pau lion noto sora alba bra ferro ponte campo ciudad colon cruz rio reina
    real puerto villa nueva nuevo norte sur este oeste central nord sud ovest est grande piccolo nuova nuovo monte
    bello forte chico fiume gente nada para playa pueblo"""
    .split()
)


# Names two places share, where the one trips go to isn't the bigger one.
PREFER = {'valencia': 'ES', 'cordoba': 'ES', 'cordova': 'ES', 'granada': 'ES', 'alexandria': 'EG', 'santiago': 'CL'}


def norm(text):
    text = unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode()
    return ' '.join(re.sub(r"[^a-z' ]+", ' ', text.replace("'", ' ')).split())


NAME = re.compile(r"^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ɏ' .\-]{2,29}$")

with urllib.request.urlopen(urllib.request.Request(SOURCE, headers={'User-Agent': 'RoamieBuild/1.0 (+https://roamie.org)'})) as response:
    archive = zipfile.ZipFile(io.BytesIO(response.read()))
lines = archive.read('cities15000.txt').decode('utf8').splitlines()

places, best = [], {}
for line in lines:
    row = line.split('\t')
    population, feature = int(row[14] or 0), row[7]
    if population < MIN_POPULATION and feature != 'PPLC':
        continue
    # Real names only: capitalised, in Latin script, not codes (IATA) or romanised transliterations.
    names = {row[1], row[2]} | {a for a in row[3].split(',') if NAME.match(a) and not a.isupper()}
    index = len(places)
    places.append([row[1], row[8], round(float(row[4]), 3), round(float(row[5]), 3), population])
    for name in names:
        key = norm(name)
        # Short words only ("A Mi", "La La") are ordinary words in a chat, whatever place they also name.
        if len(key) < 4 or key in COMMON_WORDS or max(len(w) for w in key.split()) < 4:
            continue
        current = places[best[key]] if key in best else None
        preferred = PREFER.get(key)
        if current is None:
            best[key] = index
        elif preferred:
            # The preferred country's place wins over any other; between two of the same standing, the bigger.
            if (row[8] == preferred) > (current[1] == preferred) or ((row[8] == preferred) == (current[1] == preferred) and current[4] < population):
                best[key] = index
        elif current[4] < population:
            best[key] = index

data = {
    'source': 'GeoNames (CC BY 4.0), geonames.org',
    'places': [p[:4] for p in places],
    'names': dict(sorted(best.items())),
}
with open('public/data/chat-places.json', 'w', encoding='utf8') as out:
    json.dump(data, out, ensure_ascii=False, separators=(',', ':'))
print(f'{len(places)} places, {len(best)} names')
