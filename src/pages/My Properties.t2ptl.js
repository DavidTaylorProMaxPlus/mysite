import { getMyProperties } from "backend/properties";
import wixUsers from "wix-users";
import wixLocation from "wix-location";

console.log("getMyProperties typeof (top):", typeof getMyProperties);

/* =========================================================
   ✅ EPC colours updated to MATCH your EPC screenshot exactly
   ========================================================= */

const EPC_COLORS = {
  A: { bg: "#5AC287", text: "#111111" },
  B: { bg: "#54AF62", text: "#111111" },
  C: { bg: "#9ACA5C", text: "#111111" },
  D: { bg: "#F9D34A", text: "#111111" },
  E: { bg: "#F0AB70", text: "#111111" },
  F: { bg: "#E1843F", text: "#111111" },
  G: { bg: "#D53745", text: "#111111" }
};

/* =========================================================
   🎨 EPC colours (lit + dim) for BAR graphics
   ========================================================= */

const EPC_COLOURS_LIT = {
  A: "#5AC287",
  B: "#54AF62",
  C: "#9ACA5C",
  D: "#F9D34A",
  E: "#F0AB70",
  F: "#E1843F",
  G: "#D53745"
};

const EPC_COLOURS_DIM = {
  A: "#D6F0E1",
  B: "#D4EBD8",
  C: "#E6F2D6",
  D: "#FEF4D2",
  E: "#FBEADB",
  F: "#F8E0CF",
  G: "#F4CDD0"
};

function safeText(v, fallback = "—") {
  const t = String(v ?? "").trim();
  return t.length ? t : fallback;
}

function safeNumberText(v, fallback = "Not set") {
  if (v === 0) return "0";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : fallback;
}

function normPostcode(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

// ---- Media helpers ----
function extractSrc(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.src) return v.src;
  return v.fileUrl || v.url || v.mediaUrl || null;
}

function guessTypeFromSrc(src) {
  const s = String(src || "").toLowerCase();
  if (s.includes(".pdf") || s.startsWith("wix:document://")) return "document";
  return "image";
}

function toGalleryItems(value) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  return arr
    .map((v) => {
      const src = extractSrc(v);
      if (!src) return null;
      const type = typeof v === "object" && v.type ? v.type : guessTypeFromSrc(src);
      return { src, type, title: "", description: "" };
    })
    .filter(Boolean);
}

function hasUsablePhotos(item) {
  return toGalleryItems(item?.photos2).length > 0;
}

// ---- EPC helpers ----
function normaliseEpcLetter(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return ["A", "B", "C", "D", "E", "F", "G"].includes(s) ? s : null;
}

function getEpcRatingFromItem(itemData) {
  const direct = normaliseEpcLetter(itemData?.epcCurrentRating);
  if (direct) return direct;

  const raw = itemData?.epcRaw;
  return (
    normaliseEpcLetter(raw?.currentEnergyRating) ||
    normaliseEpcLetter(raw?.["current-energy-rating"]) ||
    normaliseEpcLetter(raw?.current_energy_rating) ||
    null
  );
}

function getEpcScoreFromItem(itemData) {
  const direct = Number(itemData?.epcCurrentScore);
  if (Number.isFinite(direct)) return direct;

  const raw = itemData?.epcRaw;
  const fromRaw =
    Number(raw?.currentEnergyEfficiency) ||
    Number(raw?.["energy-efficiency-current"]) ||
    Number(raw?.current_energy_efficiency);

  return Number.isFinite(fromRaw) ? fromRaw : null;
}

function getEpcPotentialLetterFromItem(itemData) {
  const direct = normaliseEpcLetter(itemData?.epcPotentialRating);
  if (direct) return direct;

  const raw = itemData?.epcRaw;
  const r =
    raw?.potentialEnergyRating ||
    raw?.["potential-energy-rating"] ||
    raw?.potential_energy_rating;

  return normaliseEpcLetter(r);
}

function getEpcPotentialScoreFromItem(itemData) {
  const direct = Number(itemData?.epcPotentialScore);
  if (Number.isFinite(direct)) return direct;

  const raw = itemData?.epcRaw;
  const fromRaw =
    Number(raw?.potentialEnergyEfficiency) ||
    Number(raw?.["energy-efficiency-potential"]) ||
    Number(raw?.potential_energy_efficiency);

  return Number.isFinite(fromRaw) ? fromRaw : null;
}

