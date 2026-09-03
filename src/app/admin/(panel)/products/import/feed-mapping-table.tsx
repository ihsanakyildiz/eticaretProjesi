"use client";

import { isXmlFeedTargetKey, type XmlFeedTagPreview, type XmlFeedTargetKey } from "@/lib/xml-product-feed-shared";

const inputClass =
  "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

function tagLabel(path: string, style: "plain" | "xml") {
  const last = path.split(".").pop() ?? path;
  if (last.startsWith("@")) return last;
  return style === "xml" ? `<${last}>` : last;
}

export function FeedMappingTable({
  title,
  hint,
  pathHeader,
  tags,
  mapping,
  groupedFields,
  onMapping,
  pathStyle = "plain",
}: {
  title: string;
  hint: string;
  pathHeader: string;
  tags: XmlFeedTagPreview[];
  mapping: Record<string, XmlFeedTargetKey>;
  groupedFields: Array<{
    id: string;
    label: string;
    fields: Array<{ key: XmlFeedTargetKey; header: string }>;
  }>;
  onMapping: (xmlPath: string, field: XmlFeedTargetKey | "") => void;
  pathStyle?: "plain" | "xml";
}) {
  if (tags.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-2 overflow-x-auto rounded-md border border-[#eef0f2]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2.5">{pathHeader}</th>
              <th className="px-3 py-2.5">Örnek değer</th>
              <th className="px-3 py-2.5">Mağaza alanı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f2]">
            {tags.map((tag) => (
              <tr key={tag.path}>
                <td className="px-3 py-2 align-top">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800">
                    {tagLabel(tag.path, pathStyle)}
                  </code>
                  {tag.path.includes(".") ? (
                    <p className="mt-1 text-[11px] text-slate-400">{tag.path}</p>
                  ) : null}
                </td>
                <td className="max-w-xs px-3 py-2 align-top text-xs text-slate-500">{tag.sample || "—"}</td>
                <td className="px-3 py-2 align-top">
                  <select
                    className={inputClass}
                    value={mapping[tag.path] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      onMapping(tag.path, isXmlFeedTargetKey(value) ? value : "");
                    }}
                  >
                    <option value="">Eşleme</option>
                    {groupedFields.map((group) => (
                      <optgroup key={group.id} label={group.label}>
                        {group.fields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.header}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
