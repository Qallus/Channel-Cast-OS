export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  ADVERTISER: "advertiser",
  BUSINESS_OWNER: "business_owner",
  RESELLER: "reseller",
  PARTNER: "partner",
  RADIO_STATION: "radio_station",
  VOICE_TALENT: "voice_talent",
  AUDIO_PRODUCTION: "audio_production",
  INSTALLER: "installer",
  SUPPORT: "support",
  BILLING: "billing",
  VIEWER: "viewer",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

/** Roles that see the Super Admin / operations console at /app/admin. */
export const ADMIN_CONSOLE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPPORT,
  ROLES.BILLING,
] as const satisfies readonly AppRole[];

/** Channel Cast internal team roles. */
export const INTERNAL_ROLES = [
  ...ADMIN_CONSOLE_ROLES,
  ROLES.INSTALLER,
] as const satisfies readonly AppRole[];

export function isAppRole(role: string | null | undefined): role is AppRole {
  return Object.values(ROLES).includes(role as AppRole);
}

export function isAdminConsoleRole(role: string | null | undefined) {
  return isAppRole(role) && (ADMIN_CONSOLE_ROLES as readonly AppRole[]).includes(role);
}

export function isInternalRole(role: string | null | undefined) {
  return isAppRole(role) && (INTERNAL_ROLES as readonly AppRole[]).includes(role);
}

/** Where a role lands after login. Mirrors 03-page-flows/00-route-map.md. */
export function defaultDashboardPathForRole(role: string | null | undefined) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
    case ROLES.SUPPORT:
    case ROLES.BILLING:
    case ROLES.INSTALLER:
      return "/app/admin";
    case ROLES.ADVERTISER:
      return "/app/advertiser";
    case ROLES.BUSINESS_OWNER:
      return "/app/owner";
    case ROLES.RESELLER:
      return "/app/reseller";
    case ROLES.PARTNER:
      return "/app/partner";
    case ROLES.RADIO_STATION:
      return "/app/radio";
    case ROLES.VOICE_TALENT:
      return "/app/voice-talent";
    default:
      return "/app/dashboard";
  }
}

export const ROLE_LABELS: Record<AppRole, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.ADVERTISER]: "Advertiser",
  [ROLES.BUSINESS_OWNER]: "Business / Ad-Space Owner",
  [ROLES.RESELLER]: "Reseller",
  [ROLES.PARTNER]: "Partner",
  [ROLES.RADIO_STATION]: "Radio Station",
  [ROLES.VOICE_TALENT]: "Voice Talent",
  [ROLES.AUDIO_PRODUCTION]: "Audio Production",
  [ROLES.INSTALLER]: "Installer",
  [ROLES.SUPPORT]: "Support",
  [ROLES.BILLING]: "Billing",
  [ROLES.VIEWER]: "Viewer",
};
