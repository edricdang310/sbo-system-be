/** Roles (see REQUIREMENTS §2) */
export enum ROLE {
  ADMIN = 'admin',
  TECH = 'tech',
  SALE = 'sale',
  ACCOUNTANT = 'accountant',
}

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
export const ROLE_PERMISSIONS: Record<ROLE, PERMISSION[]> = {
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
