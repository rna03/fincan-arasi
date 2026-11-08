const configuredDataMode = import.meta.env.VITE_DATA_MODE;
const configuredDemoTools = import.meta.env.VITE_ENABLE_DEMO_TOOLS;
const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredSupabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const configuredTurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
const allowedModes = ["demo", "supabase"];
const allowedBooleanValues = [undefined, "", "true", "false"];

if (!allowedModes.includes(configuredDataMode)) {
  throw new Error(
    "VITE_DATA_MODE açıkça 'demo' veya 'supabase' olmalıdır. Uygulama sessizce demo moduna geçmez.",
  );
}

if (!allowedBooleanValues.includes(configuredDemoTools)) {
  throw new Error("VITE_ENABLE_DEMO_TOOLS yalnızca 'true' veya 'false' olabilir.");
}

const liveConfigurationErrors = [];
if (configuredDataMode === "supabase") {
  if (!configuredSupabaseUrl) liveConfigurationErrors.push("VITE_SUPABASE_URL");
  if (!configuredSupabaseKey) liveConfigurationErrors.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!configuredTurnstileSiteKey) liveConfigurationErrors.push("VITE_TURNSTILE_SITE_KEY");
}

export const appConfig = Object.freeze({
  dataMode: configuredDataMode,
  isDemo: configuredDataMode === "demo",
  showDemoTools:
    configuredDataMode === "demo" && configuredDemoTools === "true",
  supabaseUrl: configuredSupabaseUrl || "",
  supabasePublishableKey: configuredSupabaseKey || "",
  turnstileSiteKey: configuredTurnstileSiteKey || "",
  configurationError:
    liveConfigurationErrors.length > 0
      ? `Gerçek veri modu için eksik ortam değişkenleri: ${liveConfigurationErrors.join(", ")}. Kurulum için docs/SUPABASE_KURULUM.md dosyasını izleyin.`
      : "",
});
