import * as Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().port().default(5000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('7d')
    .required(),
  COOKIE_NAME: Joi.string().trim().required(),
  COOKIE_MAX_AGE_MS: Joi.number().integer().positive().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  API_VERSION: Joi.string().required(),
  CORS_ORIGINS: Joi.string().required(),
  API_PREFIX: Joi.string().required(),
});
