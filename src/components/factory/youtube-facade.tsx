"use client";

import { useState, type ReactNode } from "react";

/**
 * YouTube "facade" (controller decision): the page loads only the i.ytimg.com preview (server-rendered `children`, see
 * VideoFacade) and a play button; the youtube-nocookie.com player — and all of YouTube's JS — is created on the first
 * click. Without JavaScript the link opens the video on youtube.com.
 */
export function YouTubeFacade({ id, label, className, children }: { id: string; label: string; className: string; children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  return playing ? (
    <div className={className}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={label}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 size-full"
      />
    </div>
  ) : (
    <a
      href={`https://www.youtube.com/watch?v=${id}`}
      target="_blank"
      rel="noopener"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        setPlaying(true);
      }}
      className={`group ${className}`}
    >
      {children}
    </a>
  );
}
