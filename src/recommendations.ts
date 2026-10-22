import { type Data, type Goal, type Match } from "./model";
import { mean, metric } from "./stats";
export function recommend(
  d: Data,
): Omit<Goal, "id" | "created" | "ended" | "excludedIds" | "status" | "count"> {
  const recent = [...d.matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);
  const deaths = mean(recent.map((m) => metric(m, "survival"))),
    econ = mean(recent.map((m) => metric(m, "economy")));
  if (recent.length < 5)
    return {
      title: "Собрать базовую линию",
      reason:
        "Меньше 5 матчей: сначала проверьте записи и разберите по одному решению в каждом матче.",
      metric: "review",
      target: 1,
      baseline: null,
    };
  if (deaths !== null && deaths > d.settings.survival.target)
    return {
      title: "Сократить частоту смертей",
      reason: `В последних ${recent.length} матчах ${deaths.toFixed(1)} смерти / 10 мин. Перед боем проверяйте пути отхода.`,
      metric: "survival",
      target: Math.max(d.settings.survival.target, deaths * 0.9),
      baseline: deaths,
    };
  if (econ !== null && econ < d.settings.economy.target)
    return {
      title: "Стабилизировать экономику",
      reason: `Средние души/мин ниже вашей цели. Планируйте следующий безопасный источник фарма.`,
      metric: "economy",
      target: Math.min(d.settings.economy.target, econ * 1.1),
      baseline: econ,
    };
  const counts = new Map<string, number>();
  recent.forEach((m) =>
    m.errors.forEach((e) => counts.set(e, (counts.get(e) || 0) + 1)),
  );
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return {
    title: top
      ? `Разобрать: ${top[0].toLowerCase()}`
      : "Закрепить игровую дисциплину",
    reason: top
      ? `Отмечено в ${top[1]} из ${recent.length} матчей. Перед игрой выберите действие, предотвращающее эту ошибку; после — оцените выполнение.`
      : "После каждого матча запишите одно удачное решение и одну корректировку.",
    metric: "review",
    target: 1,
    baseline: null,
  };
}
export function goalMatches(g: Goal, ms: Match[]) {
  return ms
    .filter(
      (m) =>
        !g.excludedIds.includes(m.id) &&
        new Date(m.date) >= new Date(g.created) &&
        (!g.ended || new Date(m.date) <= new Date(g.ended)),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, g.count);
}
export function goalResult(g: Goal, ms: Match[]) {
  const matches = goalMatches(g, ms);
  const values = matches.map((m) =>
    g.metric === "review"
      ? m.goalDone === null
        ? null
        : Number(m.goalDone)
      : metric(m, g.metric),
  );
  const assessed = values.filter((v): v is number => v !== null);
  const passed = assessed.filter((v) =>
    g.metric === "survival" ? v <= g.target : v >= g.target,
  ).length;
  return {
    matches,
    current: mean(values),
    assessed: assessed.length,
    passed,
    progress: (matches.length / g.count) * 100,
    rate: assessed.length ? (passed / assessed.length) * 100 : null,
  };
}
