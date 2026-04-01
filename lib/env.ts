/**
 * Runtime environment validation.
 * Import this module in server entry points to catch missing vars early.
 * Optional vars (empty in dev) use .optional() — required vars will throw.
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.warn(`[env] Missing: ${key}`);
  }
  return val || "";
}

function optionalEnv(key: string): string {
  return process.env[key] || "";
}

export const env = {
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  CLERK_SECRET_KEY: requireEnv("CLERK_SECRET_KEY"),
  CLERK_WEBHOOK_SECRET: optionalEnv("CLERK_WEBHOOK_SECRET"),

  // Neon
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // UploadThing
  UPLOADTHING_SECRET: optionalEnv("UPLOADTHING_SECRET"),
  UPLOADTHING_APP_ID: optionalEnv("UPLOADTHING_APP_ID"),

  // OpenRouter
  OPENROUTER_API_KEY: requireEnv("OPENROUTER_API_KEY"),

  // Apify
  APIFY_API_KEY: requireEnv("APIFY_API_KEY"),

  // Firecrawl
  FIRECRAWL_API_KEY: optionalEnv("FIRECRAWL_API_KEY"),

  // Resend
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM") || "noreply@labelos.com.br",

  // Upstash (optional — rate limiting)
  UPSTASH_REDIS_REST_URL: optionalEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("UPSTASH_REDIS_REST_TOKEN"),

  // Netlify
  NETLIFY_FUNCTION_SECRET: optionalEnv("NETLIFY_FUNCTION_SECRET"),

  // App
  NEXT_PUBLIC_APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
} as const;
