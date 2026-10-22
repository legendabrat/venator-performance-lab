import { useState } from "react";
import { Download, Upload, ShieldCheck } from "lucide-react";
import { type Data, keys, labels, settingsSchema } from "../model";
import { csv, download, parseData } from "../storage";
import { Panel } from "./Common";
export function Settings({
  data,
  update,
  storeKey,
  notify,
  recover,
}: {
  data: Data;
  update: (d: Data) => boolean;
  storeKey: string;
  notify: (s: string) => void;
  recover: (d: Data) => boolean;
}) {
  const [s, set] = useState(structuredClone(data.settings));
  return (
    <>
      <div className="grid-two">
        <Panel
          title="Целевые значения и веса"
          sub="Стартовые значения — примеры, не нормы для Venator. Настройте их по своей базовой линии."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = settingsSchema.safeParse(s);
              if (!parsed.success) {
                notify(parsed.error.issues[0].message);
                return;
              }
              update({ ...data, settings: parsed.data });
            }}
          >
            <div className="settings-grid">
              <strong>Метрика</strong>
              <strong>Цель</strong>
              <strong>Вес</strong>
              {keys.map((k) => (
                <div className="contents" key={k}>
                  <label htmlFor={"target-" + k}>
                    {labels[k]} {k === "survival" ? "↓" : "↑"}
                  </label>
                  <input
                    id={"target-" + k}
                    type="number"
                    required
                    min={0.01}
                    max={1000000}
                    step="any"
                    value={s[k].target}
                    onChange={(e) =>
                      set({
                        ...s,
                        [k]: { ...s[k], target: Number(e.target.value) },
                      })
                    }
                  />
                  <input
                    aria-label={"Вес " + labels[k]}
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={s[k].weight}
                    onChange={(e) =>
                      set({
                        ...s,
                        [k]: { ...s[k], weight: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <label>
              Название ключевой способности
              <input
                maxLength={100}
                value={s.abilityName}
                onChange={(e) => set({ ...s, abilityName: e.target.value })}
              />
            </label>
            <p className="muted small">
              Новые настройки пересчитывают весь журнал, чтобы сравнения
              использовали одну шкалу. Критерии уже начатых тренировок
              сохраняются.
            </p>
            <button className="primary">Сохранить настройки</button>
          </form>
        </Panel>
        <Panel
          title="Ваши данные принадлежат вам"
          sub="Локальное хранилище этого браузера. Синхронизации между устройствами нет."
        >
          <ShieldCheck size={30} className="accent" />
          <div className="stack">
            <button
              onClick={() =>
                download("venator-backup.json", JSON.stringify(data, null, 2))
              }
            >
              <Download size={16} /> Полная копия JSON
            </button>
            <button
              onClick={() =>
                download(
                  "venator-matches.csv",
                  csv(data),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={16} /> Экспорт матчей CSV
            </button>
            <label className="file-input">
              <Upload size={16} /> Импорт JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    if (f.size > 20 * 1024 * 1024)
                      throw new Error("Максимальный размер — 20 МБ");
                    const parsed = parseData(await f.text());
                    if (
                      confirm(
                        `Заменить текущие данные? Импорт: ${parsed.matches.length} матчей, ${parsed.builds.length} билдов. Перед заменой будет скачана копия.`,
                      )
                    ) {
                      download(
                        "venator-before-import.json",
                        JSON.stringify(data, null, 2),
                      );
                      recover(parsed);
                    }
                  } catch (err) {
                    notify(
                      err instanceof Error ? err.message : "Ошибка импорта",
                    );
                  }
                }}
              />
            </label>
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem(storeKey + "-backup");
                  if (!raw) throw new Error("Резервной копии пока нет");
                  const parsed = parseData(raw);
                  if (
                    confirm(
                      `Восстановить предыдущую сохранённую версию (${parsed.matches.length} матчей)?`,
                    )
                  ) {
                    download(
                      "venator-before-restore.json",
                      JSON.stringify(data, null, 2),
                    );
                    recover(parsed);
                  }
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Восстановить предыдущую версию
            </button>
            <button
              onClick={() => {
                try {
                  download(
                    "venator-storage-raw.txt",
                    localStorage.getItem(storeKey) || "",
                    "text/plain",
                  );
                } catch {
                  notify("Браузер запретил доступ к хранилищу");
                }
              }}
            >
              Скачать исходное хранилище
            </button>
          </div>
          <p className="muted small">
            Перед каждой записью сохраняется одна предыдущая версия. Для защиты
            от очистки браузера регулярно скачивайте JSON. CSV предназначен для
            анализа, обратный импорт — только JSON.
          </p>
        </Panel>
      </div>
      <Panel title="Методика и ограничения">
        <div className="prose">
          <p>
            <b>Performance Score</b> — ваш настраиваемый индикатор, не
            официальный рейтинг Deadlock. Для показателей «больше лучше»:
            min(100, 100 × значение / цель). Для смертей: min(100, 100 × цель /
            значение); при 0 смертей — 100. Итог — средневзвешенный балл
            доступных категорий. Пропуски исключаются, веса перенормируются.
            Победа и самооценки не входят в балл.
          </p>
          <p>
            <b>Полнота:</b> сумма доступных весов / сумма всех весов. При
            полноте ниже 80% или выборке менее 5 матчей показывается низкая
            достоверность. Даже большая выборка не делает этот индекс
            объективным рейтингом.
          </p>
          <p>
            <b>Средние:</b> показатели в минуту и KDA считаются для каждого
            матча, затем усредняются с одинаковым весом матчей. KDA = (убийства
            + ассисты) / max(смерти, 1). Нулевые смерти не вызывают деления на
            ноль.
          </p>
          <p>
            <b>Стабильность:</b> max(0, 100 − 2σ), где σ — стандартное
            отклонение индивидуального балла по всей выбранной выборке. Доступна
            от 5 оценённых матчей. Высокая стабильность возможна при стабильно
            низком качестве игры. Насыщение балла у 100 может скрывать разброс
            исходных метрик.
          </p>
          <p>
            <b>Сравнения:</b> относительное изменение = (новое − старое) /
            |старое| × 100%. При нулевой базе процент не считается. Win Rate
            меняется в процентных пунктах. Для балла и стабильности показывается
            разница баллов. Периоды сравниваются по локальным календарным дням
            одинаковой длины; сегодня может быть неполным днём.
          </p>
          <p>
            <b>Терминология:</b> Venator подтверждён официальной публикацией
            Valve «Some Are Merciful, The Venator Is Not». Сверка 22.10.2026.
            Название отслеживаемой способности настраивается: приложение не
            предполагает фиксированной локализации или неизменного набора
            способностей.{" "}
            <a
              href="https://store.steampowered.com/news/app/1422450/view/530996781696156190"
              target="_blank"
              rel="noreferrer"
            >
              Официальная публикация ↗
            </a>
          </p>
          <p>
            <b>Установка:</b> после публикации по HTTPS используйте меню
            браузера «Установить приложение» / «На главный экран», если
            доступно. Поддерживается автономное открытие после первого
            посещения. Возможность установки зависит от браузера.
          </p>
        </div>
      </Panel>
    </>
  );
}
