import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View
      className="h-full w-full flex-1 items-center justify-center p-6"
      style={{ backgroundColor: colors.background }}
    >
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          className="absolute right-4 z-10 h-11 w-11 flex-row items-center justify-center rounded-lg active:opacity-80"
          style={{
            top: insets.top + 16,
            backgroundColor: colors.card,
          }}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View className="w-full max-w-[600px] items-center justify-center gap-4">
        <Text
          className="text-center text-[28px] font-bold leading-10"
          style={{ color: colors.foreground }}
        >
          Something went wrong
        </Text>

        <Text
          className="text-center text-base leading-6"
          style={{ color: colors.mutedForeground }}
        >
          Please reload the app to continue.
        </Text>

        <Pressable
          onPress={handleRestart}
          className="min-w-[200px] rounded-lg px-6 py-4 active:scale-[0.98] active:opacity-90"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-center text-base font-semibold" style={{ color: colors.primaryForeground }}>
            Try Again
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-[rgba(0,0,0,0.5)]">
            <View
              className="h-[90%] w-full rounded-t-2xl"
              style={{ backgroundColor: colors.background }}
            >
              <View
                className="flex-row items-center justify-between border-b px-4 pb-3 pt-4"
                style={{ borderBottomColor: colors.border }}
              >
                <Text className="text-xl font-semibold" style={{ color: colors.foreground }}>
                  Error Details
                </Text>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center active:opacity-60"
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerClassName="p-4"
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                showsVerticalScrollIndicator
              >
                <View
                  className="w-full overflow-hidden rounded-lg p-4"
                  style={{ backgroundColor: colors.card }}
                >
                  <Text
                    className="w-full text-xs leading-[18px]"
                    style={{
                      color: colors.foreground,
                      fontFamily: monoFont,
                    }}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
