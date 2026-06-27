export function formatAdminError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (lower.includes("row-level security") || lower.includes("policy")) {
    return "Bị Supabase RLS chặn. Hãy chạy lại migration_admin_catalog_policies.sql và migration_avatar_storage.sql.";
  }

  if (lower.includes("bucket")) {
    return "Chưa có bucket book-covers. Hãy chạy migration_avatar_storage.sql.";
  }

  if (lower.includes("permission") || lower.includes("unauthorized")) {
    return "Supabase chưa cho phép thao tác này. Hãy chạy lại hai file migration admin/storage.";
  }

  return message || "Có lỗi xảy ra, vui lòng thử lại.";
}

export function formatVnd(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function isSuccessfulPayment(status: string) {
  return status === "completed" || status === "success";
}

export function getVipInfo(user: { is_vip?: boolean; vip_expired_at?: string | null }) {
  if (!user.is_vip) {
    return {
      active: false,
      expired: false,
      label: "User thường",
      detail: "Chưa có VIP",
      badgeBg: "#eef2f6",
      badgeText: "#526272",
    };
  }

  const expiredAt = user.vip_expired_at ? new Date(user.vip_expired_at) : null;
  const expired = !!expiredAt && expiredAt.getTime() <= Date.now();

  if (expired) {
    return {
      active: false,
      expired: true,
      label: "VIP hết hạn",
      detail: `Hết hạn: ${expiredAt.toLocaleDateString("vi-VN")}`,
      badgeBg: "#fff1f2",
      badgeText: "#be123c",
    };
  }

  const daysLeft = expiredAt
    ? Math.max(1, Math.ceil((expiredAt.getTime() - Date.now()) / 86400000))
    : null;

  return {
    active: true,
    expired: false,
    label: "VIP",
    detail: daysLeft ? `Còn ${daysLeft} ngày` : "Đang hoạt động",
    badgeBg: "#fff7df",
    badgeText: "#b45309",
  };
}
