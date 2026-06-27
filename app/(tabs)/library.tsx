import { BookCard } from "@/components/BookCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { fetchBooks, fetchReadingHistory, ReadingHistoryItem } from "@/lib/booksService";
import { getDownloadedBooks } from "@/lib/offlineService";
import { readJson, writeJson } from "@/lib/storage";
import { AppBook } from "@/types/book";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIBRARY_KEY = "book_app_library";

export async function getLibraryIds(): Promise<string[]> {
  return readJson<string[]>(LIBRARY_KEY, []);
}

export async function toggleLibrary(id: string): Promise<boolean> {
  const ids = await getLibraryIds();
  const index = ids.indexOf(id);
  if (index >= 0) {
    ids.splice(index, 1);
    await writeJson(LIBRARY_KEY, ids);
    return false;
  }

  ids.push(id);
  await writeJson(LIBRARY_KEY, ids);
  return true;
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [savedBooks, setSavedBooks] = useState<AppBook[]>([]);
  const [offlineBooks, setOfflineBooks] = useState<AppBook[]>([]);
  const [readingBooks, setReadingBooks] = useState<ReadingHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"reading" | "saved" | "offline">("reading");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const load = useCallback(async () => {
    try {
      const [idsResult, allBooksResult, downloadedResult, readingRowsResult] = await Promise.allSettled([
        getLibraryIds(),
        fetchBooks(),
        getDownloadedBooks(user?.id),
        user?.id ? fetchReadingHistory(user.id) : Promise.resolve([]),
      ]);

      const ids = idsResult.status === "fulfilled" ? idsResult.value : [];
      const allBooks = allBooksResult.status === "fulfilled" ? allBooksResult.value : [];
      const downloaded = downloadedResult.status === "fulfilled" ? downloadedResult.value : [];
      const readingRows =
        readingRowsResult.status === "fulfilled" ? readingRowsResult.value : [];
      setSavedBooks(allBooks.filter((book) => ids.includes(book.id)));
      setOfflineBooks(downloaded);
      setReadingBooks(readingRows);
    } catch (error) {
      console.error(error);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }
  const bookData = tab === "saved" ? savedBooks : offlineBooks;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="gap-4 px-5 pb-4" style={{ paddingTop: topPad + 12 }}>
        <Text className="font-[Inter_800ExtraBold] text-[26px]" style={{ color: colors.foreground }}>Thư viện của tôi</Text>
        <View
          className="flex-row rounded-xl border p-1"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {([
            ["reading", `Đang đọc (${readingBooks.length})`],
            ["saved", `Đã lưu (${savedBooks.length})`],
            ["offline", `Offline (${offlineBooks.length})`],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              className="flex-1 items-center rounded-[9px] py-2"
              style={key === tab ? { backgroundColor: colors.primary } : undefined}
              onPress={() => setTab(key)}
            >
              <Text
                className="font-[Inter_600SemiBold] text-xs"
                style={{
                  color: key === tab ? colors.primaryForeground : colors.mutedForeground,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === "reading" ? (
        readingBooks.length === 0 ? (
          <EmptyState
            colors={colors}
            icon="book-open"
            title="Chưa có lịch sử đọc"
            text="Khi bạn mở sách, ứng dụng sẽ lưu lại sách và chương đang đọc để tiếp tục sau."
          />
        ) : (
          <FlatList
            data={readingBooks}
            keyExtractor={(item) => `${item.book.id}-${item.chapterId}`}
            contentContainerClassName="px-5 pt-2"
            contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            renderItem={({ item }) => (
              <Pressable
                className="mb-3 flex-row items-center gap-3 rounded-[14px] border p-3"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                onPress={() =>
                  router.push(
                    `/reader/${item.book.id}?chapter=${item.chapterNo}&chapterId=${item.chapterId}`,
                  )
                }
              >
                <Image
                  source={{ uri: item.book.cover }}
                  style={{ width: 64, height: 92, borderRadius: 10 }}
                  contentFit="cover"
                />
                <View className="flex-1 gap-1">
                  <Text className="font-[Inter_700Bold] text-[15px] leading-5" style={{ color: colors.foreground }} numberOfLines={2}>
                    {item.book.title}
                  </Text>
                  <Text
                    className="font-[Inter_400Regular] text-[13px]"
                    style={{ color: colors.mutedForeground }}
                    numberOfLines={1}
                  >
                    {item.book.author}
                  </Text>
                  <Text className="font-[Inter_600SemiBold] text-[13px]" style={{ color: colors.accent }}>
                    Chương {item.chapterNo}: {item.chapterTitle}
                  </Text>
                  <Text className="font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
                    Nhấn để đọc tiếp
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          />
        )
      ) : bookData.length === 0 ? (
        <EmptyState
          colors={colors}
          icon={tab === "saved" ? "bookmark" : "download"}
          title={tab === "saved" ? "Thư viện trống" : "Chưa có bản tải"}
          text={
            tab === "saved"
              ? "Lưu sách yêu thích để đọc sau"
              : "Tải truyện để đọc ngay cả khi không có mạng"
          }
        />
      ) : (
        <FlatList
          data={bookData}
          keyExtractor={(book) => book.id}
          contentContainerClassName="px-5 pt-2"
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => <BookCard book={item} variant="horizontal" />}
        />
      )}
    </View>
  );
}

function EmptyState({
  colors,
  icon,
  title,
  text,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  text: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10">
      <Feather name={icon} size={52} color={colors.mutedForeground} />
      <Text className="text-center font-[Inter_700Bold] text-lg" style={{ color: colors.foreground }}>{title}</Text>
      <Text className="text-center font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>{text}</Text>
    </View>
  );
}
