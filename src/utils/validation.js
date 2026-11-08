export const FEEDBACK_TYPES = ["suggestion", "issue", "thanks"];
export const FEEDBACK_CATEGORIES = ["menu", "service", "atmosphere", "other"];
export const FEEDBACK_STATUSES = ["new", "reviewing", "planned", "resolved"];

export const TYPE_LABELS = {
  suggestion: "Öneri",
  issue: "Sorun",
  thanks: "Teşekkür",
};

export const CATEGORY_LABELS = {
  menu: "Menü",
  service: "Hizmet",
  atmosphere: "Atmosfer",
  other: "Diğer",
};

export const STATUS_LABELS = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  planned: "Planlandı",
  resolved: "Sonuçlandı",
};

export const TYPE_OPTIONS = FEEDBACK_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

export const CATEGORY_OPTIONS = FEEDBACK_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

export const STATUS_OPTIONS = FEEDBACK_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const textLength = (value) => (typeof value === "string" ? value.trim().length : 0);

export function validateFeedback(values = {}) {
  const errors = {};

  if (!FEEDBACK_TYPES.includes(values.type)) {
    errors.type = "Bir geri bildirim türü seçin.";
  }

  if (!FEEDBACK_CATEGORIES.includes(values.category)) {
    errors.category = "Bir kategori seçin.";
  }

  const titleLength = textLength(values.title);
  if (titleLength < 5) {
    errors.title = "Başlık en az 5 karakter olmalı.";
  } else if (titleLength > 100) {
    errors.title = "Başlık en fazla 100 karakter olabilir.";
  }

  const messageLength = textLength(values.message);
  if (messageLength < 10) {
    errors.message = "Açıklama en az 10 karakter olmalı.";
  } else if (messageLength > 2000) {
    errors.message = "Açıklama en fazla 2000 karakter olabilir.";
  }

  return errors;
}

export const validateFeedbackForm = validateFeedback;

export function validateAdminFields(values = {}) {
  const errors = {};

  if (values.status !== undefined && !FEEDBACK_STATUSES.includes(values.status)) {
    errors.status = "Geçerli bir durum seçin.";
  }

  if (values.admin_note !== undefined && typeof values.admin_note !== "string") {
    errors.admin_note = "İç not metin olmalı.";
  } else if ((values.admin_note ?? "").trim().length > 2000) {
    errors.admin_note = "İç not en fazla 2000 karakter olabilir.";
  }

  return errors;
}

export const hasValidationErrors = (errors) => Object.keys(errors).length > 0;

export function normalizeFeedback(values = {}) {
  return {
    type: values.type,
    category: values.category,
    title: typeof values.title === "string" ? values.title.trim() : "",
    message: typeof values.message === "string" ? values.message.trim() : "",
  };
}
