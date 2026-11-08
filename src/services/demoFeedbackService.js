import { cloneDemoFeedback } from "../data/demoFeedback";
import {
  FEEDBACK_STATUSES,
  hasValidationErrors,
  normalizeFeedback,
  validateAdminFields,
  validateFeedback,
} from "../utils/validation";

const clone = (value) => structuredClone(value);

const defaultIdFactory = () =>
  globalThis.crypto?.randomUUID?.() ??
  `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export class DemoServiceError extends Error {
  constructor(message, { code = "DEMO_SERVICE_ERROR", details = null } = {}) {
    super(message);
    this.name = "DemoServiceError";
    this.code = code;
    this.details = details;
  }
}

export class DemoFeedbackService {
  constructor({ latencyMs = 420, now = () => new Date(), idFactory = defaultIdFactory } = {}) {
    this.latencyMs = latencyMs;
    this.now = now;
    this.idFactory = idFactory;
    this.records = cloneDemoFeedback();
    this.pendingFailures = new Map();
  }

  setLatency(latencyMs) {
    if (!Number.isFinite(latencyMs) || latencyMs < 0) {
      throw new TypeError("Demo gecikmesi sıfır veya pozitif bir sayı olmalı.");
    }

    this.latencyMs = latencyMs;
  }

  failNext(operation, message = "Demo servis hatası. Lütfen yeniden deneyin.") {
    const supportedOperations = [
      "list",
      "get",
      "create",
      "updateAdminFields",
      "delete",
      "reset",
      "*",
    ];

    if (!supportedOperations.includes(operation)) {
      throw new TypeError(`Desteklenmeyen demo işlemi: ${operation}`);
    }

    this.pendingFailures.set(operation, message);
  }

  async list({ search = "", type = "all", category = "all", status = "all" } = {}) {
    await this.#beforeOperation("list");

    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    return clone(
      this.records
        .filter((record) => type === "all" || record.type === type)
        .filter((record) => category === "all" || record.category === category)
        .filter((record) => status === "all" || record.status === status)
        .filter((record) => {
          if (!normalizedSearch) return true;
          return [record.title, record.message, record.admin_note]
            .join(" ")
            .toLocaleLowerCase("tr-TR")
            .includes(normalizedSearch);
        })
        .toSorted((first, second) =>
          second.created_at.localeCompare(first.created_at),
        ),
    );
  }

  async get(id) {
    await this.#beforeOperation("get");
    const record = this.records.find((item) => item.id === id);

    if (!record) {
      throw new DemoServiceError("Geri bildirim bulunamadı.", { code: "NOT_FOUND" });
    }

    return clone(record);
  }

  async create(values) {
    await this.#beforeOperation("create");
    const normalized = normalizeFeedback(values);
    const errors = validateFeedback(normalized);

    if (hasValidationErrors(errors)) {
      throw new DemoServiceError("Geri bildirim alanlarını kontrol edin.", {
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    const timestamp = this.now().toISOString();
    const id = `demo-${this.idFactory()}`;
    const record = {
      id,
      ...normalized,
      status: "new",
      admin_note: "",
      created_at: timestamp,
      updated_at: timestamp,
      history: [
        {
          id: `${id}-history-${this.idFactory()}`,
          feedback_id: id,
          previous_status: null,
          new_status: "new",
          changed_by: "demo-system",
          created_at: timestamp,
        },
      ],
    };

    this.records.unshift(record);
    return clone(record);
  }

  async updateAdminFields(id, fields = {}) {
    await this.#beforeOperation("updateAdminFields");

    const forbiddenFields = Object.keys(fields).filter(
      (key) => !["status", "admin_note"].includes(key),
    );
    if (forbiddenFields.length > 0) {
      throw new DemoServiceError("Müşterinin özgün alanları değiştirilemez.", {
        code: "FORBIDDEN_FIELDS",
        details: { fields: forbiddenFields },
      });
    }

    const index = this.records.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new DemoServiceError("Geri bildirim bulunamadı.", { code: "NOT_FOUND" });
    }

    const errors = validateAdminFields(fields);
    if (hasValidationErrors(errors)) {
      throw new DemoServiceError("Yönetici alanlarını kontrol edin.", {
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    const current = this.records[index];
    const nextStatus = fields.status ?? current.status;
    const nextNote =
      fields.admin_note === undefined ? current.admin_note : fields.admin_note.trim();
    const statusChanged = nextStatus !== current.status;
    const noteChanged = nextNote !== current.admin_note;

    if (!statusChanged && !noteChanged) {
      return clone(current);
    }

    const timestamp = this.now().toISOString();
    const history = [...current.history];
    if (statusChanged) {
      history.push({
        id: `${id}-history-${this.idFactory()}`,
        feedback_id: id,
        previous_status: current.status,
        new_status: nextStatus,
        changed_by: "demo-admin",
        created_at: timestamp,
      });
    }

    const updated = {
      ...current,
      status: nextStatus,
      admin_note: nextNote,
      updated_at: timestamp,
      history,
    };

    this.records[index] = updated;
    return clone(updated);
  }

  async delete(id) {
    await this.#beforeOperation("delete");
    const index = this.records.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new DemoServiceError("Geri bildirim bulunamadı.", { code: "NOT_FOUND" });
    }

    const [removed] = this.records.splice(index, 1);
    return clone(removed);
  }

  async reset() {
    await this.#beforeOperation("reset");
    this.records = cloneDemoFeedback();
    this.pendingFailures.clear();
    return clone(this.records);
  }

  async #beforeOperation(operation) {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    const failureKey = this.pendingFailures.has(operation) ? operation : "*";
    if (this.pendingFailures.has(failureKey)) {
      const message = this.pendingFailures.get(failureKey);
      this.pendingFailures.delete(failureKey);
      throw new DemoServiceError(message, { code: "SIMULATED_FAILURE" });
    }
  }
}

export const demoFeedbackService = new DemoFeedbackService();

export const feedbackStatuses = FEEDBACK_STATUSES;
