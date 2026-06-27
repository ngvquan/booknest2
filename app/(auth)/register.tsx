import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await register(name.trim(), email.trim(), password);
      if (!result.success) {
        setError(result.error || "Đăng ký thất bại");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      }
    } catch {
      setError("Không thể kết nối máy chủ. App sẽ tiếp tục dùng chế độ local khi có thể.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-grow px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable className="mb-5 w-10" onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <View className="mb-7 items-center gap-2.5">
          <View
            className="mb-1 h-16 w-16 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="user-plus" size={28} color={colors.accentForeground} />
          </View>
          <Text className="text-center text-[26px] font-extrabold" style={{ color: colors.foreground }}>Tạo tài khoản</Text>
          <Text className="text-center text-[15px]" style={{ color: colors.mutedForeground }}>
            Tham gia cộng đồng đọc sách
          </Text>
        </View>

        <View className="gap-[14px]">
          {error !== "" && (
            <View
              className="flex-row items-center gap-2 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] p-3"
            >
              <Feather name="alert-circle" size={15} color="#dc2626" />
              <Text className="flex-1 text-sm text-[#dc2626]">{error}</Text>
            </View>
          )}

          {[
            {
              label: "Họ và tên",
              icon: "user",
              value: name,
              setter: setName,
              placeholder: "Nguyễn Văn A",
              keyboard: "default" as const,
            },
            {
              label: "Email",
              icon: "mail",
              value: email,
              setter: setEmail,
              placeholder: "email@example.com",
              keyboard: "email-address" as const,
            },
          ].map((field) => (
            <View className="gap-1.5" key={field.label}>
              <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>{field.label}</Text>
              <View
                className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Feather
                  name={field.icon as any}
                  size={18}
                  color={colors.mutedForeground}
                />
                <TextInput
                  className="flex-1 text-[15px]"
                  style={{ color: colors.foreground }}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.value}
                  onChangeText={field.setter}
                  autoCapitalize={field.keyboard === "email-address" ? "none" : "words"}
                  keyboardType={field.keyboard}
                />
              </View>
            </View>
          ))}

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>Mật khẩu</Text>
            <View
              className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                className="flex-1 text-[15px]"
                style={{ color: colors.foreground }}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Feather
                  name={showPass ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Xác nhận mật khẩu
            </Text>
            <View
              className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                className="flex-1 text-[15px]"
                style={{ color: colors.foreground }}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={colors.mutedForeground}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          <Pressable
            className="mt-1 items-center rounded-xl py-4 active:opacity-80"
            style={{
              backgroundColor: colors.primary,
              opacity: loading ? 0.8 : 1,
            }}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.primaryForeground }}>
                Đăng ký
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center">
            <Text className="text-sm" style={{ color: colors.mutedForeground }}>
              Đã có tài khoản?{" "}
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm font-bold" style={{ color: colors.accent }}>Đăng nhập</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap justify-center">
            <Text className="text-[13px]" style={{ color: colors.mutedForeground }}>
              Bằng cách đăng ký, bạn đồng ý với{" "}
            </Text>
            <Pressable onPress={() => router.push("/privacy-policy")}>
              <Text className="text-[13px] font-semibold" style={{ color: colors.accent }}>
                Chính sách bảo mật
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
