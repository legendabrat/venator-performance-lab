import { dataSchema, emptyData, type Data } from "./model";
export const STORE = "venator-lab-v1";
export function parseData(raw: string): Data {
  if (raw.length > 20 * 1024 * 1024) throw new Error("Файл превышает 20 МБ");
  const result = dataSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(
      "Неверный формат: " +
        result.error.issues
          .slice(0, 3)
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; "),
    );
  return result.data;
}
export function load(key = STORE) {
  try {
    const raw = localStorage.getItem(key);
    return { data: raw ? parseData(raw) : emptyData(), error: "" };
  } catch {
    return {
      data: emptyData(),
      error:
        "Хранилище недоступно или повреждено. Запись заблокирована: скачайте исходные данные или восстановите резервную копию.",
    };
  }
}
export function save(data: Data, key = STORE) {
  dataSchema.parse(data);
  const old = localStorage.getItem(key);
  if (old) {
    parseData(old);
    localStorage.setItem(key + "-backup", old);
  }
  localStorage.setItem(key, JSON.stringify(data));
}
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(d: Data) {
  const headers = [
    "Дата",
    "Исход",
    "Минуты",
    "Убийства",
    "Смерти",
    "Ассисты",
    "Души",
    "Урон героям",
    "Урон объектам",
    "Линия",
    "Билд",
    "Главная ошибка",
    "Все ошибки",
    "Соперник",
    "Предметы и тайминги",
    "Причины смертей",
    "Способность",
    "Оценка способности",
    "Позиционирование",
    "Решения",
    "Концентрация",
    "Командные действия",
    "Цель выполнена",
    "Заметки",
    "Патч",
  ];
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      headers,
      ...d.matches.map((m) => [
        m.date,
        m.win ? "Победа" : "Поражение",
        m.minutes,
        m.kills,
        m.deaths,
        m.assists,
        m.souls,
        m.damage,
        m.objects,
        m.lane,
        d.builds.find((b) => b.id === m.buildId)?.name,
        m.mainError,
        m.errors.join("; "),
        m.opponent,
        m.items,
        m.deathReasons,
        m.abilityName,
        m.ability,
        m.position,
        m.decisions,
        m.focus,
        m.team,
        m.goalDone === null ? "" : m.goalDone ? "Да" : "Нет",
        m.notes,
        m.patch,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