function getFloorAreaFromItem(itemData) {
  const candidates = [
    itemData?.epcFloorArea,
    itemData?.floorArea,
    itemData?.floorAreaM2,
    itemData?.floorAreaSqm,
    itemData?.floor_area,
    itemData?.floor_area_m2,
    itemData?.totalFloorArea,
    itemData?.internalArea,
    itemData?.squareMeters,
    itemData?.sqm,
    itemData?.epcRaw?.totalFloorArea,
    itemData?.epcRaw?.["total-floor-area"],
    itemData?.epcRaw?.total_floor_area
  ];

  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

// ✅ Container Box safe background setter
function setBgSafe(el, color) {
  if (!el) return false;
  if (el.style && typeof el.style.backgroundColor !== "undefined") {
    el.style.backgroundColor = color;
    return true;
  }
  return false;
}

function applyBadgeLetterColorInRepeater($item, letter, debugId = "") {
  const badge = $item("#epcBadgeLetter");
  if (!badge) return;

  const key = normaliseEpcLetter(letter);
  const color = key ? (EPC_COLOURS_LIT[key] || EPC_COLORS[key]?.bg) : null;
  const finalColor = color || "#111111";

  setTimeout(() => {
    let didSomething = false;

    if (badge.style && typeof badge.style.color !== "undefined") {
      badge.style.color = finalColor;
      didSomething = true;
    }

    if (badge.style && typeof badge.style.backgroundColor !== "undefined") {
      badge.style.backgroundColor = "transparent";
      didSomething = true;
    }

    if (!didSomething) {
      console.warn("⚠️ #epcBadgeLetter can't be styled (style props missing):", {
        debugId,
        elementType: badge.type,
        attemptedColor: finalColor
      });
    }
  }, 0);
}

function hideAllEpcShadows($item, debugId = "") {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const missing = [];

  letters.forEach((letter) => {
    const id = `#epcShadow${letter}`;
    const el = $item(id);
    if (!el) {
      missing.push(id);
      return;
    }
    el.hide?.();
  });

  if (missing.length) {
    console.warn("⚠️ EPC shadow boxes missing (create these in the repeater):", {
      debugId,
      missing,
      tip: "Duplicate each #epcBarX, rename to #epcShadowX, send behind, add shadow in Design, keep inside repeater item."
    });
  }
}

function showEpcShadow($item, ratingLetter, debugId = "") {
  if (!ratingLetter) return;

  const el = $item(`#epcShadow${ratingLetter}`);
  if (!el) {
    console.warn("⚠️ Could not show EPC shadow (missing element):", {
      debugId,
      ratingLetter,
      expectedId: `#epcShadow${ratingLetter}`
    });
    return;
  }
  el.show?.();
}

function resetEpcBarsToDim($item, debugId = "") {
  const letters = ["A", "B", "C", "D", "E", "F", "G"];
  const missing = [];
  const noStyle = [];

  letters.forEach((letter) => {
    const id = `#epcBar${letter}`;
    const el = $item(id);

    if (!el) {
      missing.push(id);
      return;
    }

    el.show?.();

    const dimColor = EPC_COLOURS_DIM[letter];
    const ok = setBgSafe(el, dimColor);

    if (!ok) {
      noStyle.push({ id, elementType: el.type });
    }
  });

  if (missing.length) {
    console.warn("❌ EPC BAR IDs not found inside repeater item:", {
      debugId,
      missing
    });
  }

  if (noStyle.length) {
    console.warn("⚠️ EPC BAR elements exist but backgroundColor not supported:", {
      debugId,
      noStyle,
      tip: "These must be Container Boxes (not shapes/vectors)."
    });
  }

  return { missing, noStyle };
}

function highlightEpcBar($item, ratingLetter, debugId = "") {
  resetEpcBarsToDim($item, debugId);
  hideAllEpcShadows($item, debugId);

  if (!ratingLetter) return;

  const bar = $item(`#epcBar${ratingLetter}`);
  if (!bar) return;

  const litColor = EPC_COLOURS_LIT[ratingLetter] || EPC_COLOURS_LIT.G;
  setBgSafe(bar, litColor);

  showEpcShadow($item, ratingLetter, debugId);
}

$w.onReady(async () => {
  console.log("✅ MY PROPERTIES ONREADY RAN");
  console.log("getMyProperties typeof (onReady):", typeof getMyProperties);

  const user = wixUsers.currentUser;
  if (!user.loggedIn) {
    console.log("❌ User not logged in on My Properties");
    return;
  }

  const repeater = $w("#propertiesRepeater");
  const emptyStateGroup = $w("#emptyStateGroup");

  emptyStateGroup?.collapse();
  repeater.data = [];

  let dbgCount = 0;

  repeater.onItemReady(($item, itemData) => {
    $item("#addressLineText").text = safeText(itemData.propertyAddress);
    $item("#typeText").text = safeText(itemData.propertyType);
    $item("#bedroomsText").text = safeNumberText(itemData.bedrooms);

    // Photos
    const photos = toGalleryItems(itemData.photos2);
    const photosGallery = $item("#photosGallery");
    const photosSlider = $item("#photosSlider");
    if (photosGallery) photosGallery.items = photos;
    if (photosSlider) photosSlider.items = photos;

    // Floorplans
    const floorplans = toGalleryItems(itemData.floorplan2);
    const floorplanGallery = $item("#floorplanGallery");
    if (floorplanGallery) floorplanGallery.items = floorplans;

    // EPC
    const currentLetter = getEpcRatingFromItem(itemData);
    highlightEpcBar($item, currentLetter, itemData?._id);

    const badgeLetterEl = $item("#epcBadgeLetter");
    if (badgeLetterEl) badgeLetterEl.text = currentLetter ?? "—";
    applyBadgeLetterColorInRepeater($item, currentLetter, itemData?._id);

    const currentScore = getEpcScoreFromItem(itemData);
    const potentialLetter = getEpcPotentialLetterFromItem(itemData);
    const potentialScore = getEpcPotentialScoreFromItem(itemData);
    const floorArea = getFloorAreaFromItem(itemData);

    const epcRatingTextEl = $item("#epcRatingText");
    if (epcRatingTextEl) {
      epcRatingTextEl.text =
        `EPC: ${currentLetter ?? "—"}` + (currentScore != null ? ` (${currentScore})` : "");
    }

    const epcPotentialTextEl = $item("#epcPotentialText");
    if (epcPotentialTextEl) {
      epcPotentialTextEl.text =
        `Potential: ${potentialLetter ?? "—"}` + (potentialScore != null ? ` (${potentialScore})` : "");
    }

    const epcFloorAreaTextEl = $item("#epcFloorAreaText");
    if (epcFloorAreaTextEl) {
      epcFloorAreaTextEl.text =
        floorArea != null ? `Floor area: ${floorArea} m²` : "Floor area: —";
    }

    if (dbgCount < 5) {
      console.log("🧪 EPC/FLOOR DEBUG:", {
        id: itemData?._id,
        address: itemData?.propertyAddress,
        currentLetter,
        currentScore,
        potentialLetter,
        potentialScore,
        floorAreaResolved: floorArea,
        itemDataKeys: Object.keys(itemData || {})
      });

      console.log("🔎 REPEATER ITEM KEYS:", Object.keys(itemData || {}));
      console.log("🔎 REPEATER ITEM DATA:", itemData);

      dbgCount++;
    }

    // View button
    const postcode = normPostcode(itemData.PostCode);
    const url =
      postcode && itemData._id
        ? `/properties/${encodeURIComponent(postcode)}/${itemData._id}`
        : "";

    const btn = $item("#viewPropertyBtn");

    if (!url) {
      btn?.hide?.();
      btn?.disable?.();
    } else {
      btn.label = "View Property";

      // IMPORTANT: do not use btn.link, force manual navigation instead
      try {
        btn.link = "";
      } catch (e) {}

      btn.target = "_self";
      btn?.show?.();
      btn?.enable?.();

      btn.onClick(() => {
        console.log("👉 Manual property navigation:", {
          clickedId: itemData?._id,
          postcode,
          url
        });
        wixLocation.to(url);
      });
    }
  });

  try {
    if (typeof getMyProperties !== "function") {
      console.error("❌ getMyProperties is not a function. Import/path issue.");
      emptyStateGroup?.expand();
      return;
    }

    const res = await getMyProperties({ limit: 200 });
    console.log("getMyProperties() response:", res);

    if (!res?.ok) {
      console.warn("❌ getMyProperties failed:", res);
      emptyStateGroup?.expand();
      return;
    }

    const items = Array.isArray(res.items) ? res.items : [];
    console.log("✅ Loaded items count:", items.length);

    const itemsToShow = items.filter((i) => i && i._id).filter(hasUsablePhotos);
    console.log("✅ Items shown (with usable photos):", itemsToShow.length);

    repeater.data = itemsToShow;

    if (!itemsToShow.length) emptyStateGroup?.expand();
    else emptyStateGroup?.collapse();
  } catch (err) {
    console.error("❌ My Properties load failed:", err);
    emptyStateGroup?.expand();
  }
});