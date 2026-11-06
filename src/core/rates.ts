import type { RateSchedule } from "./types";

export const RATES_2025: RateSchedule = {
  effectiveFrom: "2025-07-01", // verify against the proclamation
  brackets: [
    { upTo: 2000, rate: 0, deduction: 0 },
    { upTo: 4000, rate: 0.15, deduction: 300 },
    { upTo: 7000, rate: 0.2, deduction: 500 },
    { upTo: 10000, rate: 0.25, deduction: 850 },
    { upTo: 14000, rate: 0.3, deduction: 1350 },
    { upTo: null, rate: 0.35, deduction: 2050 },
  ],
  employeePension: 0.07,
  employerPension: 0.11,
  transportCap: 2200,
  transportPct: 0.25,
  overtime: { day: 1.5, night: 1.75, rest: 2, holiday: 2.5 },
};