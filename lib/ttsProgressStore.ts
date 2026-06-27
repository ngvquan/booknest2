import { AsyncStorage, readJson, writeJson } from "@/lib/storage";

export interface TtsProgress {
  userId: string;
  bookId: string;
  chapterId: string;
  voice: string;
  chunkIndex: number;
  positionMillis: number;
  updatedAt: string;
}

const LOCAL_TTS_PROGRESS_KEY = "booknest:local-tts-progress";

async function readTtsProgressItems() {
  const items = await readJson<TtsProgress[]>(LOCAL_TTS_PROGRESS_KEY, []);
  return Array.isArray(items) ? items : [];
}

async function writeTtsProgressItems(items: TtsProgress[]) {
  await writeJson(LOCAL_TTS_PROGRESS_KEY, items);
}

export async function upsertTtsProgress(
  userId: string,
  bookId: string,
  chapterId: string,
  progress: { voice: string; chunkIndex: number; positionMillis: number },
) {
  const items = await readTtsProgressItems();
  const index = items.findIndex(
    (item) => item.userId === userId && item.bookId === bookId && item.chapterId === chapterId,
  );
  const nextItem: TtsProgress = {
    userId,
    bookId,
    chapterId,
    voice: progress.voice,
    chunkIndex: Math.max(0, progress.chunkIndex),
    positionMillis: Math.max(0, progress.positionMillis),
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    items[index] = nextItem;
  } else {
    items.push(nextItem);
  }

  await writeTtsProgressItems(items);
  return nextItem;
}

export async function fetchTtsProgress(userId: string, bookId: string, chapterId: string) {
  const items = await readTtsProgressItems();
  return (
    items.find((item) => item.userId === userId && item.bookId === bookId && item.chapterId === chapterId) ??
    null
  );
}

export async function clearTtsProgress(userId: string, bookId: string, chapterId: string) {
  const items = await readTtsProgressItems();
  const nextItems = items.filter(
    (item) => !(item.userId === userId && item.bookId === bookId && item.chapterId === chapterId),
  );

  if (nextItems.length === items.length) return;
  if (nextItems.length === 0) {
    await AsyncStorage.removeItem(LOCAL_TTS_PROGRESS_KEY);
    return;
  }

  await writeTtsProgressItems(nextItems);
}
