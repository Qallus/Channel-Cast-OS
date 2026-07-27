import { type AppRole, ROLES } from "@/lib/rbac/roles";

export const PERMISSIONS = {
  // Platform / users
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
  // Network entities
  ORGS_VIEW_ALL: "orgs.view_all",
  DEVICES_VIEW_ALL: "devices.view_all",
  DEVICES_MANAGE: "devices.manage",
  ADSPACES_VIEW_ALL: "adspaces.view_all",
  ADSPACES_MANAGE: "adspaces.manage",
  LISTINGS_MANAGE: "listings.manage",
  // Campaigns & content
  CAMPAIGNS_VIEW_ALL: "campaigns.view_all",
  CAMPAIGNS_VIEW_OWN: "campaigns.view_own",
  CAMPAIGNS_MANAGE: "campaigns.manage",
  AUDIO_VIEW: "audio.view",
  AUDIO_MANAGE: "audio.manage",
  APPROVALS_MANAGE: "approvals.manage",
  // Commerce
  QUOTES_VIEW: "quotes.view",
  QUOTES_MANAGE: "quotes.manage",
  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",
  REVENUE_VIEW: "revenue.view",
  // Shared
  REPORTS_VIEW: "reports.view",
  SUPPORT_MANAGE: "support.manage",
  PROFILE_EDIT: "profile.edit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const everyone = [PERMISSIONS.PROFILE_EDIT] as const satisfies readonly Permission[];

const allPermissions = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  [ROLES.SUPER_ADMIN]: allPermissions,
  [ROLES.ADMIN]: allPermissions,
  [ROLES.SUPPORT]: [
    ...everyone,
    PERMISSIONS.ORGS_VIEW_ALL,
    PERMISSIONS.DEVICES_VIEW_ALL,
    PERMISSIONS.CAMPAIGNS_VIEW_ALL,
    PERMISSIONS.SUPPORT_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.BILLING]: [
    ...everyone,
    PERMISSIONS.ORGS_VIEW_ALL,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.REVENUE_VIEW,
    PERMISSIONS.QUOTES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.INSTALLER]: [
    ...everyone,
    PERMISSIONS.DEVICES_VIEW_ALL,
    PERMISSIONS.DEVICES_MANAGE,
  ],
  [ROLES.ADVERTISER]: [
    ...everyone,
    PERMISSIONS.CAMPAIGNS_VIEW_OWN,
    PERMISSIONS.CAMPAIGNS_MANAGE,
    PERMISSIONS.AUDIO_VIEW,
    PERMISSIONS.AUDIO_MANAGE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.BUSINESS_OWNER]: [
    ...everyone,
    PERMISSIONS.ADSPACES_MANAGE,
    PERMISSIONS.DEVICES_VIEW_ALL,
    PERMISSIONS.REVENUE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.RESELLER]: [
    ...everyone,
    PERMISSIONS.ORGS_VIEW_ALL,
    PERMISSIONS.REVENUE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.PARTNER]: [...everyone, PERMISSIONS.CAMPAIGNS_VIEW_OWN, PERMISSIONS.AUDIO_VIEW, PERMISSIONS.REPORTS_VIEW],
  [ROLES.RADIO_STATION]: [...everyone, PERMISSIONS.CAMPAIGNS_VIEW_OWN, PERMISSIONS.AUDIO_VIEW, PERMISSIONS.REPORTS_VIEW],
  [ROLES.VOICE_TALENT]: [...everyone, PERMISSIONS.AUDIO_VIEW, PERMISSIONS.AUDIO_MANAGE],
  [ROLES.AUDIO_PRODUCTION]: [...everyone, PERMISSIONS.AUDIO_VIEW, PERMISSIONS.AUDIO_MANAGE],
  [ROLES.VIEWER]: [...everyone, PERMISSIONS.REPORTS_VIEW],
};
