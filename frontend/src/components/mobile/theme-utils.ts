import { CSSProperties } from "react";

export type ThemeParticle = {
  left: number;
  startTop: number;
  width: number;
  height: number;
  delay: number;
  duration: number;
  opacity: number;
  driftX: number;
  rotate: number;
  blur: number;
  background: string;
  radius: string;
};

export const THEME_DEFAULTS = {
  backgroundColor: "#fdf8f5",
  textColor: "#4a2c2a",
  accentColor: "#803b2a",
  pattern: "none",
  effectType: "none",
  fontFamily: "'Noto Sans KR', sans-serif",
  fontSize: 16,
  scrollReveal: false,
};

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}

export function toRgba(hex: string, alpha: number): string {
  const normalized = normalizeHexColor(hex, "#000000");
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function clampThemeFontSize(value: number | undefined): number {
  if (!Number.isFinite(value)) return THEME_DEFAULTS.fontSize;
  return Math.min(28, Math.max(12, Math.round(value as number)));
}

export function buildThemePatternStyle(pattern: string, accentColor: string, patternColor: string = accentColor): CSSProperties {
  const patternTone = normalizeHexColor(patternColor, accentColor);
  const strong = toRgba(patternTone, 0.12);
  const soft = toRgba(patternTone, 0.08);
  const subtle = toRgba(patternTone, 0.05);

  if (pattern === "dot") {
    return {
      backgroundImage: `radial-gradient(circle at 1px 1px, ${soft} 1px, transparent 0)`,
      backgroundSize: "16px 16px",
    };
  }

  if (pattern === "grid") {
    return {
      backgroundImage: `linear-gradient(${subtle} 1px, transparent 1px), linear-gradient(90deg, ${subtle} 1px, transparent 1px)`,
      backgroundSize: "22px 22px",
    };
  }

  if (pattern === "linen") {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${subtle} 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, ${subtle} 0 2px, transparent 2px 8px)`,
      backgroundSize: "18px 18px",
    };
  }

  if (pattern === "petal") {
    return {
      backgroundImage: `radial-gradient(circle at 20% 20%, ${soft} 0 12%, transparent 13%), radial-gradient(circle at 80% 80%, ${strong} 0 10%, transparent 11%)`,
      backgroundSize: "48px 48px",
    };
  }

  if (pattern === "paper") {
    return {
      backgroundImage:
        `repeating-linear-gradient(45deg, ${toRgba(patternTone, 0.048)} 0 2px, transparent 2px 10px),` +
        `repeating-linear-gradient(-45deg, ${toRgba(patternTone, 0.048)} 0 2px, transparent 2px 10px)`,
      backgroundSize: "18px 18px, 18px 18px",
    };
  }

  if (pattern === "photo-texture-1") {
    const textureSvg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 220'>` +
      `<filter id='grain'><feTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='3' seed='17' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0.12'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.32'/></feComponentTransfer></filter>` +
      `<rect width='220' height='220' fill='#f5f0e7'/>` +
      `<rect width='220' height='220' filter='url(#grain)' fill='#e1d6c3'/>` +
      `</svg>`;

    return {
      backgroundImage:
        `url("data:image/svg+xml,${encodeURIComponent(textureSvg)}"),` +
        "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(242,233,220,0.32) 100%)",
      backgroundSize: "220px 220px, 100% 100%",
      backgroundPosition: "0 0, 0 0",
      backgroundRepeat: "repeat",
    };
  }

  if (pattern === "photo-texture-2") {
    const textureSvg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>` +
      `<filter id='weaveNoise'><feTurbulence type='fractalNoise' baseFrequency='0.62' numOctaves='2' seed='41' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0.08'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.2'/></feComponentTransfer></filter>` +
      `<rect width='240' height='240' fill='#f4f4f1'/>` +
      `<g stroke='#e8e7e1' stroke-width='0.8' opacity='0.42'><path d='M0 24 L240 0'/><path d='M0 72 L240 48'/><path d='M0 120 L240 96'/><path d='M0 168 L240 144'/><path d='M0 216 L240 192'/><path d='M0 264 L240 240'/></g>` +
      `<rect width='240' height='240' filter='url(#weaveNoise)' fill='#d8d8d1'/>` +
      `</svg>`;

    return {
      backgroundImage:
        `url("data:image/svg+xml,${encodeURIComponent(textureSvg)}"),` +
        "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(241,241,236,0.22) 100%)",
      backgroundSize: "240px 240px, 100% 100%",
      backgroundPosition: "0 0, 0 0",
      backgroundRepeat: "repeat",
    };
  }

  if (pattern === "photo-texture-3") {
    const textureSvg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>` +
      `<filter id='paper'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' seed='53' stitchTiles='stitch'/><feDisplacementMap in='SourceGraphic' scale='1.4'/></filter>` +
      `<linearGradient id='g' x1='0' y1='0' x2='0.9' y2='1'><stop offset='0' stop-color='#f5f5f5'/><stop offset='1' stop-color='#ececec'/></linearGradient>` +
      `<rect width='200' height='200' fill='url(#g)'/>` +
      `<g opacity='0.26'><path d='M0 42 C30 31 59 51 90 41 C120 31 150 51 200 37' stroke='#d8d8d8' stroke-width='1' fill='none'/><path d='M0 96 C34 81 62 105 96 92 C130 80 158 104 200 88' stroke='#d4d4d4' stroke-width='1' fill='none'/><path d='M0 154 C34 140 66 164 104 148 C136 134 165 156 200 142' stroke='#d7d7d7' stroke-width='1' fill='none'/></g>` +
      `<rect width='200' height='200' filter='url(#paper)' fill='#d8d8d8' opacity='0.12'/>` +
      `</svg>`;

    return {
      backgroundImage:
        `url("data:image/svg+xml,${encodeURIComponent(textureSvg)}"),` +
        "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(236,236,236,0.2) 100%)",
      backgroundSize: "200px 200px, 100% 100%",
      backgroundPosition: "0 0, 0 0",
      backgroundRepeat: "repeat",
    };
  }

  if (pattern === "hanji-texture") {
    const red = Number.parseInt(patternTone.slice(1, 3), 16);
    const green = Number.parseInt(patternTone.slice(3, 5), 16);
    const blue = Number.parseInt(patternTone.slice(5, 7), 16);
    const makeSeededRandom = (initialSeed: number) => {
      let seed = initialSeed >>> 0;
      return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    };
    const createHanjiEmbossSvg = (tileSize: number, count: number, seed: number) => {
      const rand = makeSeededRandom(seed);
      let shapes = "";

      for (let index = 0; index < count; index += 1) {
        const x = rand() * tileSize;
        const y = rand() * tileSize;
        const isLongStroke = rand() < 0.34;
        const rx = isLongStroke ? 2.4 + rand() * 5.6 : 0.8 + rand() * 2.7;
        const ry = isLongStroke ? 0.3 + rand() * 0.9 : 0.38 + rand() * 1.26;
        const angle = -82 + rand() * 164;
        const darkDx = 0.28 + rand() * 0.58;
        const darkDy = 0.28 + rand() * 0.58;
        const lightDx = 0.24 + rand() * 0.5;
        const lightDy = 0.24 + rand() * 0.5;
        const darkOpacity = 0.036 + rand() * 0.07;
        const lightOpacity = 0.042 + rand() * 0.08;
        const highlightRx = Math.max(0.24, rx - (0.2 + rand() * 0.58));
        const highlightRy = Math.max(0.16, ry - (0.08 + rand() * 0.3));

        shapes +=
          `<g transform='rotate(${angle.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})'>` +
          `<ellipse cx='${(x + darkDx).toFixed(2)}' cy='${(y + darkDy).toFixed(2)}' rx='${rx.toFixed(2)}' ry='${ry.toFixed(2)}' fill='black' opacity='${darkOpacity.toFixed(3)}'/>` +
          `<ellipse cx='${(x - lightDx).toFixed(2)}' cy='${(y - lightDy).toFixed(2)}' rx='${highlightRx.toFixed(2)}' ry='${highlightRy.toFixed(2)}' fill='white' opacity='${lightOpacity.toFixed(3)}'/>` +
          `</g>`;
      }

      return (
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${tileSize} ${tileSize}' preserveAspectRatio='none'>` +
        `<filter id='hanji' x='-6%' y='-6%' width='112%' height='112%'><feGaussianBlur stdDeviation='0.38'/></filter>` +
        `<g filter='url(#hanji)'>${shapes}</g>` +
        `</svg>`
      );
    };

    const hanjiSvgA = createHanjiEmbossSvg(460, 186, 17);
    const hanjiSvgB = createHanjiEmbossSvg(336, 128, 59);
    const hanjiReliefSvg = createHanjiEmbossSvg(620, 88, 83);
    const hanjiNoiseSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 260 260'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' seed='31' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.078'/></feComponentTransfer></filter><rect width='260' height='260' fill='rgb(${red},${green},${blue})' opacity='0.24' filter='url(#n)'/></svg>`;
    const hanjiTextureA = `url("data:image/svg+xml,${encodeURIComponent(hanjiSvgA)}")`;
    const hanjiTextureB = `url("data:image/svg+xml,${encodeURIComponent(hanjiSvgB)}")`;
    const hanjiReliefTexture = `url("data:image/svg+xml,${encodeURIComponent(hanjiReliefSvg)}")`;
    const hanjiNoiseTexture = `url("data:image/svg+xml,${encodeURIComponent(hanjiNoiseSvg)}")`;

    return {
      backgroundImage:
        `${hanjiReliefTexture},` +
        `${hanjiTextureA},` +
        `${hanjiTextureB},` +
        `${hanjiNoiseTexture},` +
        `linear-gradient(180deg, ${toRgba("#ffffff", 0.068)} 0%, ${toRgba("#000000", 0.03)} 100%)`,
      backgroundSize: "620px 620px, 460px 460px, 336px 336px, 260px 260px, 100% 100%",
      backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0",
      backgroundRepeat: "repeat",
    };
  }

  if (pattern === "paper-texture") {
    return {};
  }

  return {};
}

export function buildThemeParticles(effectType: string): ThemeParticle[] {
  if (effectType === "none") return [];

  const densityMap: Record<string, number> = {
    "cherry-blossom": 34,
    snow: 52,
    "falling-leaves": 28,
    "baby-breath": 56,
    forsythia: 32,
  };
  const count = densityMap[effectType] ?? 0;
  if (count <= 0) return [];

  const colorMap: Record<string, string[]> = {
    "cherry-blossom": ["#ffd6e5", "#ffc0d8", "#ffe7f0"],
    snow: ["#ffffff", "#eff7ff", "#f8fcff"],
    "falling-leaves": ["#d58f55", "#bf6f3a", "#cf9f6d"],
    "baby-breath": ["#ffffff", "#f4f8ff", "#eef6ff"],
    forsythia: ["#ffe55c", "#ffd733", "#f5c112"],
  };
  const colors = colorMap[effectType] ?? ["#ffffff"];

  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const baseSize = effectType === "baby-breath" ? 3 : effectType === "snow" ? 6 : 7;
    const width = baseSize + (seed % 5) * (effectType === "snow" ? 1.2 : 0.9);
    const height = effectType === "falling-leaves" || effectType === "forsythia" ? width * 1.6 : width;
    const radius =
      effectType === "cherry-blossom"
        ? "58% 42% 54% 46%"
        : effectType === "falling-leaves"
          ? "45% 55% 48% 52%"
          : effectType === "forsythia"
            ? "42% 58% 44% 56%"
            : "9999px";

    return {
      left: (seed * 17 + (seed % 7) * 9) % 100,
      startTop: -18 - (seed % 6) * 4,
      width,
      height,
      delay: -((seed % 14) * 0.7),
      duration: 11 + (seed % 8) * 1.2,
      opacity: effectType === "baby-breath" ? 0.55 + (seed % 3) * 0.12 : 0.45 + (seed % 4) * 0.1,
      driftX: -34 + (seed % 9) * 8,
      rotate: seed % 2 === 0 ? 320 : -320,
      blur: effectType === "baby-breath" ? 8 : effectType === "snow" ? 4 : 3,
      background: colors[seed % colors.length],
      radius,
    };
  });
}
