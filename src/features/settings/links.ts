/** Plain helpers (no zod) so client components can import them without shipping the schema. */
export const whatsappHref = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const SOCIALS = ["facebook", "instagram", "linkedin", "x", "youtube", "tiktok"] as const;
export type SocialKey = (typeof SOCIALS)[number];

/** Brand names as link labels (the icons have no text). */
export const SOCIAL_LABELS: Record<SocialKey, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", x: "X", youtube: "YouTube", tiktok: "TikTok" };
