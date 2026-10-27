import { hasPermission, PERMISSION, ROLE, ROLE_PERMISSIONS } from './index';

describe('RBAC matrix', () => {
  it('admin has every permission', () => {
    expect(ROLE_PERMISSIONS[ROLE.ADMIN]).toHaveLength(Object.values(PERMISSION).length);
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
