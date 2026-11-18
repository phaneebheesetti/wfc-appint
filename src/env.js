import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    SKIP_ENV_VALIDATION: z.boolean().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ENV: z.enum(["local", "staging", "pre-prod", "prod"]).optional(),
    DATABASE_URL: z.url(),
    DATABASE_MIGRATIONS_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    CLERK_SECRET_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_PUBLIC_KEY: z.string(),
    STRIPE_VERSION: z.string(),
    APP_URL: z.url(),
    HANDWRITING_OCR_API_KEY: z.string(),
    SENDGRID_API_KEY: z.string(),
    TWILIO_ACCOUNT_SID: z.string(),
    TWILIO_AUTH_TOKEN: z.string(),
    TWILIO_PHONE_NUMBER: z.string(),
    APP_SHORT_LINK: z.url(),
    SENTRY_ORG: z.string(),
    SENTRY_PROJECT: z.string(),
    SF_LOGIN_URL: z.string().url().optional(),
    SF_USERNAME: z.string().optional(),
    SF_PASSWORD: z.string().optional(),
    NIGHTLY_JOBS_EMAIL_NOTIFICATIONS_ENABLED: z.string().optional(),
    ROLE_SESSION_SECRET: z.string().min(32),
    STRIPE_RESTRICTION_CHECK: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SKIP_ENV_VALIDATION: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string(),
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_SENTRY_ENABLED: z.string(),
    NEXT_PUBLIC_SENTRY_DSN: z.string(),
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string(),
    NEXT_PUBLIC_SENTRY_DEBUG: z.string(),
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string(),
    NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE: z.string(),
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_ABLY_API_KEY: z.string(),
    NEXT_PUBLIC_DEMO_SOCIAL_PROOF: z.string(),
    NEXT_PUBLIC_TERMS_AND_CONDITIONS_ENABLED: z.string().optional(),
    NEXT_PUBLIC_DIGITAL_SALES_ENABLED: z.string().optional(),
    NEXT_PUBLIC_FF_LABEL_CHANGE: z.string().optional(),
    NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SKIP_ENV_VALIDATION: process.env.NEXT_PUBLIC_SKIP_ENV_VALIDATION,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_DEBUG: process.env.NEXT_PUBLIC_SENTRY_DEBUG,
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_ABLY_API_KEY: process.env.NEXT_PUBLIC_ABLY_API_KEY,
    NEXT_PUBLIC_DEMO_SOCIAL_PROOF: process.env.NEXT_PUBLIC_DEMO_SOCIAL_PROOF,
    NEXT_PUBLIC_TERMS_AND_CONDITIONS_ENABLED: process.env.NEXT_PUBLIC_TERMS_AND_CONDITIONS_ENABLED,
    NEXT_PUBLIC_DIGITAL_SALES_ENABLED: process.env.NEXT_PUBLIC_DIGITAL_SALES_ENABLED,
    NEXT_PUBLIC_FF_LABEL_CHANGE: process.env.NEXT_PUBLIC_FF_LABEL_CHANGE,
    NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES: process.env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION || !!process.env.NEXT_PUBLIC_SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
