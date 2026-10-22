import { useState } from "react";
import {
  type Data,
  type Match,
  localDate,
  keys,
  labels,
  mistakes,
} from "../model";
import {
  summary,
  delta,
  mean,
  metric,
  dayQuality,
  errorStats,
  range,
} from "../stats";
import { Panel, fmt, TrendChart, Badge } from "./Common";
import { Matches } from "./Matches";
export function Comparison({
  a,
  b,
  data,
  aLabel = "Текущий",
  bLabel = "Предыдущий",
}: {
  a: Match[];
  b: Match[];
  data: Data;
  aLabel?: string;
  bLabel?: string;
}) {
  const x = summary(a, data.settings),
    y = summary(b, data.settings);
  return (
    <>
      <p className="muted small">
        {aLabel}: n={a.length} · {bLabel}: n={b.length}.{" "}
        {Math.min(a.length, b.length) < 5
          ? "Малая выборка — выводы предварительные."
          : "Наблюдательное сравнение, не доказательство причин."}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Метрика</th>
              <th>{aLabel}</th>
              <th>{bLabel}</th>
              <th>Изменение</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["wr", "Доля побед, %"],
                ["kda", "Средний KDA"],
                ["economy", "Души / мин"],
                ["damage", "Урон / мин"],
                ["deaths", "Смерти / матч"],
                ["minutes", "Длительность, мин"],
                ["score", "Performance Score"],
                ["stability", "Стабильность"],
              ] as const
            ).map(([k, t]) => (
              <tr key={k}>
                <td>{t}</td>
                <td>{fmt(x[k])}</td>
                <td>{fmt(y[k])}</td>
                <td>
                  {k === "score" || k === "stability"
                    ? x[k] !== null && y[k] !== null
                      ? `${fmt(x[k]! - y[k]!)} балла`
                      : "Нет сравнения"
                    : delta(x[k], y[k], k === "wr")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Analysis({ data, matches }: { data: Data; matches: Match[] }) {
  const [mode, set] = useState("5"),
    [field, select] = useState("score");
  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  let a: Match[],
    b: Match[],
    al = "Последние",
    bl = "Предыдущие";
  if (mode === "wins") {
    a = sorted.filter((m) => m.win);
    b = sorted.filter((m) => !m.win);
    al = "Победы";
    bl = "Поражения";
  } else if (mode.endsWith("d")) {
    const n = parseInt(mode);
    const end = new Date(),
      start = new Date();
    start.setDate(start.getDate() - n + 1);
    a = range(sorted, localDate(start), localDate(end));
    end.setDate(start.getDate() - 1);
    start.setDate(start.getDate() - n);
    b = range(sorted, localDate(start), localDate(end));
    al = `Последние ${n} дней`;
    bl = `Предыдущие ${n} дней`;
  } else {
    const n = Number(mode);
    a = sorted.slice(0, n);
    b = sorted.slice(n, n * 2);
    al = `Последние ${n} матчей`;
    bl = `Предыдущие ${n} матчей`;
  }
  return (
    <>
      <Panel
        title="Измеряйте изменения, а не впечатления"
        sub="Сравнения используют весь журнал с учётом выбранных билда и патча."
      >
        <div className="toolbar">
          <select
            aria-label="Тип сравнения"
            value={mode}
            onChange={(e) => set(e.target.value)}
          >
            <option value="5">5 матчей против 5</option>
            <option value="10">10 матчей против 10</option>
            <option value="7d">7 дней против 7</option>
            <option value="30d">30 дней против 30</option>
            <option value="wins">Победы против поражений</option>
          </select>
        </div>
        <Comparison a={a} b={b} data={data} aLabel={al} bLabel={bl} />
      </Panel>
      <Panel
        title="Траектория результатов"
        sub="Одна точка — один матч. Пропуски не соединяются."
      >
        <MetricSelect value={field} change={select} />
        <TrendChart
          matches={[...b, ...a]}
          settings={data.settings}
          field={field}
        />
      </Panel>
    </>
  );
}
export function MetricSelect({
  value,
  change,
}: {
  value: string;
  change: (v: string) => void;
}) {
  return (
    <select
      aria-label="Метрика графика"
      value={value}
      onChange={(e) => change(e.target.value)}
    >
      <option value="score">Performance Score</option>
      <option value="kda">KDA</option>
      {keys.map((k) => (
        <option key={k} value={k}>
          {labels[k]}
        </option>
      ))}
    </select>
  );
}
export function Skills({
  data,
  matches,
  previous,
}: {
  data: Data;
  matches: Match[];
  previous: Match[];
}) {
  const rows = [
    {
      name: "Экономика",
      unit: "душ/мин",
      values: matches.map((m) => metric(m, "economy")),
      old: previous.map((m) => metric(m, "economy")),
      subjective: false,
    },
    {
      name: "Выживаемость",
      unit: "смертей/10 мин ↓",
      values: matches.map((m) => metric(m, "survival")),
      old: previous.map((m) => metric(m, "survival")),
      subjective: false,
    },
    {
      name: "Реализация урона",
      unit: "урон/мин",
      values: matches.map((m) => metric(m, "damage")),
      old: previous.map((m) => metric(m, "damage")),
      subjective: false,
    },
    {
      name: "Работа с объектами",
      unit: "урон/мин",
      values: matches.map((m) => metric(m, "objects")),
      old: previous.map((m) => metric(m, "objects")),
      subjective: false,
    },
    ...(
      [
        ["position", "Позиционирование"],
        ["ability", "Использование способностей"],
        ["team", "Командные действия"],
        ["focus", "Игровая дисциплина"],
      ] as const
    ).map(([k, name]) => ({
      name,
      unit: "из 5",
      values: matches.map((m) => m[k]),
      old: previous.map((m) => m[k]),
      subjective: true,
    })),
    {
      name: "Контроль линии",
      unit: "% выигранных линий",
      values: matches.map((m) => (m.lane === "Победа" ? 100 : 0)),
      old: previous.map((m) => (m.lane === "Победа" ? 100 : 0)),
      subjective: true,
    },
  ];
  return (
    <>
      <p className="notice">
        Самооценка описывает ваш разбор, а не точно измеренный навык. Название
        способности: {data.settings.abilityName}. При смене определения
        сравнение ограничено.
      </p>
      <div className="grid-three">
        {rows.map((r) => (
          <Panel title={r.name} key={r.name}>
            <Badge>{r.subjective ? "Самооценка" : "Статистика матча"}</Badge>
            <p className="big">
              {fmt(mean(r.values))} <small>{r.unit}</small>
            </p>
            <p className="muted">
              n={r.values.filter((x) => x !== null).length} · Δ{" "}
              {r.subjective
                ? mean(r.values) !== null && mean(r.old) !== null
                  ? fmt(mean(r.values)! - mean(r.old)!) +
                    (r.name === "Контроль линии" ? " п.п." : " балла")
                  : "Нет сравнения"
                : delta(mean(r.values), mean(r.old))}
            </p>
          </Panel>
        ))}
      </div>
    </>
  );
}
export function Errors({
  matches,
  previous,
}: {
  matches: Match[];
  previous: Match[];
}) {
  return (
    <Panel
      title="Повторяющиеся ошибки"
      sub="Частота = матчи с ошибкой / все матчи. Можно отметить несколько ошибок; сумма частот может превышать 100%."
    >
      <p className="notice">
        Связь с исходом не доказывает причинность. При n &lt; 5 в любой группе
        сравнение ненадёжно.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ошибка</th>
              <th>Частота</th>
              <th>Δ периода</th>
              <th>Победы с ошибкой</th>
              <th>Победы без ошибки</th>
            </tr>
          </thead>
          <tbody>
            {mistakes
              .map((name) => ({
                name,
                ...errorStats(matches, name),
                old: errorStats(previous, name),
              }))
              .sort((a, b) => b.count - a.count)
              .map((e) => (
                <tr key={e.name}>
                  <td>{e.name}</td>
                  <td>
                    {fmt(e.frequency)}%{" "}
                    <span className="cell-sub">
                      {e.count} / {matches.length}
                    </span>
                  </td>
                  <td>{delta(e.frequency, e.old.frequency, true)}</td>
                  <td>
                    {fmt(e.withWR)}% · n={e.withN}
                  </td>
                  <td>
                    {fmt(e.withoutWR)}% · n={e.withoutN}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
export function Calendar({
  data,
  matches,
  onEdit,
  onDelete,
}: {
  data: Data;
  matches: Match[];
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
}) {
  const [month, set] = useState(localDate(new Date()).slice(0, 7)),
    [day, choose] = useState("");
  const [year, mo] = month.split("-").map(Number);
  const count = new Date(year, mo, 0).getDate(),
    offset = (new Date(year, mo - 1, 1).getDay() + 6) % 7;
  const selected = matches.filter((m) => localDate(m.date) === day);
  return (
    <>
      <Panel
        title="Календарь практики"
        sub="Реальный календарный месяц: 28–31 день. Оттенок учитывает балл и количество матчей."
      >
        <div className="toolbar">
          <input
            type="month"
            aria-label="Месяц"
            value={month}
            onChange={(e) => {
              if (e.target.value) set(e.target.value);
            }}
          />
          <span className="muted small">
            Нет игры — нет оценки · ✓ цель отмечена выполненной
          </span>
        </div>
        <div className="calendar">
          {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((x) => (
            <span className="weekday" key={x}>
              {x}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={"pad" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`,
              ms = matches.filter((m) => localDate(m.date) === date),
              s = summary(ms, data.settings),
              q = dayQuality(ms, data.settings);
            return (
              <button
                key={date}
                aria-label={`${date}: ${ms.length} матчей`}
                className={
                  "day " +
                  (day === date ? "chosen" : "") +
                  " " +
                  (q === null
                    ? "no-data"
                    : q >= 65
                      ? "good"
                      : q < 45
                        ? "bad"
                        : "neutral")
                }
                onClick={() => choose(date)}
              >
                <span className="row">
                  <strong>{i + 1}</strong>
                  {ms.some((m) => m.goalDone === true) && <span>✓</span>}
                </span>
                {ms.length ? (
                  <>
                    <b>
                      {ms.length} <span className="desktop-text">матча</span>
                    </b>
                    <small>
                      {s.wins}П · {fmt(s.wr, 0)}%
                    </small>
                    <small>PS {fmt(s.score, 0)}</small>
                  </>
                ) : (
                  <small>—</small>
                )}
              </button>
            );
          })}
        </div>
        <p className="muted small">
          Цвет: 50 + (средний балл − 50) × n/(n+4). Это визуальное сглаживание,
          не статистическая достоверность.
        </p>
      </Panel>
      {day && (
        <Panel
          title={"Матчи · " + day}
          sub={`n=${selected.length} · Побед: ${selected.filter((m) => m.win).length}`}
        >
          <Matches
            matches={selected}
            data={data}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Panel>
      )}
    </>
  );
}
