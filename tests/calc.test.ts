import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { calcPayslip, incomeTax } from "../src/core/calc";
import { RATES_2025 } from "../src/core/rates";
import type { PayslipInput } from "../src/core/types";

const base: PayslipInput = {
  basic: 12000, transport: 2500, other: 0, otherDeduction: 0,
  hourly: 0, dayHours: 0, nightHours: 0, restHours: 0, holidayHours: 0,
};

describe("incomeTax boundaries", () => {
  const cases: [number, number][] = [
    [0, 0], [2000, 0], [4000, 300], [7000, 900],
    [10000, 1650], [14000, 2850], [20000, 4950],
  ];
  for (const [income, expected] of cases) {
    it(`tax on ${income} is ${expected}`, () => {
      expect(incomeTax(new Decimal(income), RATES_2025).toNumber()).toBe(expected);
    });
  }
});

describe("reference payslip", () => {
  const r = calcPayslip(base, RATES_2025);
  it("gross", () => expect(r.gross.toNumber()).toBe(14500));
  it("exempt transport", () => expect(r.exemptTransport.toNumber()).toBe(2200));
  it("taxable", () => expect(r.taxable.toNumber()).toBe(11460));
  it("tax", () => expect(r.tax.toNumber()).toBe(2088));
  it("net", () => expect(r.net.toNumber()).toBe(11572));
  it("employer pension", () => expect(r.employerPension.toNumber()).toBe(1320));
});

describe("transport and overtime", () => {
  it("transport exemption limited to 25% of basic", () => {
    const r = calcPayslip({ ...base, basic: 4000, transport: 2500 }, RATES_2025);
    expect(r.exemptTransport.toNumber()).toBe(1000);
  });
  it("day overtime 10h at 100", () => {
    const r = calcPayslip({ ...base, hourly: 100, dayHours: 10 }, RATES_2025);
    expect(r.day.toNumber()).toBe(1500);
  });
  it("holiday overtime 2h at 100", () => {
    const r = calcPayslip({ ...base, hourly: 100, holidayHours: 2 }, RATES_2025);
    expect(r.holiday.toNumber()).toBe(500);
  });
});