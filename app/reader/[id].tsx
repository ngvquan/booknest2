import { useAuth } from "@/context/AuthContext";
import {
  ChapterNav,
  ReaderAdModal,
  TTSControls,
  VoicePickerModal,
  type TtsState,
} from "@/components/ReaderParts";
import { useColors } from "@/hooks/useColors";
import { isBookLocked } from "@/lib/bookAccess";
import { fetchBookById, fetchChaptersByBook } from "@/lib/booksService";
import { upsertReadingProgress } from "@/lib/bookRepository";
import { getOfflineBookDetail } from "@/lib/offlineService";
import { callGeminiTTS, hasTtsApiKey, splitChunks, VOICES } from "@/lib/tts";
import { clearTtsProgress, fetchTtsProgress, upsertTtsProgress } from "@/lib/ttsProgressStore";
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReaderChapter = { id: string; chapter_no: number; title: string; content: string };
export default function ReaderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, chapter, chapterId } = useLocalSearchParams<{
    id: string;
    chapter?: string;
    chapterId?: string;
  }>();

  const [bookTitle, setBookTitle] = useState("");
  const [chapters, setChapters] = useState<ReaderChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [voiceModal, setVoiceModal] = useState(false);
  const [adVisible, setAdVisible] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  const soundRef = useRef<Audio.Sound | null>(null);
  const chunksRef = useRef<string[]>([]);
  const chunkIdxRef = useRef(0);
  const loadedChunkIdxRef = useRef(0);
  const resumePositionMillisRef = useRef(0);
  const lastProgressSaveAtRef = useRef(0);
  const playbackResolveRef = useRef<(() => void) | null>(null);
  const stopFlagRef = useRef(false);
  const voiceRef = useRef(voice);
  const playbackContextRef = useRef<{
    userId?: string;
    bookId?: string;
    chapterId?: string;
  }>({});
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchBookById(id).catch(() => null),
      fetchChaptersByBook(id).catch(() => []),
      getOfflineBookDetail(id, user?.id).catch(() => ({ book: null, chapters: [] })),
    ])
      .then(([book, rows, offline]) => {
        const accessBook = book ?? offline.book;

        if (isBookLocked(accessBook, user)) {
          Alert.alert(
            "Nội dung Premium",
            "Bạn cần tài khoản Premium để đọc cuốn sách này.",
            [{ text: "Mở Premium", onPress: () => router.replace("/(tabs)/premium") }],
          );
          setBookTitle("");
          setChapters([]);
          setCurrentIndex(0);
          return;
        }
        if (!alive) return;
        const finalRows = (rows.length > 0 ? rows : offline.chapters) as ReaderChapter[];
        setBookTitle(book?.title ?? offline.book?.title ?? (finalRows.length > 0 ? "Đọc offline" : ""));
        setChapters(finalRows);
        const byId = chapterId ? finalRows.findIndex((row) => row.id === chapterId) : -1;
        const byNo = chapter
          ? finalRows.findIndex((row) => String(row.chapter_no) === String(chapter))
          : -1;
        setCurrentIndex(byId >= 0 ? byId : byNo >= 0 ? byNo : 0);
      })
      .catch(() => {
        if (!alive) return;
        setBookTitle("");
        setChapters([]);
        setCurrentIndex(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id, chapter, chapterId, user?.id, user?.isVip]);

  const currentChapter = chapters[currentIndex];
  const paragraphs = useMemo(
    () =>
      (currentChapter?.content ?? "")
        .split(/\n\s*\n/g)
        .map((part) => part.trim())
        .filter(Boolean),
    [currentChapter?.content],
  );
  const selectedVoice = VOICES.find((item) => item.id === voice) ?? VOICES[0];
  const canCloseAd = adCountdown <= 0;

  useEffect(() => {
    playbackContextRef.current = {
      userId: user?.id,
      bookId: id,
      chapterId: currentChapter?.id,
    };
  }, [currentChapter?.id, id, user?.id]);

  useEffect(() => {
    if (!currentChapter?.id || user?.isVip) {
      setAdVisible(false);
      return;
    }

    setAdCountdown(5);
    setAdVisible(true);

    const timer = setInterval(() => {
      setAdCountdown((value) => {
        if (value <= 1) {
          clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentChapter?.id, user?.isVip]);

  useEffect(() => {
    if (!user?.id || !id || !currentChapter?.id) return;
    upsertReadingProgress(user.id, id, currentChapter.id, 0).catch((error) => {
      console.error("save progress error:", error);
    });
  }, [currentChapter?.id, id, user?.id]);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      setChromeVisible((prev) => !prev);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  }

  const unloadSound = useCallback(async () => {
    playbackResolveRef.current?.();
    playbackResolveRef.current = null;
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, []);

  const persistTtsProgress = useCallback((chunkIndex: number, positionMillis: number) => {
    const { userId, bookId, chapterId } = playbackContextRef.current;
    if (!userId || !bookId || !chapterId) return;
    upsertTtsProgress(userId, bookId, chapterId, {
      voice: voiceRef.current,
      chunkIndex,
      positionMillis,
    }).catch((error) => {
      console.error("save TTS progress error:", error);
    });
  }, []);

  const saveCurrentTtsProgress = useCallback(async () => {
    const { userId, bookId, chapterId } = playbackContextRef.current;
    if (!userId || !bookId || !chapterId || !soundRef.current) return;

    const status = await soundRef.current.getStatusAsync().catch(() => null);
    if (!status?.isLoaded) return;

    await upsertTtsProgress(userId, bookId, chapterId, {
      voice: voiceRef.current,
      chunkIndex: loadedChunkIdxRef.current,
      positionMillis: status.positionMillis ?? 0,
    }).catch((error) => {
      console.error("save TTS progress error:", error);
    });
  }, []);

  const clearCurrentTtsProgress = useCallback(async () => {
    const { userId, bookId, chapterId } = playbackContextRef.current;
    if (!userId || !bookId || !chapterId) return;
    await clearTtsProgress(userId, bookId, chapterId).catch((error) => {
      console.error("clear TTS progress error:", error);
    });
  }, []);

  const stopTts = useCallback(async (resetProgress: boolean) => {
    stopFlagRef.current = true;
    if (!resetProgress) {
      await saveCurrentTtsProgress();
    }
    await unloadSound();
    chunkIdxRef.current = 0;
    resumePositionMillisRef.current = 0;
    setTtsState("idle");
    if (resetProgress) {
      await clearCurrentTtsProgress();
    }
  }, [clearCurrentTtsProgress, saveCurrentTtsProgress, unloadSound]);

  const handleStop = useCallback(async () => {
    await stopTts(true);
  }, [stopTts]);

  useEffect(() => {
    return () => {
      stopFlagRef.current = true;
      (async () => {
        await saveCurrentTtsProgress();
        await unloadSound();
      })().catch(() => {});
    };
  }, [saveCurrentTtsProgress, unloadSound]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        saveCurrentTtsProgress().catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [saveCurrentTtsProgress]);

  async function goToIndex(next: number) {
    if (next < 0 || next >= chapters.length) return;
    await stopTts(false);
    setCurrentIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function handleBackToBookDetail() {
    await stopTts(false);
    if (id) {
      router.replace(`/book/${id}`);
      return;
    }
    router.back();
  }

  const playBase64 = useCallback(
    async (base64: string, chunkIndex: number, startPositionMillis: number) => {
      await unloadSound();
      if (stopFlagRef.current) return;
      loadedChunkIdxRef.current = chunkIndex;
      lastProgressSaveAtRef.current = Date.now();
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${base64}` },
        { shouldPlay: false },
      );
      soundRef.current = sound;
      if (startPositionMillis > 0) {
        await sound.setPositionAsync(startPositionMillis).catch(() => {});
      }
      await sound.playAsync();
      await new Promise<void>((resolve) => {
        playbackResolveRef.current = resolve;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            playbackResolveRef.current = null;
            persistTtsProgress(chunkIndex + 1, 0);
            resolve();
            return;
          }

          const now = Date.now();
          if (status.isPlaying && now - lastProgressSaveAtRef.current >= 2500) {
            lastProgressSaveAtRef.current = now;
            persistTtsProgress(chunkIndex, status.positionMillis ?? 0);
          }
        });
      });
    },
    [persistTtsProgress, unloadSound],
  );

  const playQueue = useCallback(async () => {
    const chunks = chunksRef.current;
    const initialChunkIndex = chunkIdxRef.current;
    const initialPositionMillis = resumePositionMillisRef.current;
    resumePositionMillisRef.current = 0;
    for (let i = chunkIdxRef.current; i < chunks.length; i++) {
      if (stopFlagRef.current) break;
      chunkIdxRef.current = i;
      const startPositionMillis = i === initialChunkIndex ? initialPositionMillis : 0;
      persistTtsProgress(i, startPositionMillis);
      setTtsState("loading");
      const base64 = await callGeminiTTS(chunks[i], voiceRef.current);
      if (stopFlagRef.current) break;
      setTtsState("playing");
      await playBase64(base64, i, startPositionMillis);
    }
    if (!stopFlagRef.current) {
      setTtsState("idle");
      chunkIdxRef.current = 0;
      resumePositionMillisRef.current = 0;
      await clearCurrentTtsProgress();
    }
  }, [clearCurrentTtsProgress, persistTtsProgress, playBase64]);

  const handlePlay = useCallback(async () => {
    if (!hasTtsApiKey()) {
      Alert.alert(
        "Thiếu API Key",
        "Vui lòng điền EXPO_PUBLIC_GEMINI_API_KEY trong file .env để dùng đọc truyện.",
      );
      return;
    }
    if (!currentChapter) return;
    stopFlagRef.current = false;
    chunksRef.current = splitChunks(paragraphs.join("\n\n"));
    chunkIdxRef.current = 0;
    resumePositionMillisRef.current = 0;
    const { userId, bookId, chapterId } = playbackContextRef.current;
    if (userId && bookId && chapterId) {
      const progress = await fetchTtsProgress(userId, bookId, chapterId).catch(() => null);
      if (progress?.voice === voiceRef.current && progress.chunkIndex < chunksRef.current.length) {
        chunkIdxRef.current = progress.chunkIndex;
        resumePositionMillisRef.current = progress.positionMillis;
      }
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    playQueue().catch((error) => {
      console.error("TTS error:", error);
      setTtsState("idle");
      Alert.alert("Lỗi TTS", error?.message ?? "Không thể đọc truyện.");
    });
  }, [currentChapter, paragraphs, playQueue]);

  const handlePauseResume = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await saveCurrentTtsProgress();
      await soundRef.current.pauseAsync();
      setTtsState("paused");
    } else {
      await soundRef.current.playAsync();
      setTtsState("playing");
    }
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!currentChapter) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Không tìm thấy nội dung</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <VoicePickerModal
        colors={colors}
        visible={voiceModal}
        voice={voice}
        onClose={() => setVoiceModal(false)}
        onSelectVoice={(nextVoice) => {
          setVoice(nextVoice);
          setVoiceModal(false);
        }}
      />

      <ReaderAdModal
        colors={colors}
        visible={adVisible}
        canClose={canCloseAd}
        countdown={adCountdown}
        onClose={() => setAdVisible(false)}
        onUpgrade={() => {
          setAdVisible(false);
          router.push("/(tabs)/premium");
        }}
      />
      {chromeVisible && (
        <View
          className="flex-row items-center gap-2 border-b px-4 pb-3"
          style={{
            paddingTop: topPad + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable className="p-2" onPress={handleBackToBookDetail}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text className="flex-1 font-[Inter_600SemiBold] text-[15px]" style={{ color: colors.foreground }} numberOfLines={1}>
            {bookTitle}
          </Text>
          <View className="flex-row items-center">
            <TTSControls
              colors={colors}
              selectedVoice={selectedVoice}
              ttsState={ttsState}
              onOpenVoiceModal={() => setVoiceModal(true)}
              onPlay={handlePlay}
              onPauseResume={handlePauseResume}
              onStop={handleStop}
            />
            <Pressable className="p-2" onPress={() => setFontSize((size) => Math.max(12, size - 2))}>
              <Text className="px-[5px] font-[Inter_700Bold] text-[13px]" style={{ color: colors.foreground }}>A-</Text>
            </Pressable>
            <Pressable className="p-2" onPress={() => setFontSize((size) => Math.min(24, size + 2))}>
              <Text className="px-[5px] font-[Inter_700Bold] text-[17px]" style={{ color: colors.foreground }}>A+</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View className="flex-1" onTouchEnd={handleTap}>
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="px-6"
          contentContainerStyle={{
            paddingTop: chromeVisible ? 24 : 16,
            paddingBottom: chromeVisible ? bottomPad + 108 : bottomPad + 28,
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          overScrollMode="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View className="mb-4">
            <ChapterNav
              colors={colors}
              currentIndex={currentIndex}
              total={chapters.length}
              chapterNo={currentChapter.chapter_no}
              showChapter
              onPrev={() => goToIndex(currentIndex - 1)}
              onNext={() => goToIndex(currentIndex + 1)}
            />
          </View>

          <Text className="mb-[18px] text-center font-[Inter_800ExtraBold] text-2xl" style={{ color: colors.foreground }}>
            {currentChapter.title}
          </Text>

          <View className="gap-4">
            {paragraphs.map((para, index) => (
              <Text
                key={index}
                style={[
                  {
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    fontSize,
                    lineHeight: fontSize * 1.9,
                  },
                ]}
              >
                {para}
              </Text>
            ))}
          </View>

          <View className="mb-3 mt-[22px]">
            <ChapterNav
              colors={colors}
              currentIndex={currentIndex}
              total={chapters.length}
              onPrev={() => goToIndex(currentIndex - 1)}
              onNext={() => goToIndex(currentIndex + 1)}
            />
          </View>
          <View style={{ height: chromeVisible ? 8 : 0 }} />
        </ScrollView>
      </View>

      {chromeVisible && (
        <View
          className="flex-row items-center justify-center gap-1.5 border-t px-5 pt-3"
          style={{
            paddingBottom: bottomPad + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          }}
        >
          <Feather name="align-left" size={15} color={colors.mutedForeground} />
          <Text className="font-[Inter_500Medium] text-[13px]" style={{ color: colors.mutedForeground }}>
            Cỡ chữ: {fontSize}px
          </Text>
          <Text className="font-[Inter_500Medium] text-[13px]" style={{ color: colors.mutedForeground }}>·</Text>
          <Feather
            name={ttsState !== "idle" ? "volume-2" : "book-open"}
            size={15}
            color={colors.mutedForeground}
          />
          <Text className="font-[Inter_500Medium] text-[13px]" style={{ color: colors.mutedForeground }}>
            {ttsState === "loading"
              ? `Đang tải · ${selectedVoice.label}...`
              : ttsState === "playing"
                ? `Đang đọc · ${selectedVoice.label}`
                : ttsState === "paused"
                  ? `Tạm dừng · ${selectedVoice.label}`
                  : `Chương ${currentChapter.chapter_no}`}
          </Text>
        </View>
      )}
    </View>
  );
}
