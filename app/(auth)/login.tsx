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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.error || "Đăng nhập thất bại");
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
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-9 items-center gap-3">
          <View
            className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-[20px]"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="book-open" size={32} color={colors.accentForeground} />
          </View>
          <Text className="text-center text-[28px] font-extrabold" style={{ color: colors.foreground }}>Chào mừng trở lại</Text>
          <Text className="text-center text-[15px]" style={{ color: colors.mutedForeground }}>
            Đăng nhập để tiếp tục đọc sách
          </Text>
        </View>

        <View className="gap-4">
          {error !== "" && (
            <View
              className="flex-row items-center gap-2 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] p-3"
            >
              <Feather name="alert-circle" size={15} color="#dc2626" />
              <Text className="flex-1 text-sm text-[#dc2626]">{error}</Text>
            </View>
          )}

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>Email</Text>
            <View
              className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                className="flex-1 text-[15px]"
                style={{ color: colors.foreground }}
                placeholder="email@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
          </View>

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
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          <Pressable className="self-end" onPress={() => router.push("/forgot-password" as never)}>
            <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
              Quên mật khẩu?
            </Text>
          </Pressable>

          <Pressable
            className="mt-1 items-center rounded-xl py-4 active:opacity-80"
            style={{
              backgroundColor: colors.primary,
              opacity: loading ? 0.8 : 1,
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.primaryForeground }}>
                Đăng nhập
              </Text>
            )}
          </Pressable>

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1" style={{ backgroundColor: colors.border }} />
            <Text className="text-[13px]" style={{ color: colors.mutedForeground }}>hoặc</Text>
            <View className="h-px flex-1" style={{ backgroundColor: colors.border }} />
          </View>

          <Pressable
            className="items-center rounded-xl border py-4 active:opacity-80"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text className="text-base font-semibold" style={{ color: colors.foreground }}>
              Tạo tài khoản mới
            </Text>
          </Pressable>
        </View>

        <View className="mt-8 flex-row flex-wrap justify-center">
          <Text className="text-[13px]" style={{ color: colors.mutedForeground }}>
            Bằng cách đăng nhập, bạn đồng ý với{" "}
          </Text>
          <Pressable onPress={() => router.push("/privacy-policy")}>
            <Text className="text-[13px] font-semibold" style={{ color: colors.accent }}>
              Chính sách bảo mật
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
