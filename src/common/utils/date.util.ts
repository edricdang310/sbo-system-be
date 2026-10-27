import { BadRequestException } from '@nestjs/common';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today as yyyy-mm-dd in the configured business timezone (not the server's) */
export const todayIso = (timeZone = process.env.TIME_ZONE ?? 'Asia/Ho_Chi_Minh') =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

/** Adds months keeping the day-of-month (clamped to the target month length) - mirrors sbo-fe/lib/billing.ts */
export const addMonths = (s: string, n: number) => {
  const d = parse(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toIso(d);
};

export const maxDate = (a?: string | null, b?: string | null) => (!a ? b ?? null : !b ? a : a > b ? a : b);

export const daysBetween = (fromIso: string, toIso_: string) =>
  Math.round((parse(toIso_).getTime() - parse(fromIso).getTime()) / 86400000);

export const assertIsoDate = (value: string, field: string) => {
  if (!ISO_DATE.test(value ?? '') || Number.isNaN(parse(value).getTime())) {
    throw new BadRequestException(`${field} phải có dạng yyyy-mm-dd`);
  }
};

export const formatDateVi = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const formatVnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))}đ`;
