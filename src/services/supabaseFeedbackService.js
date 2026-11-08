import {
  hasValidationErrors,
  normalizeFeedback,
  validateAdminFields,
  validateFeedback,
} from "../utils/validation";
import { getSupabaseClient } from "./supabaseClient";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export class LiveServiceError extends Error {
  constructor(message, { code = "LIVE_SERVICE_ERROR", details = null, status = null } = {}) {
    super(message);
    this.name = "LiveServiceError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function normalizeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    admin_note: record.admin_note ?? "",
    history: Array.isArray(record.history) ? record.history : [],
  };
}

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

function mapDatabaseError(error, fallbackMessage) {
  const message = error?.message || "";
  if (message.includes("ADMIN_REQUIRED")) {
    return new LiveServiceError("Bu işlem için yetkili yönetici oturumu gerekiyor.", {
      code: "ADMIN_REQUIRED",
      status: 403,
    });
  }
  if (message.includes("FEEDBACK_CONFLICT")) {
    return new LiveServiceError(
      "Bu kayıt başka bir oturumda değiştirildi. Güncel veriyi yükleyip yeniden deneyin.",
      { code: "CONFLICT", status: 409 },
    );
  }
  if (message.includes("FEEDBACK_NOT_FOUND")) {
    return new LiveServiceError("Geri bildirim bulunamadı.", {
      code: "NOT_FOUND",
      status: 404,
    });
  }
  return new LiveServiceError(fallbackMessage, { code: "DATABASE_ERROR" });
}

async function mapFunctionError(error) {
  let payload = null;
  try {
    payload = await error?.context?.clone?.().json();
  } catch {
    payload = null;
  }

  const status = error?.context?.status ?? null;
  const code = payload?.code || "SUBMISSION_FAILED";
  const knownMessages = {
    VALIDATION_FAILED: "Gönderim alanlarını kontrol edin.",
    VERIFICATION_FAILED: "Güvenlik doğrulaması tamamlanamadı. Lütfen yeniden deneyin.",
    RATE_LIMITED: "Kısa sürede çok fazla gönderim yapıldı. Biraz bekleyip yeniden deneyin.",
    IDEMPOTENCY_CONFLICT: "Gönderim anahtarı farklı bir içerikle yeniden kullanılamaz.",
    SUBMISSION_UNAVAILABLE: "Gönderim şu anda kullanılamıyor. Lütfen biraz sonra yeniden deneyin.",
  };

  return new LiveServiceError(
    knownMessages[code] || "Gönderim tamamlanamadı. Lütfen yeniden deneyin.",
    { code, status, details: payload?.fieldErrors ?? null },
  );
}

export class SupabaseFeedbackService {
  constructor(client = null) {
    this.client = client;
  }

  getClient() {
    return this.client || getSupabaseClient();
  }

