import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function readImageFile(uri: string) {
  if (Platform.OS !== "web" && !uri.startsWith("http")) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  }

  const response = await fetch(uri);
  return response.arrayBuffer();
}

export function getImageMeta(asset: ImagePicker.ImagePickerAsset) {
  let ext = ((asset.fileName || asset.uri).split(".").pop() || "jpg")
    .split("?")[0]
    .toLowerCase();

  if (ext === "jpeg") ext = "jpg";
  if (!["jpg", "png", "webp"].includes(ext)) ext = "jpg";

  return {
    ext,
    contentType: asset.mimeType || (ext === "jpg" ? "image/jpeg" : `image/${ext}`),
  };
}
