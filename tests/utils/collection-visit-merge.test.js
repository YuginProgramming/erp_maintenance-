import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDateStub,
  mergeSolitonEntries,
  parseSolitonDate,
  pickVisitDate,
} from "../../utils/collection-visit-merge.js";

describe("mergeSolitonEntries", () => {
  it("merges купюри and монети a few seconds apart into one visit", () => {
    const visits = mergeSolitonEntries([
      {
        date: "2026-09-16 13:38:04",
        banknotes: "722.00",
        coins: "0.00",
        descr: "Дмитро  - ",
      },
      {
        date: "2026-09-16 13:38:08",
        banknotes: "0.00",
        coins: "861.50",
        descr: "Дмитро  - ",
      },
    ]);

    assert.equal(visits.length, 1);
    assert.equal(visits[0].banknotes, 722);
    assert.equal(visits[0].coins, 861.5);
    assert.equal(visits[0].total_sum, 1583.5);
    assert.equal(visits[0].date.getTime(), parseSolitonDate("2026-09-16 13:38:04").getTime());
  });

  it("keeps two real visits hours apart as two packets", () => {
    const visits = mergeSolitonEntries([
      { date: "2026-09-16 13:38:04", banknotes: "722.00", coins: "0.00" },
      { date: "2026-09-16 23:08:41", banknotes: "40.00", coins: "0.00" },
    ]);

    assert.equal(visits.length, 2);
    assert.equal(visits[0].banknotes, 722);
    assert.equal(visits[1].banknotes, 40);
  });

  it("skips zero-sum lines", () => {
    const visits = mergeSolitonEntries([
      { date: "2026-09-16 13:38:04", banknotes: "0.00", coins: "0.00" },
    ]);
    assert.equal(visits.length, 0);
  });
});

describe("date stubs", () => {
  it("treats UTC midnight as the 03:00 Kyiv duplicate", () => {
    const stub = parseSolitonDate("2026-09-16");
    const real = parseSolitonDate("2026-09-16 13:38:04");
    assert.equal(isDateStub(stub), true);
    assert.equal(isDateStub(real), false);
    assert.equal(pickVisitDate(stub, real).getTime(), real.getTime());
  });
});
