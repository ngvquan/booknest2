const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PORT = parseInt(process.env.PORT || process.env.API_PORT || "4000", 10);
const DB_PATH = process.env.MOCK_DB_PATH
  ? path.resolve(process.env.MOCK_DB_PATH)
  : path.resolve(__dirname, "mock-db.json");

const PAYMENT_BANK_ID = process.env.PAYMENT_BANK_ID || "970422";
const PAYMENT_BANK_NAME = process.env.PAYMENT_BANK_NAME || "MB BANK";
const PAYMENT_ACCOUNT_NO = process.env.PAYMENT_ACCOUNT_NO || "0123456789";
const PAYMENT_ACCOUNT_NAME = process.env.PAYMENT_ACCOUNT_NAME || "BOOKNEST";
const PAYMENT_QR_TEMPLATE = process.env.PAYMENT_QR_TEMPLATE || "compact2";
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
let supabaseAdmin = null;

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeTxnCode() {
  return `BN${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function normalizeText(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildVietQrImageUrl(attempt) {
  const params = new URLSearchParams({
    amount: String(Math.round(Number(attempt.amount) || 0)),
    addInfo: attempt.mock_txn_code,
    accountName: PAYMENT_ACCOUNT_NAME,
  });

  return `https://img.vietqr.io/image/${PAYMENT_BANK_ID}-${PAYMENT_ACCOUNT_NO}-${PAYMENT_QR_TEMPLATE}.png?${params.toString()}`;
}

function hydratePaymentAttempt(attempt) {
  if (!attempt) return attempt;
  attempt.receiver_bank ||= PAYMENT_BANK_NAME;
  attempt.receiver_account ||= PAYMENT_ACCOUNT_NO;
  attempt.receiver_name ||= PAYMENT_ACCOUNT_NAME;
  attempt.mock_qr_payload ||= `BANK=${attempt.receiver_bank};ACCOUNT=${attempt.receiver_account};AMOUNT=${attempt.amount};CONTENT=${attempt.mock_txn_code}`;
  attempt.vietqr_image_url ||= buildVietQrImageUrl(attempt);
  return attempt;
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdmin;
}

function isWebhookAuthorized(req) {
  if (!PAYMENT_WEBHOOK_SECRET) return !IS_PRODUCTION;
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const querySecret = url.searchParams.get("secret") || "";
  return (
    req.headers["x-webhook-secret"] === PAYMENT_WEBHOOK_SECRET ||
    bearer === PAYMENT_WEBHOOK_SECRET ||
    querySecret === PAYMENT_WEBHOOK_SECRET
  );
}

function validateProductionConfig() {
  if (!IS_PRODUCTION) return;

  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!PAYMENT_WEBHOOK_SECRET) missing.push("PAYMENT_WEBHOOK_SECRET");
  if (!PAYMENT_ACCOUNT_NO) missing.push("PAYMENT_ACCOUNT_NO");
  if (!PAYMENT_ACCOUNT_NAME) missing.push("PAYMENT_ACCOUNT_NAME");

  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  }
}

function getPlanDurationDays(planName) {
  const normalized = String(planName || "").toLowerCase();
  if (normalized.includes("3 thang") || normalized.includes("3 tháng") || normalized.includes("quarter")) {
    return 90;
  }
  if (normalized.includes("nam") || normalized.includes("năm") || normalized.includes("year")) {
    return 365;
  }
  return 30;
}

