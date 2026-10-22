import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { type Match, type Settings } from "../model";
import { score, metric, kda } from "../stats";
export const fmt = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : n.toLocaleString("ru-RU", { maximumFractionDigits: d });
export function Panel({
  title,
  sub,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {sub && <p className="muted small">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
export function Empty({
  text = "Добавьте первый матч — здесь появится ваша статистика.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <span>◈</span>
      <h3>Пока нет данных</h3>
      <p>{text}</p>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function TrendChart({
  matches,
  settings,
  field,
}: {
  matches: Match[];
  settings: Settings;
  field: string;
}) {
  const rows = [...matches]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m, i) => ({
      name: String(i + 1),
      date: new Date(m.date).toLocaleString("ru-RU"),
      value:
        field === "score"
          ? score(m, settings).value
          : field === "kda"
            ? kda(m)
            : metric(m, field as "economy"),
    }));
  return rows.length ? (
    <div
      className="chart"
      role="img"
      aria-label="График выбранной метрики по матчам, от старых к новым"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={rows}
          margin={{ top: 12, right: 15, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bbdf71" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#bbdf71" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2b3032" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#7d8587"
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis stroke="#7d8587" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#202627",
              border: "1px solid #46504a",
              borderRadius: 10,
            }}
            labelFormatter={(_, p) => p[0]?.payload.date}
            formatter={(v) => [fmt(Number(v)), "Значение"]}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke="#bbdf71"
            fill="url(#chartFill)"
            strokeWidth={2}
            connectNulls={false}
            dot={rows.length < 15}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty />
  );
}
