const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  "*": "nwnnwnwnn",
};

function patternModules(pattern: string): number[] {
  const modules: number[] = [];
  for (const ch of pattern) {
    modules.push(ch === "w" ? 3 : 1);
  }
  return modules;
}

export function code39Svg(value: string, options?: { height?: number; module?: number }): string {
  const height = options?.height ?? 64;
  const module = options?.module ?? 1.6;
  const payload = `*${value.replace(/[^0-9A-Z\-]/gi, "").toUpperCase()}*`;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const character of payload) {
    const pattern = CODE39[character];
    if (!pattern) continue;
    const widths = patternModules(pattern);
    widths.forEach((width, index) => {
      if (index % 2 === 0) bars.push({ x, w: width * module });
      x += width * module;
    });
    x += module;
  }
  const width = Math.ceil(x);
  const rects = bars
    .map((bar) => `<rect x="${bar.x.toFixed(2)}" y="0" width="${bar.w.toFixed(2)}" height="${height}" fill="#000" />`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${value}">${rects}</svg>`;
}
