import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://bbypuyqsxchksfkoqmhu.supabase.co";

const supabaseKey =
  "sb_publishable_tG9ACn7SJw04K2LzEME1gQ_Z--owxwk";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);