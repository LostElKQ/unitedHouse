import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatPhoneInput,
  formatVolume,
  PHONE_RE,
} from "./format.ts";

describe("formatMoney", () => {
  it("formats rubles with space groups and comma (СТ 7)", () => {
    expect(formatMoney(1234.56)).toBe("1 234,56 ₽");
    expect(formatMoney("2295.65")).toBe("2 295,65 ₽");
    expect(formatMoney(60)).toBe("60,00 ₽");
  });
});

describe("units", () => {
  it("formats water with 3 digits and area with 2", () => {
    expect(formatVolume("5")).toBe("5,000 м³");
    expect(formatVolume(3.333)).toBe("3,333 м³");
    expect(formatArea("72.4")).toBe("72,40 м²");
  });
});

describe("formatDate", () => {
  it("keeps date-only strings as is", () => {
    expect(formatDate("2026-11-15")).toBe("15.11.2026");
  });

  it("converts timestamps to the HOA time zone", () => {
    // 21:30 UTC — уже следующий день в Москве
    expect(formatDate("2026-10-31T21:30:00Z")).toBe("01.11.2026");
    expect(formatDateTime("2026-10-31T21:30:00Z")).toBe("01.11.2026 00:30");
  });
});

describe("formatPeriod", () => {
  it("names the month", () => {
    expect(formatPeriod(2026, 10)).toBe("Октябрь 2026");
  });
});

describe("formatPhoneInput", () => {
  it("builds the +7 mask while typing", () => {
    expect(formatPhoneInput("9")).toBe("+7 (9");
    expect(formatPhoneInput("900")).toBe("+7 (900)");
    expect(formatPhoneInput("89000000")).toBe("+7 (900) 000-0");
    expect(formatPhoneInput("+7 900 000-00-01")).toBe("+7 (900) 000-00-01");
    expect(formatPhoneInput("")).toBe("");
  });

  it("produces values accepted by the API pattern", () => {
    expect(PHONE_RE.test(formatPhoneInput("89000000001"))).toBe(true);
  });
});
