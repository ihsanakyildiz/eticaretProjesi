export const GRID_BREAKPOINTS = ["xs", "sm", "md", "lg", "xl"] as const;
export type GridBreakpoint = (typeof GRID_BREAKPOINTS)[number];

export type GridColumnSpan = Partial<Record<GridBreakpoint, number>> & {
  /** Mobil varsayılan (Bootstrap col-*) — genelde 12 */
  xs: number;
};

export type GridColumnDef = {
  id: string;
  span: GridColumnSpan;
};

export type GridRowConfig = {
  columns: GridColumnDef[];
  /** Bootstrap g-* (0–5) */
  gutter: 0 | 1 | 2 | 3 | 4 | 5;
  alignItems: "start" | "center" | "stretch";
  /** true = .container benzeri max-width sarmalayıcı */
  useContainer: boolean;
};

export type GridColPlacement = {
  columnId: string;
};

export const GRID_PRESETS: {
  id: string;
  label: string;
  description: string;
  spans: number[];
}[] = [
  { id: "12", label: "1 kolon", description: "Tam genişlik", spans: [12] },
  { id: "6-6", label: "2 eşit", description: "6 + 6", spans: [6, 6] },
  { id: "4-4-4", label: "3 eşit", description: "4 + 4 + 4", spans: [4, 4, 4] },
  { id: "3-3-3-3", label: "4 eşit", description: "3 + 3 + 3 + 3", spans: [3, 3, 3, 3] },
  { id: "8-4", label: "8 + 4", description: "Geniş + dar", spans: [8, 4] },
  { id: "4-8", label: "4 + 8", description: "Dar + geniş", spans: [4, 8] },
  { id: "3-9", label: "3 + 9", description: "Yan menü + içerik", spans: [3, 9] },
  { id: "9-3", label: "9 + 3", description: "İçerik + yan", spans: [9, 3] },
  { id: "5-7", label: "5 + 7", description: "Dengesiz iki kolon", spans: [5, 7] },
  { id: "7-5", label: "7 + 5", description: "Dengesiz iki kolon", spans: [7, 5] },
];

export function createGridColumnId() {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

export function spanFromMd(md: number): GridColumnSpan {
  const clamped = Math.max(1, Math.min(12, Math.round(md)));
  return {
    xs: 12,
    sm: clamped >= 6 ? clamped : 12,
    md: clamped,
    lg: clamped,
    xl: clamped,
  };
}

export function createGridColumnsFromSpans(spans: number[]): GridColumnDef[] {
  return spans.map((span) => ({
    id: createGridColumnId(),
    span: spanFromMd(span),
  }));
}

export function getDefaultGridRowConfig(): GridRowConfig {
  return {
    columns: createGridColumnsFromSpans([6, 6]),
    gutter: 4,
    alignItems: "stretch",
    useContainer: true,
  };
}

function parseSpanValue(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(12, Math.round(raw)));
}

export function parseGridColumnDef(raw: unknown): GridColumnDef | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const id =
    typeof obj.id === "string" && obj.id.trim()
      ? obj.id.trim().slice(0, 40)
      : createGridColumnId();

  const spanRaw =
    obj.span && typeof obj.span === "object" && !Array.isArray(obj.span)
      ? (obj.span as Record<string, unknown>)
      : obj;

  const xs = parseSpanValue(spanRaw.xs, 12);
  const span: GridColumnSpan = { xs };
  for (const bp of ["sm", "md", "lg", "xl"] as const) {
    if (spanRaw[bp] !== undefined) {
      span[bp] = parseSpanValue(spanRaw[bp], xs);
    }
  }
  if (span.md === undefined && typeof obj.md === "number") {
    span.md = parseSpanValue(obj.md, xs);
  }

  return { id, span };
}

export function parseGridRowConfig(raw: unknown): GridRowConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const defaults = getDefaultGridRowConfig();

  const columnsRaw = Array.isArray(obj.columns) ? obj.columns : [];
  const columns = columnsRaw
    .map(parseGridColumnDef)
    .filter((item): item is GridColumnDef => Boolean(item))
    .slice(0, 12);

  const gutterRaw = typeof obj.gutter === "number" ? Math.round(obj.gutter) : defaults.gutter;
  const gutter = ([0, 1, 2, 3, 4, 5] as const).includes(gutterRaw as 0 | 1 | 2 | 3 | 4 | 5)
    ? (gutterRaw as 0 | 1 | 2 | 3 | 4 | 5)
    : defaults.gutter;

  const alignItems =
    obj.alignItems === "start" ||
    obj.alignItems === "center" ||
    obj.alignItems === "stretch"
      ? obj.alignItems
      : defaults.alignItems;

  return {
    columns: columns.length > 0 ? columns : defaults.columns,
    gutter,
    alignItems,
    useContainer: typeof obj.useContainer === "boolean" ? obj.useContainer : true,
  };
}

export function parseGridColPlacement(raw: unknown): GridColPlacement | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.columnId !== "string" || !obj.columnId.trim()) return undefined;
  return { columnId: obj.columnId.trim().slice(0, 40) };
}

/** Bootstrap benzeri sınıf adları: col-12 col-md-6 … */
export function gridColumnClassName(span: GridColumnSpan): string {
  const classes = [`pg-col-${span.xs}`];
  for (const bp of ["sm", "md", "lg", "xl"] as const) {
    const value = span[bp];
    if (typeof value === "number") {
      classes.push(`pg-col-${bp}-${value}`);
    }
  }
  return classes.join(" ");
}

export function gridRowClassName(config: GridRowConfig): string {
  const classes = ["pg-row", `pg-g-${config.gutter}`];
  if (config.alignItems === "center") classes.push("pg-align-center");
  if (config.alignItems === "start") classes.push("pg-align-start");
  return classes.join(" ");
}

export function applyGridPreset(
  current: GridRowConfig,
  presetId: string,
): GridRowConfig {
  const preset = GRID_PRESETS.find((item) => item.id === presetId);
  if (!preset) return current;

  const nextColumns = createGridColumnsFromSpans(preset.spans);
  // Eski kolon id’lerini mümkün olduğunca koru (içerik kaybını azalt)
  const merged = nextColumns.map((column, index) => ({
    ...column,
    id: current.columns[index]?.id ?? column.id,
  }));

  return { ...current, columns: merged };
}
