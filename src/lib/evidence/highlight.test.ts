import { describe, expect, it } from "vitest";
import { locateEvidence, windowAround } from "./highlight";

const TEXT = "Preamble. The Contractor shall submit within 14 days. End of clause.";
const QUOTE = "submit within 14 days";
const START = TEXT.indexOf(QUOTE);

describe("locateEvidence", () => {
  it("uses the locator when it points at the quote", () => {
    const s = locateEvidence({
      documentText: TEXT,
      locator: { char_start: START, char_end: START + QUOTE.length },
      quote: QUOTE,
    });
    expect(s.strategy).toBe("locator");
    expect(s.match).toBe(QUOTE);
    expect(s.before + s.match + s.after).toBe(TEXT);
  });

  it("falls back to the quote when the locator is stale", () => {
    const s = locateEvidence({
      documentText: TEXT,
      locator: { char_start: 0, char_end: 8 }, // points at "Preamble"
      quote: QUOTE,
    });
    expect(s.strategy).toBe("quote");
    expect(s.match).toBe(QUOTE);
    expect(s.start).toBe(START);
  });

  it("falls back to the quote when the locator is out of range", () => {
    const s = locateEvidence({
      documentText: TEXT,
      locator: { char_start: 9000, char_end: 9100 },
      quote: QUOTE,
    });
    expect(s.strategy).toBe("quote");
  });

  it("accepts a locator with no quote to compare against", () => {
    const s = locateEvidence({
      documentText: TEXT,
      locator: { char_start: 0, char_end: 8 },
      quote: null,
    });
    expect(s.strategy).toBe("locator");
    expect(s.match).toBe("Preamble");
  });

  it("reports none rather than highlighting something arbitrary", () => {
    expect(locateEvidence({ documentText: TEXT, quote: "not in this document" }).strategy).toBe("none");
    expect(locateEvidence({ documentText: undefined, quote: QUOTE }).strategy).toBe("none");
    expect(locateEvidence({ documentText: "", quote: QUOTE }).match).toBe("");
  });

  it("ignores an inverted or empty locator range", () => {
    expect(locateEvidence({ documentText: TEXT, locator: { char_start: 20, char_end: 5 }, quote: QUOTE }).strategy).toBe("quote");
    expect(locateEvidence({ documentText: TEXT, locator: { char_start: 5, char_end: 5 }, quote: QUOTE }).strategy).toBe("quote");
  });
});

describe("windowAround", () => {
  it("keeps the match and trims the surrounding text with ellipses", () => {
    const long = "x".repeat(5000) + QUOTE + "y".repeat(5000);
    const span = locateEvidence({ documentText: long, quote: QUOTE });
    const w = windowAround(span, 100);
    expect(w.match).toBe(QUOTE);
    expect(w.before.startsWith("…")).toBe(true);
    expect(w.after.endsWith("…")).toBe(true);
    expect(w.before.length).toBeLessThan(120);
  });

  it("does not add ellipses when the text is already short", () => {
    const span = locateEvidence({ documentText: TEXT, quote: QUOTE });
    const w = windowAround(span, 900);
    expect(w.before).toBe(span.before);
    expect(w.after).toBe(span.after);
  });

  it("still returns readable text when nothing was located", () => {
    const span = locateEvidence({ documentText: TEXT, quote: "missing" });
    const w = windowAround(span, 20);
    expect(w.strategy).toBe("none");
    expect(w.before.length).toBeGreaterThan(0);
  });
});
