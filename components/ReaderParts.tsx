import { useColors } from "@/hooks/useColors";
import { VOICES } from "@/lib/tts";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

export type TtsState = "idle" | "loading" | "playing" | "paused";

type Colors = ReturnType<typeof useColors>;

export function ChapterNav({
  colors,
  currentIndex,
  total,
  chapterNo,
  onPrev,
  onNext,
  showChapter = false,
}: {
  colors: Colors;
  currentIndex: number;
  total: number;
  chapterNo?: number;
  onPrev: () => void;
  onNext: () => void;
  showChapter?: boolean;
}) {
  const disabledPrev = currentIndex === 0;
  const disabledNext = currentIndex === total - 1;
  const buttonBase = "flex-1 flex-row items-center gap-1 rounded-xl border px-3 py-2";

  return (
    <View className="flex-row items-center justify-between gap-2.5">
      <Pressable
        className={buttonBase}
        style={{ opacity: disabledPrev ? 0.35 : 1, borderColor: colors.border }}
        onPress={onPrev}
        disabled={disabledPrev}
      >
        <Feather name="chevron-left" size={18} color={colors.foreground} />
        <Text className="flex-1 font-[Inter_600SemiBold] text-xs" style={{ color: colors.foreground }}>
          Trước
        </Text>
      </Pressable>

      {showChapter ? (
        <View className="rounded-full px-3 py-2" style={{ backgroundColor: colors.muted }}>
          <Text className="font-[Inter_700Bold] text-[13px]" style={{ color: colors.foreground }}>
            Chương {chapterNo}
          </Text>
        </View>
      ) : null}

      <Pressable
        className={buttonBase}
        style={{ opacity: disabledNext ? 0.35 : 1, borderColor: colors.border }}
        onPress={onNext}
        disabled={disabledNext}
      >
        <Text className="flex-1 font-[Inter_600SemiBold] text-xs" style={{ color: colors.foreground }}>
          Sau
        </Text>
        <Feather name="chevron-right" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export function TTSControls({
  colors,
  selectedVoice,
  ttsState,
  onOpenVoiceModal,
  onPlay,
  onPauseResume,
  onStop,
}: {
  colors: Colors;
  selectedVoice: { label: string };
  ttsState: TtsState;
  onOpenVoiceModal: () => void;
  onPlay: () => void;
  onPauseResume: () => void;
  onStop: () => void;
}) {
  return (
    <View className="flex-row items-center">
      <Pressable className="flex-row items-center gap-[3px] rounded-lg px-2 py-1.5" onPress={onOpenVoiceModal}>
        <Text className="font-[Inter_600SemiBold] text-xs" style={{ color: colors.foreground }}>
          {selectedVoice.label}
        </Text>
        <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
      </Pressable>
      {ttsState === "loading" ? (
        <View className="p-2">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : ttsState === "idle" ? (
        <Pressable className="p-2" onPress={onPlay}>
          <Feather name="volume-2" size={20} color={colors.foreground} />
        </Pressable>
      ) : (
        <>
          <Pressable className="p-2" onPress={onPauseResume}>
            <Feather name={ttsState === "playing" ? "pause" : "play"} size={20} color={colors.primary} />
          </Pressable>
          <Pressable className="p-2" onPress={onStop}>
            <Feather name="square" size={18} color={colors.foreground} />
          </Pressable>
        </>
      )}
    </View>
  );
}

export function VoicePickerModal({
  colors,
  visible,
  voice,
  onSelectVoice,
  onClose,
}: {
  colors: Colors;
  visible: boolean;
  voice: string;
  onSelectVoice: (voice: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-[#00000066] p-8" onPress={onClose}>
        <Pressable
          className="w-full gap-2.5 rounded-[20px] border p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text className="mb-1 font-[Inter_700Bold] text-[17px]" style={{ color: colors.foreground }}>
            Chọn giọng đọc
          </Text>
          {VOICES.map((item) => {
            const active = item.id === voice;
            return (
              <Pressable
                key={item.id}
                className="flex-row items-center rounded-xl border-[1.5px] px-[14px] py-3"
                style={{
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + "18" : undefined,
                }}
                onPress={() => onSelectVoice(item.id)}
              >
                <View className="flex-1">
                  <Text className="font-[Inter_600SemiBold] text-[15px]" style={{ color: colors.foreground }}>
                    {item.label}
                  </Text>
                  <Text className="mt-0.5 font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
                    {item.desc}
                  </Text>
                </View>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
          <Text className="mt-1.5 text-center font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
            Nhấn biểu tượng loa để mở lại menu này
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ReaderAdModal({
  colors,
  visible,
  canClose,
  countdown,
  onClose,
  onUpgrade,
}: {
  colors: Colors;
  visible: boolean;
  canClose: boolean;
  countdown: number;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (canClose) onClose();
      }}
    >
      <View className="flex-1 items-center justify-center bg-[#00000099] p-6">
        <View
          className="w-full max-w-[360px] items-center gap-3 rounded-[20px] border p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent + "22" }}>
            <Feather name="zap" size={22} color={colors.accent} />
          </View>
          <Text className="text-center font-[Inter_800ExtraBold] text-xl" style={{ color: colors.foreground }}>
            Quảng cáo
          </Text>
          <Text className="text-center font-[Inter_400Regular] text-sm leading-5" style={{ color: colors.mutedForeground }}>
            Nâng cấp VIP để đọc truyện không quảng cáo và mở khóa toàn bộ nội dung Premium.
          </Text>
          <Pressable className="mt-1 h-11 w-full items-center justify-center rounded-xl" style={{ backgroundColor: colors.accent }} onPress={onUpgrade}>
            <Text className="font-[Inter_700Bold] text-sm" style={{ color: colors.accentForeground }}>
              Nâng cấp VIP
            </Text>
          </Pressable>
          <Pressable
            className="h-11 w-full items-center justify-center rounded-xl border"
            style={{ borderColor: colors.border, opacity: canClose ? 1 : 0.55 }}
            disabled={!canClose}
            onPress={onClose}
          >
            <Text className="font-[Inter_700Bold] text-sm" style={{ color: colors.foreground }}>
              {canClose ? "Đóng quảng cáo" : `Có thể đóng sau ${countdown}s`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
