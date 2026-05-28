import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

interface BuildOptions {
  width?: number;
  height?: number;
  background?: string;
  color?: string;
  font?: string;
  padding?: number;
  repeatX?: number;
  repeatY?: number;
}

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
};

export const buildTextTexture = (
  text: string,
  opts: BuildOptions = {},
): CanvasTexture | null => {
  if (typeof document === "undefined") return null;

  const {
    width = 1024,
    height = 1024,
    background = "#f5e6c8",
    color = "#3a1f0a",
    font = "bold 36px ui-sans-serif, system-ui, sans-serif",
    padding = 48,
    repeatX = 1,
    repeatY = 1,
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = "top";

  const maxWidth = width - padding * 2;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = Math.round(parseInt(font, 10) * 1.25) || 44;

  let y = padding;
  for (const line of lines) {
    if (y + lineHeight > height - padding) break;
    ctx.fillText(line, padding, y, maxWidth);
    y += lineHeight;
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
  return texture;
};
