import { AsyncStorage, readJson, writeJson } from "@/lib/storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

type PaymentAttemptStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired"
  | "cancelled";

export interface PaymentAttempt {
  id: string;
  user_id: string;
  plan_name: string;
  amount: number;
  method: string;
  status: PaymentAttemptStatus;
  mock_qr_payload: string;
  mock_txn_code: string;
  receiver_bank: string;
  receiver_account: string;
  receiver_name: string;
  vietqr_image_url: string;
  created_at: string;
  paid_at: string | null;
}

export interface PaymentProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  role: string;
  is_vip: boolean;
  vip_expired_at: string | null;
  created_at: string;
}

type LocalPaymentStore = {
  attempts: PaymentAttempt[];
  profiles: PaymentProfile[];
};

type PendingPaymentRecord = {
  attemptId: string;
  userId: string;
  planName: string;
  amount: number;
  createdAt: string;
};

const LOCAL_PAYMENT_STORE_KEY = "booknest:local-payment-store";
const PENDING_PAYMENT_KEY_PREFIX = "booknest:pending-payment:";
const PENDING_PAYMENT_MAX_AGE_MS = 72 * 60 * 60 * 1000;
const LOCAL_BANK_NAME = "BookNest Bank";
const LOCAL_ACCOUNT_NO = "0123 456 789";
const LOCAL_ACCOUNT_NAME = "BOOKNEST";
const ALLOW_LOCAL_PAYMENT_FALLBACK =
  __DEV__ && process.env.EXPO_PUBLIC_ALLOW_LOCAL_PAYMENT_FALLBACK !== "false";

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeTxnCode() {
  return `TXN_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function pendingPaymentKey(userId: string) {
  return `${PENDING_PAYMENT_KEY_PREFIX}${userId}`;
}

function isPendingPaymentRecord(value: unknown): value is PendingPaymentRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PendingPaymentRecord>;
  return (
    typeof record.attemptId === "string" &&
    typeof record.userId === "string" &&
    typeof record.planName === "string" &&
    typeof record.amount === "number" &&
    typeof record.createdAt === "string"
  );
}

export async function readPendingPaymentAttempt(userId: string) {
  const record = await readJson<PendingPaymentRecord | null>(pendingPaymentKey(userId), null);
  if (!isPendingPaymentRecord(record) || record.userId !== userId) {
    await AsyncStorage.removeItem(pendingPaymentKey(userId));
    return null;
  }

  const createdAtMs = new Date(record.createdAt).getTime();
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > PENDING_PAYMENT_MAX_AGE_MS) {
    await AsyncStorage.removeItem(pendingPaymentKey(userId));
    return null;
  }

  return record;
}

export async function savePendingPaymentAttempt(attempt: PaymentAttempt) {
  if (attempt.status !== "pending") {
    await clearPendingPaymentAttempt(attempt.user_id, attempt.id);
    return;
  }

  const record: PendingPaymentRecord = {
    attemptId: attempt.id,
    userId: attempt.user_id,
    planName: attempt.plan_name,
    amount: Number(attempt.amount) || 0,
    createdAt: attempt.created_at || nowIso(),
  };

  await writeJson(pendingPaymentKey(attempt.user_id), record);
}

export async function clearPendingPaymentAttempt(userId: string, attemptId?: string) {
  if (attemptId) {
    const record = await readJson<PendingPaymentRecord | null>(pendingPaymentKey(userId), null);
    if (isPendingPaymentRecord(record) && record.attemptId !== attemptId) {
      return;
    }
  }

  await AsyncStorage.removeItem(pendingPaymentKey(userId));
}

async function readLocalStore(): Promise<LocalPaymentStore> {
  const store = await readJson<LocalPaymentStore>(LOCAL_PAYMENT_STORE_KEY, {
    attempts: [],
    profiles: [],
  });

  return {
    attempts: Array.isArray(store.attempts) ? store.attempts : [],
    profiles: Array.isArray(store.profiles) ? store.profiles : [],
  };
}

async function writeLocalStore(store: LocalPaymentStore) {
  await writeJson(LOCAL_PAYMENT_STORE_KEY, store);
}

function getOrCreateLocalProfile(store: LocalPaymentStore, userId: string) {
  let profile = store.profiles.find((item) => item.id === userId);
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
    store.profiles.push(profile);
  }
  return profile;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function resolveDevApiBaseUrls() {
  const constantsAny = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
  };

  const hostUri =
    constantsAny.expoConfig?.hostUri || constantsAny.expoGoConfig?.debuggerHost || "";
  const urls: string[] = [];

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host) {
      urls.push(`http://${host}:4000`);
    }
  }

  urls.push(Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000");
  urls.push("http://localhost:4000");

  return uniqueValues(urls);
}

