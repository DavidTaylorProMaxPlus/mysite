import { getSecret } from "wix-secrets-backend";
import { fetch } from "wix-fetch";

const BASE = "https://epc.opendatacommunities.org/api/v1";

// ---- helpers ----
function norm(s = "") {
  return String(s)
    .toUpperCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFlat(s = "") {
  const m = norm(s).match(/\bFLAT\s+([A-Z0-9]+)\b/);
  return m ? m[1] : null;
}

function scoreAddress(candidateAddr, hintAddr) {
  const a = norm(candidateAddr);
  const h = norm(hintAddr);
  if (!a || !h) return 0;

  const aTokens = new Set(a.split(" ").filter((t) => t.length > 1));
  const hTokens = new Set(h.split(" ").filter((t) => t.length > 1));

  let overlap = 0;
  for (const t of hTokens) if (aTokens.has(t)) overlap++;

  let score = Math.round((overlap / Math.max(3, hTokens.size)) * 10);

  const flatH = extractFlat(h);
  const flatA = extractFlat(a);
  if (flatH && flatA && flatH === flatA) score += 5;

  return Math.min(15, score);
}

function candidateAddress(row) {
  return (
    row.address ||
    row.address1 ||
    row["address"] ||
    row["address1"] ||
    `${row.buildingReferenceNumber || ""} ${row.address2 || ""} ${row.address3 || ""}`.trim()
  );
}

function getCertificateNumber(row) {
  // EPC commonly calls this lmk-key (LMK key)
  return (
    row.lmkKey ||
    row["lmk-key"] ||
    row.lmk_key ||
    row.certificateNumber ||
    row["certificate-number"] ||
    null
  );
}

/**
 * Normalise the "best" row into a stable shape for your front-end.
 * We keep key fields as top-level properties and also attach the raw certificate row under `_raw`
 * so your front-end can store it in `epcRaw` (Object field in CMS).
 */
function normaliseBestRow(best) {
  const b = best?.row || {};

  const keyFields = {
    currentEnergyRating:
      b.currentEnergyRating || b["current-energy-rating"] || b.current_energy_rating || null,
    currentEnergyEfficiency:
      b.currentEnergyEfficiency || b["current-energy-efficiency"] || b.current_energy_efficiency || null,

    potentialEnergyRating:
      b.potentialEnergyRating || b["potential-energy-rating"] || b.potential_energy_rating || null,
    potentialEnergyEfficiency:
      b.potentialEnergyEfficiency || b["potential-energy-efficiency"] || b.potential_energy_efficiency || null,

    lodgementDate: b.lodgementDate || b["lodgement-date"] || b.lodgement_date || null,
    expiryDate: b.expiryDate || b["expiry-date"] || b.expiry_date || null,

    certificateNumber: getCertificateNumber(b),
    address: best?.address || candidateAddress(b) || null,

    propertyType: b.propertyType || b["property-type"] || b.property_type || null,
    totalFloorArea: b.totalFloorArea || b["total-floor-area"] || b.total_floor_area || null
  };

  return {
    ...keyFields,
    _raw: b
  };
}

async function makeToken() {
  const email = await getSecret("EPC_EMAIL");
  const apiKey = await getSecret("EPC_API_KEY");
  if (!email || !apiKey) {
    throw new Error("Missing EPC secrets (EPC_EMAIL / EPC_API_KEY)");
  }
  return Buffer.from(`${email}:${apiKey}`).toString("base64");
}

async function epcSearchByPostcode(pcNoSpaces, token) {
  const url = `${BASE}/domestic/search?postcode=${encodeURIComponent(pcNoSpaces)}&size=100`;

  const res = await fetch(url, {
    method: "get",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${token}`
    }
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: "EPC API request failed",
      preview: text?.slice(0, 250)
    };
  }

  const rows = Array.isArray(json) ? json : json?.rows || json?.data || [];
  return { ok: true, status: 200, rows };
}

async function epcFetchByCertificate(lmkKey, token) {
  const url = `${BASE}/domestic/certificate/${encodeURIComponent(lmkKey)}`;

  const res = await fetch(url, {
    method: "get",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${token}`
    }
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: "EPC certificate request failed",
      preview: text?.slice(0, 250)
    };
  }

  // The endpoint sometimes returns:
  // - { rows: [ ... ] }
  // - [ ... ]
  // - { ... } (single object)
  const row =
    (Array.isArray(json?.rows) && json.rows[0]) ||
    (Array.isArray(json) && json[0]) ||
    json;

  return { ok: true, status: 200, row };
}

