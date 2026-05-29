#!/usr/bin/env bash
# Generates a clean, original pi image (public-domain digits + own composition)
# to replace the unverified-provenance pi.jpg used by the pi-image / pi-pie demos.
# Output: 855x1077 JPEG, matching the dimensions declared in the manifests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="$(mktemp /tmp/pi.XXXXXX.svg)"
OUT="$(mktemp /tmp/pi.XXXXXX.jpg)"

# First 800 digits of pi after the decimal point (mathematical fact, not copyrightable).
PI_DIGITS="1415926535897932384626433832795028841971693993751\
0582097494459230781640628620899862803482534211706\
7982148086513282306647093844609550582231725359408\
1284811174502841027019385211055596446229489549303\
8196442881097566593344612847564823378678316527120\
1909145648566923460348610454326648213393607260249\
1412737245870066063155881748815209209628292540917\
1536436789259036001133053054882046652138414695194\
1511609433057270365759591953092186117381932611793\
1051185480744623799627495673518857527248912279381\
8301194912983367336244065664308602139494639522473\
7190702179860943702770539217176293176752384674818\
4676694051320005681271452635608277857713427577896"

# Build digit block: wrap into lines of ~33 chars.
DIGIT_LINES=$(echo "$PI_DIGITS" | fold -w33)

# Emit SVG line tspans.
y=300; LINES_SVG=""
while IFS= read -r line; do
  LINES_SVG+="<text x=\"427\" y=\"$y\" text-anchor=\"middle\" font-family=\"monospace\" font-size=\"30\" letter-spacing=\"2\" fill=\"#2b2b2b\">$line</text>"
  y=$((y+38))
done <<< "$DIGIT_LINES"

cat > "$SVG" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="855" height="1077" viewBox="0 0 855 1077">
  <rect width="855" height="1077" fill="#f4efe4"/>
  <text x="427" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="200" font-weight="bold" fill="#1a1a1a">&#960;</text>
  $LINES_SVG
</svg>
SVG

echo "Rendering SVG -> JPG (855x1077)..."
rsvg-convert -w 855 -h 1077 "$SVG" -o /tmp/pi-render.png
magick /tmp/pi-render.png -quality 90 "$OUT"

cp "$OUT" "$ROOT/public/manifest/pi-image/pi.jpg"
cp "$OUT" "$ROOT/public/manifest/pi-pie/pi.jpg"
echo "Wrote pi-image/pi.jpg and pi-pie/pi.jpg"
ls -l "$ROOT/public/manifest/pi-image/pi.jpg"
