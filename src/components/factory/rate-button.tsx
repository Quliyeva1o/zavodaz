import { Icon } from "@/components/ui/icon";

/**
 * Figma "Button" 368:11008 (desktop 180×40) / 762:23123 (mobile full width): gray-200 stroke, r4, Star 20 + body-md.
 * Slot for the rating modal: Task 5 turns this into the lazy dialog trigger (the modal chunk loads on click).
 */
export function RateButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className="relative flex h-10 w-full items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 px-2.5 text-body-md text-brand-950 after:absolute after:inset-x-0 after:-inset-y-1"
    >
      <Icon name="star-outline" size={20} />
      {label}
    </button>
  );
}
