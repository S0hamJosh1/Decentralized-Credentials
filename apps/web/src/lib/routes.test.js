import { describe, expect, test } from "vitest";
import { buildJoinPath, buildResetPasswordPath, buildVerifyPath, normalizePathname, parseRoute, sitePathForPage } from "./routes.js";

describe("route helpers", () => {
  test("normalizes and parses workspace routes", () => {
    expect(normalizePathname("/trust/")).toBe("/trust");
    expect(normalizePathname("")).toBe("/");

    expect(parseRoute("/")).toEqual({
      view: "workspace",
      page: null,
      verificationCode: "",
      invitationCode: "",
      resetToken: "",
    });

    expect(parseRoute("/how-it-works")).toEqual({
      view: "workspace",
      page: null,
      verificationCode: "",
      invitationCode: "",
      resetToken: "",
    });

    expect(parseRoute("/join/JOIN-123")).toEqual({
      view: "join",
      page: null,
      verificationCode: "",
      invitationCode: "JOIN-123",
      resetToken: "",
    });

    expect(parseRoute("/verify/NST-INT-1001")).toEqual({
      view: "verify",
      page: null,
      verificationCode: "NST-INT-1001",
      invitationCode: "",
      resetToken: "",
    });

    expect(parseRoute("/reset-password/token-123")).toEqual({
      view: "reset-password",
      page: null,
      verificationCode: "",
      invitationCode: "",
      resetToken: "token-123",
    });
  });

  test("builds join, reset, and verify paths", () => {
    expect(sitePathForPage("workspace")).toBe("/");
    expect(sitePathForPage("use-cases")).toBe("/");
    expect(buildJoinPath("join-123")).toBe("/join/join-123");
    expect(buildResetPasswordPath("token-123")).toBe("/reset-password/token-123");
    expect(buildVerifyPath("nst-int-1001")).toBe("/verify/NST-INT-1001");
    expect(buildVerifyPath("")).toBe("/verify");
  });
});
