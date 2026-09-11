"use client";

export const FEED_SYNC_LOCK_TITLE =
  "İşaretliyse XML ve API senkronu fiyatı, stoğu ve satışı değiştirmez.";

export function FeedSyncLockCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center justify-center pt-1.5" title={FEED_SYNC_LOCK_TITLE}>
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[#c5cbd3] text-[#405189] accent-[#405189] disabled:cursor-not-allowed disabled:opacity-50"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
