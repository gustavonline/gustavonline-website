const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

export type Unit = "count" | "hours" | "percent" | "decimal";

// Dates travel as YYYY-MM-DD so calendar math never depends on the Worker's clock zone.
export function isoWeek(date: string): { year: number; week: number } {
  const value = new Date(dayNumber(date) * DAY_MS);
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(value.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((value.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: value.getUTCFullYear(), week };
}

export function weekMonday(year: number, week: number): string {
  // 4 January is always in ISO week 1.
  return addDays(mondayOf(`${year}-01-04`), (week - 1) * 7);
}

export function mondayOf(date: string): string {
  const weekday = new Date(dayNumber(date) * DAY_MS).getUTCDay() || 7;
  return addDays(date, 1 - weekday);
}

export function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

export function dayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function todayIn(timezone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function safeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "Europe/Copenhagen";
  }
}

export function formatDay(date: string): string {
  const value = new Date(dayNumber(date) * DAY_MS);
  return `${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]}`;
}

export function formatDate(date: string): string {
  return `${formatDay(date)} ${dayYear(date)}`;
}

export function formatLongDate(date: string): string {
  const value = new Date(dayNumber(date) * DAY_MS);
  return `${value.getUTCDate()} ${LONG_MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

export function formatWeekday(date: string): string {
  return WEEKDAYS[new Date(dayNumber(date) * DAY_MS).getUTCDay()];
}

// Leaves the year out while it is the year the reader is in.
export function formatDayNear(date: string, today: string): string {
  return dayYear(date) === dayYear(today) ? formatDay(date) : formatDate(date);
}

export function formatInteger(value: number): string {
  return signed(value) + Math.abs(Math.trunc(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 999 · 1.2K · 17.1K · 3M. Rounds before picking the unit, so 999,950 is 1M and never 1000K.
export function formatCompact(value: number): string {
  let amount = Math.abs(value);
  if (oneDecimal(amount) < 1000) return signed(value) + trimDecimal(amount);
  for (const suffix of ["K", "M", "B"]) {
    amount /= 1000;
    if (oneDecimal(amount) < 1000 || suffix === "B") return signed(value) + trimDecimal(amount) + suffix;
  }
  return formatInteger(value);
}

export function formatValue(value: number, unit: Unit): string {
  if (unit === "hours") return `${formatCompact(value)} h`;
  if (unit === "percent") return `${trimDecimal(value)}%`;
  return formatCompact(value);
}

// The exact number behind a compact one, for the tooltip.
export function formatExact(value: number, unit: Unit): string {
  const [whole, fraction] = Math.abs(value).toFixed(2).replace(/\.?0+$/, "").split(".");
  const number = signed(value) + formatInteger(Number(whole)) + (fraction ? `.${fraction}` : "");
  if (unit === "hours") return `${number} hours`;
  if (unit === "percent") return `${number}%`;
  return number;
}

function trimDecimal(value: number): string {
  return oneDecimal(value).toFixed(1).replace(/\.0$/, "");
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function signed(value: number): string {
  return value < 0 ? "−" : "";
}

function dayYear(date: string): number {
  return new Date(dayNumber(date) * DAY_MS).getUTCFullYear();
}
