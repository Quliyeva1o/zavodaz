"use client";

import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { myRating, rateFactory } from "@/features/factory/rating-actions";

export type RatingLabels = {
  title: string;
  group: string;
  /** "{n} ulduz" */
  star: string;
  submit: string;
  close: string;
  thanksTitle: string;
  thanksText: string;
  home: string;
  errors: { invalid: string; rateLimited: string; notFound: string; server: string; load: string };
};
export type RatingDialogProps = { slug: string; labels: RatingLabels; homeHref: string; onClose: () => void };

const STARS = [1, 2, 3, 4, 5];
const button = "flex h-12 w-full items-center justify-center rounded-[4px] bg-brand-950 px-2.5 text-body-md text-white hover:bg-brand-900 disabled:bg-gray-100 disabled:text-gray-300";

/**
 * Figma "Pop up" 368:11391 (choose) / 368:11506 (Təsdiqlə active) / 368:11779 (thanks); mobile 767:23522 / 767:23698 / 767:23946.
 * Desktop: centred 656 (thanks 448), padding 24, r10, title 22 + X 32, five 107 stars 17.9 apart, 48px button, gap 40.
 * Mobile: a sheet on the bottom edge (r24 on top, padding 16, top 40), 40px stars spread over the width, no X.
 * Five native radios (arrow keys, one tab stop, aria-label each) in a fieldset; the earlier vote is preselected.
 * Loaded on the first click of "Qiymətləndir" (RateButton); the browser's modal <dialog> traps focus and handles Escape.
 */
export function RatingDialog({ slug, labels, homeHref, onClose }: RatingDialogProps) {
  const ref = useModalDialog(true);
  const titleId = useId();
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const close = () => ref.current?.close();

  // The voter's earlier score (cookie): a small uncached request, never part of the cached page.
  useEffect(() => {
    let live = true;
    myRating(slug)
      .then((previous) => live && previous && setScore((current) => current || previous))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);

  async function submit() {
    setPending(true);
    setError("");
    try {
      const result = await rateFactory(slug, score);
      if (result.ok) setDone(true);
      else setError(labels.errors[result.error]);
    } catch {
      setError(labels.errors.server);
    }
    setPending(false);
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`m-auto max-w-[calc(100%-32px)] rounded-[10px] bg-white p-6 backdrop:bg-black/20 max-lg:m-0 max-lg:mt-auto max-lg:w-full max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-[24px] max-lg:px-4 max-lg:pb-4 max-lg:pt-10 ${done ? "lg:w-[448px]" : "lg:w-[656px]"}`}
    >
      <div className="flex flex-col gap-6 lg:gap-10">
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="flex items-center gap-4">
            <h2 id={titleId} className="min-w-0 flex-1 text-mob-subtitle text-brand-950 lg:text-subtitle-1-medium">
              {done ? labels.thanksTitle : labels.title}
            </h2>
            <button type="button" onClick={close} aria-label={labels.close} className="relative size-8 shrink-0 rounded-[4px] after:absolute after:-inset-1.5 max-lg:hidden">
              <Icon name="x-brand" size={32} />
            </button>
          </div>
          {done ? (
            <p className="text-body-sm text-gray-700 lg:text-body-md">{labels.thanksText}</p>
          ) : (
            <fieldset className="flex justify-between lg:justify-start lg:gap-[17.88px]">
              <legend className="sr-only">{labels.group}</legend>
              {STARS.map((n) => (
                <label key={n} className="cursor-pointer rounded-[4px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-500">
                  <input
                    type="radio"
                    name="score"
                    value={n}
                    checked={score === n}
                    onChange={() => setScore(n)}
                    aria-label={labels.star.replace("{n}", String(n))}
                    className="sr-only"
                  />
                  {n <= score ? (
                    <Icon name="star" size={107} className="size-10 lg:size-[107px]" />
                  ) : (
                    <span aria-hidden className="block size-10 bg-gray-200 [mask-image:url(/icons/star.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] lg:size-[107px]" />
                  )}
                </label>
              ))}
            </fieldset>
          )}
          {error && (
            <p role="alert" className="text-body-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        {done ? (
          <ButtonLink href={homeHref} className="flex h-12 w-full px-2.5">
            {labels.home}
          </ButtonLink>
        ) : (
          <button type="button" disabled={score === 0 || pending} onClick={submit} className={button}>
            {labels.submit}
          </button>
        )}
      </div>
    </dialog>
  );
}
