/**
 * The one link rule for rich text: the admin editor (client), the save action and the public
 * renderer all use it. Kept free of zod and server code so the editor bundle stays small.
 */
export const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

export const isSafeHref = (href: string): boolean => SAFE_HREF.test(href);
