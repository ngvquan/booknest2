# Deploy Backend On Render

This project already includes `render.yaml` for the payment backend.

## 1. Deploy

1. Push or upload this repo to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Render will read `render.yaml` and create `booknest-api`.

## 2. Backend Environment Variables

Set these on the Render service:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
PAYMENT_ACCOUNT_NO=your_mb_bank_account_number
PAYMENT_ACCOUNT_NAME=YOUR_ACCOUNT_NAME
PAYMENT_WEBHOOK_SECRET=replace_with_a_long_random_secret
```

These are already preset in `render.yaml`:

```env
NODE_ENV=production
PAYMENT_BANK_ID=970422
PAYMENT_BANK_NAME=MB BANK
PAYMENT_QR_TEMPLATE=compact2
```

## 3. App Environment Variable

After Render deploys, copy the Render service URL and set it in the app `.env`:

```env
EXPO_PUBLIC_PAYMENT_API_URL=https://booknest-api.onrender.com
```

Then restart Expo:

```bash
npx expo start -c
```

## 4. SePay Webhook URL

Use this URL in SePay:

```text
https://booknest-api.onrender.com/webhooks/bank-transaction
```

Use the same secret as `PAYMENT_WEBHOOK_SECRET`.

The backend accepts the secret by any of these:

```text
Authorization: Bearer your_secret
x-webhook-secret: your_secret
?secret=your_secret
```

## 5. Health Check

Open:

```text
https://booknest-api.onrender.com/healthz
```

Expected response:

```json
{"ok":true,"service":"book-api"}
```
