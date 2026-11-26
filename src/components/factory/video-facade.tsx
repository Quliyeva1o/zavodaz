import { YouTubeFacade } from "./youtube-facade";

/**
 * Figma 368:12679 (media tab 893×510, Play 90) / 368:12056 (about preview 462×323, Play 60) / 767:23198 (mobile 288×186,
 * Play 38): the video image under a 40% black layer, the Play triangle (white 40%) in the middle with a background
 * blur clipped to the triangle — Figma "Background blur 20" = CSS blur(10px), as in Figma's own SVG export.
 * The markup is rendered here on the server; the client part (YouTubeFacade) only swaps in the player on click.
 */
export function VideoFacade({ id, label, className, playClass }: { id: string; label: string; className: string; playClass: string }) {
  return (
    <YouTubeFacade id={id} label={label} className={`relative block overflow-hidden rounded-md bg-brand-950 lg:rounded-[10px] ${className}`}>
      {/* hqdefault exists for every video, but it is 4:3 with black bars around a 16:9 video: scaled 125% the bars fall outside every box (462×323 … 893×510). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own preview image */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-125 object-cover" />
      <span aria-hidden className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/30" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static icon */}
      <img
        src="/icons/play.svg"
        alt=""
        aria-hidden
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-[10px] [clip-path:polygon(25%_9.37%,93.75%_50%,25%_90.63%)] ${playClass}`}
      />
    </YouTubeFacade>
  );
}
