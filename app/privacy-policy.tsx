import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const PRIVACY_HTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chính sách bảo mật</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.7; color: #1a1a2e; background: #faf7f2; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #1a1a2e; }
  .subtitle { color: #7d7063; font-size: 14px; margin-bottom: 32px; }
  h2 { font-size: 17px; font-weight: 700; margin: 24px 0 10px; color: #1a1a2e; }
  p { color: #4a4040; font-size: 15px; margin-bottom: 12px; }
  ul { padding-left: 20px; color: #4a4040; font-size: 15px; margin-bottom: 12px; }
  li { margin-bottom: 6px; }
  .chip { display: inline-block; background: #e8a838; color: #1a1a2e; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
  .contact { background: #fff; border: 1px solid #e0d9cf; border-radius: 12px; padding: 16px; margin-top: 24px; }
  .contact p { margin: 0; }
</style>
</head>
<body>
<span class="chip">CẬP NHẬT: 01/01/2024</span>
<h1>Chính sách bảo mật</h1>
<p class="subtitle">Book App cam kết bảo vệ quyền riêng tư của bạn</p>

<h2>1. Thông tin chúng tôi thu thập</h2>
<p>Chúng tôi thu thập các loại thông tin sau khi bạn sử dụng ứng dụng Book App:</p>
<ul>
  <li><strong>Thông tin tài khoản:</strong> Tên, địa chỉ email khi bạn đăng ký tài khoản</li>
  <li><strong>Lịch sử đọc sách:</strong> Sách bạn đã đọc, lưu và tiến độ đọc</li>
  <li><strong>Cài đặt cá nhân:</strong> Chủ đề giao diện, cỡ chữ và các tùy chọn khác</li>
  <li><strong>Dữ liệu thiết bị:</strong> Loại thiết bị, hệ điều hành để tối ưu trải nghiệm</li>
</ul>

<h2>2. Cách chúng tôi sử dụng thông tin</h2>
<p>Thông tin thu thập được sử dụng để:</p>
<ul>
  <li>Cung cấp và cải thiện dịch vụ đọc sách trực tuyến</li>
  <li>Cá nhân hóa trải nghiệm và đề xuất sách phù hợp</li>
  <li>Đồng bộ tiến độ đọc giữa các thiết bị</li>
  <li>Liên hệ về các cập nhật quan trọng của ứng dụng</li>
  <li>Phân tích và cải thiện hiệu suất ứng dụng</li>
</ul>

<h2>3. Bảo mật dữ liệu</h2>
<p>Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn ngành để bảo vệ thông tin của bạn:</p>
<ul>
  <li>Mã hóa SSL/TLS cho tất cả dữ liệu truyền tải</li>
  <li>Lưu trữ mật khẩu dưới dạng mã hóa một chiều (hash)</li>
  <li>Kiểm tra bảo mật định kỳ và cập nhật hệ thống</li>
  <li>Giới hạn quyền truy cập dữ liệu người dùng nội bộ</li>
</ul>

<h2>4. Chia sẻ thông tin</h2>
<p>Chúng tôi <strong>không bao giờ</strong> bán, trao đổi hoặc chia sẻ thông tin cá nhân của bạn với bên thứ ba vì mục đích thương mại mà không có sự đồng ý của bạn. Chúng tôi chỉ chia sẻ thông tin trong các trường hợp:</p>
<ul>
  <li>Khi có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền</li>
  <li>Bảo vệ quyền lợi hợp pháp của Book App và người dùng</li>
  <li>Trong trường hợp sáp nhập hoặc mua lại công ty (có thông báo trước)</li>
</ul>

<h2>5. Quyền của bạn</h2>
<p>Bạn có toàn quyền đối với dữ liệu cá nhân của mình, bao gồm:</p>
<ul>
  <li><strong>Quyền truy cập:</strong> Xem tất cả dữ liệu chúng tôi lưu trữ về bạn</li>
  <li><strong>Quyền chỉnh sửa:</strong> Cập nhật thông tin không chính xác</li>
  <li><strong>Quyền xóa:</strong> Yêu cầu xóa tài khoản và tất cả dữ liệu liên quan</li>
  <li><strong>Quyền xuất dữ liệu:</strong> Nhận bản sao dữ liệu của bạn</li>
</ul>

<h2>6. Cookie và theo dõi</h2>
<p>Ứng dụng sử dụng lưu trữ cục bộ (AsyncStorage) để lưu cài đặt và tiến độ đọc. Chúng tôi không sử dụng cookie theo dõi quảng cáo của bên thứ ba.</p>

<h2>7. Thay đổi chính sách</h2>
<p>Chúng tôi có thể cập nhật chính sách này theo thời gian. Bạn sẽ được thông báo qua email hoặc thông báo trong ứng dụng khi có thay đổi quan trọng. Việc tiếp tục sử dụng ứng dụng sau khi thay đổi được công bố đồng nghĩa với việc bạn chấp nhận chính sách mới.</p>

<div class="contact">
  <h2 style="margin-top: 0; margin-bottom: 10px;">Liên hệ chúng tôi</h2>
  <p>Nếu bạn có câu hỏi về chính sách bảo mật này, vui lòng liên hệ:</p>
  <p><strong>Email:</strong> privacy@bookapp.vn</p>
  <p><strong>Website:</strong> www.bookapp.vn/privacy</p>
  <p><strong>Địa chỉ:</strong> 123 Nguyễn Huệ, Quận 1, TP.HCM</p>
</div>
</body>
</html>
`;

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        <Text className="text-[17px] font-bold" style={{ color: colors.foreground }}>Chính sách bảo mật</Text>
        <View className="w-9" />
      </View>
      {loading && (
        <View
          className="absolute inset-0 z-10 items-center justify-center"
          style={{ backgroundColor: colors.background }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
      <WebView
        source={{ html: PRIVACY_HTML }}
        style={{ flex: 1, backgroundColor: colors.background }}
        onLoadEnd={() => setLoading(false)}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      />
    </View>
  );
}
