import { createClient } from "@supabase/supabase-js";

export const client = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export const createNewsBuilder = () => {
  return client
    .from("news")
    .select("id, title, image")
    .filter("draft", "eq", false);
}

export const createCourseBuilder = () => {
  return client
    .from("course")
    .select("*")
    .filter("draft", "eq", false)
    .order("created_at", { ascending: false });
}