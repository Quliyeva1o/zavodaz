import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Every admin page and admin server action calls this first. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/admin/login");
  return user;
}

export { createSession, deleteSession, getSessionUser, type SessionUser } from "./session";
