"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

const id = z.uuid();

/** Marks one submission as read (idempotent: the first read time is kept). */
export async function markRead(raw: string): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(raw);
  if (!parsed.success) return;
  await db
    .update(contactMessages)
    .set({ readAt: new Date() })
    .where(and(eq(contactMessages.id, parsed.data), isNull(contactMessages.readAt)));
  // The sidebar counter lives in the panel layout.
  revalidatePath("/admin", "layout");
}

export async function deleteSubmission(raw: string): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(raw);
  if (!parsed.success) return;
  await db.delete(contactMessages).where(eq(contactMessages.id, parsed.data));
  revalidatePath("/admin", "layout");
}
