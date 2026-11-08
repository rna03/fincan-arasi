export const MAX_REQUEST_BYTES = 10_240;

const FEEDBACK_TYPES = new Set(["suggestion", "issue", "thanks"]);
const FEEDBACK_CATEGORIES = new Set(["menu", "service", "atmosphere", "other"]);
const PAYLOAD_KEYS = new Set(["feedback", "idempotencyKey", "turnstileToken"]);
const FEEDBACK_KEYS = new Set(["type", "category", "title", "message"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IP_PATTERN = /^[0-9a-f:.]{3,64}$/i;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

export function validateSubmissionPayload(payload) {
  const fieldErrors = {};
  if (!isObject(payload) || !hasOnlyKeys(payload, PAYLOAD_KEYS)) {
    return { valid: false, fieldErrors: { body: "Beklenmeyen istek gövdesi." } };
  }

  const feedback = payload.feedback;
  if (!isObject(feedback) || !hasOnlyKeys(feedback, FEEDBACK_KEYS)) {
    fieldErrors.feedback = "Yalnızca beklenen geri bildirim alanları kabul edilir.";
  }

  if (!UUID_PATTERN.test(payload.idempotencyKey || "")) {
    fieldErrors.idempotencyKey = "Geçerli bir gönderim anahtarı gerekiyor.";
  }

  if (
    typeof payload.turnstileToken !== "string"
    || payload.turnstileToken.length < 1
    || payload.turnstileToken.length > 2048
  ) {
    fieldErrors.turnstileToken = "Geçerli bir güvenlik doğrulama belirteci gerekiyor.";
  }

  if (isObject(feedback)) {
    if (!FEEDBACK_TYPES.has(feedback.type)) fieldErrors.type = "Geçersiz geri bildirim türü.";
    if (!FEEDBACK_CATEGORIES.has(feedback.category)) fieldErrors.category = "Geçersiz kategori.";

    const title = typeof feedback.title === "string" ? feedback.title.trim() : "";
    const message = typeof feedback.message === "string" ? feedback.message.trim() : "";
    if (title.length < 5 || title.length > 100) fieldErrors.title = "Başlık 5–100 karakter olmalıdır.";
    if (message.length < 10 || message.length > 2000) fieldErrors.message = "Açıklama 10–2000 karakter olmalıdır.";
  }

  if (Object.keys(fieldErrors).length > 0) return { valid: false, fieldErrors };

  return {
    valid: true,
    value: {
      feedback: {
        type: feedback.type,
        category: feedback.category,
        title: feedback.title.trim(),
        message: feedback.message.trim(),
      },
      idempotencyKey: payload.idempotencyKey.toLowerCase(),
      turnstileToken: payload.turnstileToken,
    },
  };
}

export function getTrustedClientIp(headers) {
  const forwarded = headers.get("x-forwarded-for");
  const firstAddress = forwarded?.split(",")[0]?.trim() || "";
  return IP_PATTERN.test(firstAddress) ? firstAddress : "";
}

export function isRequestTooLarge(rawBody, declaredLength = 0) {
  return declaredLength > MAX_REQUEST_BYTES
    || new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES;
}

export async function readRequestBody(request, maximumBytes = MAX_REQUEST_BYTES) {
  if (!request.body) return { tooLarge: false, text: "" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maximumBytes) {
        await reader.cancel("PAYLOAD_TOO_LARGE");
        return { tooLarge: true, text: "" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { tooLarge: false, text };
  } finally {
    reader.releaseLock();
  }
}

export function isTurnstileResultValid(result, responseOk, allowedHostnames) {
  return responseOk
    && result?.success === true
    && result?.action === "feedback_submit"
    && allowedHostnames.includes(result?.hostname);
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createRequestHash(feedback) {
  return sha256Hex(JSON.stringify({
    type: feedback.type,
    category: feedback.category,
    title: feedback.title,
    message: feedback.message,
  }));
}

export async function createRateKeyHash(ipAddress, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ipAddress));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
