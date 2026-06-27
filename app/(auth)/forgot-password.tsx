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

function getPasswordResetRedirectUrl() {
  return (
    process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL?.trim() ||
    "book-app:///reset-password"
  );
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSendResetEmail() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError("Vui lòng nhập email tài khoản.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const redirectTo = getPasswordResetRedirectUrl();
    const result = await requestPasswordReset(nextEmail, redirectTo);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Không gửi được email đặt lại mật khẩu.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setMessage("Đã gửi email đặt lại mật khẩu. Vui lòng mở email và bấm vào liên kết xác nhận.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

        <View className="mb-8 items-center gap-3">
          <View
            className="mb-1 h-16 w-16 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="key" size={28} color={colors.accentForeground} />
          </View>
          <Text className="text-center text-[26px] font-extrabold" style={{ color: colors.foreground }}>
            Quên mật khẩu
          </Text>
          <Text className="text-center text-[15px] leading-6" style={{ color: colors.mutedForeground }}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt lại mật khẩu.
          </Text>
        </View>

        <View className="gap-4">
          {!!error && (
            <View className="flex-row items-center gap-2 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] p-3">
              <Feather name="alert-circle" size={15} color="#dc2626" />
              <Text className="flex-1 text-sm text-[#dc2626]">{error}</Text>
            </View>
          )}

          {!!message && (
            <View className="flex-row items-center gap-2 rounded-[10px] border border-[#86efac] bg-[#dcfce7] p-3">
              <Feather name="check-circle" size={15} color="#16a34a" />
              <Text className="flex-1 text-sm text-[#166534]">{message}</Text>
            </View>
          )}

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Email
            </Text>
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
                returnKeyType="send"
                onSubmitEditing={handleSendResetEmail}
              />
            </View>
          </View>

          <Pressable
            className="mt-1 items-center rounded-xl py-4 active:opacity-80"
            style={{ backgroundColor: colors.primary, opacity: loading ? 0.8 : 1 }}
            onPress={handleSendResetEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.primaryForeground }}>
                Gửi email đặt lại mật khẩu
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
