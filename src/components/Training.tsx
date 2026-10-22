import { useState } from "react";
import { Target, ArrowUpRight } from "lucide-react";
import { type Data, type Goal } from "../model";
import { recommend, goalResult } from "../recommendations";
import { Panel, fmt, Badge } from "./Common";
export function GoalCard({ goal, data }: { goal: Goal; data: Data }) {
  const r = goalResult(goal, data.matches);
  return (
    <div>
      <div className="row">
        <h3>{goal.title}</h3>
        <Badge>
          {r.matches.length}/{goal.count} матчей
        </Badge>
      </div>
      <p className="muted">{goal.reason}</p>
      <p>
        Критерий:{" "}
        {goal.metric === "survival"
          ? `≤ ${fmt(goal.target)} смерти / 10 мин`
          : goal.metric === "economy"
            ? `≥ ${fmt(goal.target, 0)} душ / мин`
            : "Выполнить разбор и отметить цель в форме матча"}
      </p>
      <div className="goal-stats">
        <div>
          <small>Базовое</small>
          <strong>{fmt(goal.baseline)}</strong>
        </div>
        <div>
          <small>Сейчас</small>
          <strong>
            {goal.metric === "review"
              ? fmt(r.current === null ? null : r.current * 100) + "%"
              : fmt(r.current)}
          </strong>
        </div>
        <div>
          <small>Выполнение</small>
          <strong>{fmt(r.rate, 0)}%</strong>
        </div>
      </div>
      <progress value={r.matches.length} max={goal.count} />
      <p className="muted small">
        {r.passed} успешных из {r.assessed} оценённых;{" "}
        {r.matches.length - r.assessed} без оценки.{" "}
        {r.matches.length >= goal.count
          ? "Блок набран — завершите и оцените результат."
          : "Учитываются только новые матчи после старта цели."}
      </p>
    </div>
  );
}
export function Training({
  data,
  update,
}: {
  data: Data;
  update: (d: Data) => boolean;
}) {
  const [count, set] = useState(5);
  const rec = recommend(data),
    active = data.goals.find((g) => g.status === "active");
  const start = () =>
    update({
      ...data,
      goals: [
        ...data.goals,
        {
          ...rec,
          id: crypto.randomUUID(),
          created: new Date().toISOString(),
          ended: null,
          excludedIds: data.matches.map((m) => m.id),
          count,
          status: "active",
        },
      ],
    });
  const stop = (status: "completed" | "stopped") =>
    update({
      ...data,
      goals: data.goals.map((g) =>
        g.id === active?.id
          ? { ...g, status, ended: new Date().toISOString() }
          : g,
      ),
    });
  return (
    <>
      <div className="grid-two">
        <Panel
          title="Одна цель. Осознанная практика."
          sub="Правила рекомендаций открыты; это не искусственный интеллект."
        >
          {active ? (
            <>
              <GoalCard goal={active} data={data} />
              <div className="toolbar">
                <button
                  className="primary"
                  disabled={
                    goalResult(active, data.matches).matches.length <
                    active.count
                  }
                  onClick={() => stop("completed")}
                >
                  Завершить блок
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Остановить текущий блок? Он останется в истории.",
                      )
                    )
                      stop("stopped");
                  }}
                >
                  Остановить
                </button>
              </div>
            </>
          ) : (
            <>
              <Target className="accent" size={32} />
              <h3>{rec.title}</h3>
              <p>{rec.reason}</p>
              <div className="toolbar">
                <label>
                  Длина блока
                  <select
                    value={count}
                    onChange={(e) => set(Number(e.target.value))}
                  >
                    {[3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} матча
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary" onClick={start}>
                  Начать тренировку <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}
        </Panel>
        <Panel title="Как выбирается цель">
          <ol className="steps">
            <li>До 5 матчей — собрать базовую линию и привычку разбора.</li>
            <li>
              Смерти/10 мин выше вашей цели — снизить частоту на 10%, не требуя
              сразу идеала.
            </li>
            <li>Экономика ниже цели — увеличить души/мин на 10%.</li>
            <li>Иначе — разобрать самую частую ошибку последних 10 матчей.</li>
          </ol>
          <p className="notice">
            Изменение показателя не доказывает эффект тренировки. Учитывайте
            патч, соперников и длительность игры. Завершённые блоки
            пересчитываются при исправлении связанных матчей.
          </p>
        </Panel>
      </div>
      <Panel title="История тренировок">
        {data.goals.filter((g) => g.status !== "active").length ? (
          data.goals
            .filter((g) => g.status !== "active")
            .slice()
            .reverse()
            .map((g) => (
              <details key={g.id}>
                <summary>
                  {g.title} ·{" "}
                  {g.status === "completed" ? "Завершено" : "Остановлено"} ·{" "}
                  {new Date(g.created).toLocaleDateString("ru-RU")}
                </summary>
                <GoalCard goal={g} data={data} />
              </details>
            ))
        ) : (
          <p className="muted">
            Завершённые и остановленные блоки появятся здесь.
          </p>
        )}
      </Panel>
    </>
  );
}
