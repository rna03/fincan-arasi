export function getHistoryActorLabel(entry = {}) {
  if (entry.changed_by === "demo-admin") return "Demo yönetici";
  if (entry.actor_kind === "admin") return "Yönetici";
  return "Sistem";
}
