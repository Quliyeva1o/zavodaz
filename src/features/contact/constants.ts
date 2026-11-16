/** Zod-free constants, shared by the schema (server) and the form (client). */
export const MESSAGE_MAX = 200;
export const CONTACT_FIELDS = ["firstName", "lastName", "email", "phone", "topic", "message"] as const;