  async list({
    search = "",
    type = "all",
    category = "all",
    status = "all",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = {}) {
    const safePage = clampInteger(page, 1, Number.MAX_SAFE_INTEGER, 1);
    const safePageSize = clampInteger(pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const { data, error } = await this.getClient().rpc("admin_list_feedback", {
      p_search: search.trim(),
      p_type: type === "all" ? null : type,
      p_category: category === "all" ? null : category,
      p_status: status === "all" ? null : status,
      p_page: safePage,
      p_page_size: safePageSize,
    });

    if (error) throw mapDatabaseError(error, "Geri bildirimler alınamadı.");
    return {
      items: Array.isArray(data?.items) ? data.items.map(normalizeRecord) : [],
      total: Number(data?.total ?? 0),
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async get(id) {
    const { data, error } = await this.getClient().rpc("admin_get_feedback", {
      p_feedback_id: id,
    });
    if (error) throw mapDatabaseError(error, "Geri bildirim alınamadı.");
    return normalizeRecord(data);
  }

  async summary() {
    const { data, error } = await this.getClient().rpc("admin_feedback_summary");
    if (error) throw mapDatabaseError(error, "Geri bildirim özeti alınamadı.");
    return data ?? { total: 0, statuses: {}, categories: {} };
  }

  async create(values, { turnstileToken, idempotencyKey } = {}) {
    const normalized = normalizeFeedback(values);
    const errors = validateFeedback(normalized);
    if (hasValidationErrors(errors)) {
      throw new LiveServiceError("Geri bildirim alanlarını kontrol edin.", {
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    if (!turnstileToken || !idempotencyKey) {
      throw new LiveServiceError("Güvenlik doğrulaması tamamlanmalıdır.", {
        code: "VERIFICATION_REQUIRED",
      });
    }

    const { data, error } = await this.getClient().functions.invoke("submit-feedback", {
      body: {
        feedback: normalized,
        idempotencyKey,
        turnstileToken,
      },
    });

    if (error) throw await mapFunctionError(error);
    if (!data?.accepted) {
      throw new LiveServiceError("Gönderim sunucu tarafından doğrulanamadı.", {
        code: "INVALID_RESPONSE",
      });
    }

    return { accepted: true, duplicate: Boolean(data.duplicate) };
  }

  async updateAdminFields(id, fields = {}, expectedUpdatedAt) {
    const errors = validateAdminFields(fields);
    if (hasValidationErrors(errors)) {
      throw new LiveServiceError("Yönetici alanlarını kontrol edin.", {
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    const { data, error } = await this.getClient().rpc("admin_update_feedback", {
      p_feedback_id: id,
      p_status: fields.status,
      p_admin_note: fields.admin_note ?? "",
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) throw mapDatabaseError(error, "Geri bildirim güncellenemedi.");
    return normalizeRecord(data);
  }

  async delete(id, expectedUpdatedAt) {
    const { error } = await this.getClient().rpc("admin_delete_feedback", {
      p_feedback_id: id,
      p_expected_updated_at: expectedUpdatedAt,
    });
    if (error) throw mapDatabaseError(error, "Geri bildirim silinemedi.");
  }

  async getSession() {
    const { data, error } = await this.getClient().auth.getSession();
    if (error) throw new LiveServiceError("Yönetici oturumu okunamadı.", { code: "AUTH_ERROR" });
    return data.session;
  }

  onAuthStateChange(callback) {
    const { data } = this.getClient().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => data.subscription.unsubscribe();
  }

  async isCurrentUserAdmin() {
    const { data, error } = await this.getClient().rpc("is_current_user_admin");
    if (error) return false;
    return data === true;
  }

  async signIn(email, password, captchaToken) {
    if (!captchaToken) {
      throw new LiveServiceError("Güvenlik doğrulaması tamamlanmalıdır.", {
        code: "VERIFICATION_REQUIRED",
      });
    }

    const { data, error } = await this.getClient().auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error || !data.session) {
      throw new LiveServiceError(
        "Giriş bilgileri doğrulanamadı veya bu hesap yetkili değil.",
        { code: "INVALID_LOGIN" },
      );
    }

    const allowed = await this.isCurrentUserAdmin();
    if (!allowed) {
      await this.getClient().auth.signOut({ scope: "local" });
      throw new LiveServiceError(
        "Giriş bilgileri doğrulanamadı veya bu hesap yetkili değil.",
        { code: "INVALID_LOGIN" },
      );
    }
    return data.session;
  }

  async requestPasswordReset(email, redirectTo, captchaToken) {
    if (!captchaToken) {
      throw new LiveServiceError("Güvenlik doğrulaması tamamlanmalıdır.", {
        code: "VERIFICATION_REQUIRED",
      });
    }

    await this.getClient().auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken,
    });
    // The application boundary deliberately exposes one neutral outcome for every
    // Auth response. Delivery and account-existence details must not become a UI side channel.
    return { accepted: true };
  }

  async updatePassword(password) {
    const { error } = await this.getClient().auth.updateUser({ password });
    if (error) {
      throw new LiveServiceError(
        "Yeni şifre kaydedilemedi. Bağlantı geçersiz veya süresi dolmuş olabilir; yeni bir bağlantı isteyin.",
        { code: "PASSWORD_UPDATE_FAILED" },
      );
    }
  }

  async signOut() {
    const { error } = await this.getClient().auth.signOut({ scope: "global" });
    if (error) {
      throw new LiveServiceError("Oturum kapatılamadı. Lütfen yeniden deneyin.", {
        code: "SIGN_OUT_FAILED",
      });
    }
  }
}

export const supabaseFeedbackService = new SupabaseFeedbackService();
