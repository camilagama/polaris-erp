import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BusinessTimeZoneNotice, TimeValue } from "./time-value";

const TIME_VALUE_INSTANT_PATTERN =
  /<time dateTime="2026-01-01T02:30:00\.000Z">31\/12\/2025.*23:30<\/time>/;

describe("TimeValue", () => {
  it("marks civil dates with their exact machine-readable value", () => {
    expect(
      renderToStaticMarkup(<TimeValue kind="civil-date" value="2026-01-01" />)
    ).toBe('<time dateTime="2026-01-01">01/01/2026</time>');
  });

  it("marks instants with the original timezone-aware value", () => {
    expect(
      renderToStaticMarkup(
        <TimeValue kind="instant" value="2026-01-01T02:30:00.000Z" />
      )
    ).toMatch(TIME_VALUE_INSTANT_PATTERN);
  });

  it("uses the shared short timezone note", () => {
    expect(renderToStaticMarkup(<BusinessTimeZoneNotice />)).toBe(
      '<p class="text-muted-foreground text-xs">Horários no fuso de São Paulo</p>'
    );
  });
});
