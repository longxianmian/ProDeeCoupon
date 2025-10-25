import type { Config } from 'drizzle-kit'

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: false, // 禁用确认提示以支持自动化
} satisfies Config