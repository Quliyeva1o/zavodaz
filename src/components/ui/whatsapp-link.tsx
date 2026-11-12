import { whatsappHref } from "@/features/settings/links";
import { Icon } from "./icon";

/** Figma "Birbaşa Whatsapp-a yazın" pill: 40px high, green tint, 4px radius; content starts after the
 * caller's padding (Figma cross=MIN, padding 10 / 24 inside the stroke, so 1px less here). */
export function WhatsAppLink({ number, label, className = "" }: { number: string; label: string; className?: string }) {
  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noopener"
      className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-whatsapp-border bg-whatsapp-bg text-body-md text-whatsapp-text ${className}`}
    >
      <Icon name="whatsapp" size={20} />
      {label}
    </a>
  );
}
