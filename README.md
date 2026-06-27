# Cách chạy project

## 1. Cài package

```bash
npm install
```

## 2. Chạy app

```bash
npm start
```

Hoặc chạy trực tiếp:

```bash
npm run android
npm run ios
npm run web
```

## Payment VietQR + webhook

### Chạy backend local để test

```bash
npm run server:api
```

Backend local mặc định chạy ở:

```text
http://localhost:4000
```

### Deploy backend HTTPS

Repo đã có `render.yaml`. Có thể deploy lên Render bằng Blueprint hoặc tạo Web Service thủ công:

```text
Build command: npm ci
Start command: npm run server:api
Health check path: /healthz
```

Biến môi trường backend cần cấu hình trên server deploy:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_secret_key
PAYMENT_BANK_ID=970422
PAYMENT_BANK_NAME=MB BANK
PAYMENT_ACCOUNT_NO=your_account_no
PAYMENT_ACCOUNT_NAME=YOUR_ACCOUNT_NAME
PAYMENT_QR_TEMPLATE=compact2
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
```

Sau khi deploy xong, app phải trỏ tới backend HTTPS:

```env
EXPO_PUBLIC_PAYMENT_API_URL=https://your-booknest-api.onrender.com
```

Production build sẽ không tự tạo đơn thanh toán local nếu backend lỗi. Khi backend không gọi được, app sẽ báo lỗi để tránh người dùng chuyển tiền vào đơn không được server ghi nhận.

### Webhook ngân hàng

Dịch vụ biến động số dư cần gọi:

```http
POST https://your-booknest-api.onrender.com/webhooks/bank-transaction
Authorization: Bearer your_webhook_secret
Content-Type: application/json

{
  "amount": 2000,
  "description": "BN...",
  "transaction_id": "bank-ref"
}
```

Nếu dịch vụ webhook không cho thêm header, có thể gắn secret vào URL:

```text
https://your-booknest-api.onrender.com/webhooks/bank-transaction?secret=your_webhook_secret
```

Endpoint kiểm tra webhook gần nhất:

```text
GET https://your-booknest-api.onrender.com/webhooks/bank-transaction/recent?secret=your_webhook_secret
```

Backend sẽ tìm đơn `pending` có nội dung chuyển khoản chứa mã đơn và số tiền đủ, sau đó cập nhật `payment_attempts.status = success` và nâng `profiles.is_vip = true`.
"# booknest" 
"# booknest" 
"# book-nest" 
"# book-nest" 
"# booknest2" 
"# booknest2" 
