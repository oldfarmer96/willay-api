import * as Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().port().default(5000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('15m')
    .required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('7d'),
  COOKIE_NAME: Joi.string().trim().required(),
  COOKIE_MAX_AGE_MS: Joi.number().integer().positive().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  API_VERSION: Joi.string().required(),
  CORS_ORIGINS: Joi.string().required(),
  API_PREFIX: Joi.string().required(),
  RATE_LIMIT_LIMIT: Joi.number().integer().positive(),
  RATE_LIMIT_TTL: Joi.number().integer().positive(),

  CEREBRAS_API_KEY: Joi.string().required(),
  GROQ_API_KEY: Joi.string().required(),
  OPENROUTER_API_KEY: Joi.string().required(),
  AI_PROVIDER_TIMEOUT: Joi.number().integer().positive().default(30000),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
});
