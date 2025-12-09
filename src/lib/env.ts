export const env = {
  USE_REDIS: process.env.USE_REDIS === "true",
  USE_DB: process.env.USE_DB === "true",
  REDIS_URL: process.env.REDIS_URL || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
};

export function isRedisEnabled(): boolean {
  return env.USE_REDIS && !!env.REDIS_URL;
}

export function isDbEnabled(): boolean {
  return env.USE_DB && !!env.DATABASE_URL;
}

