export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function formatDate(value) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function monthLabel(value) {
  if (!value) return "-";

  return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}
