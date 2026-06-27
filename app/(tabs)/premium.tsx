import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const VIP_FEATURES = [
  "Mở khóa toàn bộ sách VIP",
  "Tải offline không giới hạn",
  "Đọc không quảng cáo",
];

const PREMIUM_PLANS = [
  {
    id: "monthly",
    name: "Gói tháng",
    price: "79.000đ",
    period: "/ tháng",
    note: "Dùng thử 7 ngày đầu",
    popular: false,
  },
  {
    id: "quarterly",
    name: "Gói 3 tháng",
    price: "2.000đ",
    period: "/ 3 tháng",
    note: "Tiết kiệm 15%",
    popular: true,
  },
  {
    id: "yearly",
    name: "Gói năm",
    price: "599.000đ",
    period: "/ năm",
    note: "Tiết kiệm 35%",
    popular: false,
  },
];

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top;
  const [selectedPlan, setSelectedPlan] = React.useState("quarterly");

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-3 flex-row items-center gap-2.5 px-4" style={{ paddingTop: topPad + 8 }}>
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-[10px] border"
          style={{ borderColor: colors.border }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text className="font-[Inter_800ExtraBold] text-xl" style={{ color: colors.foreground }}>Premium</Text>
      </View>

      <View className="px-4">
        <View className="rounded-[20px] border border-[#FFD70033] bg-[#FFD70015] p-5">
          <Text className="mb-4 font-[Inter_700Bold] text-lg" style={{ color: colors.foreground }}>
            {"Đặc quyền Premium"}
          </Text>
          <View className="gap-3">
            {VIP_FEATURES.map((feature) => (
              <View key={feature} className="flex-row items-center gap-3">
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.accent + "22" }}
                >
                  <Feather name="check" size={12} color={colors.accent} />
                </View>
                <Text className="font-[Inter_500Medium] text-[15px]" style={{ color: colors.foreground }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text
          className="mb-3 mt-6 font-[Inter_700Bold] text-lg"
          style={{ color: colors.foreground }}
        >
          {"Chọn gói của bạn"}
        </Text>
        {PREMIUM_PLANS.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => setSelectedPlan(plan.id)}
            className="relative mb-3 flex-row items-center rounded-2xl border p-4"
            style={{
              backgroundColor: colors.surface,
              borderColor: selectedPlan === plan.id ? colors.accent : colors.border,
              borderWidth: selectedPlan === plan.id ? 2 : 1,
            }}
          >
            {plan.popular && (
              <View
                className="absolute -top-2.5 right-4 rounded px-2 py-0.5"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="font-[Inter_800ExtraBold] text-[10px]" style={{ color: colors.accentForeground }}>
                  {"PHỔ BIẾN"}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="font-[Inter_700Bold] text-base" style={{ color: colors.foreground }}>{plan.name}</Text>
              <Text className="mt-0.5 font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>{plan.note}</Text>
            </View>
            <View className="items-end">
              <Text className="font-[Inter_800ExtraBold] text-lg" style={{ color: colors.foreground }}>{plan.price}</Text>
              <Text className="font-[Inter_400Regular] text-xs" style={{ color: colors.mutedForeground }}>
                {plan.period}
              </Text>
            </View>
          </Pressable>
        ))}

        <Pressable
          className="mt-6 h-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: colors.accent,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            const plan = PREMIUM_PLANS.find((item) => item.id === selectedPlan);
            router.push({
              pathname: "/payment" as never,
              params: { planId: plan?.id, planName: plan?.name, price: plan?.price },
            } as never);
          }}
        >
          <Text className="font-[Inter_800ExtraBold] text-lg" style={{ color: colors.accentForeground }}>
            {"Nâng cấp ngay"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center font-[Inter_400Regular] text-xs leading-[18px]" style={{ color: colors.mutedForeground }}>
          {"Bạn có thể hủy bất kỳ lúc nào trong cài đặt App Store hoặc Google Play."}
        </Text>
      </View>
    </ScrollView>
  );
}
