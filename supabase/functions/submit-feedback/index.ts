// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  MAX_REQUEST_BYTES,
  createRateKeyHash,
  createRequestHash,
  getTrustedClientIp,
  isTurnstileResultValid,
  readRequestBody,
  validateSubmissionPayload,
} from "./validation.js";

function parseCsv(value) {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function readSecretKey() {
  const currentKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (currentKeys) {
    try {
      return JSON.parse(currentKeys).default || "";
    } catch {
      return "";
    }
  }
  return "";
}

function response(origin, status, payload, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin",
    ...extraHeaders,
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(payload), { status, headers });
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = parseCsv(Deno.env.get("ALLOWED_ORIGINS"));
  const allowedHostnames = parseCsv(Deno.env.get("TURNSTILE_ALLOWED_HOSTNAMES"));
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  const rateLimitSecret = Deno.env.get("RATE_LIMIT_HASH_SECRET") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseSecretKey = readSecretKey();
  const originAllowed = Boolean(origin) && allowedOrigins.includes(origin);

  if (request.method === "OPTIONS") {
    if (!originAllowed) return response("", 403, { code: "ORIGIN_NOT_ALLOWED" });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return response(originAllowed ? origin : "", 405, { code: "METHOD_NOT_ALLOWED" }, { Allow: "POST, OPTIONS" });
  }
  if (!originAllowed) return response("", 403, { code: "ORIGIN_NOT_ALLOWED" });
  if (!allowedOrigins.length || !allowedHostnames.length || !turnstileSecret || !rateLimitSecret || !supabaseUrl || !supabaseSecretKey) {
    return response(origin, 503, { code: "SUBMISSION_UNAVAILABLE", requestId });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response(origin, 415, { code: "UNSUPPORTED_MEDIA_TYPE", requestId });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return response(origin, 413, { code: "PAYLOAD_TOO_LARGE", requestId });
  }

  let bodyResult;
  let payload;
  try {
    bodyResult = await readRequestBody(request);
  } catch {
    return response(origin, 400, { code: "INVALID_JSON", requestId });
  }
  if (bodyResult.tooLarge) {
    return response(origin, 413, { code: "PAYLOAD_TOO_LARGE", requestId });
  }
  try {
    payload = JSON.parse(bodyResult.text);
  } catch {
    return response(origin, 400, { code: "INVALID_JSON", requestId });
  }

  const validation = validateSubmissionPayload(payload);
  if (!validation.valid) {
    return response(origin, 422, {
      code: "VALIDATION_FAILED",
      fieldErrors: validation.fieldErrors,
      requestId,
    });
  }

  const clientIp = getTrustedClientIp(request.headers);
  if (!clientIp) return response(origin, 400, { code: "CLIENT_ADDRESS_UNAVAILABLE", requestId });

  try {
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const requestHash = await createRequestHash(validation.value.feedback);

    const { data: idempotency, error: idempotencyError } = await adminClient.rpc(
      "submission_idempotency_status",
      {
        p_idempotency_key: validation.value.idempotencyKey,
        p_request_hash: requestHash,
      },
    );
    if (idempotencyError) throw new Error("IDEMPOTENCY_LOOKUP_FAILED");
    if (idempotency?.state === "conflict") {
      return response(origin, 409, { code: "IDEMPOTENCY_CONFLICT", requestId });
    }
    if (idempotency?.state === "duplicate") {
      return response(origin, 202, { accepted: true, duplicate: true, requestId });
    }

    const rateKeyHash = await createRateKeyHash(clientIp, rateLimitSecret);
    const { data: rateLimit, error: rateLimitError } = await adminClient.rpc(
      "consume_feedback_rate_limit",
      { p_rate_key_hash: rateKeyHash, p_limit: 5, p_window_seconds: 900 },
    );
    if (rateLimitError) throw new Error("RATE_LIMIT_CHECK_FAILED");
    if (!rateLimit?.allowed) {
      return response(
        origin,
        429,
        { code: "RATE_LIMITED", requestId },
        { "Retry-After": String(rateLimit?.retry_after || 900) },
      );
    }

    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: validation.value.turnstileToken,
          remoteip: clientIp,
          idempotency_key: crypto.randomUUID(),
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    const turnstileResult = await turnstileResponse.json();
    const turnstileValid = isTurnstileResultValid(
      turnstileResult,
      turnstileResponse.ok,
      allowedHostnames,
    );
    if (!turnstileValid) {
      const providerErrors = Array.isArray(turnstileResult?.["error-codes"])
        ? turnstileResult["error-codes"]
        : [];
      const verificationCode = providerErrors.some((code) => code.includes("input-secret"))
        ? "TURNSTILE_SECRET_REJECTED"
        : providerErrors.includes("timeout-or-duplicate")
          ? "TURNSTILE_TOKEN_EXPIRED"
          : providerErrors.some((code) => code.includes("input-response"))
            ? "TURNSTILE_TOKEN_REJECTED"
            : !turnstileResponse.ok || turnstileResult?.success !== true
              ? "TURNSTILE_PROVIDER_REJECTED"
        : turnstileResult?.action !== "feedback_submit"
          ? "TURNSTILE_ACTION_MISMATCH"
          : "TURNSTILE_HOSTNAME_MISMATCH";
      console.warn("turnstile verification failed", { requestId, code: verificationCode });
      return response(origin, 400, { code: "VERIFICATION_FAILED", requestId });
    }

    const { data: submission, error: submissionError } = await adminClient.rpc(
      "submit_feedback_from_edge",
      {
        p_idempotency_key: validation.value.idempotencyKey,
        p_request_hash: requestHash,
        p_type: validation.value.feedback.type,
        p_category: validation.value.feedback.category,
        p_title: validation.value.feedback.title,
        p_message: validation.value.feedback.message,
      },
    );
    if (submissionError?.message?.includes("IDEMPOTENCY_CONFLICT")) {
      return response(origin, 409, { code: "IDEMPOTENCY_CONFLICT", requestId });
    }
    if (submissionError || !submission?.accepted) throw new Error("SUBMISSION_FAILED");

    return response(origin, 202, {
      accepted: true,
      duplicate: Boolean(submission.duplicate),
      requestId,
    });
  } catch {
    console.error("submit-feedback failed", { requestId, code: "UNEXPECTED_FAILURE" });
    return response(origin, 503, { code: "SUBMISSION_UNAVAILABLE", requestId });
  }
});
