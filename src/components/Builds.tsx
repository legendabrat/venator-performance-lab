import { useState } from "react";
import { type Data, type Match } from "../model";
import { summary, previousRange, range } from "../stats";
import { Panel, fmt } from "./Common";
import { Comparison } from "./Analysis";
export function Builds({
  data,
  matches,
  update,
  start,
  end,
}: {
  data: Data;
  matches: Match[];
  update: (d: Data) => boolean;
  start: string;
  end: string;
}) {
  const [name, set] = useState(""),
    [notes, note] = useState(""),
    [edit, editing] = useState<string | null>(null),
    [a, sa] = useState(data.builds[0].id),
    [b, sb] = useState(data.builds[1]?.id || data.builds[0].id);
  const prev = previousRange(start, end);
  return (
    <>
      <Panel
        title="Ваши варианты сборки"
        sub="Статистика за выбранный период; сравнение одинаковых патчей и условий полезнее общего Win Rate."
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Билд",
                  "Матчи",
                  "Победы",
                  "KDA",
                  "Души/мин",
                  "Урон/мин",
                  "Смерти",
                  "Минуты",
                  "Δ WR",
                  "",
                ].map((x, i) => (
                  <th key={i}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.builds.map((build) => {
                const all = matches.filter((m) => m.buildId === build.id),
                  s = summary(range(all, start, end), data.settings),
                  p = summary(range(all, prev.start, prev.end), data.settings);
                return (
                  <tr key={build.id}>
                    <td>
                      <strong>{build.name}</strong>
                      <span className="cell-sub">{build.notes}</span>
                    </td>
                    <td>{s.n}</td>
                    <td>{fmt(s.wr)}%</td>
                    <td>{fmt(s.kda)}</td>
                    <td>{fmt(s.economy, 0)}</td>
                    <td>{fmt(s.damage, 0)}</td>
                    <td>{fmt(s.deaths)}</td>
                    <td>{fmt(s.minutes)}</td>
                    <td>
                      {s.wr !== null && p.wr !== null
                        ? fmt(s.wr - p.wr) + " п.п."
                        : "—"}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          editing(build.id);
                          set(build.name);
                          note(build.notes);
                        }}
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            const next = {
              ...data,
              builds: edit
                ? data.builds.map((x) =>
                    x.id === edit ? { ...x, name: n, notes } : x,
                  )
                : [...data.builds, { id: crypto.randomUUID(), name: n, notes }],
            };
            if (update(next)) {
              set("");
              note("");
              editing(null);
            }
          }}
        >
          <label>
            Название
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => set(e.target.value)}
            />
          </label>
          <label>
            Описание / предметы
            <input
              maxLength={4000}
              value={notes}
              onChange={(e) => note(e.target.value)}
            />
          </label>
          <button className="primary">
            {edit ? "Сохранить" : "Добавить билд"}
          </button>
          {edit && (
            <button
              type="button"
              onClick={() => {
                editing(null);
                set("");
                note("");
              }}
            >
              Отмена
            </button>
          )}
        </form>
      </Panel>
      <Panel title="Сравнение билдов">
        <div className="toolbar">
          <select
            aria-label="Первый билд"
            value={a}
            onChange={(e) => sa(e.target.value)}
          >
            {data.builds.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <span>против</span>
          <select
            aria-label="Второй билд"
            value={b}
            onChange={(e) => sb(e.target.value)}
          >
            {data.builds.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        {a === b ? (
          <p className="notice">Выберите два разных билда для сравнения.</p>
        ) : (
          <Comparison
            a={range(
              matches.filter((m) => m.buildId === a),
              start,
              end,
            )}
            b={range(
              matches.filter((m) => m.buildId === b),
              start,
              end,
            )}
            data={data}
            aLabel={data.builds.find((x) => x.id === a)?.name}
            bLabel={data.builds.find((x) => x.id === b)?.name}
          />
        )}
        <p className="muted small">
          На результаты влияют противники, длительность, патч и ваши навыки.
          Разница не означает, что один билд причинно сильнее другого.
        </p>
      </Panel>
    </>
  );
}