/**
 * Returns candidates for the Add Property dropdown.
 * (Deduped by address; includes certificateNumber/LMK key when available)
 */
export async function getDomesticEpcCandidates({ postcode } = {}) {
  try {
    const token = await makeToken();
    const pc = norm(postcode).replace(/\s/g, "");
    if (!pc) return { ok: false, status: 400, message: "postcode is required" };

    const r = await epcSearchByPostcode(pc, token);
    if (!r.ok) return r;
    if (!r.rows?.length) return { ok: true, status: 200, candidates: [] };

    const seen = new Set();
    const candidates = [];

    for (const row of r.rows) {
      const addr = candidateAddress(row);
      const key = norm(addr);
      if (!addr || !key || seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        address: addr,
        certificateNumber: getCertificateNumber(row),
        score: 0
      });

      if (candidates.length >= 60) break;
    }

    return { ok: true, status: 200, candidates };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      message: "getDomesticEpcCandidates crashed",
      error: String(err)
    };
  }
}

/**
 * Returns the best EPC match for a postcode (+ optional addressHint).
 * ✅ If certificateNumber is provided, it fetches that exact certificate (LMK key).
 */
export async function getLatestDomesticEpc({ postcode, addressHint, certificateNumber } = {}) {
  try {
    const token = await makeToken();

    const cert = String(certificateNumber || "").trim();
    const pc = norm(postcode).replace(/\s/g, "");
    const hint = norm(addressHint || "");

    // ✅ If certificate is provided, do NOT require postcode
    if (cert) {
      const certRes = await epcFetchByCertificate(cert, token);
      if (!certRes.ok) return certRes;

      const row = certRes.row || {};
      const address = candidateAddress(row);

      const best = { row, address, score: 15 };

      return {
        ok: true,
        status: 200,
        data: normaliseBestRow(best),
        matchScore: 15,
        warning: undefined,
        candidates: [
          {
            address: address || null,
            score: 15,
            certificateNumber: getCertificateNumber(row)
          }
        ],
        debug: {
          mode: "certificate",
          requestedCertificateNumber: cert,
          returnedCertificateNumber: getCertificateNumber(row),
          returnedAddress: address || null
        }
      };
    }

    // Fallback requires postcode
    if (!pc) return { ok: false, status: 400, message: "postcode is required" };

    const r = await epcSearchByPostcode(pc, token);
    if (!r.ok) return r;

    const rows = r.rows || [];
    if (!rows.length) {
      return {
        ok: false,
        status: 200,
        message: "No EPC results",
        candidates: [],
        debug: { mode: "postcode", postcode: pc }
      };
    }

    const scored = rows.map((row) => {
      const address = candidateAddress(row);
      const score = hint ? scoreAddress(address, hint) : 0;
      return { row, address, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const data = normaliseBestRow(best);

    const candidates = scored.slice(0, 20).map((x) => ({
      address: x.address || null,
      score: x.score ?? 0,
      certificateNumber: getCertificateNumber(x.row)
    }));

    const warning =
      hint && best.score < 9 ? `Low confidence address match (score=${best.score}).` : undefined;

    return {
      ok: true,
      status: 200,
      data,
      warning,
      matchScore: best.score,
      candidates,
      debug: {
        mode: "postcode",
        postcode: pc,
        hint: hint || null,
        bestAddress: best.address || null,
        bestCertificateNumber: getCertificateNumber(best.row)
      }
    };
  } catch (err) {
    return { ok: false, status: 500, message: "getLatestDomesticEpc crashed", error: String(err) };
  }
}