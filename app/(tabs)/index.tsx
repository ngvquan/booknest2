import { BookCard } from "@/components/BookCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { openBookWithAccess } from "@/lib/bookAccess";
import { fetchBooks } from "@/lib/booksService";
import { AppBook } from "@/types/book";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLACEHOLDER_COLORS = [
  "#1565C0",
  "#2E7D52",
  "#6A1B9A",
  "#E65C00",
  "#1B5E20",
  "#455A64",
  "#B71C1C",
  "#4E342E",
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isVip = !!user?.isVip;
  const [refreshing, setRefreshing] = useState(false);
  const [books, setBooks] = useState<AppBook[]>([]);

  useEffect(() => {
    fetchBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  const featured = books.filter((book) => book.isFeatured);
  const mainFeatured = featured[0];
  const gridBooks = books.filter((book) => book.id !== mainFeatured?.id).slice(0, 4);
  const recommended = books.filter((book) => book.isBestseller || book.isNew).slice(0, 6);
  const newBooks = books.filter((book) => book.isNew);

  const topPad = insets.top;
  const screenW = Dimensions.get("window").width;
  const padding = 16;
  const gap = 8;
  const totalWidth = screenW - padding * 2;
  const featuredWidth = Math.floor(totalWidth * 0.54);
  const rightWidth = totalWidth - featuredWidth - gap;
  const smallWidth = Math.floor((rightWidth - gap) / 2);
  const smallHeight = Math.floor((240 - gap) / 2);

  function onRefresh() {
    setRefreshing(true);
    fetchBooks()
      .then(setBooks)
      .finally(() => setRefreshing(false));
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View
        className="mb-1 flex-row items-center justify-between border-b px-4 pb-[14px]"
        style={{ paddingTop: topPad + 12, borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="h-[38px] w-[38px] items-center justify-center rounded-[10px]"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="book-open" size={18} color={colors.accentForeground} />
          </View>
          <View>
            <Text
              className="text-base font-extrabold tracking-[0.3px]"
              style={{ color: colors.accent }}
            >
              Book App
            </Text>
            <View className="mt-px flex-row items-center gap-1.5">
              <Text className="text-xs" style={{ color: colors.mutedForeground }}>
                Xin chào, {user?.name?.split(" ").pop() ?? "bạn"}
              </Text>
              {isVip ? (
                <View
                  className="h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Feather name="zap" size={9} color={colors.accentForeground} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {isVip ? (
          <View
            className="h-[38px] w-[38px] items-center justify-center rounded-xl"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="award" size={17} color={colors.accentForeground} />
          </View>
        ) : (
          <Pressable
            className="h-[38px] flex-row items-center justify-center gap-1.5 rounded-xl px-3"
            style={{ backgroundColor: colors.accent }}
            onPress={() => router.push("/(tabs)/premium")}
          >
            <Feather name="zap" size={14} color={colors.accentForeground} />
            <Text
              className="text-[13px] font-extrabold uppercase tracking-[0.3px]"
              style={{ color: colors.accentForeground }}
            >
              Premium
            </Text>
          </Pressable>
        )}
      </View>

      <View className="mt-5">
        <Text className="mb-[14px] px-4 text-[17px] font-bold" style={{ color: colors.foreground }}>
          Truyện hay nhất đề xuất cho bạn
        </Text>

        <View className="flex-row items-start gap-2 px-4">
          {mainFeatured && (
            <Pressable
              className="h-[240px] overflow-hidden rounded-xl active:opacity-[0.88]"
              style={{
                width: featuredWidth,
                backgroundColor: PLACEHOLDER_COLORS[0],
              }}
              onPress={() => openBookWithAccess(mainFeatured, user)}
            >
              <Image
                source={{ uri: mainFeatured.cover }}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                contentFit="cover"
              />
              <View className="absolute bottom-0 left-0 right-0 gap-1 bg-[rgba(0,0,0,0.48)] p-3">
                <View
                  className="self-start rounded px-1.5 py-0.5"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text
                    className="text-[9px] font-bold tracking-[0.5px]"
                    style={{ color: colors.accentForeground }}
                  >
                    TIÊU BIỂU
                  </Text>
                </View>
                <Text
                  className="text-base font-extrabold leading-[21px] text-white"
                  numberOfLines={2}
                >
                  {mainFeatured.title}
                </Text>
                <Text className="text-xs text-[rgba(255,255,255,0.8)]">{mainFeatured.author}</Text>
                <View className="mt-0.5 flex-row items-center gap-[3px]">
                  <Feather name="star" size={12} color="#e8a838" />
                  <Text className="text-xs font-semibold text-white">{mainFeatured.rating}</Text>
                </View>
              </View>
            </Pressable>
          )}

          <View className="flex-row flex-wrap content-start gap-2" style={{ width: rightWidth }}>
            {gridBooks.map((book, index) => (
              <Pressable
                key={book.id}
                className="overflow-hidden rounded-lg active:opacity-[0.85]"
                style={{
                  width: smallWidth,
                  height: smallHeight,
                  backgroundColor: PLACEHOLDER_COLORS[(index + 1) % PLACEHOLDER_COLORS.length],
                }}
                onPress={() => openBookWithAccess(book, user)}
              >
                <Image
                  source={{ uri: book.cover }}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                  contentFit="cover"
                />
                <View className="absolute bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.55)] p-1.5">
                  <Text className="text-[10px] font-bold leading-[13px] text-white" numberOfLines={2}>
                    {book.title}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View className="mt-7">
        <Text className="mb-[14px] px-4 text-[17px] font-bold" style={{ color: colors.foreground }}>
          Chúng tôi tin bạn sẽ thích
        </Text>
        <FlatList
          horizontal
          data={recommended}
          keyExtractor={(book) => book.id}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-[14px] px-4"
          renderItem={({ item, index }) => (
            <Pressable
              className="active:opacity-[0.85]"
              onPress={() => openBookWithAccess(item, user)}
            >
              <View
                style={[
                  {
                    width: 120,
                    height: 168,
                    overflow: "hidden",
                    marginBottom: 8,
                  },
                  {
                    backgroundColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length],
                    borderRadius: 10,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.cover }}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                  contentFit="cover"
                />
              </View>
              <Text
                className="mb-0.5 w-[120px] text-[13px] font-semibold leading-[17px]"
                style={{ color: colors.foreground }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                className="mb-[3px] w-[120px] text-xs"
                style={{ color: colors.mutedForeground }}
                numberOfLines={1}
              >
                {item.author}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-[3px]">
                <Feather name="star" size={12} color={colors.star} />
                <Text className="text-xs font-semibold" style={{ color: colors.foreground }}>
                  {item.rating}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>

      <View className="mt-7">
        <View className="flex-row items-center justify-between px-4">
          <Text className="mb-0 px-0 text-[17px] font-bold" style={{ color: colors.foreground }}>
            Mới nhất
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/search")}>
            <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
              Xem tất cả
            </Text>
          </Pressable>
        </View>
        <View className="mt-[14px] px-4">
          {newBooks.map((book) => (
            <BookCard key={book.id} book={book} variant="horizontal" />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
