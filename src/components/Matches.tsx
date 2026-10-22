import { Pencil, Trash2 } from "lucide-react";
import { type Data, type Match } from "../model";
import { score, kda } from "../stats";
import { fmt, Empty } from "./Common";
export function Matches({
  matches,
  data,
  onEdit,
  onDelete,
}: {
  matches: Match[];
  data: Data;
  onEdit: (m: Match) => void;
  onDelete: (id: string) => void;
}) {
  return matches.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Дата / билд",
              "Результат",
              "K / D / A",
              "KDA",
              "Души/мин",
              "Балл",
              "Главная ошибка",
              "Действия",
            ].map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...matches]
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .map((m) => {
              const s = score(m, data.settings);
              return (
                <tr key={m.id}>
                  <td>
                    <strong>
                      {new Date(m.date).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </strong>
                    <span className="cell-sub">
                      {data.builds.find((b) => b.id === m.buildId)?.name} ·{" "}
                      {fmt(m.minutes)} мин
                    </span>
                  </td>
                  <td>
                    <span className={"result " + (m.win ? "win" : "loss")}>
                      {m.win ? "Победа" : "Поражение"}
                    </span>
                  </td>
                  <td>
                    {m.kills} / {m.deaths} / {m.assists}
                  </td>
                  <td>{fmt(kda(m), 2)}</td>
                  <td>{fmt(m.souls / m.minutes, 0)}</td>
                  <td title={`Полнота данных ${fmt(s.coverage * 100, 0)}%`}>
                    <strong className="accent">{fmt(s.value, 0)}</strong>
                    {s.coverage < 1 ? " *" : ""}
                  </td>
                  <td className="small">{m.mainError}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="icon-btn"
                        aria-label="Редактировать матч"
                        onClick={() => onEdit(m)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label="Удалить матч"
                        onClick={() => onDelete(m.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}
