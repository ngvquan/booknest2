import { readJson, writeJson } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { AppBook } from "@/types/book";
import {
  fetchLocalReadingHistory,
  fetchLocalReadingProgress,
  isLocalUserId,
} from "@/lib/readingProgressStore";

const BOOKS_CACHE_KEY = "booknest:books-cache";
let booksLoadedFromCache = false;

export function isUsingCachedBooks() {
  return booksLoadedFromCache;
}

async function readBooksCache(): Promise<AppBook[]> {
  const books = await readJson<AppBook[]>(BOOKS_CACHE_KEY, []);
  return Array.isArray(books) ? books : [];
}

async function writeBooksCache(books: AppBook[]) {
  await writeJson(BOOKS_CACHE_KEY, books);
}
function toAppBook(row: any): AppBook {
  const created = row.created_at ? new Date(row.created_at) : new Date();
  const categoryName = row.categories?.name ?? row.categories?.[0]?.name;

  return {
    id: row.id,
    title: row.title ?? "Untitled",
    author: row.author ?? "Unknown",
    cover: row.cover_url ?? "https://picsum.photos/300/420",
    rating: 4.6,
    ratingCount: 1000,
    genre: row.genre ?? categoryName ?? "Chưa phân loại",
    description: row.description ?? "",
    pages: Math.max((row.total_chapters ?? 1) * 12, 24),
    year: created.getFullYear(),
    language: "Tiếng Việt",
    isVip: !!row.is_vip,
    isFeatured: !row.is_vip,
    isBestseller: !!row.is_vip,
    isNew: true,
    readingTime: `${Math.max(row.total_chapters ?? 1, 1)} giờ`,
  };
}

export interface ReadingHistoryItem {
  book: AppBook;
  chapterId: string;
  chapterNo: number;
  chapterTitle: string;
  updatedAt: string;
  position: number;
}

export interface ReadingProgressItem {
  chapterId: string;
  chapterNo: number;
  chapterTitle: string;
  position: number;
  updatedAt: string;
}

export async function fetchBooks(): Promise<AppBook[]> {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const books = (data ?? []).map(toAppBook);
    booksLoadedFromCache = false;
    writeBooksCache(books).catch(() => {});
    return books;
  } catch (error) {
    const cachedBooks = await readBooksCache();
    if (cachedBooks.length > 0) {
      booksLoadedFromCache = true;
      return cachedBooks;
    }

    booksLoadedFromCache = false;
    throw error;
  }
}

export async function fetchCategories(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(name: string) {
  return supabase.from("categories").insert({ name });
}

export async function removeCategory(id: string) {
  return supabase.from("categories").delete().eq("id", id);
}

export async function fetchBookById(id: string): Promise<AppBook | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, categories(name)")
    .eq("id", id)
    .single();

  if (error) return null;
  return toAppBook(data);
}

export async function fetchReadingHistory(userId: string): Promise<ReadingHistoryItem[]> {
  if (isLocalUserId(userId)) {
    const [items, books] = await Promise.all([
      fetchLocalReadingHistory(userId),
      fetchBooks().catch(() => readBooksCache()),
    ]);

    const history = await Promise.all(
      items.map(async (item) => {
        const book = books.find((candidate) => candidate.id === item.bookId);
        if (!book) return null;

        const chapters = await fetchChaptersByBook(item.bookId).catch(() => []);
        const chapter = chapters.find((candidate) => candidate.id === item.chapterId);
        if (!chapter) return null;

        return {
          book,
          chapterId: item.chapterId,
          chapterNo: chapter.chapter_no,
          chapterTitle: chapter.title,
          updatedAt: item.updatedAt,
          position: item.position,
        };
      }),
    );

    return history.filter((item): item is ReadingHistoryItem => !!item);
  }

  const { data, error } = await supabase
    .from("reading_progress")
    .select(
      "book_id,chapter_id,position,updated_at,book:books(*, categories(name)),chapter:chapters(id, chapter_no, title)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((item) => item.book && item.chapter)
    .map((item: any) => ({
      book: toAppBook(item.book),
      chapterId: item.chapter_id,
      chapterNo: item.chapter.chapter_no,
      chapterTitle: item.chapter.title,
      updatedAt: item.updated_at,
      position: item.position ?? 0,
    }));
}

export async function fetchReadingProgress(
  userId: string,
  bookId: string,
): Promise<ReadingProgressItem | null> {
  if (isLocalUserId(userId)) {
    const progress = await fetchLocalReadingProgress(userId, bookId);
    if (!progress) return null;

    const chapters = await fetchChaptersByBook(bookId).catch(() => []);
    const chapter = chapters.find((item) => item.id === progress.chapterId);
    if (!chapter) return null;

    return {
      chapterId: progress.chapterId,
      chapterNo: chapter.chapter_no,
      chapterTitle: chapter.title,
      position: progress.position,
      updatedAt: progress.updatedAt,
    };
  }

  const { data, error } = await supabase
    .from("reading_progress")
    .select("chapter_id,position,updated_at,chapter:chapters(id, chapter_no, title)")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  const chapter = Array.isArray(data.chapter) ? data.chapter[0] : data.chapter;

  if (!chapter) {
    return null;
  }

  return {
    chapterId: data.chapter_id,
    chapterNo: chapter.chapter_no,
    chapterTitle: chapter.title,
    position: data.position ?? 0,
    updatedAt: data.updated_at,
  };
}

export async function createBook(payload: {
  category_id: string | null;
  title: string;
  author: string;
  description?: string;
  cover_url?: string;
  is_vip?: boolean;
  total_chapters?: number;
}) {
  return supabase.from("books").insert(payload);
}

export async function updateBook(
  id: string,
  payload: Partial<{
    category_id: string | null;
    title: string;
    author: string;
    description: string;
    cover_url: string;
    is_vip: boolean;
    total_chapters: number;
  }>,
) {
  return supabase.from("books").update(payload).eq("id", id);
}

export async function removeBook(id: string) {
  return supabase.from("books").delete().eq("id", id);
}

export async function fetchChaptersByBook(bookId: string) {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, book_id, chapter_no, title, content")
    .eq("book_id", bookId)
    .order("chapter_no", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createChapter(payload: {
  book_id: string;
  chapter_no: number;
  title: string;
  content: string;
  is_vip?: boolean;
}) {
  return supabase.from("chapters").insert(payload);
}

export async function updateChapter(
  id: string,
  payload: {
    book_id?: string;
    chapter_no?: number;
    title?: string;
    content?: string;
    is_vip?: boolean;
  },
) {
  return supabase.from("chapters").update(payload).eq("id", id);
}

export async function removeChapter(id: string) {
  return supabase.from("chapters").delete().eq("id", id);
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,username,role,is_vip,vip_expired_at,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateProfileAdmin(
  id: string,
  payload: Partial<{
    username: string;
    role: string;
    is_vip: boolean;
    vip_expired_at: string | null;
  }>,
) {
  return supabase.from("profiles").update(payload).eq("id", id);
}

export async function fetchPaymentAttempts() {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("id,user_id,plan_name,amount,status,created_at,paid_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function updateAvatarUrl(userId: string, avatarUrl: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (error) throw error;
}
