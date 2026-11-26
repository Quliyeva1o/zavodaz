import { Icon } from "@/components/ui/icon";
import { starFills } from "./star-fills";

/**
 * Figma card stars (281:7099 / 1054:41919): 5 × 24 (mobile 20), gap 4. Figma only draws filled and half stars,
 * so an empty star is the same star shape as a mask in gray-200. The factory page header (331:10196) draws an empty
 * star as the yellow outline (`empty="outline"`, the star-outline shape in the star colour).
 */
export function Stars({ rating, label, className = "", empty = "gray" }: { rating: number; label: string; className?: string; empty?: "gray" | "outline" }) {
  const emptyClass = empty === "outline" ? "bg-star [mask-image:url(/icons/star-outline.svg)]" : "bg-gray-200 [mask-image:url(/icons/star.svg)]";
  return (
    <div role="img" aria-label={label} className={`flex items-center gap-1 ${className}`}>
      {starFills(rating).map((fill, i) =>
        fill === "empty" ? (
          <span
            key={i}
            aria-hidden
            className={`size-5 ${emptyClass} [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] lg:size-6`}
          />
        ) : (
          <Icon key={i} name={fill === "half" ? "star-half" : "star"} size={24} className="size-5 lg:size-6" />
        ),
      )}
    </div>
  );
}
