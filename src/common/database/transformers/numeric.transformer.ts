import { ValueTransformer } from 'typeorm';

/** Postgres returns numeric/decimal as string; the API must expose JSON numbers */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