const defaultDb = {
  categories: [
    { id: "cat-1", name: "Tiên hiệp" },
    { id: "cat-2", name: "Ngôn tình" },
    { id: "cat-3", name: "Trinh thám" },
  ],
  books: [
    {
      id: "book-1",
      category_id: "cat-1",
      title: "Hành Trình Bắt Đầu",
      author: "Vô Danh",
      description: "Truyện test cho luồng free.",
      cover_url: "https://picsum.photos/300/420?book=1",
      is_vip: false,
      total_chapters: 3,
    },
    {
      id: "book-2",
      category_id: "cat-2",
      title: "Lua Tinh Mua He",
      author: "An Nhien",
      description: "Truyện test khóa VIP.",
      cover_url: "https://picsum.photos/300/420?book=2",
      is_vip: true,
      total_chapters: 3,
    },
  ],
  chapters: [
    { id: "chap-1", book_id: "book-1", chapter_no: 1, title: "Chương 1", content: "Nội dung chương 1." },
    { id: "chap-2", book_id: "book-1", chapter_no: 2, title: "Chương 2", content: "Nội dung chương 2." },
    { id: "chap-3", book_id: "book-1", chapter_no: 3, title: "Chương 3", content: "Nội dung chương 3." },
    { id: "chap-4", book_id: "book-2", chapter_no: 1, title: "Chương 1", content: "Nội dung VIP 1." },
    { id: "chap-5", book_id: "book-2", chapter_no: 2, title: "Chương 2", content: "Nội dung VIP 2." },
    { id: "chap-6", book_id: "book-2", chapter_no: 3, title: "Chương 3", content: "Nội dung VIP 3." },
  ],
  profiles: [
    {
      id: "user-1",
      email: "user1@example.com",
      username: "User 1",
      avatar_url: "",
      role: "user",
      is_vip: false,
      vip_expired_at: null,
      created_at: nowIso(),
    },
  ],
  subscriptions: [],
  payment_attempts: [],
  bank_transactions: [],
  reading_progress: [],
  downloads: [],
};

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2));
  }
}

function loadDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8").replace(/^\uFEFF/, ""));
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  };
}

