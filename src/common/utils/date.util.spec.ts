import { addDays, addMonths, daysBetween, maxDate } from './date.util';

describe('date.util', () => {
  it('addMonths keeps the day-of-month and clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-10-15', 3)).toBe('2027-01-15');
  });

  it('a monthly service starting on the 15th is billed 15th → 14th of next month', () => {
    const from = '2026-10-15';
    expect(addDays(addMonths(from, 1), -1)).toBe('2026-11-14');
    // next invoice starts right after paidUntil, with no gap or overlap
    expect(addDays('2026-11-14', 1)).toBe('2026-11-15');
  });

  it('a yearly cycle ending on Feb 28/29 is computed correctly', () => {
    expect(addDays(addMonths('2027-03-01', 12), -1)).toBe('2028-02-29');
  });

  it('maxDate never moves paidUntil backwards', () => {
    expect(maxDate('2026-12-31', '2026-10-31')).toBe('2026-12-31');
    expect(maxDate(null, '2026-10-31')).toBe('2026-10-31');
    expect(maxDate('2026-10-31', null)).toBe('2026-10-31');
  });

  it('daysBetween is signed', () => {
    expect(daysBetween('2026-10-26', '2026-10-29')).toBe(3);
    expect(daysBetween('2026-10-26', '2026-10-20')).toBe(-6);
  });
});
