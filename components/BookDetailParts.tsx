import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Colors = ReturnType<typeof useColors>;

export function BookDetailState({
  colors,
  text,
  loading = false,
}: {
  colors: Colors;
  text: string;
  loading?: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <Text
        className={`${loading ? "mt-3 text-sm" : "text-base"} font-[Inter_500Medium]`}
        style={{ color: colors.mutedForeground }}
      >
        {text}
      </Text>
    </View>
  );
}

export function BookInfoRow({
  colors,
  label,
  value,
}: {
  colors: Colors;
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-row justify-between border-b py-2.5" style={{ borderBottomColor: colors.border }}>
      <Text className="font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text className="font-[Inter_600SemiBold] text-sm" style={{ color: colors.foreground }}>
        {value}
      </Text>
    </View>
  );
}

export function ChapterRow({
  colors,
  chapter,
  active,
  onPress,
}: {
  colors: Colors;
  chapter: { id: string; chapter_no: number; title: string };
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="mb-2 flex-row items-center gap-3 rounded-xl border px-3 py-3 active:opacity-80"
      style={{
        backgroundColor: active ? colors.accent + "12" : colors.background,
        borderColor: active ? colors.accent + "55" : colors.border,
      }}
      onPress={onPress}
    >
      <View
        className="items-center justify-center rounded-lg"
        style={{
          width: 44,
          height: 36,
          backgroundColor: active ? colors.accent : colors.muted,
        }}
      >
        <Text
          className="font-[Inter_800ExtraBold] text-sm"
          style={{ color: active ? colors.accentForeground : colors.foreground }}
        >
          {chapter.chapter_no}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="font-[Inter_700Bold] text-sm" style={{ color: colors.foreground }} numberOfLines={1}>
          {chapter.title || `Chương ${chapter.chapter_no}`}
        </Text>
        <Text className="mt-0.5 font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
          Chương {chapter.chapter_no}
        </Text>
      </View>

      {active ? (
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.accent }}>
          <Text className="font-[Inter_800ExtraBold] text-[10px]" style={{ color: colors.accentForeground }}>
            Đang đọc
          </Text>
        </View>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}
