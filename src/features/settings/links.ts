/** Plain helpers (no zod) so client components can import them without shipping the schema. */
export const whatsappHref = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
