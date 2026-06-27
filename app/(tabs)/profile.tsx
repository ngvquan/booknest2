import { getLibraryIds } from "@/app/(tabs)/library";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { fetchReadingHistory, updateAvatarUrl } from "@/lib/booksService";
import { getImageMeta, readImageFile } from "@/lib/imageUpload";
import { getDownloadedBooks } from "@/lib/offlineService";
import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getPremiumDaysRemaining(vipExpiredAt: string | null | undefined) {
  if (!vipExpiredAt) return 0;

  const expiry = new Date(vipExpiredAt).getTime();
  const now = Date.now();

  if (Number.isNaN(expiry) || expiry <= now) {
    return 0;
  }

  return Math.ceil((expiry - now) / 86400000);
}

function ProfileActionRow({
  colors,
  icon,
  iconBg,
  iconColor,
  title,
  onPress,
  right,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const content = (
    <>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: iconBg }}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <Text className="font-[Inter_500Medium] text-[15px]" style={{ color: colors.foreground }}>
          {title}
        </Text>
      </View>
      {right ?? <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </>
  );

  if (!onPress) {
    return <View className="flex-row items-center justify-between p-4">{content}</View>;
  }

  return (
    <Pressable className="flex-row items-center justify-between p-4 active:opacity-70" onPress={onPress}>
      {content}
    </Pressable>
  );
}

function ProfileDivider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View className="ml-16 h-px" style={{ backgroundColor: colors.border }} />;
}

