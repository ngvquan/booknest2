import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

type VoiceStatus = "idle" | "listening" | "processing" | "permission-error";

type SpeechModule = {
  abort: () => void;
  stop: () => void;
  start: (options: Record<string, unknown>) => void;
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener?: (eventName: string, listener: (event: any) => void) => { remove: () => void };
};

type VoiceSearchProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (keyword: string) => void | Promise<void>;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Chưa nghe",
  listening: "Đang nghe",
  processing: "Đang xử lý",
  "permission-error": "Lỗi quyền micro",
};

function loadSpeechModule(): SpeechModule | null {
  try {
    const speech = require("expo-speech-recognition");
    return speech.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

const ExpoSpeechRecognitionModule = loadSpeechModule();

export function VoiceSearch({
  value,
  onChangeText,
  onSearch,
  placeholder = "Nhập tên sách, tác giả...",
  containerStyle,
  inputStyle,
}: VoiceSearchProps) {
  const colors = useColors();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const lastTranscriptRef = useRef("");
  const searchedTranscriptRef = useRef("");
  const statusRef = useRef<VoiceStatus>("idle");

  const updateStatus = (nextStatus: VoiceStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const runSearch = async (keyword: string) => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword || searchedTranscriptRef.current === normalizedKeyword) {
      updateStatus("idle");
      return;
    }

    searchedTranscriptRef.current = normalizedKeyword;
    updateStatus("processing");

    try {
      await onSearch(normalizedKeyword);
    } finally {
      updateStatus("idle");
    }
  };

  useEffect(() => {
    return () => {
      if (statusRef.current === "listening" && ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!ExpoSpeechRecognitionModule?.addListener) return;

    const subscriptions = [
      ExpoSpeechRecognitionModule.addListener("start", () => {
        setErrorMessage("");
        updateStatus("listening");
      }),
      ExpoSpeechRecognitionModule.addListener("result", (event: ExpoSpeechRecognitionResultEvent) => {
        const transcript = event.results[0]?.transcript?.trim() ?? "";

        if (!transcript) return;

        lastTranscriptRef.current = transcript;
        onChangeText(transcript);

        if (event.isFinal) {
          void runSearch(transcript);
        }
      }),
      ExpoSpeechRecognitionModule.addListener("nomatch", () => {
        setErrorMessage("Không nhận được nội dung giọng nói.");
        updateStatus("idle");
      }),
      ExpoSpeechRecognitionModule.addListener("error", (event: ExpoSpeechRecognitionErrorEvent) => {
        if (event.error === "aborted") {
          updateStatus("idle");
          return;
        }

        if (event.error === "not-allowed") {
          setErrorMessage("Bạn cần cấp quyền micro để tìm kiếm bằng giọng nói.");
          updateStatus("permission-error");
          return;
        }

        setErrorMessage(event.message || "Không thể nhận diện giọng nói.");
        updateStatus("idle");
      }),
      ExpoSpeechRecognitionModule.addListener("end", () => {
        if (
          (statusRef.current === "listening" || statusRef.current === "processing") &&
          lastTranscriptRef.current
        ) {
          void runSearch(lastTranscriptRef.current);
          return;
        }

        if (statusRef.current === "listening" || statusRef.current === "processing") {
          updateStatus("idle");
        }
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription?.remove());
    };
  }, [onChangeText, onSearch]);

  const startListening = async () => {
    setErrorMessage("");
    lastTranscriptRef.current = "";
    searchedTranscriptRef.current = "";

    if (!ExpoSpeechRecognitionModule) {
      setErrorMessage("Tìm kiếm bằng giọng nói cần chạy bằng dev build, không hỗ trợ trong Expo Go.");
      updateStatus("idle");
      return;
    }

    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setErrorMessage("Thiết bị chưa hỗ trợ nhận diện giọng nói.");
        updateStatus("idle");
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage("Bạn cần cấp quyền micro để tìm kiếm bằng giọng nói.");
        updateStatus("permission-error");
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "vi-VN",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        contextualStrings: [
          "Đấu phá thương khung",
          "Đấu la đại lục",
          "Tru tiên",
          "Phàm nhân tu tiên",
        ],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể mở micro.");
      updateStatus("idle");
    }
  };

  const stopListening = () => {
    if (!ExpoSpeechRecognitionModule) return;
    updateStatus("processing");
    ExpoSpeechRecognitionModule.stop();
  };

  const clearText = () => {
    onChangeText("");
    lastTranscriptRef.current = "";
    searchedTranscriptRef.current = "";
  };

  const isListening = status === "listening";
  const isProcessing = status === "processing";
  const hasValue = value.trim().length > 0;

  return (
    <View style={containerStyle}>
      <View
        className="min-h-[50px] flex-row items-center gap-2 rounded-xl border px-3"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          className="min-h-12 flex-1 text-[15px]"
          style={[{ color: colors.foreground }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCorrect={false}
          editable={!isProcessing}
          onSubmitEditing={() => {
            const keyword = value.trim();
            if (keyword) void runSearch(keyword);
          }}
        />

        {hasValue && !isListening && !isProcessing ? (
          <Pressable onPress={clearText} hitSlop={10} accessibilityRole="button" accessibilityLabel="Xóa từ khóa tìm kiếm">
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={startListening}
          disabled={isListening || isProcessing}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: isListening ? colors.destructive : colors.accent,
            opacity: isListening || isProcessing ? 0.55 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Tìm truyện bằng giọng nói"
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.accentForeground} />
          ) : (
            <Feather name="mic" size={18} color={colors.accentForeground} />
          )}
        </Pressable>

        {isListening ? (
          <Pressable
            onPress={stopListening}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.destructive }}
            accessibilityRole="button"
            accessibilityLabel="Dừng nghe"
          >
            <Feather name="square" size={16} color={colors.destructiveForeground} />
          </Pressable>
        ) : null}
      </View>

      <Text
        className="mt-1.5 text-xs"
        style={{
          color: status === "permission-error" ? colors.destructive : colors.mutedForeground,
        }}
      >
        {errorMessage || STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
