import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

function readParamsFromUrl(url: string | null) {
  if (!url) return new URLSearchParams();

  const parsed = Linking.parse(url);
  const params = new URLSearchParams();

  Object.entries(parsed.queryParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });

  const hash = url.split("#")[1];
  if (hash) {
    new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  }

  return params;
}

type RouteParamValue = string | string[] | undefined;

function setParam(params: URLSearchParams, key: string, value: RouteParamValue) {
  const nextValue = Array.isArray(value) ? value[0] : value;
  if (typeof nextValue === "string" && nextValue.length > 0) {
    params.set(key, nextValue);
  }
}

function readRecoveryParams(url: string | null, routeParams: Record<string, RouteParamValue>) {
  const params = readParamsFromUrl(url);

  Object.entries(routeParams).forEach(([key, value]) => {
    if (!params.has(key)) {
      setParam(params, key, value);
    }
  });

  return params;
}

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const url = Linking.useLinkingURL();
  const routeParams = useLocalSearchParams() as Record<string, RouteParamValue>;
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const params = useMemo(() => readRecoveryParams(url, routeParams), [url, routeParams]);
  const paramsKey = params.toString();
  const handledParamsKeyRef = useRef<string | null>(null);
  const debugParamKeys = useMemo(() => {
    if (!__DEV__) return "";

    const keys = Array.from(new Set(Array.from(params.keys()))).sort();
    const routeKeys = Object.keys(routeParams).sort();
    return [
      `url=${url ? "yes" : "no"}`,
      `keys=${keys.length ? keys.join(",") : "none"}`,
      `route=${routeKeys.length ? routeKeys.join(",") : "none"}`,
    ].join(" ");
  }, [paramsKey, routeParams, url]);

  useEffect(() => {
    if (handledParamsKeyRef.current === paramsKey) return;
    handledParamsKeyRef.current = paramsKey;

    let active = true;

    async function prepareRecoverySession() {
      setPreparing(true);
      setError("");

      const params = new URLSearchParams(paramsKey);
      const code = params.get("code");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const tokenHash = params.get("token_hash");
      const recoveryType = params.get("type") || "recovery";
      const authErrorCode = params.get("error_code");
      const authErrorDescription = params.get("error_description");

      try {
        if (authErrorCode === "otp_expired") {
          throw new Error("Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng gửi email đặt lại mật khẩu mới.");
        }

        if (authErrorDescription) {
          throw new Error(authErrorDescription);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: recoveryType,
          });
          if (verifyError) throw verifyError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
          }
        }

        if (!active) return;
        setReady(true);
      } catch (e) {
        if (!active) return;
        setReady(false);
        setError(e instanceof Error ? e.message : "Không xác thực được liên kết đặt lại mật khẩu.");
      } finally {
        if (active) setPreparing(false);
      }
    }

    prepareRecoverySession();
    return () => {
      active = false;
    };
  }, [paramsKey]);

  async function handleResetPassword() {
    if (!ready || preparing) return;

    if (!password.trim() || !confirm.trim()) {
      setError("Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await resetPassword(password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Không thể đặt lại mật khẩu.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
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
        <View className="mb-8 items-center gap-3">
          <View
            className="mb-1 h-16 w-16 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: colors.accent }}
          >
            <Feather name="shield" size={28} color={colors.accentForeground} />
          </View>
          <Text className="text-center text-[26px] font-extrabold" style={{ color: colors.foreground }}>
            Đặt lại mật khẩu
          </Text>
          <Text className="text-center text-[15px] leading-6" style={{ color: colors.mutedForeground }}>
            Nhập mật khẩu mới để hoàn tất khôi phục tài khoản.
          </Text>
        </View>

        <View className="gap-4">
          {preparing ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-3 text-sm" style={{ color: colors.mutedForeground }}>
                Đang xác thực liên kết...
              </Text>
            </View>
          ) : null}

          {!!error && (
            <View className="gap-2 rounded-[10px] border border-[#fca5a5] bg-[#fee2e2] p-3">
              <View className="flex-row items-center gap-2">
                <Feather name="alert-circle" size={15} color="#dc2626" />
                <Text className="flex-1 text-sm text-[#dc2626]">{error}</Text>
              </View>
              {__DEV__ && debugParamKeys ? (
                <Text className="text-xs text-[#991b1b]">{debugParamKeys}</Text>
              ) : null}
            </View>
          )}

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Mật khẩu mới
            </Text>
            <View
              className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, opacity: ready ? 1 : 0.6 }}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                className="flex-1 text-[15px]"
                style={{ color: colors.foreground }}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={ready && !loading}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Xác nhận mật khẩu
            </Text>
            <View
              className="flex-row items-center gap-2.5 rounded-xl border px-[14px] py-[14px]"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, opacity: ready ? 1 : 0.6 }}
            >
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                className="flex-1 text-[15px]"
                style={{ color: colors.foreground }}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={colors.mutedForeground}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                editable={ready && !loading}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
            </View>
          </View>

          <Pressable
            className="mt-1 items-center rounded-xl py-4 active:opacity-80"
            style={{ backgroundColor: colors.primary, opacity: loading || !ready ? 0.7 : 1 }}
            onPress={handleResetPassword}
            disabled={loading || !ready}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="text-base font-bold" style={{ color: colors.primaryForeground }}>
                Cập nhật mật khẩu
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
