import { createClient } from "@supabase/supabase-js";
import { auth } from "../firebase/firebaseConfig";

const supabaseUrl =
  "https://bbypuyqsxchksfkoqmhu.supabase.co";

const supabaseKey =
  "sb_publishable_tG9ACn7SJw04K2LzEME1gQ_Z--owxwk";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    accessToken: async () => {
      const user = auth.currentUser;

      if (!user) {
        return null;
      }

      return await user.getIdToken();
    },
  }
);