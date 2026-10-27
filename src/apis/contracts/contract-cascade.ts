import { EntityManager, In } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { Contract } from './entities/contract.entity';
import { ServiceItem } from './entities/service-item.entity';

/**
 * Soft-deletes contracts together with their services, invoices, invoice items and payments.
 * Rows stay in the database (deletedAt) so the data can still be recovered by an administrator.
 */
export async function softDeleteContracts(m: EntityManager, contractIds: string[]) {
  if (!contractIds.length) return;
  const invoices = await m.find(Invoice, { where: { contractId: In(contractIds) }, select: { id: true } });
  const invoiceIds = invoices.map((i) => i.id);
  if (invoiceIds.length) {
    await m.softDelete(Payment, { invoiceId: In(invoiceIds) });
    await m.softDelete(InvoiceItem, { invoiceId: In(invoiceIds) });
    await m.softDelete(Invoice, { id: In(invoiceIds) });
  }
  await m.softDelete(ServiceItem, { contractId: In(contractIds) });
  await m.softDelete(Contract, { id: In(contractIds) });
}
