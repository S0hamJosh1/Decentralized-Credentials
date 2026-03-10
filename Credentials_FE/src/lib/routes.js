export const SITE_PAGES = ["home", "how-it-works", "use-cases", "trust"];

export function normalizePathname(pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const trimmed = normalized.replace(/\/+$/, "");
  return trimmed || "/";
}

export function parseRoute(pathname = "/") {
  const normalized = normalizePathname(pathname);

  if (normalized === "/app") {
    return { view: "app", page: null, verificationCode: "" };
  }

  if (normalized === "/how-it-works") {
    return { view: "site", page: "how-it-works", verificationCode: "" };
  }

  if (normalized === "/use-cases") {
    return { view: "site", page: "use-cases", verificationCode: "" };
  }

  if (normalized === "/trust") {
    return { view: "site", page: "trust", verificationCode: "" };
  }

  if (normalized.startsWith("/verify/")) {
    return {
      view: "verify",
      page: null,
      verificationCode: decodeURIComponent(normalized.replace("/verify/", "")),
    };
  }

  if (normalized === "/verify") {
    return { view: "verify", page: null, verificationCode: "" };
  }

  return { view: "site", page: "home", verificationCode: "" };
}

export function sitePathForPage(page = "home") {
  if (page === "how-it-works") return "/how-it-works";
  if (page === "use-cases") return "/use-cases";
  if (page === "trust") return "/trust";
  return "/";
}

export function buildVerifyPath(verificationCode = "") {
  const normalizedCode = verificationCode.trim().toUpperCase();
  return normalizedCode ? `/verify/${encodeURIComponent(normalizedCode)}` : "/verify";
}

export function pushRoute(pathname, options = {}) {
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function resolveVerificationUrl(pathname, origin = window.location.origin) {
  return new URL(pathname, origin).toString();
}
