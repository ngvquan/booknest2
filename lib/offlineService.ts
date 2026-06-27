import * as FileSystem from "expo-file-system/legacy";

import { AppBook } from "@/types/book";

import { fetchChaptersByBook } from "./booksService";
import { AsyncStorage, readJson, writeJson } from "./storage";

const OFFLINE_BOOKS_KEY = "offline_books_list";
const OFFLINE_CHAPTERS_PREFIX = "offline_chapters_";
const OFFLINE_COVERS_PREFIX = "offline_cover_";
const OFFLINE_LEGACY_CLEANUP_KEY = "offline_legacy_cleanup_done";
const FREE_OFFLINE_BOOK_LIMIT = 1;

export type OfflineChapter = {
  id: string;
  chapter_no: number;
  title: string;
  content?: string;
};

function getOfflineScope(userId?: string | null) {
  const scope = userId?.trim();
  return scope ? scope : null;
}

function getOfflineBooksKey(userId?: string | null) {
  const scope = getOfflineScope(userId);
  return scope ? `${OFFLINE_BOOKS_KEY}:${scope}` : null;
}

function getOfflineChaptersKey(bookId: string, userId?: string | null) {
  const scope = getOfflineScope(userId);
  return scope ? `${OFFLINE_CHAPTERS_PREFIX}${scope}:${bookId}` : null;
}

function getOfflineCoverUri(bookId: string, userId?: string | null, coverUrl?: string) {
  const scope = getOfflineScope(userId);
  if (!scope || !FileSystem.documentDirectory) return null;

  const ext = (coverUrl?.split("?")[0].split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  return `${FileSystem.documentDirectory}${OFFLINE_COVERS_PREFIX}${scope}_${bookId}.${safeExt}`;
}

async function removeScopedOfflineCache(scope: string) {
  const booksKey = `${OFFLINE_BOOKS_KEY}:${scope}`;
  const books = await readJson<AppBook[]>(booksKey, []);
  const chapterKeys = books.map((book) => `${OFFLINE_CHAPTERS_PREFIX}${scope}:${book.id}`);
  const coverUris = books
    .map((book) => getOfflineCoverUri(book.id, scope, book.cover))
    .filter(Boolean) as string[];

  await AsyncStorage.multiRemove([booksKey, ...chapterKeys]);
  await Promise.all(coverUris.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})));
}

async function removeLegacyOfflineCache() {
  const cleanupDone = await AsyncStorage.getItem(OFFLINE_LEGACY_CLEANUP_KEY);
  if (cleanupDone === "1") {
    return;
  }

  const legacyBooks = await readJson<AppBook[]>(OFFLINE_BOOKS_KEY, []);
  const legacyChapterKeys = legacyBooks.map((book) => `${OFFLINE_CHAPTERS_PREFIX}${book.id}`);

  await AsyncStorage.multiRemove([OFFLINE_BOOKS_KEY, ...legacyChapterKeys]);
  await removeScopedOfflineCache("guest");
  await AsyncStorage.setItem(OFFLINE_LEGACY_CLEANUP_KEY, "1");
}

async function cacheBookCover(book: AppBook, userId?: string | null): Promise<AppBook> {
  if (!book.cover.startsWith("http")) {
    return book;
  }

  const localUri = getOfflineCoverUri(book.id, userId, book.cover);
  if (!localUri) {
    return book;
  }

  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      await FileSystem.downloadAsync(book.cover, localUri);
    }
    return { ...book, cover: localUri };
  } catch {
    return book;
  }
}

export async function getDownloadedBooks(userId?: string | null): Promise<AppBook[]> {
  await removeLegacyOfflineCache();
  const booksKey = getOfflineBooksKey(userId);
  if (!booksKey) {
    return [];
  }

  return readJson<AppBook[]>(booksKey, []);
}

export async function isBookDownloaded(
  bookId: string,
  userId?: string | null,
): Promise<boolean> {
  return !!(await getDownloadedBook(bookId, userId));
}

async function getDownloadedBook(
  bookId: string,
  userId?: string | null,
): Promise<AppBook | null> {
  const books = await getDownloadedBooks(userId);
  return books.find((book) => book.id === bookId) ?? null;
}

export async function downloadBook(
  book: AppBook,
  userId?: string | null,
  options?: { isVip?: boolean },
): Promise<void> {
  const booksKey = getOfflineBooksKey(userId);
  const chapterKey = getOfflineChaptersKey(book.id, userId);
  if (!booksKey || !chapterKey) {
    throw new Error("OFFLINE_AUTH_REQUIRED");
  }

  const books = await getDownloadedBooks(userId);
  const alreadyDownloaded = books.some((item) => item.id === book.id);
  const cachedChapters = await AsyncStorage.getItem(chapterKey);

  if (!options?.isVip && !alreadyDownloaded && books.length >= FREE_OFFLINE_BOOK_LIMIT) {
    throw new Error(`OFFLINE_LIMIT_REACHED:${FREE_OFFLINE_BOOK_LIMIT}`);
  }

  if (!cachedChapters) {
    const chapters = await fetchChaptersByBook(book.id);
    await writeJson(chapterKey, chapters);
  }

  if (!alreadyDownloaded) {
    const offlineBook = await cacheBookCover(book, userId);
    books.push(offlineBook);
    await writeJson(booksKey, books);
  }
}

export async function removeDownloadedBook(
  bookId: string,
  userId?: string | null,
): Promise<void> {
  const booksKey = getOfflineBooksKey(userId);
  const chapterKey = getOfflineChaptersKey(bookId, userId);
  if (!booksKey || !chapterKey) {
    return;
  }

  await AsyncStorage.removeItem(chapterKey);
  const books = await getDownloadedBooks(userId);
  const bookToRemove = books.find((book) => book.id === bookId);
  const coverUri =
    bookToRemove?.cover && !bookToRemove.cover.startsWith("http")
      ? bookToRemove.cover
      : getOfflineCoverUri(bookId, userId, bookToRemove?.cover);
  if (coverUri) {
    await FileSystem.deleteAsync(coverUri, { idempotent: true }).catch(() => {});
  }

  const filtered = books.filter((book) => book.id !== bookId);
  await writeJson(booksKey, filtered);
}

export async function enforceOfflineBookLimitForPlan(
  userId?: string | null,
  options?: { isVip?: boolean },
): Promise<AppBook[]> {
  const books = await getDownloadedBooks(userId);
  if (options?.isVip || books.length <= FREE_OFFLINE_BOOK_LIMIT) {
    return [];
  }

  const regularBooks = books.filter((book) => !book.isVip);
  const keepSource = regularBooks.length > 0 ? regularBooks : books;
  const keep = keepSource.slice(-FREE_OFFLINE_BOOK_LIMIT);
  const keepIds = new Set(keep.map((book) => book.id));
  const removed = books.filter((book) => !keepIds.has(book.id));

  await Promise.all(removed.map((book) => removeDownloadedBook(book.id, userId)));
  return removed;
}

async function getOfflineChapters(
  bookId: string,
  userId?: string | null,
): Promise<OfflineChapter[] | null> {
  await removeLegacyOfflineCache();
  const chapterKey = getOfflineChaptersKey(bookId, userId);
  if (!chapterKey) {
    return null;
  }

  return readJson<OfflineChapter[] | null>(chapterKey, null);
}

export async function getOfflineBookDetail(bookId: string, userId?: string | null) {
  const [book, chapters] = await Promise.all([
    getDownloadedBook(bookId, userId),
    getOfflineChapters(bookId, userId),
  ]);

  return {
    book,
    chapters: chapters ?? [],
  };
}
