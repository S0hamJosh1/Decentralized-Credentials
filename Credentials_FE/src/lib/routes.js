export const SITE_PAGES = ["workspace"];

export function normalizePathname(pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const trimmed = normalized.replace(/\/+$/, "");
  return trimmed || "/";
}

export function parseRoute(pathname = "/") {
  const normalized = normalizePathname(pathname);

  if (normalized === "/" || normalized === "/app") {
    return { view: "workspace", page: null, verificationCode: "", invitationCode: "" };
  }

  if (normalized.startsWith("/join/")) {
    return {
      view: "join",
      page: null,
      verificationCode: "",
      invitationCode: decodeURIComponent(normalized.replace("/join/", "")),
    };
  }

  if (normalized.startsWith("/verify/")) {
    return {
      view: "verify",
      page: null,
      verificationCode: decodeURIComponent(normalized.replace("/verify/", "")),
      invitationCode: "",
    };
  }

  if (normalized === "/verify") {
    return { view: "verify", page: null, verificationCode: "", invitationCode: "" };
  }

  // Old marketing/demo paths now route back into the workspace app.
  return { view: "workspace", page: null, verificationCode: "", invitationCode: "" };
}

export function sitePathForPage(page = "workspace") {
  return "/";
}

export function buildVerifyPath(verificationCode = "") {
  const normalizedCode = verificationCode.trim().toUpperCase();
  return normalizedCode ? `/verify/${encodeURIComponent(normalizedCode)}` : "/verify";
}

export function buildJoinPath(invitationCode = "") {
  const normalizedCode = invitationCode.trim();
  return normalizedCode ? `/join/${encodeURIComponent(normalizedCode)}` : "/";
}

export function pushRoute(pathname, options = {}) {
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function resolveVerificationUrl(pathname, origin = window.location.origin) {
  return new URL(pathname, origin).toString();
}
