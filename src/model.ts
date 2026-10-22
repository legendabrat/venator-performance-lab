import { z } from "zod";
export const mistakes = [
  "Излишняя агрессия",
  "Плохое позиционирование",
  "Смерть без необходимости",
  "Неправильное применение способности",
  "Ошибка при выборе цели",
  "Потеря фарма",
  "Поздняя ротация",
  "Неудачный тайминг предмета",
  "Неправильное решение в командном бою",
  "Недостаточное давление на объекты",
  "Другое",
] as const;
const text = z.string().max(4000);
const num = z.number().finite().nonnegative().max(10000000);
const rating = z.number().int().min(1).max(5).nullable();
export const matchSchema = z
  .object({
    id: z.string().min(1),
    date: z.string().datetime({ offset: true }),
    win: z.boolean(),
    minutes: z.number().finite().positive().max(240),
    kills: num.int(),
    deaths: num.int(),
    assists: num.int(),
    souls: num.int(),
    damage: num.int(),
    objects: num.int().nullable(),
    lane: z.enum(["Победа", "Равная", "Поражение"]),
    buildId: z.string(),
    mainError: z.enum([...mistakes, "Нет явной ошибки"]),
    errors: z.array(z.enum(mistakes)).max(11),
    opponent: text,
    items: text,
    deathReasons: text,
    abilityName: text,
    ability: rating,
    position: rating,
    decisions: rating,
    focus: rating,
    team: rating,
    goalDone: z.boolean().nullable(),
    notes: text,
    patch: text,
  })
  .superRefine((m, c) => {
    if (m.mainError !== "Нет явной ошибки" && !m.errors.includes(m.mainError))
      c.addIssue({
        code: "custom",
        message: "Главная ошибка должна входить в список ошибок",
      });
  });
export type Match = z.infer<typeof matchSchema>;
export const keys = ["economy", "damage", "survival", "objects"] as const;
export type MetricKey = (typeof keys)[number];
export const labels: Record<MetricKey, string> = {
  economy: "Души / мин",
  damage: "Урон героям / мин",
  survival: "Смерти / 10 мин",
  objects: "Урон объектам / мин",
};
const metricSchema = z.object({
  target: z.number().finite().positive().max(1000000),
  weight: z.number().finite().min(0).max(100),
});
export const settingsSchema = z
  .object({
    economy: metricSchema,
    damage: metricSchema,
    survival: metricSchema,
    objects: metricSchema,
    abilityName: z.string().max(100),
  })
  .refine(
    (s) => keys.some((k) => s[k].weight > 0),
    "Хотя бы один вес должен быть больше нуля",
  );
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = {
  economy: { target: 900, weight: 30 },
  damage: { target: 800, weight: 30 },
  survival: { target: 1.5, weight: 30 },
  objects: { target: 150, weight: 10 },
  abilityName: "Ключевая способность",
};
export const goalSchema = z.object({
  id: z.string(),
  created: z.string().datetime({ offset: true }),
  ended: z.string().datetime({ offset: true }).nullable(),
  title: text,
  reason: text,
  metric: z.enum(["economy", "survival", "review"]),
  target: z.number().finite().nonnegative(),
  baseline: z.number().finite().nonnegative().nullable(),
  count: z.number().int().min(3).max(5),
  excludedIds: z.array(z.string()),
  status: z.enum(["active", "completed", "stopped"]),
});
export type Goal = z.infer<typeof goalSchema>;
export const dataSchema = z
  .object({
    version: z.literal(1),
    matches: z.array(matchSchema).max(50000),
    builds: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(100),
          notes: text,
        }),
      )
      .min(1)
      .max(1000),
    settings: settingsSchema,
    goals: z.array(goalSchema).max(10000),
  })
  .superRefine((d, c) => {
    for (const field of ["matches", "builds", "goals"] as const) {
      if (new Set(d[field].map((x) => x.id)).size !== d[field].length)
        c.addIssue({ code: "custom", message: `Повторяющиеся ID: ${field}` });
    }
    if (d.matches.some((m) => !d.builds.some((b) => b.id === m.buildId)))
      c.addIssue({
        code: "custom",
        message: "Матч ссылается на неизвестный билд",
      });
    if (d.goals.filter((g) => g.status === "active").length > 1)
      c.addIssue({ code: "custom", message: "Допускается одна активная цель" });
  });
export type Data = z.infer<typeof dataSchema>;
export const emptyData = (): Data => ({
  version: 1,
  matches: [],
  builds: [{ id: "default", name: "Основной билд", notes: "" }],
  settings: structuredClone(defaults),
  goals: [],
});
export function localDate(d: Date | string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export function localTime(d = new Date()) {
  return `${localDate(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function blankMatch(buildId: string, abilityName: string): Match {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    win: true,
    minutes: 30,
    kills: 0,
    deaths: 0,
    assists: 0,
    souls: 0,
    damage: 0,
    objects: null,
    lane: "Равная",
    buildId,
    mainError: "Нет явной ошибки",
    errors: [],
    opponent: "",
    items: "",
    deathReasons: "",
    abilityName,
    ability: null,
    position: null,
    decisions: null,
    focus: null,
    team: null,
    goalDone: null,
    notes: "",
    patch: "",
  };
}
