import { blankMatch, emptyData, localDate, mistakes, type Data } from "./model";
export function demoData(): Data {
  const d = emptyData();
  d.builds = [
    {
      id: "default",
      name: "Основной · оружие",
      notes: "Демонстрационный вариант",
    },
    {
      id: "grenade",
      name: "Эксперимент · граната",
      notes: "Демонстрационный вариант",
    },
  ];
  for (let i = 0; i < 84; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(i / 3));
    date.setHours(18 + (i % 3), 15, 0, 0);
    if (date > new Date()) date.setDate(date.getDate() - 1);
    const m = blankMatch(i % 3 ? "default" : "grenade", "Ключевая способность");
    const n = (Math.sin(i * 73 + 12) + 1) / 2;
    m.date = date.toISOString();
    m.id = "demo-" + i;
    m.minutes = 24 + ((i * 7) % 22);
    m.win = n > 0.38;
    m.kills = 4 + Math.floor(n * 14);
    m.deaths = 2 + (i % 9);
    m.assists = 5 + (i % 15);
    m.souls = Math.round(m.minutes * (650 + n * 420 + (84 - i) * 1.3));
    m.damage = Math.round(m.minutes * (400 + n * 700));
    m.objects = i % 4 ? Math.round(m.minutes * (50 + n * 220)) : null;
    m.mainError = mistakes[i % mistakes.length];
    m.errors = [m.mainError];
    m.position = 2 + (i % 4);
    m.focus = 3 + (i % 3);
    m.team = 2 + (i % 4);
    m.decisions = 2 + (i % 4);
    m.ability = i % 3 ? 3 + (i % 3) : null;
    m.lane = i % 3 === 0 ? "Поражение" : i % 3 === 1 ? "Равная" : "Победа";
    m.patch = "Демо";
    m.notes = `Тестовая запись ${localDate(date)}. Не является реальным матчем.`;
    m.goalDone = i % 3 !== 0;
    d.matches.push(m);
  }
  return d;
}
