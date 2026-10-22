import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import {
  type Data,
  type Match,
  matchSchema,
  mistakes,
  localTime,
} from "../model";
import { score } from "../stats";
import { labels } from "../model";
import { fmt } from "./Common";
export function MatchForm({
  match,
  data,
  onSave,
  onClose,
}: {
  match: Match;
  data: Data;
  onSave: (m: Match) => void;
  onClose: () => void;
}) {
  const [m, set] = useState(match),
    [advanced, expand] = useState(false),
    [error, err] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const change = (key: keyof Match, value: unknown) =>
    set((s) => ({ ...s, [key]: value }));
  const numbers: [keyof Match, string][] = [
    ["minutes", "Длительность, мин"],
    ["kills", "Убийства"],
    ["deaths", "Смерти"],
    ["assists", "Ассисты"],
    ["souls", "Всего душ"],
    ["damage", "Урон героям"],
    ["objects", "Урон объектам (если известен)"],
  ];
  const s = score(m, data.settings);
  return (
    <dialog ref={ref} onCancel={onClose} className="modal">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = matchSchema.safeParse(m);
          if (!parsed.success) {
            err(
              "Проверьте поля: " +
                parsed.error.issues.map((i) => i.path.join(".")).join(", "),
            );
            return;
          }
          if (new Date(m.date) > new Date()) {
            err("Дата матча не может быть в будущем");
            return;
          }
          onSave(parsed.data);
        }}
      >
        <header className="row">
          <div>
            <span className="eyebrow">ЖУРНАЛ ИГРОКА</span>
            <h2>
              {data.matches.some((x) => x.id === m.id)
                ? "Редактировать матч"
                : "Новый матч"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <div className="segmented">
          <button
            type="button"
            className={!advanced ? "selected" : ""}
            onClick={() => expand(false)}
          >
            Быстрый ввод
          </button>
          <button
            type="button"
            className={advanced ? "selected" : ""}
            onClick={() => expand(true)}
          >
            Расширенный
          </button>
        </div>
        <div className="form-grid">
          <label>
            Дата и время
            <input
              required
              type="datetime-local"
              value={localTime(new Date(m.date))}
              onChange={(e) => {
                if (e.target.value)
                  change("date", new Date(e.target.value).toISOString());
              }}
            />
          </label>
          <label>
            Результат
            <select
              value={String(m.win)}
              onChange={(e) => change("win", e.target.value === "true")}
            >
              <option value="true">Победа</option>
              <option value="false">Поражение</option>
            </select>
          </label>
          {numbers.map(([k, t]) => (
            <label key={k}>
              {t}
              <input
                type="number"
                required={k !== "objects"}
                min={k === "minutes" ? 0.1 : 0}
                max={k === "minutes" ? 240 : 10000000}
                step={k === "minutes" ? 0.1 : 1}
                value={m[k] === null ? "" : String(m[k])}
                onChange={(e) =>
                  change(
                    k,
                    e.target.value === ""
                      ? k === "objects"
                        ? null
                        : NaN
                      : Number(e.target.value),
                  )
                }
              />
            </label>
          ))}
          <label>
            Линия · самооценка
            <select
              value={m.lane}
              onChange={(e) => change("lane", e.target.value)}
            >
              {["Победа", "Равная", "Поражение"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Билд
            <select
              value={m.buildId}
              onChange={(e) => change("buildId", e.target.value)}
            >
              {data.builds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Главная ошибка · самооценка
            <select
              value={m.mainError}
              onChange={(e) => {
                const v = e.target.value as Match["mainError"];
                set({
                  ...m,
                  mainError: v,
                  errors:
                    v === "Нет явной ошибки"
                      ? m.errors
                      : [...new Set([...m.errors, v])],
                });
              }}
            >
              {["Нет явной ошибки", ...mistakes].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Версия игры / патч
            <input
              maxLength={100}
              value={m.patch}
              onChange={(e) => change("patch", e.target.value)}
              placeholder="Необязательно"
            />
          </label>
        </div>
        {advanced && (
          <>
            <h3>
              Разбор матча{" "}
              <span className="muted small">
                Самооценка, не объективная телеметрия
              </span>
            </h3>
            <div className="checks">
              {mistakes.map((v) => (
                <label key={v}>
                  <input
                    type="checkbox"
                    checked={m.errors.includes(v)}
                    disabled={m.mainError === v}
                    onChange={(e) =>
                      change(
                        "errors",
                        e.target.checked
                          ? [...m.errors, v]
                          : m.errors.filter((x) => x !== v),
                      )
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
            <div className="form-grid">
              {(
                [
                  ["opponent", "Соперник на линии"],
                  ["items", "Ключевые предметы и время покупки"],
                  ["deathReasons", "Причины смертей"],
                  ["abilityName", "Отслеживаемая способность"],
                ] as const
              ).map(([k, t]) => (
                <label key={k}>
                  {t}
                  <input
                    value={m[k]}
                    maxLength={4000}
                    onChange={(e) => change(k, e.target.value)}
                  />
                </label>
              ))}
              {(
                [
                  ["ability", "Применение способности"],
                  ["position", "Позиционирование"],
                  ["decisions", "Принятие решений"],
                  ["focus", "Концентрация"],
                  ["team", "Командные действия"],
                ] as const
              ).map(([k, t]) => (
                <label key={k}>
                  {t} · самооценка
                  <select
                    value={m[k] ?? ""}
                    onChange={(e) =>
                      change(k, e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">Не оценено</option>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} / 5
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="muted small">
              Шкала: 1 — частые ошибки; 3 — смешанный результат; 5 —
              последовательно выполнял задуманный план.
            </p>
          </>
        )}
        <label>
          Тренировочная цель выполнена · самооценка
          <select
            value={m.goalDone === null ? "" : String(m.goalDone)}
            onChange={(e) =>
              change(
                "goalDone",
                e.target.value === "" ? null : e.target.value === "true",
              )
            }
          >
            <option value="">Не оценено</option>
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </label>
        <label>
          Заметки
          <textarea
            rows={3}
            maxLength={4000}
            value={m.notes}
            onChange={(e) => change("notes", e.target.value)}
            placeholder="Что повторить в следующей игре?"
          />
        </label>
        <details>
          <summary>Состав Performance Score · {fmt(s.value)} / 100</summary>
          {s.parts.map((p) => (
            <p key={p.key}>
              {labels[p.key]}: {fmt(p.value)} → {fmt(p.score)} баллов · вес{" "}
              {p.weight}
            </p>
          ))}
          <p>
            Полнота: {fmt(s.coverage * 100, 0)}%. Цели и веса меняются в
            настройках.
          </p>
        </details>
        {error && (
          <p role="alert" className="danger">
            {error}
          </p>
        )}
        <footer className="row">
          <span className="muted small">Хранится только в этом браузере</span>
          <button className="primary" type="submit">
            Сохранить матч
          </button>
        </footer>
      </form>
    </dialog>
  );
}
