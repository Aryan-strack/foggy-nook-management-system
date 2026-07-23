// This is a lightweight placeholder so the Supabase client stays type-safe
// without requiring the CLI during initial setup.
//
// For full, accurate types generated from your live schema, run:
//   npx supabase login
//   npx supabase link --project-ref YOUR_PROJECT_REF
//   npx supabase gen types typescript --linked > src/types/database.ts
//
// Until then, the app uses the hand-written domain types in src/types/index.ts
// and this file just satisfies the generic constraint on the Supabase client.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
