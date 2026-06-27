import React from "react";
import { Pressable, Text, View } from "react-native";

const PAGE_SIZE = 10;

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="w-full self-start gap-2.5 rounded-[10px] bg-white p-3">
      <Text className="text-sm font-bold text-[#263240]">{title}</Text>
      {children}
    </View>
  );
}

export function Metric({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View className="w-[180px] rounded-[10px] border-t-[3px] bg-white p-3" style={{ borderTopColor: color }}>
      <Text className="mb-1 text-xs text-[#6a7684]">{title}</Text>
      <Text className="text-2xl font-extrabold text-[#1e2a36]">{value}</Text>
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <Text className="text-[13px] leading-[19px] text-[#526272]">{text}</Text>;
}

export function paginate<T>(items: T[], page: number) {
  const start = (Math.max(page, 1) - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

export function Pagination({
  total,
  page,
  onChange,
}: {
  total: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;

  return (
    <View className="mt-2 flex-row items-center justify-end gap-2">
      <Pressable
        className="rounded-lg border border-[#d0d9e4] bg-white px-3 py-2"
        disabled={page <= 1}
        style={{ opacity: page <= 1 ? 0.45 : 1 }}
        onPress={() => onChange(page - 1)}
      >
        <Text className="text-xs font-bold text-[#1a4e92]">Trước</Text>
      </Pressable>
      <Text className="text-xs font-semibold text-[#526272]">
        Trang {page}/{totalPages}
      </Text>
      <Pressable
        className="rounded-lg border border-[#d0d9e4] bg-white px-3 py-2"
        disabled={page >= totalPages}
        style={{ opacity: page >= totalPages ? 0.45 : 1 }}
        onPress={() => onChange(page + 1)}
      >
        <Text className="text-xs font-bold text-[#1a4e92]">Sau</Text>
      </Pressable>
    </View>
  );
}
