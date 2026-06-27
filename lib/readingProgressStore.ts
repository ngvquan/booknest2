import { readJson, writeJson } from "@/lib/storage";

interface LocalReadingProgress {
  userId: string;
  bookId: string;
  chapterId: string;
  position: number;
  updatedAt: string;
}

const LOCAL_READING_PROGRESS_KEY = "booknest:local-reading-progress";

export function isLocalUserId(userId: string | undefined) {
  return !!userId && userId.startsWith("local-");
}

async function readLocalProgressItems() {
  const items = await readJson<LocalReadingProgress[]>(LOCAL_READING_PROGRESS_KEY, []);
  return Array.isArray(items) ? items : [];
}

async function writeLocalProgressItems(items: LocalReadingProgress[]) {
  await writeJson(LOCAL_READING_PROGRESS_KEY, items);
}

export async function upsertLocalReadingProgress(
  userId: string,
  bookId: string,
  chapterId: string,
  position: number,
) {
  const items = await readLocalProgressItems();
  const index = items.findIndex((item) => item.userId === userId && item.bookId === bookId);
  const nextItem: LocalReadingProgress = {
    userId,
    bookId,
    chapterId,
    position,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    items[index] = nextItem;
  } else {
    items.push(nextItem);
  }

  await writeLocalProgressItems(items);
  return nextItem;
}

export async function fetchLocalReadingProgress(userId: string, bookId: string) {
  const items = await readLocalProgressItems();
  return items.find((item) => item.userId === userId && item.bookId === bookId) ?? null;
}

export async function fetchLocalReadingHistory(userId: string) {
  const items = await readLocalProgressItems();
  return items
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
