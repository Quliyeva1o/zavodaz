import "server-only";
import { count, desc, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";

export const SUBMISSIONS_PAGE = 50;

/** Microsecond-precise ISO text of created_at: a JS Date would cut it to ms and the keyset would repeat a row. */
const createdText = sql<string>`to_char(${contactMessages.createdAt} at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
/** "<created_at iso µs>|<id>": the id breaks ties between rows created in the same microsecond. */
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)\|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const columns = {
  id: contactMessages.id,
  firstName: contactMessages.firstName,
  lastName: contactMessages.lastName,
  email: contactMessages.email,
  phone: contactMessages.phone,
  topicLabel: contactMessages.topicLabel,
  message: contactMessages.message,
  lang: contactMessages.lang,
  readAt: contactMessages.readAt,
  createdAt: contactMessages.createdAt,
  cursor: sql<string>`${createdText} || '|' || ${contactMessages.id}::text`,
};

export type SubmissionRow = Awaited<ReturnType<typeof listSubmissions>>["rows"][number];

/** Newest first, keyset pagination: `before` is the `cursor` of the last row of the previous page. */
export async function listSubmissions(before?: string) {
  const m = before ? CURSOR.exec(before) : null;
  const rows = await db
    .select(columns)
    .from(contactMessages)
    .where(m ? sql`(${contactMessages.createdAt}, ${contactMessages.id}) < (${m[1]}::timestamptz, ${m[2]}::uuid)` : undefined)
    .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
    .limit(SUBMISSIONS_PAGE + 1);
  const hasMore = rows.length > SUBMISSIONS_PAGE;
  const page = hasMore ? rows.slice(0, SUBMISSIONS_PAGE) : rows;
  return { rows: page, nextCursor: hasMore ? page[page.length - 1].cursor : null };
}

export async function recentSubmissions(limit = 5) {
  return db.select(columns).from(contactMessages).orderBy(desc(contactMessages.createdAt), desc(contactMessages.id)).limit(limit);
}

export async function unreadCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(contactMessages).where(isNull(contactMessages.readAt));
  return row?.n ?? 0;
}

/** Same style everywhere in the admin panel (Baku time). */
export const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat("az-AZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Baku" }).format(d);
