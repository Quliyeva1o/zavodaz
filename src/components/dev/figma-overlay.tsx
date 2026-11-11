"use client";

import { useEffect, useState } from "react";

type Box = { top: number; left: number; src: string };

/** `?overlay=header` puts the Figma export over [data-figma=header] at 50% opacity. Key "o" toggles it. */
export function FigmaOverlay() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const name = new URLSearchParams(location.search).get("overlay");
    if (!name) return;
    const bp = innerWidth >= 1024 ? "desktop" : "mobile";
    const place = () =>
      setBoxes(
        [...document.querySelectorAll<HTMLElement>(`[data-figma="${name}"]`)].map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top + scrollY, left: r.left + scrollX, src: `/api/dev/figma/${bp}/${name}` };
        }),
      );
    place();
    const onKey = (e: KeyboardEvent) => e.key === "o" && setVisible((v) => !v);
    addEventListener("resize", place);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("keydown", onKey);
    };
  }, []);

  if (!visible) return null;
  return boxes.map((b, i) => (
    // eslint-disable-next-line @next/next/no-img-element -- dev-only overlay
    <img
      key={i}
      src={b.src}
      alt=""
      style={{ position: "absolute", top: b.top, left: b.left, opacity: 0.5, pointerEvents: "none", zIndex: 9999 }}
    />
  ));
}
