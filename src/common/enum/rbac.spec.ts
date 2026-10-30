import { hasPermission, isAdminRole, PERMISSION, ROLE, ROLE_PERMISSIONS, ROLE_RANK } from './index';

describe('RBAC matrix', () => {
  it('admin and system admin have every permission', () => {
    expect(ROLE_PERMISSIONS[ROLE.ADMIN]).toHaveLength(Object.values(PERMISSION).length);
    expect(ROLE_PERMISSIONS[ROLE.SYSTEM_ADMIN]).toHaveLength(Object.values(PERMISSION).length);
  });

  it('system admin outranks admin, admin outranks staff, admins are not equal-rank with each other', () => {
    expect(ROLE_RANK[ROLE.SYSTEM_ADMIN]).toBeGreaterThan(ROLE_RANK[ROLE.ADMIN]);
    expect(ROLE_RANK[ROLE.ADMIN]).toBeGreaterThan(ROLE_RANK[ROLE.TECH]);
    expect(isAdminRole(ROLE.SYSTEM_ADMIN) && isAdminRole(ROLE.ADMIN) && !isAdminRole(ROLE.SALE)).toBe(true);
  });

  it.each([
    [ROLE.TECH, PERMISSION.SERVICE_MANAGE, true],
    [ROLE.TECH, PERMISSION.INVOICE_VIEW, false],
    [ROLE.SALE, PERMISSION.TICKET_CREATE, true],
    [ROLE.SALE, PERMISSION.TICKET_HANDLE, false],
    [ROLE.SALE, PERMISSION.PAYMENT_MANAGE, false],
    [ROLE.ACCOUNTANT, PERMISSION.PAYMENT_MANAGE, true],
    [ROLE.ACCOUNTANT, PERMISSION.CUSTOMER_MANAGE, false],
    [ROLE.ACCOUNTANT, PERMISSION.USER_MANAGE, false],
  ])('%s / %s → %s', (role, permission, expected) => {
    expect(hasPermission(role, permission)).toBe(expected);
  });
});
