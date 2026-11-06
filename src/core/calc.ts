import Decimal from "decimal.js";
import type { PayslipInput, RateSchedule } from "./types";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

const d = (n: Decimal.Value) => new Decimal(n);
const r2 = (x: Decimal) => x.toDecimalPlaces(2);

export function incomeTax(taxable: Decimal, rs: RateSchedule): Decimal {
  const b = rs.brackets.find((x) => x.upTo === null || taxable.lte(x.upTo));
  if (!b) throw new Error("No tax bracket found");
  return r2(Decimal.max(taxable.times(b.rate).minus(b.deduction), 0));
}

export function calcPayslip(p: PayslipInput, rs: RateSchedule) {
  const day = r2(d(p.hourly).times(p.dayHours).times(rs.overtime.day));
  const night = r2(d(p.hourly).times(p.nightHours).times(rs.overtime.night));
  const rest = r2(d(p.hourly).times(p.restHours).times(rs.overtime.rest));
  const holiday = r2(d(p.hourly).times(p.holidayHours).times(rs.overtime.holiday));
  const overtime = r2(day.plus(night).plus(rest).plus(holiday));

  const gross = r2(d(p.basic).plus(p.transport).plus(p.other).plus(overtime));
  const employeePension = r2(d(p.basic).times(rs.employeePension));
  const employerPension = r2(d(p.basic).times(rs.employerPension));

  const exemptTransport = Decimal.min(
    d(p.transport),
    d(rs.transportCap),
    r2(d(p.basic).times(rs.transportPct)),
  );

  const taxable = r2(gross.minus(employeePension).minus(exemptTransport));
  const tax = incomeTax(taxable, rs);
  const totalDeduction = r2(employeePension.plus(tax).plus(p.otherDeduction));
  const net = r2(gross.minus(totalDeduction));

  return {
    day, night, rest, holiday, overtime,
    gross, employeePension, employerPension,
    exemptTransport, taxable, tax, totalDeduction, net,
  };
}