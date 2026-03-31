import { describe, it, expect } from "vitest";
import { getErrorMessage } from "../errorUtils";

describe("getErrorMessage", () => {
  it("returns message from an Error instance", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe(
      "something broke",
    );
  });

  it("returns a string error directly", () => {
    expect(getErrorMessage("network failure")).toBe("network failure");
  });

  it("returns a generic message for a number", () => {
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });

  it("returns a generic message for null", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
  });

  it("returns a generic message for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
  });

  it("returns a generic message for a plain object", () => {
    expect(getErrorMessage({ code: 500 })).toBe(
      "An unexpected error occurred",
    );
  });
});
