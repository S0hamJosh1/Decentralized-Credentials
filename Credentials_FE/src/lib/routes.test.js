import assert from "node:assert/strict";
import { buildJoinPath, buildVerifyPath, normalizePathname, parseRoute, sitePathForPage } from "./routes.js";

assert.equal(normalizePathname("/trust/"), "/trust");
assert.equal(normalizePathname(""), "/");

assert.deepEqual(parseRoute("/"), { view: "workspace", page: null, verificationCode: "", invitationCode: "" });
// Old marketing/demo paths now land in the workspace app
assert.deepEqual(parseRoute("/how-it-works"), { view: "workspace", page: null, verificationCode: "", invitationCode: "" });
assert.deepEqual(parseRoute("/use-cases"), { view: "workspace", page: null, verificationCode: "", invitationCode: "" });
assert.deepEqual(parseRoute("/trust"), { view: "workspace", page: null, verificationCode: "", invitationCode: "" });

assert.deepEqual(parseRoute("/app"), { view: "workspace", page: null, verificationCode: "", invitationCode: "" });
assert.deepEqual(parseRoute("/join/JOIN-123"), { view: "join", page: null, verificationCode: "", invitationCode: "JOIN-123" });
assert.deepEqual(parseRoute("/verify/NST-INT-1001"), {
  view: "verify",
  page: null,
  verificationCode: "NST-INT-1001",
  invitationCode: "",
});
assert.deepEqual(parseRoute("/verify"), { view: "verify", page: null, verificationCode: "", invitationCode: "" });

assert.equal(sitePathForPage("workspace"), "/");
assert.equal(sitePathForPage("use-cases"), "/");
assert.equal(buildJoinPath("join-123"), "/join/join-123");
assert.equal(buildVerifyPath("nst-int-1001"), "/verify/NST-INT-1001");
assert.equal(buildVerifyPath(""), "/verify");

console.log("Route helper assertions passed.");