function isLocalUserId(userId: string | undefined) {
  return !!userId && userId.startsWith("local-");
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshCurrentUser, updateLocalAvatar } = useAuth();
  const { isDark, setMode } = useTheme();
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({
    reading: 0,
    saved: 0,
    downloaded: 0,
  });

  const topPad = insets.top;
  const isVip = !!user?.isVip;
  const premiumDaysRemaining = useMemo(
    () => getPremiumDaysRemaining(user?.vipExpiredAt),
    [user?.vipExpiredAt],
  );

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [user?.avatar]);

  useEffect(() => {
    if (!user?.id) {
      setStats({ reading: 0, saved: 0, downloaded: 0 });
      return;
    }

    let active = true;

    Promise.all([
      getLibraryIds(),
      fetchReadingHistory(user.id),
      getDownloadedBooks(user.id),
    ])
      .then(([savedIds, readingRows, downloadedBooks]) => {
        if (!active) return;
        setStats({
          reading: readingRows.length,
          saved: savedIds.length,
          downloaded: downloadedBooks.length,
        });
      })
      .catch(() => {
        if (!active) return;
        setStats((prev) => ({ ...prev, reading: 0, downloaded: 0 }));
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  function handleLogout() {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  function toggleDark(value: boolean) {
    setMode(value ? "dark" : "light");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleShowHotline() {
    const phoneUrl = "tel:19008668";

    try {
      await Linking.openURL(phoneUrl);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      if (Platform.OS !== "android") {
        Alert.alert("Hotline hỗ trợ", "1900 8668");
      }
    }
  }

  function getAvatarUploadErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");

    if (message.toLowerCase().includes("bucket")) {
      return "Chưa có bucket avatars trên Supabase. Hãy chạy migration avatar storage trước.";
    }

    if (message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("policy")) {
      return "Storage policy chưa cho phép tài khoản này upload avatar.";
    }

    return message || "Vui lòng thử lại sau.";
  }

  async function uploadAvatarAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!user?.id || uploadingAvatar) return;

    setUploadingAvatar(true);
    setAvatarImageFailed(false);

    try {
      if (isLocalUserId(user.id)) {
        await updateLocalAvatar(asset.uri);
        Alert.alert("Cập nhật thành công", "Ảnh đại diện đã được lưu trên thiết bị.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const { ext, contentType } = getImageMeta(asset);
      const storagePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const arrayBuffer = await readImageFile(asset.uri);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
      await updateAvatarUrl(user.id, data.publicUrl);
      await refreshCurrentUser();
      Alert.alert("Cập nhật thành công", "Ảnh đại diện đã được lưu.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Không thể upload", getAvatarUploadErrorMessage(error));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function pickAvatarFromLibrary() {
    if (!user?.id) {
      Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập lại để đổi avatar.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Cần quyền truy cập", "Vui lòng cho phép truy cập thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadAvatarAsset(result.assets[0]);
  }

  async function takeAvatarPhoto() {
    if (!user?.id) {
      Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập lại để đổi avatar.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Cần quyền camera", "Vui lòng cho phép truy cập camera để chụp ảnh đại diện.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadAvatarAsset(result.assets[0]);
  }

  function handlePickAvatar() {
    if (uploadingAvatar) return;

    Alert.alert("Đổi ảnh đại diện", "Chọn nguồn ảnh bạn muốn sử dụng.", [
      { text: "Chụp ảnh", onPress: takeAvatarPhoto },
      { text: "Chọn từ album", onPress: pickAvatarFromLibrary },
      { text: "Hủy", style: "cancel" },
    ]);
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(-2)
      .join("")
      .toUpperCase() ?? "?";
  const canShowAvatarImage = !!user?.avatar && !avatarImageFailed;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerClassName="items-center px-6"
      contentContainerStyle={{ paddingTop: topPad + 24, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-6 items-center gap-1.5">
        <Pressable
          className="relative mb-1.5 items-center justify-center"
          style={{ width: 104, height: 104 }}
          onPress={handlePickAvatar}
          disabled={uploadingAvatar}
        >
          <View
            className="items-center justify-center"
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 3,
              borderColor: colors.accent,
              backgroundColor: colors.surface,
            }}
          >
            {canShowAvatarImage ? (
              <Image
                source={{ uri: user.avatar }}
                contentFit="cover"
                transition={120}
                onError={() => setAvatarImageFailed(true)}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: colors.muted,
                }}
              />
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: colors.primary,
                }}
              >
                <Text
                  className="font-[Inter_800ExtraBold] text-[30px]"
                  style={{ color: colors.primaryForeground }}
                >
                  {initials}
                </Text>
              </View>
            )}
          </View>

          <View
            className="absolute items-center justify-center border-2"
            style={{
              left: 6,
              bottom: 6,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderColor: colors.background,
            }}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="camera" size={13} color={colors.primary} />
            )}
          </View>

          {isVip ? (
            <View
              className="absolute items-center justify-center border-2"
              style={{
                right: 6,
                bottom: 6,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.accent,
                borderColor: colors.background,
              }}
            >
              <Feather name="award" size={14} color={colors.accentForeground} />
            </View>
          ) : null}
        </Pressable>

        <View className="flex-row items-center gap-2">
          <Text className="font-[Inter_700Bold] text-xl" style={{ color: colors.foreground }}>
            {user?.name ?? "Người dùng"}
          </Text>
          {isVip ? (
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: colors.accent }}
            >
              <Feather name="zap" size={11} color={colors.accentForeground} />
              <Text
                className="text-[11px] font-[Inter_800ExtraBold]"
                style={{ color: colors.accentForeground }}
              >
                VIP
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>
          {user?.email ?? "user@example.com"}
        </Text>
      </View>

      <View
        className="mb-5 w-full flex-row rounded-[14px] border p-5"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        {[
          { label: "Đang đọc", value: stats.reading },
          { label: "Đã lưu", value: stats.saved },
          { label: "Đã tải", value: stats.downloaded },
        ].map((item, index, array) => (
          <React.Fragment key={item.label}>
            <View className="flex-1 items-center gap-1">
              <Text className="font-[Inter_800ExtraBold] text-2xl" style={{ color: colors.foreground }}>
                {item.value}
              </Text>
              <Text
                className="text-center font-[Inter_400Regular] text-xs"
                style={{ color: colors.mutedForeground }}
              >
                {item.label}
              </Text>
            </View>
            {index < array.length - 1 && (
              <View className="my-1 w-px" style={{ backgroundColor: colors.border }} />
            )}
          </React.Fragment>
        ))}
      </View>

      {isVip ? (
        <View
          className="mb-4 w-full flex-row items-center justify-between rounded-[14px] border px-3 py-3"
          style={{
            backgroundColor: colors.accent + "12",
            borderColor: colors.accent + "55",
          }}
        >
          <View className="flex-1 flex-row items-center gap-2.5">
            <View
              className="h-[30px] w-[30px] items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.accent }}
            >
              <Feather name="award" size={15} color={colors.accentForeground} />
            </View>
            <View className="flex-1">
              <Text
                className="mb-px font-[Inter_800ExtraBold] text-sm"
                style={{ color: colors.foreground }}
              >
                Premium đang hoạt động
              </Text>
              <Text
                className="font-[Inter_400Regular] text-[11px]"
                style={{ color: colors.mutedForeground }}
                numberOfLines={1}
              >
                Còn lại {premiumDaysRemaining} ngày sử dụng Premium
              </Text>
            </View>
          </View>
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.accent }}
          >
            <Text
              className="font-[Inter_800ExtraBold] text-xs"
              style={{ color: colors.accentForeground }}
            >
              {premiumDaysRemaining} ngày
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          className="mb-4 w-full flex-row items-center justify-between rounded-[14px] border px-3 py-2.5 active:opacity-90"
          style={{
            backgroundColor: colors.accent + "12",
            borderColor: colors.accent + "55",
          }}
          onPress={() => router.push("/(tabs)/premium")}
        >
          <View className="flex-1 flex-row items-center gap-2.5">
            <View
              className="h-[30px] w-[30px] items-center justify-center rounded-lg"
              style={{ backgroundColor: colors.accent }}
            >
              <Feather name="zap" size={15} color={colors.accentForeground} />
            </View>
            <View className="flex-1">
              <Text
                className="mb-px font-[Inter_800ExtraBold] text-sm"
                style={{ color: colors.foreground }}
              >
                Nâng cấp Premium
              </Text>
              <Text
                className="font-[Inter_400Regular] text-[11px]"
                style={{ color: colors.mutedForeground }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Mở khóa sách VIP và đọc không quảng cáo
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.accent} />
        </Pressable>
      )}

      <View
        className="mb-6 w-full overflow-hidden rounded-[14px] border"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <ProfileActionRow
          colors={colors}
          icon="edit-3"
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          title="Chỉnh sửa thông tin"
          onPress={() => router.push("/edit-profile")}
        />
        <ProfileDivider colors={colors} />
        <ProfileActionRow
          colors={colors}
          icon="phone"
          iconBg="#dcfce7"
          iconColor="#16a34a"
          title="Hotline hỗ trợ"
          onPress={handleShowHotline}
          right={<Text className="font-[Inter_700Bold] text-[13px]" style={{ color: colors.primary }}>1900 8668</Text>}
        />
        <ProfileDivider colors={colors} />
        <ProfileActionRow
          colors={colors}
          icon="moon"
          iconBg={isDark ? "#1e1b4b" : "#ede9fe"}
          iconColor={isDark ? "#818cf8" : "#7c3aed"}
          title="Chế độ tối"
          right={
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={isDark ? colors.surface : "#f4f3f4"}
            />
          }
        />
        <ProfileDivider colors={colors} />
        <ProfileActionRow
          colors={colors}
          icon="shield"
          iconBg="#dbeafe"
          iconColor="#2563eb"
          title="Chính sách bảo mật"
          onPress={() => router.push("/privacy-policy")}
        />
      </View>

      <Pressable
        className="mb-4 w-full flex-row items-center justify-center gap-2.5 rounded-xl border-2 py-[14px] active:opacity-80"
        style={{ borderColor: colors.accent }}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color={colors.accent} />
        <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.accent }}>
          Đăng xuất
        </Text>
      </Pressable>

      <Text className="font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
        Book App v1.0.0
      </Text>
    </ScrollView>
  );
}
