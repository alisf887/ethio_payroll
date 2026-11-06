import { describe, it, expect } from "vitest";
import { safeCell, toCsv } from "../src/export/csv";

describe("safeCell", () => {
  it("leaves normal text alone", () => {
    expect(safeCell("Abebe Kebede")).toBe("Abebe Kebede");
  });
  it("blocks formula injection", () => {
    expect(safeCell("=1+1")).toBe("'=1+1");
    expect(safeCell("+cmd")).toBe("'+cmd");
    expect(safeCell("-cmd")).toBe("'-cmd");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
  it("quotes commas and double quotes", () => {
    expect(safeCell("Doe, John")).toBe('"Doe, John"');
    expect(safeCell('He said "hi"')).toBe('"He said ""hi"""');
  });
  it("formats numbers with 2 decimals and keeps negatives", () => {
    expect(safeCell(11572)).toBe("11572.00");
    expect(safeCell(-5)).toBe("-5.00");
  });
});

describe("toCsv", () => {
  it("builds header and rows", () => {
    const csv = toCsv(
      [{ header: "name", key: "name" }, { header: "net", key: "net" }],
      [{ name: "Abebe", net: 11572 }],
    );
    expect(csv).toBe("name,net\nAbebe,11572.00");
  });
});