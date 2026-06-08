import { createClient } from '@supabase/supabase-js';

// Single shared Supabase client untuk seluruh app.
// Jangan buat createClient() di tempat lain — import dari sini.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);