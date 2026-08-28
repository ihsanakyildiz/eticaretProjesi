"use client";

type ThemeColorFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
};

function normalizePickerValue(value: string) {
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    return value;
  }
  return "#7c3aed";
}

export function ThemeColorField({
  id,
  name,
  label,
  value,
  hint,
  onChange,
}: ThemeColorFieldProps) {
  const isHex = value.trim().startsWith("#");

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={normalizePickerValue(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-[#e9ebec] bg-white p-1"
          aria-label={`${label} renk seçici`}
        />
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#7c3aed veya rgba(...)"
          className="min-w-0 flex-1 rounded-md border border-[#e9ebec] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20"
        />
      </div>
      {hint ? (
        <p className="mt-1 text-xs text-slate-400">
          {hint}
          {!isHex ? " · rgba() değerleri için metin alanını kullanın" : null}
        </p>
      ) : null}
    </div>
  );
}
