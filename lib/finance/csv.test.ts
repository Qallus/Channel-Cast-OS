import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyRules, guessColumns, mapRows, parseAmount, parseCsv, parseDate } from "./csv.ts";

describe("parseCsv", () => {
  it("handles quotes, embedded commas and CRLF", () => {
    const rows = parseCsv('Date,Description,Amount\r\n03/04/2026,"ADOBE, INC",54.99\r\n03/05/2026,"Say ""hi""",-10\r\n');
    assert.deepEqual(rows[1], ["03/04/2026", "ADOBE, INC", "54.99"]);
    assert.equal(rows[2][1], 'Say "hi"');
  });
  it("detects tab-separated paste from a spreadsheet", () => {
    assert.equal(parseCsv("a\tb\n1\t2")[1][1], "2");
  });
});

describe("parsing values", () => {
  it("amounts", () => {
    assert.equal(parseAmount("$1,234.56"), 1234.56);
    assert.equal(parseAmount("(12.00)"), -12);
    assert.equal(parseAmount("45.00 CR"), -45);
    assert.equal(parseAmount(""), null);
  });
  it("dates", () => {
    assert.equal(parseDate("3/4/26"), "2026-03-04");
    assert.equal(parseDate("2026-12-31"), "2026-12-31");
    assert.equal(parseDate("nope"), null);
  });
});

describe("mapRows", () => {
  it("reads a card export where positive = charge", () => {
    const rows = parseCsv("Transaction Date,Description,Amount\n01/02/2026,SUPABASE,25\n01/03/2026,PAYMENT THANK YOU,-500");
    const map = guessColumns(rows[0]);
    const { rows: out } = mapRows(rows.slice(1), map, "out");
    assert.equal(out[0].amount, -25);
    assert.equal(out[1].amount, 500);
  });
  it("reads separate debit/credit columns", () => {
    const rows = parseCsv("Date,Memo,Debit,Credit\n2026-01-02,Rent,1200,\n2026-01-03,Client,,3000");
    const { rows: out } = mapRows(rows.slice(1), guessColumns(rows[0]), "in");
    assert.deepEqual(out.map((r) => r.amount), [-1200, 3000]);
  });
});

describe("applyRules", () => {
  it("user rules beat built-ins", () => {
    assert.equal(applyRules("ADOBE CREATIVE", [{ id: "r", match: "adobe", category: "exp_rnd" }]).category, "exp_rnd");
    assert.equal(applyRules("ADOBE CREATIVE", []).category, "exp_software");
    assert.equal(applyRules("PAYMENT THANK YOU", []).category, "xfer_card_payment");
  });
});
