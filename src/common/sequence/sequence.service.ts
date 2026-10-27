import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { todayIso } from '../utils/date.util';

@Injectable()
export class SequenceService {
  constructor(private readonly dataSource: DataSource) {}

  /** Race-free increment (single UPSERT statement) */
  async next(key: string): Promise<number> {
    const rows = await this.dataSource.query(
      `INSERT INTO sequences ("key", "value") VALUES ($1, 1)
       ON CONFLICT ("key") DO UPDATE SET "value" = sequences."value" + 1
       RETURNING "value"`,
      [key],
    );
    return Number(rows[0].value);
  }

  private year() {
    return todayIso().slice(0, 4);
  }

  /** KH-0001 */
  async customerCode() {
    return `KH-${String(await this.next('customer')).padStart(4, '0')}`;
  }

  /** HD-2026-001 */
  async contractCode() {
    const y = this.year();
    return `HD-${y}-${String(await this.next(`contract:${y}`)).padStart(3, '0')}`;
  }

  /** INV-2026-0001 */
  async invoiceCode() {
    const y = this.year();
    return `INV-${y}-${String(await this.next(`invoice:${y}`)).padStart(4, '0')}`;
  }

  /** BG-2026-001 */
  async quotationCode() {
    const y = this.year();
    return `BG-${y}-${String(await this.next(`quotation:${y}`)).padStart(3, '0')}`;
  }

  /** TK-0001 */
  async ticketCode() {
    return `TK-${String(await this.next('ticket')).padStart(4, '0')}`;
  }
}
