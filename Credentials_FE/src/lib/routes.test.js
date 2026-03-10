import assert from "node:assert/strict";
import { buildVerifyPath, normalizePathname, parseRoute, sitePathForPage } from "./routes.js";

assert.equal(normalizePathname("/trust/"), "/trust");
assert.equal(normalizePathname(""), "/");

assert.deepEqual(parseRoute("/"), { view: "site", page: "home", verificationCode: "" });
assert.deepEqual(parseRoute("/how-it-works"), { view: "site", page: "how-it-works", verificationCode: "" });
assert.deepEqual(parseRoute("/app"), { view: "app", page: null, verificationCode: "" });
assert.deepEqual(parseRoute("/verify/NST-INT-1001"), {
  view: "verify",
  page: null,
  verificationCode: "NST-INT-1001",
});
assert.deepEqual(parseRoute("/verify"), { view: "verify", page: null, verificationCode: "" });

assert.equal(sitePathForPage("use-cases"), "/use-cases");
assert.equal(buildVerifyPath("nst-int-1001"), "/verify/NST-INT-1001");
assert.equal(buildVerifyPath(""), "/verify");

console.log("Route helper assertions passed.");
