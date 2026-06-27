import { getLibraryIds, toggleLibrary } from "@/app/(tabs)/library";
import { BookDetailState, BookInfoRow, ChapterRow } from "@/components/BookDetailParts";
import { StarRating } from "@/components/StarRating";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { isBookLocked } from "@/lib/bookAccess";
import {
  fetchBookById,
  fetchChaptersByBook,
  fetchReadingProgress,
  ReadingProgressItem,
} from "@/lib/booksService";
import {
  downloadBook,
  getOfflineBookDetail,
  OfflineChapter,
  removeDownloadedBook,
} from "@/lib/offlineService";
import { AppBook } from "@/types/book";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<AppBook | null>(null);
  const [chapters, setChapters] = useState<OfflineChapter[]>([]);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState<ReadingProgressItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setDetailLoading(true);
    setBook(null);
    setChapters([]);

    getLibraryIds().then((ids) => setSaved(ids.includes(id))).catch(() => setSaved(false));

    async function loadDetail() {
      const offline = await getOfflineBookDetail(id, user?.id).catch(() => ({
        book: null,
        chapters: [],
      }));
      if (!active) return;

      setDownloaded(!!offline.book);
      if (offline.book) {
        setBook(offline.book);
        setChapters(offline.chapters);
        setDetailLoading(false);
      }

      try {
        const [onlineBook, onlineChapters] = await Promise.all([
          fetchBookById(id),
          fetchChaptersByBook(id),
        ]);

        if (!active) return;

        setBook(onlineBook ?? offline.book);
        setChapters(onlineChapters.length > 0 ? onlineChapters : offline.chapters);
      } catch {
        if (!active) return;
        if (!offline.book) {
          setBook(null);
          setChapters([]);
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetail();

    if (user?.id) {
      fetchReadingProgress(user.id, id).then(setProgress).catch(() => setProgress(null));
    } else {
      setProgress(null);
    }

    return () => {
      active = false;
    };
  }, [id, user?.id]);

  async function handleToggleSave() {
    if (!id) return;
    const isNowSaved = await toggleLibrary(id);
    setSaved(isNowSaved);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function handleToggleDownload() {
    if (!book || downloadLoading) return;

    setDownloadLoading(true);
    try {
      if (downloaded) {
        await removeDownloadedBook(book.id, user?.id);
        setDownloaded(false);
        Alert.alert("Đã xóa bản tải", "Truyện đã được xóa khỏi thư viện offline.");
      } else {
        await downloadBook(book, user?.id, { isVip: user?.isVip });
        setDownloaded(true);
        Alert.alert("Tải thành công", "Bạn có thể đọc truyện này trong mục Offline.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message === "OFFLINE_AUTH_REQUIRED"
          ? "Bạn cần đăng nhập để tải truyện đọc offline."
          : error instanceof Error && error.message.startsWith("OFFLINE_LIMIT_REACHED:")
            ? "Tài khoản thường chỉ được tải tối đa 1 cuốn sách offline. Hãy xóa cuốn đã tải hoặc nâng cấp Premium để tải thêm."
            : "Không tải được nội dung chương. Hãy bật mạng và thử tải lại.";
      Alert.alert("Không thể tải truyện", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDownloadLoading(false);
    }
  }

  if (detailLoading) {
    return <BookDetailState colors={colors} text="Đang tải dữ liệu sách..." loading />;
  }

  if (!book) {
    return <BookDetailState colors={colors} text="Không tìm thấy sách" />;
  }

  const lockedBook = isBookLocked(book, user);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const resumeChapter = progress
    ? {
        chapter: progress.chapterNo,
        chapterId: progress.chapterId,
      }
    : chapters[0]
      ? {
          chapter: chapters[0].chapter_no,
          chapterId: chapters[0].id,
        }
      : null;

  if (lockedBook) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Pressable
          className="absolute left-4 h-10 w-10 items-center justify-center rounded-full"
          style={{
            top: (Platform.OS === "web" ? 67 : insets.top) + 8,
            backgroundColor: colors.surface + "e0",
          }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>

        <View className="flex-1 items-center justify-center px-8">
          <View
            className="mb-5 h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.accent + "22" }}
          >
            <Feather name="lock" size={28} color={colors.accent} />
          </View>
          <Text
            className="mb-2 text-center font-[Inter_800ExtraBold] text-[22px]"
            style={{ color: colors.foreground }}
          >
            Sách này dành cho Premium
          </Text>
          <Text
            className="mb-6 text-center font-[Inter_400Regular] text-sm"
            style={{ color: colors.mutedForeground }}
          >
            Bạn cần tài khoản Premium để mở và đọc trọn vẹn cuốn sách này.
          </Text>
          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl px-5"
            style={{ backgroundColor: colors.accent }}
            onPress={() => router.replace("/(tabs)/premium")}
          >
            <Feather name="zap" size={16} color={colors.accentForeground} />
            <Text className="font-[Inter_700Bold] text-sm" style={{ color: colors.accentForeground }}>
              Mở Premium
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      >
        <View className="items-center gap-2.5 px-6 pb-6 pt-[70px]" style={{ backgroundColor: colors.surface }}>
          <View
            className="mb-2"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Image source={{ uri: book.cover }} style={{ width: 160, height: 230, borderRadius: 12 }} contentFit="cover" />
          </View>

          <View className="flex-row gap-2">
            {book.isNew && (
              <View className="rounded-md px-2 py-[3px]" style={{ backgroundColor: colors.accent }}>
                <Text className="font-[Inter_700Bold] text-[10px] tracking-[0.5px]" style={{ color: colors.accentForeground }}>MỚI</Text>
              </View>
            )}
            {book.isBestseller && (
              <View className="rounded-md bg-[#e05252] px-2 py-[3px]">
                <Text className="font-[Inter_700Bold] text-[10px] tracking-[0.5px] text-white">BESTSELLER</Text>
              </View>
            )}
          </View>

          <Text className="text-center font-[Inter_800ExtraBold] text-[22px] leading-7" style={{ color: colors.foreground }}>{book.title}</Text>
          <Text className="font-[Inter_500Medium] text-[15px]" style={{ color: colors.mutedForeground }}>{book.author}</Text>

          <StarRating rating={book.rating} count={book.ratingCount} size={15} />

          {progress && (
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-2" style={{ backgroundColor: colors.muted }}>
              <Feather name="clock" size={12} color={colors.accent} />
              <Text className="font-[Inter_600SemiBold] text-xs" style={{ color: colors.foreground }}>
                Đang đọc chương {progress.chapterNo}
              </Text>
            </View>
          )}

          <View className="mt-1 flex-row flex-wrap justify-center gap-2">
            {[
              { icon: "tag", label: book.genre },
              { icon: "book-open", label: `${book.pages} trang` },
              { icon: "clock", label: book.readingTime },
              { icon: "globe", label: book.language },
            ].map((meta) => (
              <View
                key={`${meta.icon}-${meta.label}`}
                className="flex-row items-center gap-1 rounded-full px-2.5 py-[5px]"
                style={{ backgroundColor: colors.muted }}
              >
                <Feather
                  name={meta.icon as never}
                  size={12}
                  color={colors.mutedForeground}
                />
                <Text className="font-[Inter_500Medium] text-xs" style={{ color: colors.mutedForeground }}>
                  {meta.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-4 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="font-[Inter_700Bold] text-[17px]" style={{ color: colors.foreground }}>Giới thiệu</Text>
          </View>
          <Text
            className="font-[Inter_400Regular] text-[15px] leading-6"
            style={{ color: colors.mutedForeground }}
            numberOfLines={expanded ? undefined : 4}
          >
            {book.description}
          </Text>
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Text className="mt-1 font-[Inter_600SemiBold] text-sm" style={{ color: colors.accent }}>
              {expanded ? "Thu gọn" : "Xem thêm"}
            </Text>
          </Pressable>

          <View
            className="overflow-hidden rounded-[14px] border p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text
              className="mb-3 font-[Inter_700Bold] text-[17px]"
              style={{ color: colors.foreground }}
            >
              Thông tin sách
            </Text>
            {[
              { label: "Tác giả", value: book.author },
              { label: "Thể loại", value: book.genre },
              { label: "Số trang", value: `${book.pages} trang` },
              { label: "Năm xuất bản", value: `${book.year}` },
              { label: "Ngôn ngữ", value: book.language },
              { label: "Thời gian đọc", value: book.readingTime },
            ].map((row) => (
              <BookInfoRow key={row.label} colors={colors} label={row.label} value={row.value} />
            ))}
          </View>

          <View
            className="overflow-hidden rounded-[14px] border p-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Text
              className="mb-3 font-[Inter_700Bold] text-[17px]"
              style={{ color: colors.foreground }}
            >
              Danh sách chương
            </Text>
            {chapters.length === 0 ? (
              <Text className="font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>
                Chưa có chương
              </Text>
            ) : (
              chapters.map((chapter) => (
                <ChapterRow
                  key={chapter.id}
                  colors={colors}
                  chapter={chapter}
                  active={progress?.chapterId === chapter.id}
                  onPress={() =>
                    router.push(`/reader/${book.id}?chapter=${chapter.chapter_no}&chapterId=${chapter.id}`)
                  }
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-3 border-t px-5 pt-[14px]"
        style={{
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: bottomPad + 12,
        }}
      >
        <Pressable
          className="h-[52px] w-[52px] items-center justify-center rounded-[14px] border-2"
          style={{ borderColor: saved ? colors.accent : colors.border }}
          onPress={handleToggleSave}
        >
          <Feather
            name="bookmark"
            size={22}
            color={saved ? colors.accent : colors.mutedForeground}
            style={{ opacity: saved ? 1 : 0.5 }}
          />
        </Pressable>

        <Pressable
          className="h-[52px] w-[52px] items-center justify-center rounded-[14px] border-2"
          style={{ borderColor: downloaded ? colors.accent : colors.border }}
          onPress={handleToggleDownload}
        >
          <Feather
            name={downloadLoading ? "loader" : downloaded ? "check-circle" : "download"}
            size={22}
            color={downloaded ? colors.accent : colors.mutedForeground}
          />
        </Pressable>

        <Pressable
          className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[14px] active:opacity-[0.85]"
          style={{ backgroundColor: colors.primary }}
          onPress={() => {
            const query = resumeChapter
              ? `?chapter=${resumeChapter.chapter}&chapterId=${resumeChapter.chapterId}`
              : "";
            router.push(`/reader/${book.id}${query}`);
          }}
        >
          <Feather name="book-open" size={18} color={colors.primaryForeground} />
          <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.primaryForeground }}>
            {progress ? "Đọc tiếp" : "Đọc ngay"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        className="absolute left-4 h-10 w-10 items-center justify-center rounded-full"
        style={{
          top: (Platform.OS === "web" ? 67 : insets.top) + 8,
          backgroundColor: colors.surface + "e0",
        }}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );
}
