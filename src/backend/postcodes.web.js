import { webMethod, Permissions } from "wix-web-module";
import { fetch } from "wix-fetch";

export const lookupPostcode = webMethod(Permissions.Anyone, async (postcodeRaw) => {
  try {
    const postcode = String(postcodeRaw || "").trim();
    if (!postcode) {
      return { ok: false, error: "Missing postcode" };
    }

    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`;
    const res = await fetch(url, { method: "get" });

    const data = await res.json();

    if (!res.ok || data?.status !== 200) {
      return { ok: false, error: data?.error || "Postcode lookup failed" };
    }

    return { ok: true, result: data.result };
  } catch (err) {
    return { ok: false, error: err?.message || "Server error" };
  }
});