export const EMPTY_ORGANIZATION = {
  id: "",
  name: "",
  slug: "",
  sector: "",
  website: "",
  verificationDomain: "",
  status: "Active",
  description: "",
};

export function slugifyCompanyName(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
