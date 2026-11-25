"use client";

import { useState } from "react";

/**
 * The shared loader of the lazy dialogs (rating, lightbox, mobile menu, mobile filter): none of them is in the page's
 * initial JS, its chunk is requested by the first click (a plain `import()`, no next/dynamic runtime).
 * `load()` returns a promise that resolves once the component is available (from then on the first value is `C`) and
 * rejects when the chunk cannot be fetched; every caller decides its own fallback.
 */
export function useLazy<C>(importer: () => Promise<C>) {
  const [box, setBox] = useState<{ C: C } | null>(null);
  const load = () => importer().then((C) => setBox({ C }));
  return [box?.C ?? null, load] as const;
}
