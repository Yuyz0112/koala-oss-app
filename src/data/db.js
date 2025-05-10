import { createClient } from "@supabase/supabase-js";

export const client = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

