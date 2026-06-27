import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { syncVipProfile, upsertMockPaymentAttempt } from "@/lib/bookRepository";
import {
  clearPendingPaymentAttempt,
  createMockPaymentAttempt,
  fetchMockPaymentAttempt,
  fetchMockPaymentProfile,
  readPendingPaymentAttempt,
  savePendingPaymentAttempt,
  type PaymentAttempt,
} from "@/lib/paymentApi";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-native-qrcode-svg";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const POLL_MS = 3000;

function parsePriceToAmount(price: string | undefined) {
  const digits = (price || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function isLocalUserId(userId: string | undefined) {
  return !!userId && userId.startsWith("local-");
}

function isReusableAttempt(attempt: PaymentAttempt, userId: string, planName: string, amount: number) {
  return (
    attempt.user_id === userId &&
    attempt.plan_name === planName &&
    Number(attempt.amount) === amount &&
    (attempt.status === "pending" || attempt.status === "success")
  );
}

export default function PaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refreshCurrentUser } = useAuth();
  const { planName, price } = useLocalSearchParams<{
    planId: string;
    planName: string;
    price: string;
  }>();

  const amount = useMemo(() => parsePriceToAmount(price), [price]);
  const requestedPlanName = useMemo(() => planName || "Premium", [planName]);
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [isCreatingAttempt, setIsCreatingAttempt] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const handledSuccessRef = useRef(false);

  async function syncAttemptToDatabase(nextAttempt: PaymentAttempt) {
    if (isLocalUserId(nextAttempt.user_id)) return;

    const { error } = await upsertMockPaymentAttempt(nextAttempt);
    if (error) {
      throw new Error(error.message || "Không đồng bộ được payment_attempt vào database.");
    }
  }

  async function syncVipToDatabase() {
    if (!user?.id) return;
    if (isLocalUserId(user.id)) return;

    const paymentProfile = await fetchMockPaymentProfile(user.id);
    const { error } = await syncVipProfile(user.id, paymentProfile.vip_expired_at);
    if (error) {
      throw new Error(error.message || "Không đồng bộ được trạng thái VIP vào database.");
    }
  }

  async function handleSuccessfulAttempt(nextAttempt: PaymentAttempt) {
    await syncAttemptToDatabase(nextAttempt);
    await syncVipToDatabase();
    await clearPendingPaymentAttempt(nextAttempt.user_id, nextAttempt.id);
    await refreshCurrentUser();
  }

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    let active = true;
    setIsCreatingAttempt(true);
    setErrorMessage("");
    setQrImageFailed(false);

    async function initializeAttempt() {
      try {
        const pendingPayment = await readPendingPaymentAttempt(userId);
        if (
          pendingPayment &&
          pendingPayment.planName === requestedPlanName &&
          pendingPayment.amount === amount
        ) {
          const latestAttempt = await fetchMockPaymentAttempt(pendingPayment.attemptId);

          if (!active) return;

          if (isReusableAttempt(latestAttempt, userId, requestedPlanName, amount)) {
            setAttempt(latestAttempt);

            if (latestAttempt.status === "pending") {
              await savePendingPaymentAttempt(latestAttempt);
              return;
            }

            if (latestAttempt.status === "success" && !handledSuccessRef.current) {
              handledSuccessRef.current = true;
              await handleSuccessfulAttempt(latestAttempt);
              Alert.alert(
                "Thanh toán thành công",
                "Tài khoản của bạn đã được nâng cấp Premium.",
                [{ text: "Xem tài khoản", onPress: () => router.replace("/(tabs)/profile") }],
              );
              return;
            }
          }

          await clearPendingPaymentAttempt(userId, pendingPayment.attemptId);
        }

        const createdAttempt = await createMockPaymentAttempt({
          userId,
          planName: requestedPlanName,
          amount,
        });

        await savePendingPaymentAttempt(createdAttempt);

        if (!active) return;
        setAttempt(createdAttempt);

        await syncAttemptToDatabase(createdAttempt).catch(() => {});
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "Không tạo được đơn thanh toán.");
      } finally {
        if (!active) return;
        setIsCreatingAttempt(false);
      }
    }

    initializeAttempt();

    return () => {
      active = false;
    };
  }, [amount, requestedPlanName, user?.id]);

  useEffect(() => {
    if (!attempt?.id || handledSuccessRef.current) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const latestAttempt = await fetchMockPaymentAttempt(attempt.id);
        setAttempt(latestAttempt);
        if (latestAttempt.status === "pending") {
          await savePendingPaymentAttempt(latestAttempt);
        } else {
          await clearPendingPaymentAttempt(latestAttempt.user_id, latestAttempt.id);
        }

        if (latestAttempt.status === "success" && !handledSuccessRef.current) {
          handledSuccessRef.current = true;
          await handleSuccessfulAttempt(latestAttempt);
          Alert.alert(
            "Thanh toán thành công",
            "Tài khoản của bạn đã được nâng cấp Premium.",
            [{ text: "Xem tài khoản", onPress: () => router.replace("/(tabs)/profile") }],
          );
        }
      } catch {
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [attempt?.id]);

  async function handleConfirmPayment() {
    if (!attempt || isConfirming || handledSuccessRef.current) return;

    setIsConfirming(true);
    try {
      const latestAttempt = await fetchMockPaymentAttempt(attempt.id);
      setAttempt(latestAttempt);
      if (latestAttempt.status === "pending") {
        await savePendingPaymentAttempt(latestAttempt);
      } else {
        await clearPendingPaymentAttempt(latestAttempt.user_id, latestAttempt.id);
      }

      if (latestAttempt.status === "success") {
        handledSuccessRef.current = true;
        await handleSuccessfulAttempt(latestAttempt);
        Alert.alert(
          "Thanh toán thành công",
          "Tài khoản của bạn đã được nâng cấp Premium.",
          [{ text: "Xem tài khoản", onPress: () => router.replace("/(tabs)/profile") }],
        );
        return;
      }

      Alert.alert(
        "Đang chờ xác nhận",
        "Hệ thống chưa nhận được biến động số dư khớp với đơn này. Vui lòng giữ đúng nội dung chuyển khoản và chờ vài giây.",
      );
    } catch (error) {
      Alert.alert(
        "Không kiểm tra được thanh toán",
        error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  const qrPayload = attempt
    ? `BANK=${attempt.receiver_bank};ACCOUNT=${attempt.receiver_account};AMOUNT=${attempt.amount};CONTENT=${attempt.mock_txn_code}`
    : "";
  const qrImageUrl =
    attempt?.vietqr_image_url ||
    (attempt
      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`
      : "");

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="mb-3 flex-row items-center gap-2.5 px-4" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-[10px] border"
          style={{ borderColor: colors.border }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text className="font-[Inter_800ExtraBold] text-xl" style={{ color: colors.foreground }}>
          Thanh toán
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="p-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="mb-6 rounded-[20px] border p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text
            className="mb-1 font-[Inter_600SemiBold] text-sm uppercase tracking-[0.5px]"
            style={{ color: colors.mutedForeground }}
          >
            Gói đăng ký
          </Text>
          <Text className="font-[Inter_800ExtraBold] text-2xl" style={{ color: colors.foreground }}>
            {planName || "Premium"}
          </Text>
          <View className="my-4 h-px" style={{ backgroundColor: colors.border }} />
          <View className="flex-row items-center justify-between">
            <Text className="font-[Inter_600SemiBold] text-base" style={{ color: colors.foreground }}>
              Tổng thanh toán
            </Text>
            <Text className="font-[Inter_800ExtraBold] text-[22px]" style={{ color: colors.accent }}>
              {price || "0đ"}
            </Text>
          </View>
        </View>

        <View
          className="mb-6 rounded-[20px] border p-5"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.foreground }}>
            Thông tin nhận tiền
          </Text>
          <View className="mt-3 gap-2">
            <Row label="Ngân hàng" value={attempt?.receiver_bank || "Đang tải"} colors={colors} />
            <Row label="Số tài khoản" value={attempt?.receiver_account || "Đang tải"} colors={colors} />
            <Row label="Chủ tài khoản" value={attempt?.receiver_name || "Đang tải"} colors={colors} />
            <Row label="Số tiền" value={price || "0đ"} colors={colors} />
            <Row
              label="Nội dung"
              value={attempt?.mock_txn_code || "Đang tạo mã giao dịch..."}
              colors={colors}
              accent
            />
          </View>
        </View>

        <View className="mb-8 items-center">
          <Text className="mb-1 text-center font-[Inter_700Bold] text-lg" style={{ color: colors.foreground }}>
            Quét mã QR để thanh toán
          </Text>
          <Text
            className="mb-5 text-center font-[Inter_400Regular] text-sm"
            style={{ color: colors.mutedForeground }}
          >
            Hệ thống sẽ nhận diện giao dịch theo mã nội dung riêng của đơn này
          </Text>

          <View
            className="h-[280px] w-[280px] items-center justify-center rounded-3xl border bg-white p-[15px]"
            style={{ borderColor: colors.border }}
          >
            {isCreatingAttempt ? (
              <ActivityIndicator size="large" color={colors.accent} />
            ) : attempt && !qrImageFailed ? (
              <Image
                source={{
                  uri: qrImageUrl,
                }}
                style={{ width: "100%", height: "100%" }}
                onError={() => setQrImageFailed(true)}
              />
            ) : attempt ? (
              <View className="items-center gap-2 px-5">
                <QRCode
                  value={qrPayload || attempt.mock_txn_code}
                  size={190}
                  backgroundColor="#ffffff"
                  color="#111827"
                />
                <Text className="text-center text-sm font-bold text-[#111827]">
                  QR VietQR online không tải được
                </Text>
                <Text className="text-center text-xs text-[#4b5563]">
                  Chuyển khoản theo nội dung bên dưới:
                </Text>
                <Text className="text-center text-base font-extrabold text-[#111827]">
                  {attempt.mock_txn_code}
                </Text>
                <Text className="text-center text-sm font-bold text-[#111827]">
                  {price || `${attempt.amount}d`}
                </Text>
              </View>
            ) : (
              <View className="items-center gap-2 px-5">
                <Feather name="alert-circle" size={28} color="#c62828" />
                <Text className="text-center text-sm text-[#c62828]">
                  {errorMessage || "Không tạo được QR thanh toán"}
                </Text>
              </View>
            )}
          </View>

          <View
            className="mt-5 w-full rounded-xl p-3"
            style={{ backgroundColor: colors.muted }}
          >
            <Text className="font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>
              Mã đơn:{" "}
              <Text className="font-[Inter_700Bold]" style={{ color: colors.foreground }}>
                {attempt?.id || "Đang khởi tạo"}
              </Text>
            </Text>
            <Text className="mt-1 font-[Inter_400Regular] text-sm" style={{ color: colors.mutedForeground }}>
              Trạng thái:{" "}
              <Text className="font-[Inter_700Bold]" style={{ color: colors.foreground }}>
                {attempt?.status || "pending"}
              </Text>
            </Text>
          </View>
        </View>

        <Pressable
          className="mt-2.5 h-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.accent, opacity: isCreatingAttempt ? 0.6 : 1 }}
          onPress={handleConfirmPayment}
          disabled={isCreatingAttempt || !attempt || isConfirming || attempt.status === "success"}
        >
          {isConfirming ? (
            <ActivityIndicator color={colors.accentForeground} />
          ) : (
            <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.accentForeground }}>
              {attempt?.status === "success" ? "Đã thanh toán thành công" : "Kiểm tra thanh toán"}
            </Text>
          )}
        </Pressable>

        <Text
          className="mt-3 text-center font-[Inter_400Regular] text-xs leading-[18px]"
          style={{ color: colors.mutedForeground }}
        >
          Sau khi hệ thống xác nhận giao dịch đúng số tiền và đúng nội dung, tài khoản sẽ tự động lên Premium.
        </Text>

        {!!errorMessage && !attempt ? (
          <Text className="mt-4 text-center text-sm" style={{ color: colors.destructive }}>
            {errorMessage}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  colors,
  accent = false,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  accent?: boolean;
}) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm" style={{ color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text
        className="flex-1 text-right font-[Inter_700Bold] text-sm"
        style={{ color: accent ? colors.accent : colors.foreground }}
      >
        {value}
      </Text>
    </View>
  );
}
