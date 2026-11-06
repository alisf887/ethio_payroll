export interface Bracket {
  upTo: number | null; // null = no upper limit
  rate: number;
  deduction: number;
}

export interface RateSchedule {
  effectiveFrom: string;
  brackets: Bracket[];
  employeePension: number;
  employerPension: number;
  transportCap: number;
  transportPct: number;
  overtime: { day: number; night: number; rest: number; holiday: number };
}

export interface PayslipInput {
  basic: number;
  transport: number;
  other: number;
  otherDeduction: number;
  hourly: number;
  dayHours: number;
  nightHours: number;
  restHours: number;
  holidayHours: number;
}