import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View
        className="flex-1 items-center justify-center p-5"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-xl font-bold" style={{ color: colors.foreground }}>
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/" className="mt-[15px] py-[15px]">
          <Text className="text-sm" style={{ color: colors.primary }}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
