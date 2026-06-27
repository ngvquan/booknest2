import { router } from "expo-router";
import { Alert } from "react-native";

import { isUsingCachedBooks } from "@/lib/booksService";
import { isBookDownloaded } from "@/lib/offlineService";

const OFFLINE_BOOK_MESSAGE =
  "Bạn vẫn xem được danh sách đã lưu, nhưng cần có mạng hoặc tải sách offline trước khi mở sách này.";

export function isBookLocked(
  book: { isVip?: boolean } | null | undefined,
  user: { isVip?: boolean } | null | undefined,
) {
  return !!book?.isVip && !user?.isVip;
}

export async function openBookWithAccess(
  book: { id: string; isVip?: boolean },
  user: { id?: string; isVip?: boolean } | null | undefined,
) {
  if (isBookLocked(book, user)) {
    router.push("/(tabs)/premium");
    return;
  }

  if (isUsingCachedBooks()) {
    const downloaded = await isBookDownloaded(book.id, user?.id).catch(() => false);
    if (!downloaded) {
      Alert.alert("Đang offline", OFFLINE_BOOK_MESSAGE);
      return;
    }
  }

  router.push(`/book/${book.id}`);
}
