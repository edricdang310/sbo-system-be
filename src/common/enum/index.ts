/** Roles (see REQUIREMENTS §2). SYSTEM_ADMIN is the highest role: it is seeded, never assignable through the API. */
export enum ROLE {
  SYSTEM_ADMIN = 'system_admin',
  ADMIN = 'admin',
  TECH = 'tech',
  SALE = 'sale',
  ACCOUNTANT = 'accountant',
}

/** Higher rank manages lower rank only; equal rank can never manage each other */
export const ROLE_RANK: Record<ROLE, number> = {
  [ROLE.SYSTEM_ADMIN]: 100,
  [ROLE.ADMIN]: 50,
  [ROLE.TECH]: 10,
  [ROLE.SALE]: 10,
  [ROLE.ACCOUNTANT]: 10,
};

export const isAdminRole = (role: ROLE) => role === ROLE.ADMIN || role === ROLE.SYSTEM_ADMIN;

/** Fine-grained permissions checked at every endpoint through @Roles() */
export enum PERMISSION {
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_MANAGE = 'customer:manage',
  CONTRACT_VIEW = 'contract:view',
  CONTRACT_MANAGE = 'contract:manage',
  SERVICE_MANAGE = 'service:manage',
  INVOICE_VIEW = 'invoice:view',
  INVOICE_MANAGE = 'invoice:manage',
  PAYMENT_MANAGE = 'payment:manage',
  QUOTATION_VIEW = 'quotation:view',
  QUOTATION_MANAGE = 'quotation:manage',
  TICKET_VIEW = 'ticket:view',
  TICKET_CREATE = 'ticket:create',
  TICKET_HANDLE = 'ticket:handle',
  TELEGRAM_MANAGE = 'telegram:manage',
  SETTINGS_MANAGE = 'settings:manage',
  USER_MANAGE = 'user:manage',
}

const P = PERMISSION;

/** Default RBAC matrix, identical to sbo-fe/src/lib/rbac.ts */
export const DEFAULT_ROLE_PERMISSIONS: Record<ROLE, PERMISSION[]> = {
  [ROLE.SYSTEM_ADMIN]: Object.values(PERMISSION),
  [ROLE.ADMIN]: Object.values(PERMISSION),
  [ROLE.TECH]: [P.CUSTOMER_VIEW, P.CONTRACT_VIEW, P.SERVICE_MANAGE, P.TICKET_VIEW, P.TICKET_HANDLE],
  [ROLE.SALE]: [
    P.CUSTOMER_VIEW,
    P.CUSTOMER_MANAGE,
    P.CONTRACT_VIEW,
    P.CONTRACT_MANAGE,
    P.INVOICE_VIEW,
    P.QUOTATION_VIEW,
    P.QUOTATION_MANAGE,
    P.TICKET_VIEW,
    P.TICKET_CREATE,
  ],
  [ROLE.ACCOUNTANT]: [
    P.CUSTOMER_VIEW,
    P.CONTRACT_VIEW,
    P.INVOICE_VIEW,
    P.INVOICE_MANAGE,
    P.PAYMENT_MANAGE,
    P.QUOTATION_VIEW,
  ],
};

/** Roles whose permissions a System Admin may customise. System Admin itself is always full access. */
export const EDITABLE_ROLES: ROLE[] = [ROLE.ADMIN, ROLE.TECH, ROLE.SALE, ROLE.ACCOUNTANT];

/** Live matrix used by PermissionGuard / profile. Starts as the defaults, then System Admin overrides are applied in place. */
export const ROLE_PERMISSIONS: Record<ROLE, PERMISSION[]> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([r, p]) => [r, [...p]]),
) as Record<ROLE, PERMISSION[]>;

/** Replaces the permissions of editable roles (System Admin is untouched). Roles missing from `overrides` fall back to defaults. */
export function applyRolePermissions(overrides: Partial<Record<ROLE, PERMISSION[]>> = {}) {
  for (const role of EDITABLE_ROLES) {
    ROLE_PERMISSIONS[role] = [...(overrides[role] ?? DEFAULT_ROLE_PERMISSIONS[role])];
  }
  ROLE_PERMISSIONS[ROLE.SYSTEM_ADMIN] = Object.values(PERMISSION);
}

export const hasPermission = (role: ROLE, permission: PERMISSION) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

export enum SERVICE_TYPE {
  CLOUD = 'cloud',
  CDN = 'cdn',
  STORAGE = 'storage',
  TRANSCODE = 'transcode',
  SOFTWARE = 'software',
  SETUP = 'setup',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export enum SERVICE_STATUS {
  ACTIVE = 'active',
  STOPPED = 'stopped',
}

export enum SERVICE_CHANGE_KIND {
  CREATED = 'created',
  UPDATED = 'updated',
  STOPPED = 'stopped',
  RESUMED = 'resumed',
  RENEWED = 'renewed',
}

export enum BILLING_CYCLE {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMIANNUAL = 'semiannual',
  YEARLY = 'yearly',
}

export const CYCLE_MONTHS: Record<BILLING_CYCLE, number> = {
  [BILLING_CYCLE.MONTHLY]: 1,
  [BILLING_CYCLE.QUARTERLY]: 3,
  [BILLING_CYCLE.SEMIANNUAL]: 6,
  [BILLING_CYCLE.YEARLY]: 12,
};

export const CYCLE_LABEL: Record<BILLING_CYCLE, string> = {
  [BILLING_CYCLE.MONTHLY]: 'Hàng tháng',
  [BILLING_CYCLE.QUARTERLY]: 'Hàng quý',
  [BILLING_CYCLE.SEMIANNUAL]: '6 tháng',
  [BILLING_CYCLE.YEARLY]: 'Hàng năm',
};

export enum PAYMENT_TYPE {
  POSTPAID = 'postpaid',
  PREPAID = 'prepaid',
}

export enum CONTRACT_STATUS {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum INVOICE_STATUS {
  UNPAID = 'unpaid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum CUSTOMER_TYPE {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
}

export enum ACTIVE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum QUOTATION_STATUS {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum TICKET_STATUS {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TICKET_PRIORITY {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TICKET_CATEGORY {
  SETUP = 'setup',
  INCIDENT = 'incident',
  CHANGE = 'change',
  SUPPORT = 'support',
  OTHER = 'other',
}

export enum PAYMENT_METHOD_KIND {
  BANK = 'bank',
  EWALLET = 'ewallet',
  CRYPTO = 'crypto',
}

export enum CURRENCY {
  VND = 'VND',
  USD = 'USD',
  USDT = 'USDT',
}
