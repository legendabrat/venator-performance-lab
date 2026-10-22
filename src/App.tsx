import { useState, useMemo } from "react";
import {
  LayoutDashboard,
  List,
  CalendarDays,
  ChartNoAxesCombined,
  Target,
  Layers,
  Settings as SettingsIcon,
  Plus,
  FlaskConical,
  ChevronRight,
  ArrowUpRight,
  Shield,
  Activity,
  TriangleAlert,
  Download,
  X,
} from "lucide-react";
import {
  type Data,
  type Match,
  blankMatch,
  localDate,
  dataSchema,
} from "./model";
import { load, save, STORE } from "./storage";
import { demoData } from "./demo";
import { summary, range, previousRange, delta, score, mean } from "./stats";
import { recommend } from "./recommendations";
import { Panel, fmt, TrendChart, Badge } from "./components/Common";
import { MatchForm } from "./components/MatchForm";
import { Matches } from "./components/Matches";
import {
  Analysis,
  Calendar,
  Skills,
  Errors,
  MetricSelect,
} from "./components/Analysis";
import { Training, GoalCard } from "./components/Training";
import { Builds } from "./components/Builds";
import { Settings } from "./components/Settings";
const nav = [
  ["overview", "Обзор", LayoutDashboard],
  ["matches", "Журнал матчей", List],
  ["calendar", "Календарь", CalendarDays],
  ["analysis", "Динамика", ChartNoAxesCombined],
  ["skills", "Профиль навыков", Activity],
  ["errors", "Разбор ошибок", TriangleAlert],
  ["training", "Тренировки", Target],
  ["builds", "Билды", Layers],
  ["settings", "Настройки", SettingsIcon],
] as const;
function initialDates() {
  const end = new Date(),
    start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: localDate(start), end: localDate(end) };
}
export default function App() {
  const [initial] = useState(() => load()),
    [data, setData] = useState<Data>(initial.data),
    [blocked, block] = useState(!!initial.error),
    [toast, notify] = useState(initial.error),
    [demo, setDemo] = useState(false),
    [page, go] = useState("overview"),
    [editing, edit] = useState<Match | null>(null),
    [dates, setDates] = useState(initialDates),
    [period, setPeriod] = useState("30"),
    [build, setBuild] = useState("all"),
    [patch, setPatch] = useState("all"),
    [query, search] = useState(""),
    [outcome, setOutcome] = useState("all"),
    [field, setField] = useState("score");
  const storeKey = demo ? STORE + "-demo" : STORE;
  const update = (d: Data) => {
    if (blocked) {
      notify("Сохранение заблокировано. Восстановите данные через настройки.");
      return false;
    }
    try {
      save(d, storeKey);
      setData(d);
      notify("Сохранено в этом браузере");
      return true;
    } catch (e) {
      notify("Не удалось сохранить: " + (e as Error).message);
      return false;
    }
  };
  const recover = (d: Data) => {
    try {
      dataSchema.parse(d);
      const raw = localStorage.getItem(storeKey);
      if (raw) localStorage.setItem(storeKey + "-recovery", raw);
      localStorage.setItem(storeKey, JSON.stringify(d));
      setData(d);
      block(false);
      notify("Данные восстановлены");
      return true;
    } catch (e) {
      notify("Не удалось восстановить: " + (e as Error).message);
      return false;
    }
  };
  const toggleDemo = () => {
    if (demo) {
      const result = load();
      setData(result.data);
      block(!!result.error);
      notify(result.error || "Открыты личные данные");
      setDemo(false);
    } else {
      const result = load(STORE + "-demo");
      setData(result.data.matches.length ? result.data : demoData());
      block(!!result.error);
      notify(
        result.error ||
          "Демонстрационный режим: тестовые данные отдельно от личных",
      );
      setDemo(true);
    }
    setBuild("all");
    setPatch("all");
    edit(null);
  };
  const filtered = useMemo(
    () =>
      data.matches.filter(
        (m) =>
          (build === "all" || m.buildId === build) &&
          (patch === "all" || m.patch === patch),
      ),
    [data.matches, build, patch],
  );
  const current = range(filtered, dates.start, dates.end),
    prevDates = previousRange(dates.start, dates.end),
    previous = range(filtered, prevDates.start, prevDates.end),
    s = summary(current, data.settings),
    p = summary(previous, data.settings);
  const active = data.goals.find((g) => g.status === "active");
  const coverage = mean(current.map((m) => score(m, data.settings).coverage));
  const remove = (id: string) => {
    if (confirm("Удалить матч? Предыдущая версия останется в резервной копии."))
      update({ ...data, matches: data.matches.filter((m) => m.id !== id) });
  };
  const changePeriod = (v: string) => {
    setPeriod(v);
    if (v !== "custom") {
      const end = new Date(),
        start = new Date();
      start.setDate(start.getDate() - Number(v) + 1);
      setDates({ start: localDate(start), end: localDate(end) });
    }
  };
  const journal = current.filter(
    (m) =>
      (outcome === "all" || String(m.win) === outcome) &&
      [
        m.notes,
        m.opponent,
        m.mainError,
        m.patch,
        data.builds.find((b) => b.id === m.buildId)?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <div className="brand-mark">
            V<span>+</span>
          </div>
          <div>
            VENATOR<small>PERFORMANCE LAB</small>
          </div>
        </a>
        <div className="workspace-label">ПЕРСОНАЛЬНАЯ АНАЛИТИКА</div>
        <nav aria-label="Основная навигация">
          {nav.map(([id, title, Icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon size={18} />
              <span>{title}</span>
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span /> Локальное хранилище
          </div>
          <p>
            Ваш прогресс.
            <br />
            Ваш следующий уровень.
          </p>
          <button onClick={toggleDemo}>
            <FlaskConical size={16} />
            {demo ? "Выйти из деморежима" : "Открыть деморежим"}
          </button>
          <small>VENATOR LAB / v1.0</small>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <div className="breadcrumb">
            Лаборатория <ChevronRight size={13} />{" "}
            <b>{nav.find((n) => n[0] === page)?.[1]}</b>
          </div>
          <span className="top-status">
            <span className="status-dot" />
            {demo ? "Тестовые данные" : "Личный журнал"}{" "}
            <span className="avatar">V</span>
          </span>
        </div>
        {demo && (
          <div className="demo-banner">
            <FlaskConical size={16} /> ДЕМОРЕЖИМ · Все матчи вымышлены. Личные
            данные не изменяются.<button onClick={toggleDemo}>Выйти</button>
          </div>
        )}
        {blocked && (
          <p role="alert" className="notice danger">
            Ошибка хранилища. Изменения заблокированы. Откройте настройки для
            экспорта исходных данных и восстановления.
          </p>
        )}
        <div className="page-content">
          <header className="page-heading">
            <div>
              <span className="eyebrow">DEADLOCK / VENATOR</span>
              <h1>
                {page === "overview"
                  ? "Каждый матч — шаг вперёд."
                  : nav.find((n) => n[0] === page)?.[1]}
              </h1>
              <p className="muted">
                {page === "overview"
                  ? "Замечайте закономерности. Тренируйтесь осознанно."
                  : "От наблюдений к конкретным игровым решениям."}
              </p>
            </div>
            <button
              className="primary"
              onClick={() =>
                edit(blankMatch(data.builds[0].id, data.settings.abilityName))
              }
            >
              <Plus size={18} /> Добавить матч
            </button>
          </header>
          {!["settings", "training"].includes(page) && (
            <div className="filters">
              <div className="segmented">
                {["7", "14", "30"].map((v) => (
                  <button
                    key={v}
                    className={period === v ? "selected" : ""}
                    onClick={() => changePeriod(v)}
                  >
                    {v} дней
                  </button>
                ))}
                <button
                  className={period === "custom" ? "selected" : ""}
                  onClick={() => changePeriod("custom")}
                >
                  Период
                </button>
              </div>
              <div className="date-range">
                <input
                  aria-label="Начало периода"
                  type="date"
                  value={dates.start}
                  max={dates.end}
                  onChange={(e) => {
                    if (e.target.value && e.target.value <= dates.end) {
                      setDates({ ...dates, start: e.target.value });
                      setPeriod("custom");
                    }
                  }}
                />
                <span>—</span>
                <input
                  aria-label="Конец периода"
                  type="date"
                  min={dates.start}
                  value={dates.end}
                  onChange={(e) => {
                    if (e.target.value && e.target.value >= dates.start) {
                      setDates({ ...dates, end: e.target.value });
                      setPeriod("custom");
                    }
                  }}
                />
              </div>
              <select
                aria-label="Фильтр билдов"
                value={build}
                onChange={(e) => setBuild(e.target.value)}
              >
                <option value="all">Все билды</option>
                {data.builds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Версия игры"
                value={patch}
                onChange={(e) => setPatch(e.target.value)}
              >
                <option value="all">Все патчи</option>
                {[...new Set(data.matches.map((m) => m.patch))].map((x) => (
                  <option key={x} value={x}>
                    {x || "Без метки патча"}
                  </option>
                ))}
              </select>
            </div>
          )}
          {page === "overview" && (
            <>
              <div className="section-label">
                <span>ОБЗОР РЕЗУЛЬТАТОВ</span>
                <span>
                  {s.n} матчей · {dates.start} — {dates.end}
                </span>
              </div>
              <div className="kpi-grid">
                <div className="kpi">
                  <div className="row">
                    <span>Матчей сыграно</span>
                    <Layers size={17} />
                  </div>
                  <div className="kpi-value">{s.n}</div>
                  <p>
                    <span className="accent">{s.wins} побед</span>{" "}
                    <span className="muted">/ {s.n - s.wins} поражений</span>
                  </p>
                  <small>{delta(s.n, p.n)} к прошлому периоду</small>
                </div>
                <div className="kpi">
                  <div className="row">
                    <span>Доля побед</span>
                    <ArrowUpRight size={18} />
                  </div>
                  <div className="kpi-value">
                    {fmt(s.wr)}
                    <small>%</small>
                  </div>
                  <p className="accent">{delta(s.wr, p.wr, true)}</p>
                  <small>Предыдущий период: n={p.n}</small>
                </div>
                <div className="kpi">
                  <div className="row">
                    <span>Средний KDA</span>
                    <Activity size={17} />
                  </div>
                  <div className="kpi-value">{fmt(s.kda, 2)}</div>
                  <p>
                    {fmt(s.kills)} <span className="muted">/</span>{" "}
                    {fmt(s.deaths)} <span className="muted">/</span>{" "}
                    {fmt(s.assists)}
                  </p>
                  <small>{delta(s.kda, p.kda)} к прошлому периоду</small>
                </div>
                <div className="kpi">
                  <div className="row">
                    <span>Стабильность</span>
                    <Shield size={17} />
                  </div>
                  <div className="kpi-value">
                    {fmt(s.stability, 0)}
                    <small>/100</small>
                  </div>
                  <p>
                    {s.n < 5
                      ? "Нужно не менее 5 матчей"
                      : "Постоянство индивидуального балла"}
                  </p>
                  <small>
                    {s.stability !== null && p.stability !== null
                      ? fmt(s.stability - p.stability) + " балла"
                      : "Недостаточно данных для сравнения"}
                  </small>
                </div>
              </div>
              <div className="dashboard-middle">
                <Panel
                  title="Качество индивидуальной игры"
                  sub="Performance Score · не официальный рейтинг"
                >
                  <div className="row chart-summary">
                    <div>
                      <span className="score-number">{fmt(s.score, 0)}</span>
                      <span className="muted"> / 100</span>
                      <p className="muted small">
                        Полнота{" "}
                        {fmt(coverage === null ? null : coverage * 100, 0)}% ·{" "}
                        {s.n < 5 || (coverage ?? 0) < 0.8
                          ? "Низкая достоверность"
                          : "Описательная оценка"}
                      </p>
                    </div>
                    <MetricSelect value={field} change={setField} />
                  </div>
                  <TrendChart
                    matches={current}
                    settings={data.settings}
                    field={field}
                  />
                  <div className="chart-foot">
                    <span>
                      <i /> Индивидуальная игра
                    </span>
                    <span>Каждая точка — один матч</span>
                  </div>
                </Panel>
                <Panel
                  title="Фокус следующей игры"
                  className="focus-panel"
                  sub="ТРЕНИРОВОЧНЫЙ БЛОК"
                >
                  <div className="focus-icon">
                    <Target size={28} />
                  </div>
                  {active ? (
                    <GoalCard goal={active} data={data} />
                  ) : (
                    <>
                      <Badge>Рекомендация по правилам</Badge>
                      <h3 className="focus-title">{recommend(data).title}</h3>
                      <p className="muted">{recommend(data).reason}</p>
                    </>
                  )}
                  <button
                    className="primary w-full"
                    onClick={() => go("training")}
                  >
                    {active ? "Открыть тренировку" : "Выбрать цель"}
                    <ArrowUpRight size={17} />
                  </button>
                </Panel>
              </div>
              <div className="mini-grid">
                {(
                  [
                    ["economy", "Души / мин"],
                    ["damage", "Урон героям / мин"],
                    ["minutes", "Длительность, мин"],
                    ["deaths", "Смерти / матч"],
                  ] as const
                ).map(([k, t]) => (
                  <div className="mini-stat" key={k}>
                    <span className="muted">{t}</span>
                    <strong>
                      {fmt(s[k], k === "economy" || k === "damage" ? 0 : 1)}
                    </strong>
                    <small>
                      {delta(s[k], p[k])} · n={s.n}
                    </small>
                  </div>
                ))}
              </div>
              <Panel
                title="Последние матчи"
                sub="Разберите одно решение, которое изменило ход игры."
              >
                <Matches
                  matches={[...current]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .slice(0, 5)}
                  data={data}
                  onEdit={edit}
                  onDelete={remove}
                />
                <button className="text-link" onClick={() => go("matches")}>
                  Весь журнал <ChevronRight size={15} />
                </button>
              </Panel>
            </>
          )}
          {page === "matches" && (
            <Panel
              title="История матчей"
              sub={`Найдено: ${journal.length}. Звёздочка у балла означает неполные данные.`}
            >
              <div className="toolbar">
                <input
                  aria-label="Поиск матчей"
                  placeholder="Поиск по билду, ошибке, заметке…"
                  value={query}
                  onChange={(e) => search(e.target.value)}
                />
                <select
                  aria-label="Исход матча"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="all">Любой исход</option>
                  <option value="true">Победы</option>
                  <option value="false">Поражения</option>
                </select>
              </div>
              <Matches
                matches={journal}
                data={data}
                onEdit={edit}
                onDelete={remove}
              />
            </Panel>
          )}
          {page === "calendar" && (
            <Calendar
              data={data}
              matches={filtered}
              onEdit={edit}
              onDelete={remove}
            />
          )}
          {page === "analysis" && <Analysis data={data} matches={filtered} />}
          {page === "skills" && (
            <Skills data={data} matches={current} previous={previous} />
          )}
          {page === "errors" && (
            <Errors matches={current} previous={previous} />
          )}
          {page === "training" && <Training data={data} update={update} />}
          {page === "builds" && (
            <Builds
              data={data}
              matches={data.matches.filter(
                (m) => patch === "all" || m.patch === patch,
              )}
              update={update}
              start={dates.start}
              end={dates.end}
            />
          )}
          {page === "settings" && (
            <Settings
              key={storeKey}
              data={data}
              update={update}
              storeKey={storeKey}
              notify={notify}
              recover={recover}
            />
          )}
          <footer className="app-footer">
            <span>VENATOR PERFORMANCE LAB</span>
            <span>Прогресс начинается с наблюдения.</span>
            <button onClick={() => go("settings")}>
              <Download size={13} /> Резервная копия
            </button>
          </footer>
        </div>
      </main>
      {editing && (
        <MatchForm
          match={editing}
          data={data}
          onClose={() => edit(null)}
          onSave={(m) => {
            const ms = data.matches.some((x) => x.id === m.id)
              ? data.matches.map((x) => (x.id === m.id ? m : x))
              : [...data.matches, m];
            if (update({ ...data, matches: ms })) edit(null);
          }}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <span>{toast}</span>
          <button aria-label="Закрыть уведомление" onClick={() => notify("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