function send(res, code, data) {
  res.writeHead(code, {
    ...corsHeaders(),
    "content-type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  send(res, 404, { error: "Not found" });
}

function badRequest(res, message) {
  send(res, 400, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function match(pathname, pattern) {
  const keys = [];
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\//g, "\\/")
        .replace(/:([A-Za-z0-9_]+)/g, (_, k) => {
          keys.push(k);
          return "([^\\/]+)";
        }) +
      "$",
  );
  const m = pathname.match(regex);
  if (!m) return null;
  const params = {};
  keys.forEach((k, i) => {
    params[k] = decodeURIComponent(m[i + 1]);
  });
  return params;
}

function getOrCreateProfile(db, userId) {
  let profile = db.profiles.find((p) => p.id === userId);
  if (!profile) {
    profile = {
      id: userId,
      email: `${userId}@example.com`,
      username: userId,
      avatar_url: "",
      role: "user",
      is_vip: false,
      vip_expired_at: null,
      created_at: nowIso(),
    };
    db.profiles.push(profile);
  }
  return profile;
}

function grantVipFromAttempt(db, attempt) {
  if (attempt.status === "success" && attempt.paid_at) {
    return attempt;
  }

  attempt.status = "success";
  attempt.paid_at = nowIso();

  const profile = getOrCreateProfile(db, attempt.user_id);
  const durationDays = getPlanDurationDays(attempt.plan_name);
  const baseDate =
    profile.is_vip && profile.vip_expired_at && new Date(profile.vip_expired_at) > new Date()
      ? new Date(profile.vip_expired_at)
      : new Date();
  const end = new Date(baseDate);
  end.setDate(end.getDate() + durationDays);
  profile.is_vip = true;
  profile.vip_expired_at = end.toISOString();

  db.subscriptions.push({
    id: uuid(),
    user_id: attempt.user_id,
    plan_name: attempt.plan_name,
    status: "active",
    start_date: nowIso(),
    end_date: end.toISOString(),
    payment_attempt_id: attempt.id,
  });

  return attempt;
}

async function syncAttemptToSupabase(db, attempt) {
  const client = getSupabaseAdmin();
  if (!client) return;

  const profile = db.profiles.find((p) => p.id === attempt.user_id);
  await client.from("payment_attempts").upsert(
    {
      id: attempt.id,
      user_id: attempt.user_id,
      plan_name: attempt.plan_name,
      amount: attempt.amount,
      method: attempt.method,
      status: attempt.status,
      mock_qr_payload: attempt.mock_qr_payload,
      mock_txn_code: attempt.mock_txn_code,
      created_at: attempt.created_at,
      paid_at: attempt.paid_at,
    },
    { onConflict: "mock_txn_code" },
  );

  if (profile?.is_vip) {
    await client
      .from("profiles")
      .update({
        is_vip: true,
        vip_expired_at: profile.vip_expired_at,
      })
      .eq("id", attempt.user_id);
  }
}

function normalizeSupabasePaymentAttempt(row) {
  if (!row) return null;
  return hydratePaymentAttempt({
    id: row.id,
    user_id: row.user_id,
    plan_name: row.plan_name,
    amount: Number(row.amount) || 0,
    method: row.method,
    status: row.status,
    mock_qr_payload: row.mock_qr_payload || "",
    mock_txn_code: row.mock_txn_code || "",
    receiver_bank: PAYMENT_BANK_NAME,
    receiver_account: PAYMENT_ACCOUNT_NO,
    receiver_name: PAYMENT_ACCOUNT_NAME,
    vietqr_image_url: "",
    created_at: row.created_at,
    paid_at: row.paid_at,
  });
}

async function fetchSupabasePaymentAttemptById(attemptId) {
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client
    .from("payment_attempts")
    .select("id,user_id,plan_name,amount,method,status,mock_qr_payload,mock_txn_code,created_at,paid_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizeSupabasePaymentAttempt(data);
}

async function fetchSupabasePendingPaymentAttempts() {
  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("payment_attempts")
    .select("id,user_id,plan_name,amount,method,status,mock_qr_payload,mock_txn_code,created_at,paid_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !Array.isArray(data)) return [];
  return data.map(normalizeSupabasePaymentAttempt).filter(Boolean);
}

function cachePaymentAttempt(db, attempt) {
  db.payment_attempts ||= [];
  const existing = db.payment_attempts.find((item) => item.id === attempt.id);
  if (existing) {
    Object.assign(existing, attempt);
    return existing;
  }

  db.payment_attempts.push(attempt);
  return attempt;
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }
  return undefined;
}

function unwrapBankPayload(body) {
  if (Array.isArray(body)) return body[0] || {};
  if (Array.isArray(body?.data)) return body.data[0] || {};
  if (body?.data && typeof body.data === "object") return body.data;
  if (body?.transaction && typeof body.transaction === "object") return body.transaction;
  return body || {};
}

function extractBankTransaction(body) {
  const payload = unwrapBankPayload(body);
  const amount = Number(
    firstValue(payload, [
      "amount",
      "transferAmount",
      "creditAmount",
      "transactionAmount",
      "money",
      "value",
      "credit",
    ]) || 0,
  );
  const description =
    firstValue(payload, [
      "description",
      "content",
      "addInfo",
      "transactionContent",
      "transferContent",
      "paymentDetails",
      "remark",
    ]) || "";
  const id =
    firstValue(payload, [
      "transaction_id",
      "transactionId",
      "reference",
      "referenceCode",
      "refNo",
      "tid",
      "id",
    ]) || uuid();

  return {
    id: String(id),
    amount,
    description: String(description),
    raw: body,
  };
}

function findMatchingPaymentAttempt(db, bankTransaction) {
  const amount = Number(bankTransaction.amount || 0);
  const description = normalizeText(bankTransaction.description);

  if (!amount || !description) {
    return null;
  }

  return (
    db.payment_attempts.find((attempt) => {
      if (attempt.status !== "pending") return false;
      if (amount < Number(attempt.amount)) return false;
      return description.includes(normalizeText(attempt.mock_txn_code));
    }) || null
  );
}

function isBankWebhookPath(pathname) {
  return pathname === "/webhooks/bank-transaction" || pathname === "/hooks/sepay-payment";
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const method = req.method || "GET";

    if (method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      return res.end();
    }

    const db = loadDb();

    if (method === "GET" && (pathname === "/health" || pathname === "/healthz")) {
      return send(res, 200, { ok: true, service: "book-api", time: nowIso() });
    }

    if (method === "GET" && pathname === "/categories") {
      return send(res, 200, db.categories);
    }

    if (method === "GET" && pathname === "/books") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const categoryId = url.searchParams.get("categoryId");
      const vipOnly = url.searchParams.get("vipOnly") === "true";
      let items = db.books;
      if (categoryId) items = items.filter((b) => b.category_id === categoryId);
      if (vipOnly) items = items.filter((b) => b.is_vip);
      if (q) items = items.filter((b) => `${b.title} ${b.author}`.toLowerCase().includes(q));
      return send(res, 200, items);
    }

    {
      const p = match(pathname, "/books/:bookId");
      if (method === "GET" && p) {
        const book = db.books.find((b) => b.id === p.bookId);
        if (!book) return notFound(res);
        return send(res, 200, book);
      }
    }

    {
      const p = match(pathname, "/books/:bookId/chapters");
      if (method === "GET" && p) {
        const chapters = db.chapters
          .filter((c) => c.book_id === p.bookId)
          .sort((a, b) => a.chapter_no - b.chapter_no);
        return send(res, 200, chapters);
      }
    }

    {
      const p = match(pathname, "/chapters/:chapterId");
      if (method === "GET" && p) {
        const chapter = db.chapters.find((c) => c.id === p.chapterId);
        if (!chapter) return notFound(res);
        return send(res, 200, chapter);
      }
    }

    {
      const p = match(pathname, "/profiles/:userId");
      if (method === "GET" && p) {
        const profile = getOrCreateProfile(db, p.userId);
        saveDb(db);
        return send(res, 200, profile);
      }
      if (method === "PATCH" && p) {
        const body = await parseBody(req);
        const profile = getOrCreateProfile(db, p.userId);
        const allowed = ["username", "avatar_url", "email"];
        allowed.forEach((k) => {
          if (body[k] !== undefined) profile[k] = body[k];
        });
        saveDb(db);
        return send(res, 200, profile);
      }
    }

    {
      const p = match(pathname, "/reading-progress/:userId");
      if (method === "GET" && p) {
        return send(res, 200, db.reading_progress.filter((x) => x.user_id === p.userId));
      }
    }

    {
      const p = match(pathname, "/reading-progress/:userId/:bookId");
      if (method === "PUT" && p) {
        const body = await parseBody(req);
        if (!body.chapter_id) return badRequest(res, "chapter_id is required");
        const existing = db.reading_progress.find(
          (x) => x.user_id === p.userId && x.book_id === p.bookId,
        );
        const record = existing || {
          id: uuid(),
          user_id: p.userId,
          book_id: p.bookId,
          chapter_id: body.chapter_id,
          position: body.position || 0,
          updated_at: nowIso(),
        };
        record.chapter_id = body.chapter_id;
        record.position = body.position || 0;
        record.updated_at = nowIso();
        if (!existing) db.reading_progress.push(record);
        saveDb(db);
        return send(res, 200, record);
      }
    }

    {
      const p = match(pathname, "/downloads/:userId");
      if (method === "GET" && p) {
        return send(res, 200, db.downloads.filter((x) => x.user_id === p.userId));
      }
      if (method === "POST" && p) {
        const body = await parseBody(req);
        if (!body.book_id) return badRequest(res, "book_id is required");
        const item = {
          id: uuid(),
          user_id: p.userId,
          book_id: body.book_id,
          local_path: body.local_path || "",
          status: body.status || "queued",
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        db.downloads.push(item);
        saveDb(db);
        return send(res, 201, item);
      }
    }

    {
      const p = match(pathname, "/downloads/:userId/:downloadId");
      if (method === "PATCH" && p) {
        const body = await parseBody(req);
        const item = db.downloads.find((x) => x.id === p.downloadId && x.user_id === p.userId);
        if (!item) return notFound(res);
        if (body.status !== undefined) item.status = body.status;
        if (body.local_path !== undefined) item.local_path = body.local_path;
        item.updated_at = nowIso();
        saveDb(db);
        return send(res, 200, item);
      }
    }

    if (method === "POST" && pathname === "/payment-attempts") {
      const body = await parseBody(req);
      if (!body.user_id || !body.plan_name || typeof body.amount !== "number") {
        return badRequest(res, "user_id, plan_name, amount are required");
      }
      const attempt = {
        id: uuid(),
        user_id: body.user_id,
        plan_name: body.plan_name,
        amount: body.amount,
        method: "vietqr_bank_transfer",
        status: "pending",
        mock_qr_payload: "",
        mock_txn_code: makeTxnCode(),
        receiver_bank: PAYMENT_BANK_NAME,
        receiver_account: PAYMENT_ACCOUNT_NO,
        receiver_name: PAYMENT_ACCOUNT_NAME,
        vietqr_image_url: "",
        created_at: nowIso(),
        paid_at: null,
      };
      attempt.mock_qr_payload = `BANK=${PAYMENT_BANK_NAME};ACCOUNT=${PAYMENT_ACCOUNT_NO};AMOUNT=${attempt.amount};CONTENT=${attempt.mock_txn_code}`;
      attempt.vietqr_image_url = buildVietQrImageUrl(attempt);
      db.payment_attempts.push(attempt);
      saveDb(db);
      await syncAttemptToSupabase(db, attempt).catch(() => {});
      return send(res, 201, attempt);
    }

    {
      const p = match(pathname, "/payment-attempts/by-id/:attemptId");
      if (method === "GET" && p) {
        let attempt = db.payment_attempts.find((x) => x.id === p.attemptId);
        if (!attempt) {
          const remoteAttempt = await fetchSupabasePaymentAttemptById(p.attemptId);
          if (remoteAttempt) {
            attempt = cachePaymentAttempt(db, remoteAttempt);
          }
        }
        if (!attempt) return notFound(res);
        hydratePaymentAttempt(attempt);
        saveDb(db);
        return send(res, 200, attempt);
      }
    }

    if (method === "GET" && isBankWebhookPath(pathname)) {
      if (!isWebhookAuthorized(req)) {
        return send(res, 401, { error: "Unauthorized webhook" });
      }

      return send(res, 200, {
        ok: true,
        service: "book-api",
        webhook: "bank-transaction",
      });
    }

    if (method === "POST" && isBankWebhookPath(pathname)) {
      if (!isWebhookAuthorized(req)) {
        return send(res, 401, { error: "Unauthorized webhook" });
      }

      const body = await parseBody(req);
      const parsedTransaction = extractBankTransaction(body);
      let attempt = findMatchingPaymentAttempt(db, parsedTransaction);
      if (!attempt) {
        const remoteAttempts = await fetchSupabasePendingPaymentAttempts();
        for (const remoteAttempt of remoteAttempts) {
          cachePaymentAttempt(db, remoteAttempt);
        }
        attempt = findMatchingPaymentAttempt(db, parsedTransaction);
      }

      const transaction = {
        id: parsedTransaction.id,
        amount: parsedTransaction.amount,
        description: parsedTransaction.description,
        received_at: nowIso(),
        matched_attempt_id: attempt?.id || null,
        raw: parsedTransaction.raw,
      };

      db.bank_transactions ||= [];
      db.bank_transactions.push(transaction);

      if (!attempt) {
        saveDb(db);
        return send(res, 202, {
          ok: true,
          matched: false,
          message: "No pending payment attempt matched this bank transaction",
        });
      }

      hydratePaymentAttempt(attempt);
      attempt.bank_transaction_id = transaction.id;
      grantVipFromAttempt(db, attempt);
      saveDb(db);
      await syncAttemptToSupabase(db, attempt).catch(() => {});

      return send(res, 200, {
        ok: true,
        matched: true,
        attempt,
        profile: db.profiles.find((p) => p.id === attempt.user_id),
      });
    }

    if (method === "GET" && pathname === "/webhooks/bank-transaction/recent") {
      if (!isWebhookAuthorized(req)) {
        return send(res, 401, { error: "Unauthorized webhook" });
      }

      const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);
      const transactions = [...(db.bank_transactions || [])]
        .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
        .slice(0, limit)
        .map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
          received_at: transaction.received_at,
          matched_attempt_id: transaction.matched_attempt_id,
        }));

      return send(res, 200, { transactions });
    }

    {
      const p = match(pathname, "/payment-attempts/:attemptId/status");
      if (method === "PATCH" && p) {
        const body = await parseBody(req);
        const attempt = db.payment_attempts.find((x) => x.id === p.attemptId);
        if (!attempt) return notFound(res);

        if (body.status === "success") {
          return badRequest(res, "Payment success can only be confirmed by bank webhook");
        }

        if (body.status) {
          attempt.status = body.status;
          attempt.paid_at = null;
        }

        saveDb(db);
        await syncAttemptToSupabase(db, attempt).catch(() => {});
        return send(res, 200, attempt);
      }
    }

    {
      const p = match(pathname, "/payment-attempts/:userId");
      if (method === "GET" && p) {
        return send(res, 200, db.payment_attempts.filter((x) => x.user_id === p.userId));
      }
    }

    {
      const p = match(pathname, "/subscriptions/:userId");
      if (method === "GET" && p) {
        return send(res, 200, db.subscriptions.filter((x) => x.user_id === p.userId));
      }
    }

    notFound(res);
  } catch (e) {
    send(res, 500, { error: "Internal server error", detail: e.message });
  }
});

validateProductionConfig();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Book API server running at http://localhost:${PORT}`);
});
