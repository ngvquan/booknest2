import { useAuth } from "@/context/AuthContext";
import { PasswordField } from "@/components/PasswordField";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActionResult = { success: boolean; error?: string };

const SAVE_TIMEOUT_MS = 15000;

function withActionTimeout(action: Promise<ActionResult>, error: string): Promise<ActionResult> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<ActionResult>((resolve) => {
    timeoutId = setTimeout(() => resolve({ success: false, error }), SAVE_TIMEOUT_MS);
  });

  return Promise.race([action, timeout]).finally(() => clearTimeout(timeoutId));
}

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateProfile, changePassword } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const canChangePassword = !user?.id?.startsWith("local-");

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  async function handleSaveAll() {
    if (!name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập họ và tên.");
      return;
    }

    if (canChangePassword && (currentPassword.trim() || newPassword.trim() || confirmPassword.trim())) {
      if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
        Alert.alert("Thiếu thông tin", "Vui lòng nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.");
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert("Mật khẩu quá ngắn", "Mật khẩu mới phải có ít nhất 6 ký tự.");
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert("Không khớp", "Mật khẩu xác nhận không khớp.");
        return;
      }
    }

    setSaving(true);

    try {
      const profileResult = await withActionTimeout(
        updateProfile({ name }),
        "Kết nối tới Supabase quá lâu. Vui lòng kiểm tra mạng rồi thử lại.",
      );
      if (!profileResult.success) {
        Alert.alert("Không thể cập nhật", profileResult.error || "Vui lòng thử lại sau.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (canChangePassword && newPassword.trim()) {
        const passwordResult = await withActionTimeout(
          changePassword(currentPassword, newPassword),
          "Đổi mật khẩu mất quá lâu. Vui lòng kiểm tra mạng rồi thử lại.",
        );
        if (!passwordResult.success) {
          Alert.alert("Không thể đổi mật khẩu", passwordResult.error || "Vui lòng thử lại sau.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Cập nhật thành công", "Thông tin tài khoản đã được lưu.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Không thể cập nhật", "Đã xảy ra lỗi, vui lòng thử lại.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="flex-row items-center justify-between border-b px-4 pb-[14px]"
        style={{
          paddingTop: topPad + 8,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable className="w-9 items-center p-2" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text className="font-[Inter_700Bold] text-[17px]" style={{ color: colors.foreground }}>
          Chỉnh sửa thông tin
        </Text>
        <View className="w-9" />
      </View>

      <ScrollView
        contentContainerClassName="p-5"
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="gap-[14px] rounded-2xl border p-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.foreground }}>
            Thông tin tài khoản
          </Text>

          <View className="gap-1.5">
            <Text className="font-[Inter_600SemiBold] text-sm" style={{ color: colors.foreground }}>
              Họ và tên
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={colors.mutedForeground}
              className="rounded-xl border px-[14px] py-[14px] font-[Inter_400Regular] text-[15px]"
              style={{
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              }}
            />
          </View>

          {canChangePassword ? (
            <>
              <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.foreground }}>
                Đổi mật khẩu
              </Text>

              <PasswordField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((prev) => !prev)}
              />

              <PasswordField
                label="Mật khẩu mới"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((prev) => !prev)}
              />

              <PasswordField
                label="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((prev) => !prev)}
              />
              <Text className="font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
                Để trống nếu bạn không muốn đổi mật khẩu.
              </Text>
            </>
          ) : null}

          <Pressable
            className="mt-1 h-12 items-center justify-center rounded-xl active:opacity-[0.85]"
            style={{
              backgroundColor: colors.primary,
              opacity: saving ? 0.85 : 1,
            }}
            onPress={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text className="font-[Inter_700Bold] text-[15px]" style={{ color: colors.primaryForeground }}>
                Lưu thay đổi
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
