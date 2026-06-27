import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
};

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
}: PasswordFieldProps) {
  const colors = useColors();

  return (
    <View className="gap-1.5">
      <Text className="font-[Inter_600SemiBold] text-sm" style={{ color: colors.foreground }}>
        {label}
      </Text>
      <View
        className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 p-0 font-[Inter_400Regular] text-[15px]"
          style={{ color: colors.foreground }}
        />
        <Pressable onPress={onToggleVisible}>
          <Feather name={visible ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}
