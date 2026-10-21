/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The public Supabase project URL. Safe to ship: RLS is what protects the data. */
  readonly VITE_SUPABASE_URL?: string
  /** The public anon key. Safe to ship for the same reason. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface Import {
  readonly env: ImportMetaEnv
}
