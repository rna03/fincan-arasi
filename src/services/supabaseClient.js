import { createClient } from "@supabase/supabase-js";
import { appConfig } from "../config/appConfig";

let client;

export function getSupabaseClient() {
  if (appConfig.isDemo) {
    throw new Error("Supabase istemcisi demo modunda kullanılamaz.");
  }

  if (appConfig.configurationError) {
    throw new Error(appConfig.configurationError);
  }

  if (!client) {
    client = createClient(
      appConfig.supabaseUrl,
      appConfig.supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }

  return client;
}
