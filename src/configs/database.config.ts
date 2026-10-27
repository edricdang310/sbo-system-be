import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'sbo',
  password: process.env.DATABASE_PASSWORD ?? 'sbo',
  name: process.env.DATABASE_NAME ?? 'sbo',
  synchronize: (process.env.DATABASE_SYNCHRONIZE ?? 'true') === 'true',
  debug: (process.env.DATABASE_DEBUG ?? 'false') === 'true',
}));
