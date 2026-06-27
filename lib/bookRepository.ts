import type { PaymentAttempt } from "./paymentApi";
import { isLocalUserId, upsertLocalReadingProgress } from "./readingProgressStore";
import { supabase } from "./supabase";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function upsertReadingProgress(
  userId: string,
  bookId: string,
  chapterId: string,
  position: number,
) {
  if (isLocalUserId(userId)) {
    await upsertLocalReadingProgress(userId, bookId, chapterId, position);
    return { data: null, error: null };
  }

  return supabase.from("reading_progress").upsert(
    {
      user_id: userId,
      book_id: bookId,
      chapter_id: chapterId,
      position,
    },
    { onConflict: "user_id,book_id" },
  );
}

export async function upsertMockPaymentAttempt(attempt: PaymentAttempt) {
  return supabase.from("payment_attempts").upsert(
    {
      ...(isUuid(attempt.id) ? { id: attempt.id } : {}),
      user_id: attempt.user_id,
      plan_name: attempt.plan_name,
      amount: attempt.amount,
      method: attempt.method || "qr_mock",
      status: attempt.status,
      mock_qr_payload: attempt.mock_qr_payload,
      mock_txn_code: attempt.mock_txn_code,
      created_at: attempt.created_at,
      paid_at: attempt.paid_at,
    },
    { onConflict: "mock_txn_code" },
  );
}

export async function syncVipProfile(userId: string, vipExpiredAt: string | null) {
  return supabase
    .from("profiles")
    .update({
      is_vip: true,
      vip_expired_at: vipExpiredAt,
    })
    .eq("id", userId);
}