function resolveApiBaseUrls() {
  const fromEnv = process.env.EXPO_PUBLIC_PAYMENT_API_URL?.trim();
  if (fromEnv) {
    const envUrl = fromEnv.replace(/\/+$/, "");
    return __DEV__ ? uniqueValues([envUrl, ...resolveDevApiBaseUrls()]) : [envUrl];
  }

  if (!__DEV__) {
    throw new Error("Chưa cấu hình EXPO_PUBLIC_PAYMENT_API_URL cho backend thanh toán.");
  }

  return resolveDevApiBaseUrls();
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrls = resolveApiBaseUrls();
  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });

      const text = await response.text();
      const json = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(json?.error || "API request failed");
      }

      return json as T;
    } catch (error) {
      lastError = error;
      if (!__DEV__) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("API request failed");
}

async function createLocalPaymentAttempt(input: {
  userId: string;
  planName: string;
  amount: number;
}) {
  const store = await readLocalStore();
  const attempt: PaymentAttempt = {
    id: makeId(),
    user_id: input.userId,
    plan_name: input.planName,
    amount: input.amount,
    method: "vietqr_local_pending",
    status: "pending",
    mock_qr_payload: `PAYMENT:${input.planName}:${input.amount}`,
    mock_txn_code: makeTxnCode(),
    receiver_bank: LOCAL_BANK_NAME,
    receiver_account: LOCAL_ACCOUNT_NO,
    receiver_name: LOCAL_ACCOUNT_NAME,
    vietqr_image_url: "",
    created_at: nowIso(),
    paid_at: null,
  };

  getOrCreateLocalProfile(store, input.userId);
  store.attempts.push(attempt);
  await writeLocalStore(store);
  return attempt;
}

async function fetchLocalPaymentAttempt(attemptId: string) {
  const store = await readLocalStore();
  const attempt = store.attempts.find((item) => item.id === attemptId);
  if (!attempt) throw new Error("Payment attempt not found");
  return attempt;
}

async function fetchLocalPaymentProfile(userId: string) {
  const store = await readLocalStore();
  const profile = getOrCreateLocalProfile(store, userId);
  await writeLocalStore(store);
  return profile;
}

export async function createMockPaymentAttempt(input: {
  userId: string;
  planName: string;
  amount: number;
}) {
  try {
    return await apiRequest<PaymentAttempt>("/payment-attempts", {
      method: "POST",
      body: JSON.stringify({
        user_id: input.userId,
        plan_name: input.planName,
        amount: input.amount,
      }),
    });
  } catch (error) {
    if (ALLOW_LOCAL_PAYMENT_FALLBACK) {
      return createLocalPaymentAttempt(input);
    }

    throw error instanceof Error
      ? error
      : new Error("Không kết nối được backend thanh toán.");
  }
}

export async function fetchMockPaymentAttempt(attemptId: string) {
  try {
    return await apiRequest<PaymentAttempt>(`/payment-attempts/by-id/${attemptId}`);
  } catch (error) {
    if (ALLOW_LOCAL_PAYMENT_FALLBACK) {
      return fetchLocalPaymentAttempt(attemptId);
    }

    throw error instanceof Error
      ? error
      : new Error("Không kiểm tra được trạng thái thanh toán.");
  }
}

export async function fetchMockPaymentProfile(userId: string) {
  try {
    return await apiRequest<PaymentProfile>(`/profiles/${userId}`);
  } catch (error) {
    if (ALLOW_LOCAL_PAYMENT_FALLBACK) {
      return fetchLocalPaymentProfile(userId);
    }

    throw error instanceof Error
      ? error
      : new Error("Không tải được trạng thái VIP từ backend thanh toán.");
  }
}
