"""The display fonts the app ships, cut from Fraunces (@fontsource-variable/fraunces) to what the design uses:

- fraunces-{latin,latin-ext}.woff2: the upright face with its "soft" axis pinned to 100 and "wonky" to 0, as every
  heading sets them (index.css), keeping weight and optical size variable. About half the size of the full font.
- roamie-wordmark.woff2: the logo, the italic "wonky" face at one weight and size, only the letters of "roamie"
  (3 KB instead of the 150 KB italic font).

Run again only after updating the font package or changing those settings:
  python scripts/fonts.py   (needs: pip install fonttools brotli)"""
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = 'node_modules/@fontsource-variable/fraunces/files'
OUT = 'src/assets/fonts'

for script in ('latin', 'latin-ext'):
    font = instancer.instantiateVariableFont(TTFont(f'{SRC}/fraunces-{script}-full-normal.woff2'), {'SOFT': 100, 'WONK': 0})
    font.flavor = 'woff2'
    font.save(f'{OUT}/fraunces-{script}.woff2')

wordmark = instancer.instantiateVariableFont(TTFont(f'{SRC}/fraunces-latin-full-italic.woff2'), {'wght': 500, 'opsz': 26, 'SOFT': 100, 'WONK': 1})
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
subsetter = subset.Subsetter(options)
subsetter.populate(text='roamieROAMIE')
subsetter.subset(wordmark)
wordmark.flavor = 'woff2'
# In public/, not bundled: Vite would inline a file this small as a data: URI, which the CSP's font-src forbids.
wordmark.save('public/fonts/roamie-wordmark.woff2')
