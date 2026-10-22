import { describe, it, expect } from "vitest";
import { defaults, emptyData, type Match } from "./model";
import {
  mean,
  kda,
  metric,
  score,
  summary,
  normalized,
  delta,
  range,
  previousRange,
  dayQuality,
  errorStats,
} from "./stats";
import { parseData, csv, save, load, STORE } from "./storage";
import { recommend, goalResult } from "./recommendations";
import { demoData } from "./demo";
const m = (over: Partial<Match> = {}): Match => ({
  id: "a",
  date: "2026-10-15T12:00:00.000Z",
  win: true,
  minutes: 20,
  kills: 10,
  deaths: 5,
  assists: 5,
  souls: 18000,
  damage: 16000,
  objects: null,
  lane: "Равная",
  buildId: "default",
  mainError: "Нет явной ошибки",
  errors: [],
  opponent: "",
  items: "",
  deathReasons: "",
  abilityName: "Способность",
  ability: null,
  position: null,
  decisions: null,
  focus: null,
  team: null,
  goalDone: null,
  notes: "",
  patch: "",
  ...over,
});
describe("Статистические расчёты", () => {
  it("Не заменяет пропуски нулями", () => {
    expect(mean([null, 10, 20])).toBe(15);
    expect(mean([])).toBeNull();
    expect(mean([null])).toBeNull();
  });
  it("KDA использует защиту от нулевых смертей", () => {
    expect(kda(m())).toBe(3);
    expect(kda(m({ deaths: 0 }))).toBe(15);
  });
  it("Считает показатели с единицами времени", () => {
    expect(metric(m(), "economy")).toBe(900);
    expect(metric(m(), "survival")).toBe(2.5);
    expect(metric(m(), "objects")).toBeNull();
  });
  it("Нормализация ограничена 0–100 и учитывает направление", () => {
    expect(normalized(450, 900)).toBe(50);
    expect(normalized(1800, 900)).toBe(100);
    expect(normalized(3, 1.5, true)).toBe(50);
    expect(normalized(0, 1.5, true)).toBe(100);
  });
  it("Перенормирует веса доступных данных", () => {
    const s = score(m(), defaults);
    expect(s.coverage).toBe(0.9);
    expect(s.value).toBeCloseTo((100 + 100 + 60) / 3);
  });
  it("Не зависит от исхода и самооценки", () => {
    expect(score(m(), defaults).value).toBe(
      score(m({ win: false, position: 1 }), defaults).value,
    );
  });
  it("Известный ноль отличается от пропуска", () => {
    expect(score(m({ objects: 0 }), defaults).coverage).toBe(1);
    expect(score(m({ objects: 0 }), defaults).value).toBeLessThan(
      score(m(), defaults).value!,
    );
  });
  it("Пустая выборка и стабильность до 5 матчей", () => {
    expect(summary([], defaults).wr).toBeNull();
    expect(summary([m()], defaults).stability).toBeNull();
    expect(
      summary(
        Array.from({ length: 5 }, () => m()),
        defaults,
      ).stability,
    ).toBe(100);
  });
  it("Усредняет индивидуальные скорости, не отношение сумм", () => {
    expect(summary([m(), m({ minutes: 40 })], defaults).economy).toBe(675);
  });
  it("Различает проценты и п.п., нулевую базу", () => {
    expect(delta(60, 50, true)).toBe("+10.0 п.п.");
    expect(delta(60, 50)).toBe("+20.0%");
    expect(delta(2, 0)).toBe("База равна 0");
  });
  it("Сравнивает периоды равной длины на границе месяца", () => {
    expect(previousRange("2026-03-01", "2026-03-07")).toEqual({
      start: "2026-02-22",
      end: "2026-02-28",
    });
    expect(range([m()], "2026-10-15", "2026-10-15")).toHaveLength(1);
  });
  it("Сглаживает единичную удачную игру", () => {
    expect(dayQuality([m({ deaths: 0 })], defaults)).toBe(60);
    expect(
      dayQuality(
        Array.from({ length: 6 }, () => m({ deaths: 0 })),
        defaults,
      ),
    ).toBe(80);
  });
  it("Ошибки считаются по матчам и группам", () => {
    const e = errorStats(
      [
        m({ errors: ["Потеря фарма"], mainError: "Потеря фарма" }),
        m({ win: false }),
      ],
      "Потеря фарма",
    );
    expect(e.frequency).toBe(50);
    expect(e.withWR).toBe(100);
    expect(e.withoutWR).toBe(0);
  });
});
describe("Валидация и перенос данных", () => {
  it("JSON проходит полный цикл без потерь", () => {
    const d = emptyData();
    d.matches = [m()];
    expect(parseData(JSON.stringify(d))).toEqual(d);
  });
  it("Отклоняет неизвестную версию, битый JSON и неправильные типы", () => {
    expect(() => parseData("{")).toThrow();
    expect(() =>
      parseData(JSON.stringify({ ...emptyData(), version: 2 })),
    ).toThrow();
    expect(() =>
      parseData(
        JSON.stringify({ ...emptyData(), matches: [m({ minutes: 0 })] }),
      ),
    ).toThrow();
  });
  it("Отклоняет отрицательные значения, дубли ID и неизвестный билд", () => {
    for (const ms of [
      [m({ kills: -1 })],
      [m(), m()],
      [m({ buildId: "missing" })],
    ])
      expect(() =>
        parseData(JSON.stringify({ ...emptyData(), matches: ms })),
      ).toThrow();
  });
  it("Отклоняет все нулевые веса", () => {
    const d = emptyData();
    Object.values(d.settings).forEach((v) => {
      if (typeof v === "object") v.weight = 0;
    });
    expect(() => parseData(JSON.stringify(d))).toThrow();
  });
  it("CSV экранирует кавычки, переносы и формулы", () => {
    const d = emptyData();
    d.matches = [m({ notes: '=SUM(1,2)\n"quote"' })];
    const raw = csv(d);
    expect(raw).toContain("'=SUM(1,2)");
    expect(raw).toContain('""quote""');
  });
  it("Демо соответствует схеме и не содержит личных данных", () => {
    expect(parseData(JSON.stringify(demoData())).matches).toHaveLength(84);
  });
  it("Резервирует предыдущее состояние; повреждение не затирается", () => {
    const map = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => map.set(k, v),
      },
    });
    const d = emptyData();
    save(d);
    save({ ...d, matches: [m()] });
    expect(parseData(map.get(STORE + "-backup")!).matches).toHaveLength(0);
    map.set(STORE, "broken");
    expect(load().error).not.toBe("");
    expect(() => save(d)).toThrow();
    expect(map.get(STORE)).toBe("broken");
  });
});
describe("Тренировки", () => {
  it("Малая выборка предлагает базовую линию", () =>
    expect(recommend(emptyData()).metric).toBe("review"));
  it("При избытке смертей предлагает постепенную цель", () => {
    const d = emptyData();
    d.matches = Array.from({ length: 5 }, () => m());
    expect(recommend(d).target).toBe(2.25);
  });
  it("Исключает прошлые матчи и ограничивает блок", () => {
    const g = {
      ...recommend(emptyData()),
      id: "g",
      created: "2026-10-14T00:00:00.000Z",
      ended: null,
      excludedIds: ["a"],
      count: 3,
      status: "active" as const,
    };
    const r = goalResult(g, [
      m(),
      m({ id: "b", goalDone: true }),
      m({ id: "c", goalDone: null }),
      m({ id: "d", goalDone: false }),
      m({ id: "e", goalDone: true }),
    ]);
    expect(r.matches).toHaveLength(3);
    expect(r.assessed).toBe(2);
    expect(r.rate).toBe(50);
    expect(r.progress).toBe(100);
  });
});
