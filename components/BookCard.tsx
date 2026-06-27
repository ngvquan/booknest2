import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { openBookWithAccess } from "@/lib/bookAccess";
import { AppBook } from "@/types/book";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface BookCardProps {
  book: AppBook;
  variant?: "vertical" | "horizontal" | "featured" | "small-grid";
}

export function BookCard({ book, variant = "vertical" }: BookCardProps) {
  const colors = useColors();
  const { user } = useAuth();

  const openBook = () => openBookWithAccess(book, user);

  if (variant === "small-grid") {
    return (
      <Pressable className="h-full w-full active:opacity-[0.85]" onPress={openBook}>
        <Image
          source={{ uri: book.cover }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </Pressable>
    );
  }

  if (variant === "horizontal") {
    return (
      <Pressable
        className="mb-3 flex-row gap-3 rounded-xl p-3 active:opacity-[0.85]"
        style={{ backgroundColor: colors.card }}
        onPress={openBook}
      >
        <Image
          source={{ uri: book.cover }}
          style={{ width: 78, height: 112, borderRadius: 8 }}
          contentFit="cover"
        />
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap gap-1.5">
            {book.isVip ? (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: colors.accent }}>
                <Text
                  className="font-[Inter_700Bold] text-[9px] tracking-[0.5px]"
                  style={{ color: colors.accentForeground }}
                >
                  VIP
                </Text>
              </View>
            ) : null}
            {book.isNew && (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: colors.accent }}>
                <Text
                  className="font-[Inter_700Bold] text-[9px] tracking-[0.5px]"
                  style={{ color: colors.accentForeground }}
                >
                  MỚI
                </Text>
              </View>
            )}
            {book.isBestseller && (
              <View className="rounded bg-[#e05252] px-1.5 py-0.5">
                <Text className="font-[Inter_700Bold] text-[9px] tracking-[0.5px] text-white">
                  BESTSELLER
                </Text>
              </View>
            )}
          </View>
          <Text
            className="font-[Inter_700Bold] text-[15px] leading-5"
            style={{ color: colors.foreground }}
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text
            className="font-[Inter_400Regular] text-[13px]"
            style={{ color: colors.mutedForeground }}
          >
            {book.author}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Feather name="star" size={13} color={colors.star} />
            <Text
              className="font-[Inter_600SemiBold] text-[13px]"
              style={{ color: colors.foreground }}
            >
              {book.rating}
            </Text>
            <Text
              className="font-[Inter_400Regular] text-[13px]"
              style={{ color: colors.mutedForeground }}
            >
              ·
            </Text>
            <Text
              className="font-[Inter_400Regular] text-xs"
              style={{ color: colors.mutedForeground }}
            >
              {book.genre}
            </Text>
          </View>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text
              className="font-[Inter_400Regular] text-xs"
              style={{ color: colors.mutedForeground }}
            >
              {book.readingTime}
            </Text>
            <Feather
              name="book-open"
              size={12}
              color={colors.mutedForeground}
              style={{ marginLeft: 6 }}
            />
            <Text
              className="font-[Inter_400Regular] text-xs"
              style={{ color: colors.mutedForeground }}
            >
              {book.pages} trang
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === "featured") {
    return (
      <Pressable
        className="h-[240px] w-full overflow-hidden rounded-xl active:opacity-90"
        onPress={openBook}
      >
        <Image
          source={{ uri: book.cover }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
        />
        <View className="flex-1 justify-end gap-1 bg-[rgba(0,0,0,0.48)] p-[14px]">
          <View className="flex-row flex-wrap gap-1.5">
            <View className="self-start rounded px-1.5 py-0.5" style={{ backgroundColor: colors.accent }}>
              <Text
                className="font-[Inter_700Bold] text-[9px] tracking-[0.5px]"
                style={{ color: colors.accentForeground }}
              >
                TIÊU BIỂU
              </Text>
            </View>
            {book.isVip ? (
              <View className="self-start rounded px-1.5 py-0.5" style={{ backgroundColor: "#111827" }}>
                <Text className="font-[Inter_700Bold] text-[9px] tracking-[0.5px] text-white">
                  VIP
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="font-[Inter_800ExtraBold] text-[17px] leading-[22px] text-white"
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text className="font-[Inter_400Regular] text-[13px] text-[rgba(255,255,255,0.8)]">
            {book.author}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Feather name="star" size={12} color="#e8a838" />
            <Text className="font-[Inter_600SemiBold] text-[13px] text-white">{book.rating}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable className="w-[120px] active:opacity-[0.85]" onPress={openBook}>
      <View>
        <Image
          source={{ uri: book.cover }}
          style={{ width: 120, height: 168, marginBottom: 8, borderRadius: colors.radius }}
          contentFit="cover"
        />
        {book.isVip ? (
          <View
            className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full px-2 py-1"
            style={{ backgroundColor: "rgba(17,24,39,0.88)" }}
          >
            <Feather name="lock" size={10} color="#fff" />
            <Text className="text-[10px] font-[Inter_700Bold] text-white">VIP</Text>
          </View>
        ) : null}
      </View>
      <Text
        className="mb-0.5 font-[Inter_600SemiBold] text-[13px] leading-[17px]"
        style={{ color: colors.foreground }}
        numberOfLines={2}
      >
        {book.title}
      </Text>
      <Text
        className="mb-[3px] font-[Inter_400Regular] text-xs"
        style={{ color: colors.mutedForeground }}
        numberOfLines={1}
      >
        {book.author}
      </Text>
      <View className="mt-0.5 flex-row items-center gap-1">
        <Feather name="star" size={12} color={colors.star} />
        <Text className="font-[Inter_600SemiBold] text-[13px]" style={{ color: colors.foreground }}>
          {book.rating}
        </Text>
      </View>
    </Pressable>
  );
}
