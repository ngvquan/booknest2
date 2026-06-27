import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
}

export function StarRating({ rating, count, size = 14 }: StarRatingProps) {
  const colors = useColors();
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <View className="flex-row items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={size}
          color={i <= full || (i === full + 1 && hasHalf) ? colors.star : colors.starEmpty}
        />
      ))}
      <Text className="ml-1 font-bold" style={{ color: colors.foreground, fontSize: size }}>
        {rating.toFixed(1)}
      </Text>
      {count !== undefined && (
        <Text className="ml-0.5" style={{ color: colors.mutedForeground, fontSize: size - 1 }}>
          ({count.toLocaleString()})
        </Text>
      )}
    </View>
  );
}
