import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { demoData } from "../demo";
import { Matches } from "./Matches";
import { Skills, Errors, Calendar, Analysis } from "./Analysis";
import { Training } from "./Training";
import { Builds } from "./Builds";
import { Settings } from "./Settings";
import { emptyData } from "../model";
import App from "../App";
const noop = () => {};
describe("Рендер компонентов без браузера", () => {
  for (const mode of ["empty", "demo"]) {
    const data = mode === "demo" ? demoData() : emptyData();
    it(`Страницы ${mode} не падают`, () => {
      for (const component of [
        <Matches
          matches={data.matches}
          data={data}
          onEdit={noop}
          onDelete={noop}
        />,
        <Skills data={data} matches={data.matches} previous={[]} />,
        <Errors matches={data.matches} previous={[]} />,
        <Calendar
          data={data}
          matches={data.matches}
          onEdit={noop}
          onDelete={noop}
        />,
        <Analysis data={data} matches={data.matches} />,
        <Training data={data} update={() => true} />,
        <Builds
          data={data}
          matches={data.matches}
          update={() => true}
          start="2026-01-01"
          end="2026-12-31"
        />,
        <Settings
          data={data}
          update={() => true}
          storeKey="test"
          notify={noop}
          recover={() => true}
        />,
      ])
        expect(renderToString(component).length).toBeGreaterThan(100);
    });
  }
  it("Стартовая оболочка доступна при запрете localStorage", () => {
    expect(renderToString(<App />)).toContain("Каждый матч");
  });
});
