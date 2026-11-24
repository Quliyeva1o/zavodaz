import { Icon } from "@/components/ui/icon";
import { starFills } from "./star-fills";

/**
 * Figma card stars (281:7099 / 1054:41919): 5 × 24 (mobile 20), gap 4. Figma only draws filled and half stars,
 * so an empty star is the same star shape as a mask in gray-200.
 */
export function Stars({ rating, label, className = "" }: { rating: number; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={`flex items-center gap-1 ${className}`}>
      {starFills(rating).map((fill, i) =>
        fill === "empty" ? (
          <span
            key={i}
            aria-hidden
            className="size-5 bg-gray-200 [mask-image:url(/icons/star.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] lg:size-6"
          />
        ) : (
          <Icon key={i} name={fill === "half" ? "star-half" : "star"} size={24} className="size-5 lg:size-6" />
        ),
      )}
    </div>
  );
}
