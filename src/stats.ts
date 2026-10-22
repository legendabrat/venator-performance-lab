import {
  type Match,
  type Settings,
  type MetricKey,
  keys,
  localDate,
} from "./model";
export const mean = (v: (number | null | undefined)[]) => {
  const n = v.filter((x): x is number => x != null && Number.isFinite(x));
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};
export const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function metric(m: Match, k: MetricKey): number | null {
  return k === "economy"
    ? m.souls / m.minutes
    : k === "damage"
      ? m.damage / m.minutes
      : k === "survival"
        ? (m.deaths / m.minutes) * 10
        : m.objects === null
          ? null
          : m.objects / m.minutes;
}
export function normalized(value: number, target: number, lower = false) {
  return clamp(
    lower
      ? value === 0
        ? 100
        : (100 * target) / value
      : (100 * value) / target,
  );
}
export function score(m: Match, s: Settings) {
  const parts = keys.map((k) => ({
    key: k,
    value: metric(m, k),
    weight: s[k].weight,
    score:
      metric(m, k) === null
        ? null
        : normalized(metric(m, k)!, s[k].target, k === "survival"),
  }));
  const available = parts.filter((p) => p.score !== null && p.weight > 0);
  const w = available.reduce((a, p) => a + p.weight, 0);
  const total = parts.reduce((a, p) => a + p.weight, 0);
  return {
    value: w
      ? available.reduce((a, p) => a + p.score! * p.weight, 0) / w
      : null,
    coverage: total ? w / total : 0,
    parts,
  };
}
export const kda = (m: Match) => (m.kills + m.assists) / Math.max(m.deaths, 1);
export function summary(ms: Match[], s: Settings) {
  const scores = ms
    .map((m) => score(m, s).value)
    .filter((x): x is number => x !== null);
  const avg = mean(scores);
  const sd =
    avg === null
      ? null
      : Math.sqrt(
          scores.reduce((a, v) => a + (v - avg) ** 2, 0) / scores.length,
        );
  return {
    n: ms.length,
    wins: ms.filter((m) => m.win).length,
    wr: ms.length ? (100 * ms.filter((m) => m.win).length) / ms.length : null,
    kills: mean(ms.map((m) => m.kills)),
    deaths: mean(ms.map((m) => m.deaths)),
    assists: mean(ms.map((m) => m.assists)),
    kda: mean(ms.map(kda)),
    economy: mean(ms.map((m) => metric(m, "economy"))),
    damage: mean(ms.map((m) => metric(m, "damage"))),
    survival: mean(ms.map((m) => metric(m, "survival"))),
    objects: mean(ms.map((m) => metric(m, "objects"))),
    minutes: mean(ms.map((m) => m.minutes)),
    score: avg,
    stability: scores.length >= 5 && sd !== null ? clamp(100 - 2 * sd) : null,
  };
}
export function range(ms: Match[], start: string, end: string) {
  return ms.filter((m) => {
    const d = localDate(m.date);
    return d >= start && d <= end;
  });
}
export function previousRange(start: string, end: string) {
  const a = new Date(start + "T12:00:00"),
    b = new Date(end + "T12:00:00");
  const days =
    Math.round(
      (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
        86400000,
    ) + 1;
  const prevEnd = new Date(a);
  prevEnd.setDate(prevEnd.getDate() - 1);
  a.setDate(a.getDate() - days);
  return { start: localDate(a), end: localDate(prevEnd) };
}
export function delta(a: number | null, b: number | null, pp = false) {
  if (a === null || b === null) return "Нет сравнения";
  if (pp) return `${a - b >= 0 ? "+" : ""}${(a - b).toFixed(1)} п.п.`;
  if (b === 0) return a === 0 ? "0%" : "База равна 0";
  return `${a - b >= 0 ? "+" : ""}${(((a - b) / Math.abs(b)) * 100).toFixed(1)}%`;
}
export function dayQuality(ms: Match[], s: Settings) {
  const v = summary(ms, s).score;
  return v === null ? null : 50 + ((v - 50) * ms.length) / (ms.length + 4);
}
export function errorStats(ms: Match[], name: string) {
  const withError = ms.filter((m) => m.errors.includes(name as never));
  const without = ms.filter((m) => !m.errors.includes(name as never));
  return {
    count: withError.length,
    frequency: ms.length ? (100 * withError.length) / ms.length : null,
    withN: withError.length,
    withoutN: without.length,
    withWR: withError.length
      ? (100 * withError.filter((m) => m.win).length) / withError.length
      : null,
    withoutWR: without.length
      ? (100 * without.filter((m) => m.win).length) / without.length
      : null,
  };
}
