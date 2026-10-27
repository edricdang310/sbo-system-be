import * as Joi from 'joi';

/** Validates environment variables on boot so misconfiguration fails fast */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  HTTP_PORT: Joi.number().default(3333),
  TIME_ZONE: Joi.string().default('Asia/Ho_Chi_Minh'),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRATION: Joi.string().default('1d'),
  APP_SECRET_KEY: Joi.string().min(16).required(),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  PUBLIC_URL: Joi.string().uri().optional(),
  DEFAULT_ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('admin@sbo.local'),
  DEFAULT_ADMIN_PASSWORD: Joi.string().min(6).default('Admin@123'),
  DEFAULT_ADMIN_NAME: Joi.string().default('Quản trị viên'),
}).unknown(true);
