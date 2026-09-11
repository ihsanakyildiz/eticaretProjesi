"use client";

import {
  SECTION_HIDE_BREAKPOINTS,
  type SectionHideBreakpoint,
} from "@/lib/page-sections";

export function SectionHideBreakpointsFields({
  selected = [],
}: {
  selected?: SectionHideBreakpoint[];
}) {
  return (
    <fieldset className="rounded-lg border border-[#e9ebec] bg-[#f8f9fb] p-3">
      <input type="hidden" name="hideBreakpointsTouched" value="1" />
      <legend className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Teknolojiye göre gizle
      </legend>
      <p className="mb-2 text-[11px] text-slate-500">
        İstediğiniz ekran aralıklarını işaretleyin. Birden fazla seçilebilir.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SECTION_HIDE_BREAKPOINTS.map((item) => (
          <label
            key={item.value}
            className="flex cursor-pointer flex-col gap-0.5 rounded-md border border-[#e9ebec] bg-white px-2.5 py-2 text-sm text-slate-700 has-[:checked]:border-[#405189] has-[:checked]:bg-[#405189]/5"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hideBreakpoints"
                value={item.value}
                defaultChecked={selected.includes(item.value)}
                className="h-4 w-4 rounded border-[#c5cbd3] accent-[#405189]"
              />
              <span className="font-medium">{item.label}</span>
            </span>
            <span className="pl-6 text-[11px] text-slate-400">{item.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
