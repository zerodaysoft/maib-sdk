import { describe, expect, it } from "vitest";
import { buildQueryString } from "../src/query.js";

describe("buildQueryString", () => {
  it("encodes key-value pairs", () => {
    expect(buildQueryString({ foo: "bar", num: 42 })).toBe("foo=bar&num=42");
  });

  it("omits undefined values", () => {
    expect(buildQueryString({ a: "1", b: undefined, c: "3" })).toBe("a=1&c=3");
  });

  it("omits null values", () => {
    expect(buildQueryString({ a: "1", b: null, c: "3" })).toBe("a=1&c=3");
  });

  it("returns empty string for empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("returns empty string when all values are undefined", () => {
    expect(buildQueryString({ a: undefined, b: null })).toBe("");
  });

  it("encodes special characters", () => {
    expect(buildQueryString({ q: "hello world", tag: "a&b" })).toBe("q=hello%20world&tag=a%26b");
  });

  it("converts booleans and numbers to strings", () => {
    expect(buildQueryString({ active: true, count: 10 })).toBe("active=true&count=10");
  });
});
