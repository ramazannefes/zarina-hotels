// RBAC permission matrix. Every protected server action / API route MUST check
// permissions here — hiding menu items is not authorization.

export type AdminRole = "SUPER_ADMIN" | "HOTEL_MANAGER" | "RESERVATION_MANAGER" | "CONTENT_MANAGER" | "FINANCE" | "RECEPTION" | "HOUSEKEEPING";

export const PERMISSIONS = [
  "dashboard.view",
  "bookings.view",
  "bookings.create",
  "bookings.modify",
  "bookings.cancel",
  "bookings.export",
  "refunds.request",
  "refunds.approve",
  "rates.view",
  "rates.edit",
  "availability.edit",
  "hotels.view",
  "hotels.edit",
  "rooms.edit",
  "content.view",
  "content.edit",
  "reviews.moderate",
  "media.upload",
  "messages.view",
  "analytics.view",
  "users.view",
  "users.manage",
  "settings.edit",
  "audit.view",
  // ── PMS (Otel Yönetim) ──
  "pms.view",            // PMS ekranlarını görebilir (dashboard, odalar, takvim)
  "pms.rooms.manage",    // oda ekle/düzenle, manuel durum değişikliği (bakım/blokaj dahil)
  "pms.housekeeping",    // temizlik durumu güncelleme + housekeeping görevleri
  "pms.checkin",         // check-in / check-out işlemleri
  "pms.reservations",    // PMS rezervasyon oluşturma/düzenleme/iptal + oda atama
  "pms.payments",        // manuel ödeme ekleme/silme
  "pms.guests",          // misafir profilleri yönetimi
  "pms.reports",         // raporlar + export
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  HOTEL_MANAGER: [
    "dashboard.view",
    "bookings.view",
    "bookings.create",
    "bookings.modify",
    "bookings.cancel",
    "bookings.export",
    "refunds.request",
    "rates.view",
    "rates.edit",
    "availability.edit",
    "hotels.view",
    "hotels.edit",
    "rooms.edit",
    "content.view",
    "content.edit",
    "reviews.moderate",
    "media.upload",
    "messages.view",
    "analytics.view",
    "audit.view",
    "pms.view",
    "pms.rooms.manage",
    "pms.housekeeping",
    "pms.checkin",
    "pms.reservations",
    "pms.payments",
    "pms.guests",
    "pms.reports",
  ],
  RESERVATION_MANAGER: [
    "dashboard.view",
    "bookings.view",
    "bookings.create",
    "bookings.modify",
    "bookings.cancel",
    "bookings.export",
    "refunds.request",
    "rates.view",
    "hotels.view",
    "messages.view",
    "analytics.view",
    "pms.view",
    "pms.checkin",
    "pms.reservations",
    "pms.payments",
    "pms.guests",
    "pms.reports",
  ],
  CONTENT_MANAGER: [
    "dashboard.view",
    "content.view",
    "content.edit",
    "hotels.view",
    "reviews.moderate",
    "media.upload",
    "messages.view",
  ],
  FINANCE: [
    "dashboard.view",
    "bookings.view",
    "bookings.export",
    "refunds.request",
    "refunds.approve",
    "analytics.view",
    "audit.view",
    "pms.view",
    "pms.reports",
  ],
  RECEPTION: [
    "dashboard.view",
    "bookings.view",
    "bookings.create",
    "bookings.modify",
    "rates.view",
    "pms.view",
    "pms.checkin",
    "pms.reservations",
    "pms.payments",
    "pms.guests",
  ],
  HOUSEKEEPING: [
    "dashboard.view",
    "pms.view",
    "pms.housekeeping",
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  HOTEL_MANAGER: "Hotel Manager",
  RESERVATION_MANAGER: "Reservation Manager",
  CONTENT_MANAGER: "Content Manager",
  FINANCE: "Finance",
  RECEPTION: "Reception",
  HOUSEKEEPING: "Housekeeping",
};
