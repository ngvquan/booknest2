import { BookCard } from "@/components/BookCard";
import { VoiceSearch } from "@/components/VoiceSearch";
import { useColors } from "@/hooks/useColors";
import { GENRES } from "@/constants/genres";
import { fetchBooks } from "@/lib/booksService";
import { AppBook } from "@/types/book";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GENRE_FALLBACK_COLORS = [
  "#E65C00",
  "#2E7D52",
  "#1565C0",
  "#6A1B9A",
  "#4E342E",
  "#1B5E20",
  "#455A64",
  "#B71C1C",
  "#827717",
  "#AD8B73",
  "#37474F",  
  "#3E2723",
];
const normalizeSearchText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<AppBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [booksError, setBooksError] = useState("");

  const hasQuery = query.trim().length > 0;
  const results = useMemo(() => {
    if (!hasQuery) return [];
    const q = normalizeSearchText(query);
    if (!q) return [];
    return books.filter((b) =>
      normalizeSearchText(`${b.title} ${b.author} ${b.genre}`).includes(q),
    );
  }, [hasQuery, query, books]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const genres = useMemo(
    () =>
      GENRES.map((g, index) => ({
        ...g,
        color: g.color || GENRE_FALLBACK_COLORS[index % GENRE_FALLBACK_COLORS.length],
        hasBooks: books.some((b) => b.genre === g.name),
      })),
    [books],
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBooks(true);
    setBooksError("");

    fetchBooks()
      .then((items) => {
        if (!isMounted) return;
        setBooks(items);
      })
      .catch((error) => {
        if (!isMounted) return;
        setBooks([]);
        setBooksError(error instanceof Error ? error.message : "Không tải được danh sách sách.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingBooks(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const searchStories = (keyword: string) => {
    setQuery(keyword);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="gap-1.5 px-4 pb-0" style={{ paddingTop: topPad + 12 }}>
        <Text className="text-[26px] font-extrabold" style={{ color: colors.foreground }}>Tìm kiếm</Text>
        <Text className="mb-1 text-sm" style={{ color: colors.mutedForeground }}>
          Bạn đang tìm kiếm gì?
        </Text>
        <VoiceSearch value={query} onChangeText={setQuery} onSearch={searchStories} />
        <View className="mb-0 mt-2 h-px" style={{ backgroundColor: colors.border }} />
      </View>
      {hasQuery ? (
        isLoadingBooks ? (
          <View className="flex-1 items-center justify-center gap-2.5 px-10">
            <Text className="text-center text-lg font-bold" style={{ color: colors.foreground }}>
              Đang tải danh sách sách...
            </Text>
          </View>
        ) : booksError ? (
          <View className="flex-1 items-center justify-center gap-2.5 px-10">
            <Text className="text-center text-lg font-bold" style={{ color: colors.foreground }}>
              Không tải được danh sách sách
            </Text>
            <Text className="text-center text-sm" style={{ color: colors.mutedForeground }}>
              {booksError}
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2.5 px-10">
            <Text className="text-[40px]">🔍</Text>
            <Text className="text-center text-lg font-bold" style={{ color: colors.foreground }}>
              Không tìm thấy sách
            </Text>
            <Text className="text-center text-sm" style={{ color: colors.mutedForeground }}>
              Đã tải {books.length} sách. Thử tìm với từ khóa khác.
            </Text>
          </View>
        ) : (
          <FlatList
            key="search-results"
            data={results}
            keyExtractor={(b) => b.id}
            contentContainerClassName="px-4 pt-2"
            contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text className="mb-3 text-[13px]" style={{ color: colors.mutedForeground }}>
                {results.length} kết quả cho "{query}"
              </Text>
            }
            renderItem={({ item }) => <BookCard book={item} variant="horizontal" />}
          />
        )
      ) : (
        <ScrollView
          contentContainerClassName="gap-3 p-4 pt-[14px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: Math.ceil(genres.length / 2) }, (_, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-3">
              {genres.slice(rowIdx * 2, rowIdx * 2 + 2).map((item) => (
                <Pressable
                  key={item.name}
                  className="h-[100px] flex-1 justify-between rounded-xl p-4 active:opacity-[0.85]"
                  style={{ backgroundColor: item.color }}
                  onPress={() => {
                    if (item.hasBooks) setQuery(item.name);
                  }}
                >
                  <Text className="text-[28px]">{item.emoji}</Text>
                  <Text className="text-sm font-bold leading-[18px] text-white" numberOfLines={2}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
