// Properties (Item) dynamic page code
import { getLatestDomesticEpc } from "backend/epc";
import { lookupPostcode } from "backend/postcodes.web";
import wixData from "wix-data";
import wixLocation from "wix-location";
import { session } from "wix-storage";

const COLLECTION = "Properties";
const EPC_FRESH_DAYS = 30;

const EPC_COLORS = {
  A: { bg: "#2E7D32", text: "#FFFFFF" },
  B: { bg: "#43A047", text: "#FFFFFF" },
  C: { bg: "#8BC34A", text: "#111111" },
  D: { bg: "#FDD835", text: "#111111" },
  E: { bg: "#FB8C00", text: "#111111" },
  F: { bg: "#F4511E", text: "#FFFFFF" },
  G: { bg: "#D32F2F", text: "#FFFFFF" }
};

/* =========================================================
   LIVE COMPLIANCE UI CONFIG
   ========================================================= */

const COMPLIANCE_INPUTS = {
  gasHasCert: "#gasApplianceRadio",
  gasIssueDate: "#gasCertificateDate",

  electricalIssueDate: "#eicrDate",

  smokeAlarmStatus: "#smokeAlarmRadio",
  coAlarmStatus: "#coAlarmRadio",

  depositTaken: "#depositProtectedRadio"
};

const COMPLIANCE_UI = {
  percentTextIds: ["#compliancePercentText", "#complianceScoreText"],
  progressFillIds: ["#complianceProgressBar", "#complianceProgressFill"],
  scoreLabel: "#complianceScoreLabel",
  moodText: "#complianceScoreMoodText",
  nextStepText: "#nextStepText",
  actionsSummaryText: "#actionsSummaryText",
  epcFreshnessText: "#epcFreshnessText",
  actionsRepeater: "#actionsRepeater"
};

const JOURNEY_UI = {
  epcPrioritySection: "#epcPrioritySection",
  generalComplianceSection: "#generalComplianceSection",
  journeyIntroText: "#journeyIntroText",
  journeySummarySection: "#journeySummarySection",
  journeySummaryTitle: "#journeySummaryTitle",
  journeySummaryText: "#journeySummaryText"
};

const CARD_STATE_STYLES = {
  unanswered: {
    bg: "#F5F5F5",
    badge: "Step",
    icon: "○"
  },
  pass: {
    bg: "#E8F5E9",
    badge: "Done",
    icon: "✓"
  },
  warning: {
    bg: "#FFF8E1",
    badge: "Action needed",
    icon: "!"
  },
  fail: {
    bg: "#FDECEC",
    badge: "Urgent",
    icon: "✕"
  }
};

const CARD_ID_MAP = {
  gasSafety: {
    bg: "#gasSafetyCardBg",
    icon: "#gasSafetyStateIcon",
    badge: "#gasSafetyStepBadge",
    status: "#gasSafetyStatus"
  },
  electrical: {
    bg: "#electricalCardBg",
    icon: "#electricalStateIcon",
    badge: "#electricalStepBadge",
    status: "#eicrStatus"
  },
  smokeAlarm: {
    bg: "#smokeAlarmCardBg",
    icon: "#smokeAlarmStateIcon",
    badge: "#smokeAlarmStepBadge",
    status: "#smokeAlarmStatus"
  },
  coAlarm: {
    bg: "#coAlarmCardBg",
    icon: "#coAlarmStateIcon",
    badge: "#coAlarmStepBadge",
    status: "#coAlarmStatus"
  },
  deposit: {
    bg: "#depositCardBg",
    icon: "#depositStateIcon",
    badge: "#depositStepBadge",
    status: "#depositStatus"
  }
};

/*
  Progressive reveal wrappers.
  If you have dedicated wrapper boxes/groups for each card, replace these IDs.
  For now they point to your card backgrounds.
*/
const QUESTION_CARD_WRAPPERS = {
  gasSafety: "#gasSafetyCardBg",
  electrical: "#electricalCardBg",
  smokeAlarm: "#smokeAlarmCardBg",
  coAlarm: "#coAlarmCardBg",
  deposit: "#depositCardBg"
};

const QUESTION_FLOW = ["gasSafety", "electrical", "smokeAlarm", "coAlarm", "deposit"];

/* ----------------- tiny helpers ----------------- */

function safeUpper(val) {
  return String(val || "").trim().toUpperCase();
}

function safeLower(val) {
  return String(val || "").trim().toLowerCase();
}

function cleanAddressHint(raw) {
  return safeUpper(raw).replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function toNumberMaybe(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDateMaybe(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateUK(dateLike) {
  const d = parseDateMaybe(dateLike);
  if (!d) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function startOfDay(dateLike) {
  const d = parseDateMaybe(dateLike);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(dateLike) {
  const d = startOfDay(dateLike);
  if (!d) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function addMonths(dateLike, months) {
  const d = startOfDay(dateLike);
  if (!d) return null;

  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(dateLike, years) {
  const d = startOfDay(dateLike);
  if (!d) return null;

  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function getGasExpiryFromIssue(issueDate) {
  return addMonths(issueDate, 12);
}

function getElectricalExpiryFromIssue(issueDate) {
  return addYears(issueDate, 5);
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function el(id) {
  try {
    return $w(id);
  } catch (e) {
    return null;
  }
}

function hasStyleProp(node, prop) {
  return !!(node && node.style && typeof node.style[prop] !== "undefined");
}

function setStyleProp(node, prop, value) {
  if (hasStyleProp(node, prop)) {
    node.style[prop] = value;
    return true;
  }
  return false;
}

function setText(id, value, fallback = "N/A") {
  const node = el(id);
  if (!node || typeof node.text === "undefined") return;
  const v = value === undefined || value === null || value === "" ? fallback : String(value);
  node.text = v;
}

function setTextMulti(ids = [], value, fallback = "N/A") {
  ids.forEach((id) => setText(id, value, fallback));
}

function setLabeledText(id, label, value, fallback = "N/A") {
  const node = el(id);
  if (!node || typeof node.text === "undefined") return;
  const v = value === undefined || value === null || value === "" ? fallback : String(value);
  node.text = `${label}: ${v}`;
}

function setBoxBg(id, color) {
  const node = el(id);
  if (!node) return;

  try {
    if (node.style && typeof node.style.backgroundColor !== "undefined") {
      node.style.backgroundColor = color;
      return;
    }

    if (typeof node.backgroundColor !== "undefined") {
      node.backgroundColor = color;
    }
  } catch (err) {
    console.warn("⚠️ Could not set box bg:", id, err);
  }
}

function setColor(id, color) {
  const node = el(id);
  if (!node) return;

  const styled = setStyleProp(node, "color", color);
  if (!styled) {
    console.warn(`⚠️ ${id} can't be styled (style props missing).`);
  }
}

function interpolateRgb(start, end, factor) {
  const r = Math.round(start[0] + (end[0] - start[0]) * factor);
  const g = Math.round(start[1] + (end[1] - start[1]) * factor);
  const b = Math.round(start[2] + (end[2] - start[2]) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function getProgressColor(score) {
  const safe = clamp(score, 0, 100);

  if (safe <= 50) {
    const factor = safe / 50;
    return interpolateRgb([211, 47, 47], [253, 216, 53], factor);
  }

  const factor = (safe - 50) / 50;
  return interpolateRgb([253, 216, 53], [46, 125, 50], factor);
}

function applyComplianceTint(score) {
  const tint = el("#pageTint");
  if (!tint) return;

  const color = getProgressColor(score);
  setStyleProp(tint, "backgroundColor", color);
  setStyleProp(tint, "opacity", 0.045);

  if (typeof tint.sendToBack === "function") {
    tint.sendToBack();
  }
}

function setProgressFill(score) {
  const width = clamp(score, 0, 100);
  const color = getProgressColor(width);

  for (const id of COMPLIANCE_UI.progressFillIds) {
    const progress = el(id);
    if (!progress) continue;

    try {
      if (typeof progress.value !== "undefined") {
        progress.value = width;
        if (progress.style && typeof progress.style.backgroundColor !== "undefined") {
          progress.style.backgroundColor = color;
        }
        continue;
      }

      if (typeof progress.width !== "undefined") {
        progress.width = Math.max(1, width * 3);
        if (progress.style && typeof progress.style.backgroundColor !== "undefined") {
          progress.style.backgroundColor = color;
        } else if (typeof progress.backgroundColor !== "undefined") {
          progress.backgroundColor = color;
        }
        continue;
      }

      if (typeof progress.resize === "function") {
        progress.resize(Math.max(1, width * 3), progress.height || 12);
        if (progress.style && typeof progress.style.backgroundColor !== "undefined") {
          progress.style.backgroundColor = color;
        } else if (typeof progress.backgroundColor !== "undefined") {
          progress.backgroundColor = color;
        }
        continue;
      }

      if (progress.style && typeof progress.style.width !== "undefined") {
        progress.style.width = `${width}%`;
        if (typeof progress.style.backgroundColor !== "undefined") {
          progress.style.backgroundColor = color;
        }
        continue;
      }
    } catch (err) {
      console.warn("⚠️ Failed to update progress fill:", id, err);
    }
  }
}

function expand(id) {
  const node = el(id);
  if (node && typeof node.expand === "function") node.expand();
}

function collapse(id) {
  const node = el(id);
  if (node && typeof node.collapse === "function") node.collapse();
}

function show(id) {
  const node = el(id);
  if (!node) return;

  if (typeof node.show === "function") node.show();
  if (typeof node.expand === "function") node.expand();
}

function hide(id) {
  const node = el(id);
  if (!node) return;

  if (typeof node.hide === "function") node.hide();
  if (typeof node.collapse === "function") node.collapse();
}

function bindIfSupported(node, methodName, handler) {
  if (node && typeof node[methodName] === "function") {
    node[methodName](handler);
    return true;
  }
  return false;
}

async function safeUpdateCms(itemId, fields) {
  if (!itemId) return;

  try {
    await wixData.update(COLLECTION, { _id: itemId, ...fields });
    console.log("✅ CMS updated:", fields);
  } catch (e) {
    console.warn("⚠️ CMS update failed:", e);
  }
}

function toGalleryItems(arr) {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((p) => {
      const src = p?.src || p?.url || p;
      if (!src) return null;
      return { src, title: "", description: "" };
    })
    .filter(Boolean);
}

/* ----------------- epcRaw helpers ----------------- */

function getEpcRaw(item) {
  const raw = item?.epcRaw;
  if (!raw) return null;

  if (typeof raw === "object") return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function pickFirstValue(item, itemKeys = [], rawKeys = []) {
  for (const k of itemKeys) {
    const v = item?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  const raw = getEpcRaw(item);
  if (!raw) return null;

  for (const rk of rawKeys) {
    const v = raw?.[rk];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }

  return null;
}

function normaliseEpcLetter(v) {
  const s = String(v ?? "").trim().toUpperCase();
  return ["A", "B", "C", "D", "E", "F", "G"].includes(s) ? s : null;
}

function formatM2(v) {
  const n = toNumberMaybe(v);
  if (n === null) return "N/A";
  return `${Math.round(n * 100) / 100} m²`;
}

function formatKwh(v) {
  const n = toNumberMaybe(v);
  if (n === null) return "N/A";
  return `${Math.round(n * 10) / 10} kWh/m²/yr`;
}

function formatTonnes(v) {
  const n = toNumberMaybe(v);
  if (n === null) return "N/A";
  return `${Math.round(n * 10) / 10} tCO₂/yr`;
}

function formatKgPerM2(v) {
  const n = toNumberMaybe(v);
  if (n === null) return "N/A";
  return `${Math.round(n * 10) / 10} kgCO₂/m²/yr`;
}

/* ----------------- page tint ----------------- */

function applyPageTint(letter, opacity = 0.02) {
  const key = safeUpper(letter);
  const theme = EPC_COLORS[key] || { bg: "#F5F5F5", text: "#111111" };

  const tint = el("#pageTint");
  if (!tint) return;

  setStyleProp(tint, "backgroundColor", theme.bg);
  setStyleProp(tint, "opacity", opacity);

  if (typeof tint.sendToBack === "function") {
    tint.sendToBack();
  }
}

/* ----------------- badge letter colour ----------------- */

function applyBadgeLetterColor(letter) {
  const key = safeUpper(letter);
  const theme = EPC_COLORS[key];
  if (!theme) return;
  setColor("#epcBadgeLetter", theme.bg);
}

/* ----------------- journey priority layout ----------------- */

function setJourneyIntro(message) {
  const node = el(JOURNEY_UI.journeyIntroText);
  if (!node || typeof node.text === "undefined") return;
  node.text = message || "";
}

function humanisePrimaryIntent(value) {
  const v = String(value || "").trim().toLowerCase();

  const map = {
    book_epc: "Book an EPC",
    check_epc: "Check EPC compliance",
    improve_epc: "Improve EPC rating",
    full_check: "Full compliance check",
    check_compliance_first: "Check compliance first",
    book_gas_safety: "Book a gas safety check",
    check_gas_safety: "Check gas safety compliance",
    book_eicr: "Book an EICR",
    check_eicr: "Check electrical compliance",
    book_inspection: "Book a property inspection",
    check_property_condition: "Check property condition",
    check_aml: "Run AML checks",
    sort_tax: "Sort Making Tax Digital requirements",
    seek_possession: "Prepare for possession",
    understand_eviction_position: "Understand eviction position"
  };

  return map[v] || (value ? String(value) : "");
}

function humaniseYesNoMaybe(value) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  if (v === "possible") return "Possibly";

  return value ? String(value) : "";
}

function humaniseService(value) {
  const v = String(value || "").trim().toLowerCase();

  const map = {
    epc: "EPC",
    epcs: "EPC",
    evictions: "Evictions & Possession",
    "evictions-and-possession": "Evictions & Possession",
    gas: "Gas Safety",
    gas_safety: "Gas Safety",
    "gas-safety": "Gas Safety",
    eicr: "EICR",
    "eicr-checks": "EICR",
    aml: "AML Checks",
    amlchecks: "AML Checks",
    "aml-checks": "AML Checks",
    inspections: "Property Inspections",
    propertyinspections: "Property Inspections",
    "property-inspections": "Property Inspections",
    making_tax_digital: "Making Tax Digital",
    makingtaxdigital: "Making Tax Digital",
    "making-tax-digital": "Making Tax Digital"
  };

  return map[v] || (value ? String(value) : "");
}

function humaniseInspectionType(value) {
  const v = safeLower(value);

  const map = {
    routine: "Routine inspection",
    routine_inspection: "Routine inspection",
    pre_tenancy: "Pre-tenancy / move-in check",
    pre_tenancy_move_in: "Pre-tenancy / move-in check",
    mid_tenancy: "Mid-tenancy inspection",
    end_of_tenancy: "End-of-tenancy / condition check"
  };

  return map[v] || (value ? String(value) : "");
}

function humaniseInspectionConcern(value) {
  const v = safeLower(value);

  const map = {
    general_condition: "General condition and upkeep",
    damage_cleanliness_neglect: "Damage, cleanliness, or neglect",
    safety_maintenance: "Safety or maintenance concerns",
    peace_of_mind: "I just want peace of mind"
  };

  return map[v] || (value ? String(value) : "");
}

function humaniseJourneyDepth(value) {
  const v = safeLower(value);

  const map = {
    quick_check: "Quick check",
    full_support: "Full support",
    guidance_only: "Guidance only",
    book_service: "Book a service"
  };

  return map[v] || (value ? String(value) : "");
}

function getJourneyContext(item) {
  const itemPriorityModule = String(item?.priorityModule || "").trim();
  const itemSourceServicePage = String(item?.sourceServicePage || "").trim();
  const itemPrimaryIntent = String(item?.primaryIntent || "").trim();
  const itemJourneyDepth = String(item?.journeyDepth || "").trim();
  const itemIsTenanted = String(item?.isTenanted || "").trim();
  const itemEvictionContext = String(item?.evictionContext || "").trim();
  const itemInspectionType = String(item?.inspectionType || "").trim();
  const itemInspectionConcern = String(item?.inspectionConcern || "").trim();

  const sessionPriorityModule = String(session.getItem("priorityModule") || "").trim();
  const sessionSourceServicePage = String(session.getItem("sourceServicePage") || "").trim();
  const sessionPrimaryIntent = String(session.getItem("primaryIntent") || "").trim();
  const sessionJourneyDepth = String(session.getItem("journeyDepth") || "").trim();
  const sessionIsTenanted = String(session.getItem("isTenanted") || "").trim();
  const sessionEvictionContext = String(session.getItem("evictionContext") || "").trim();
  const sessionInspectionType = String(session.getItem("inspectionType") || "").trim();
  const sessionInspectionConcern = String(session.getItem("inspectionConcern") || "").trim();

  const sourceServicePage = sessionSourceServicePage || itemSourceServicePage;
  const priorityModule = sessionPriorityModule || itemPriorityModule;
  const primaryIntent = sessionPrimaryIntent || itemPrimaryIntent;
  const journeyDepth = sessionJourneyDepth || itemJourneyDepth;
  const isTenanted = sessionIsTenanted || itemIsTenanted;
  const evictionContext = sessionEvictionContext || itemEvictionContext;
  const inspectionType = sessionInspectionType || itemInspectionType;
  const inspectionConcern = sessionInspectionConcern || itemInspectionConcern;

  return {
    sourceServicePage,
    priorityModule,
    primaryIntent,
    journeyDepth,
    isTenanted,
    evictionContext,
    inspectionType,
    inspectionConcern
  };
}

function renderJourneySummary(item) {
  const section = el(JOURNEY_UI.journeySummarySection);
  const title = el(JOURNEY_UI.journeySummaryTitle);
  const text = el(JOURNEY_UI.journeySummaryText);

  if (!section || !title || !text) {
    console.warn("⚠️ Journey summary elements missing.");
    return;
  }

  const journey = getJourneyContext(item);
  const priorityModule = safeLower(journey.priorityModule);
  const sourceServicePage = humaniseService(journey.sourceServicePage);
  const primaryIntent = humanisePrimaryIntent(journey.primaryIntent);
  const journeyDepth = humaniseJourneyDepth(journey.journeyDepth);
  const isTenanted = humaniseYesNoMaybe(journey.isTenanted);
  const evictionContext = humaniseYesNoMaybe(journey.evictionContext);
  const inspectionType = humaniseInspectionType(journey.inspectionType);
  const inspectionConcern = humaniseInspectionConcern(journey.inspectionConcern);

  const lines = [];

  if (sourceServicePage) lines.push(`Started from: ${sourceServicePage}`);
  if (primaryIntent) lines.push(`Reason for enquiry: ${primaryIntent}`);
  if (journeyDepth) lines.push(`Support level: ${journeyDepth}`);
  if (isTenanted) lines.push(`Property currently tenanted: ${isTenanted}`);
  if (evictionContext) lines.push(`Possession/eviction concern: ${evictionContext}`);
  if (inspectionType) lines.push(`Inspection type: ${inspectionType}`);
  if (inspectionConcern) lines.push(`Main concern: ${inspectionConcern}`);

  if (!lines.length) {
    hide(JOURNEY_UI.journeySummarySection);
    return;
  }

  title.text =
    priorityModule === "eviction"
      ? "What you told us earlier"
      : "Your earlier responses";

  text.text = lines.join("\n");

  show(JOURNEY_UI.journeySummarySection);
}

function applyPriorityLayout(item) {
  const journey = getJourneyContext(item);

  const priority = safeLower(journey.priorityModule);
  const primaryIntent = safeLower(journey.primaryIntent);
  const isTenanted = safeLower(journey.isTenanted);
  const evictionContext = safeLower(journey.evictionContext);
  const source = safeLower(journey.sourceServicePage);
  const inspectionType = safeLower(journey.inspectionType);

  console.log("🎯 Applying priority layout:", {
    priority,
    source,
    primaryIntent,
    isTenanted,
    evictionContext,
    inspectionType
  });

  show(JOURNEY_UI.epcPrioritySection);
  show(JOURNEY_UI.generalComplianceSection);

  if (priority === "epc" || source === "epcs" || source === "epc") {
    let intro = "We’ve prioritised your EPC details first so you can deal with the main thing you came for.";

    if (primaryIntent === "book_epc") {
      intro = "You came here to sort the EPC first, so we’ve put that front and centre.";
    } else if (primaryIntent === "check_epc") {
      intro = "You came here to check EPC compliance, so we’ve put the key EPC details first.";
    } else if (primaryIntent === "improve_epc") {
      intro = "You came here to improve the EPC rating, so we’ve prioritised the EPC section first.";
    } else if (primaryIntent === "full_check") {
      intro = "We’ve started with the EPC first, then you can work through wider compliance below.";
    }

    if (evictionContext === "yes" || evictionContext === "possible") {
      intro += " Because possession may also matter here, you can work through the wider compliance steps underneath.";
    } else if (isTenanted === "yes") {
      intro += " Since the property is tenanted, it’s worth checking the wider compliance steps underneath too.";
    }

    setJourneyIntro(intro);
    renderJourneySummary(item);
    return;
  }

  if (priority === "gasafety" || priority === "gassafety" || source === "gas-safety" || source === "gas_safety") {
    setJourneyIntro(
      "We’ve prioritised your gas safety journey first so you can quickly see whether the property looks covered, what date matters, and what still needs attention."
    );
    renderJourneySummary(item);
    return;
  }

  if (priority === "eicr" || source === "eicr-checks") {
    setJourneyIntro(
      "We’ve prioritised your electrical safety journey first so you can check the current EICR position before working through the wider compliance steps."
    );
    renderJourneySummary(item);
    return;
  }

  if (priority === "propertyinspections" || priority === "propertyinspection" || source === "property-inspections") {
    let intro =
      "We’ve prioritised your property inspections journey first so you can start from the kind of inspection you need and the main concern you’re trying to stay on top of.";

    if (inspectionType) {
      intro += " We’ve carried that inspection route into this property so the next steps feel more tailored.";
    }

    setJourneyIntro(intro);
    renderJourneySummary(item);
    return;
  }

  if (priority === "amlchecks" || priority === "aml" || source === "aml-checks") {
    setJourneyIntro(
      "We’ve prioritised your AML journey first so you can capture the right property details while keeping the wider compliance picture in view."
    );
    renderJourneySummary(item);
    return;
  }

  if (priority === "makingtaxdigital" || priority === "making_tax_digital" || source === "making-tax-digital") {
    setJourneyIntro(
      "We’ve prioritised your Making Tax Digital journey first so you can get the property details organised around the tax-related task you started with."
    );
    renderJourneySummary(item);
    return;
  }

  if (priority === "eviction" || source === "evictions-and-possession" || source === "evictions") {
    show(JOURNEY_UI.generalComplianceSection);
    show(JOURNEY_UI.epcPrioritySection);
    setJourneyIntro(
      "We’ve prioritised the wider compliance checks first because possession-readiness matters for this property."
    );
    renderJourneySummary(item);
    return;
  }

  setJourneyIntro("Here’s your property overview.");
  renderJourneySummary(item);
}

/* ----------------- Street View lock overlay ----------------- */

let streetUnlockTimer = null;

function lockStreetView() {
  expand("#streetViewOverlay");
}

function unlockStreetViewFor(ms = 10000) {
  collapse("#streetViewOverlay");

  if (streetUnlockTimer) clearTimeout(streetUnlockTimer);

  streetUnlockTimer = setTimeout(() => {
    lockStreetView();
  }, ms);
}

function wireStreetOverlayUX() {
  const overlay = el("#streetViewOverlay");
  if (!overlay) {
    console.warn("⚠️ #streetViewOverlay not found.");
    return;
  }

  lockStreetView();
  bindIfSupported(overlay, "onClick", () => unlockStreetViewFor(10000));
}

/* ----------------- Location strip ----------------- */

function mapSrc(lat, lng) {
  const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

function streetSrc(lat, lng) {
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
}

function setHtmlSrc(id, url) {
  const node = el(id);
  if (!node) return;

  if ("src" in node) {
    node.src = url;
  } else {
    console.warn(`⚠️ ${id} is not an HTML iframe element (no .src property).`);
  }
}

function showMap(lat, lng) {
  expand("#locationStrip");
  expand("#mapHtml");
  collapse("#streetHtml");
  setHtmlSrc("#mapHtml", mapSrc(lat, lng));
  lockStreetView();
}

function showStreet(lat, lng) {
  expand("#locationStrip");
  expand("#streetHtml");
  collapse("#mapHtml");
  setHtmlSrc("#streetHtml", streetSrc(lat, lng));
  lockStreetView();
}

function wireLocationTabs(lat, lng) {
  showStreet(lat, lng);

  bindIfSupported(el("#mapTabBtn"), "onClick", () => showMap(lat, lng));
  bindIfSupported(el("#streetTabBtn"), "onClick", () => showStreet(lat, lng));
}

/* ----------------- EPC caching ----------------- */

function hasCachedEpc(item) {
  const rating = String(item.epcCurrentRating || "").trim();
  const score = item.epcCurrentScore;
  return rating.length > 0 || (score !== null && score !== undefined);
}

function isEpcFresh(item, days = EPC_FRESH_DAYS) {
  const last = item.epcFetchedAt ? new Date(item.epcFetchedAt) : null;
  if (!last || Number.isNaN(last.getTime())) return false;

  const ageDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= days;
}

/* ----------------- EPC render ----------------- */

function renderEpcUI(item, source = {}) {
  const cr =
    normaliseEpcLetter(
      source.currentRating ??
        pickFirstValue(item, ["epcCurrentRating"], [
          "currentEnergyRating",
          "current-energy-rating",
          "current_energy_rating"
        ])
    ) || "N/A";

  const cs =
    source.currentScore === 0 || source.currentScore
      ? source.currentScore
      : pickFirstValue(item, ["epcCurrentScore"], [
          "currentEnergyEfficiency",
          "energy-efficiency-current",
          "current_energy_efficiency"
        ]) ?? "N/A";

  const pr =
    normaliseEpcLetter(
      source.potentialRating ??
        pickFirstValue(item, ["epcPotentialRating"], [
          "potentialEnergyRating",
          "potential-energy-rating",
          "potential_energy_rating"
        ])
    ) || "N/A";

  const ps =
    source.potentialScore === 0 || source.potentialScore
      ? source.potentialScore
      : pickFirstValue(item, ["epcPotentialScore"], [
          "potentialEnergyEfficiency",
          "energy-efficiency-potential",
          "potential_energy_efficiency"
        ]) ?? "N/A";

  const lodgement =
    source.lodgementDate ??
    pickFirstValue(item, ["epcLodgementDate"], [
      "lodgementDate",
      "lodgement-date",
      "lodgement_date"
    ]);

  const expiry =
    source.expiryDate ??
    pickFirstValue(item, ["epcExpiryDate"], ["expiryDate", "expiry-date", "expiry_date"]);

  setLabeledText("#epcRatingText", "EPC rating", cr);
  setLabeledText("#epcScoreText", "EPC score", cs === 0 || cs ? cs : "N/A");
  setLabeledText("#epcPotentialRatingText", "Potential rating", pr);
  setLabeledText("#epcPotentialScoreText", "Potential score", ps === 0 || ps ? ps : "N/A");
  setLabeledText("#epcLodgementText", "Lodgement date", lodgement ? formatDateUK(lodgement) : "N/A");
  setLabeledText("#epcExpiryText", "Expiry date", expiry ? formatDateUK(expiry) : "N/A");

  setText("#epcBadgeLetter", cr);
  setText("#epcBadgeScore", cs === 0 || cs ? cs : "N/A");
  applyBadgeLetterColor(cr);

  const floorArea = pickFirstValue(
    item,
    ["epcTotalFloorArea", "epcFloorArea", "floorArea", "floorAreaM2", "totalFloorArea"],
    ["totalFloorArea", "total-floor-area", "total_floor_area"]
  );

  const summaryParts = [
    cr !== "N/A" ? `EPC ${cr}` : null,
    cs === 0 || cs ? `(${cs})` : null,
    pr !== "N/A" ? `→ Potential ${pr}` : null,
    ps === 0 || ps ? `(${ps})` : null,
    floorArea ? `• ${formatM2(floorArea)}` : null
  ].filter(Boolean);

  setText("#epcSummaryText", summaryParts.join(" "), "");
  setLabeledText("#epcFloorAreaText", "Floor area", floorArea ? formatM2(floorArea) : "N/A");

  const eUseCur = pickFirstValue(
    item,
    ["epcEnergyConsumptionCurrent", "epcEnergyUseCurrent"],
    ["energyConsumptionCurrent", "energy-consumption-current", "energy_consumption_current"]
  );

  const eUsePot = pickFirstValue(
    item,
    ["epcEnergyConsumptionPotential", "epcEnergyUsePotential"],
    ["energyConsumptionPotential", "energy-consumption-potential", "energy_consumption_potential"]
  );

  setLabeledText("#epcEnergyUseCurrentText", "Energy use (current)", eUseCur != null ? formatKwh(eUseCur) : "N/A");
  setLabeledText("#epcEnergyUsePotentialText", "Energy use (potential)", eUsePot != null ? formatKwh(eUsePot) : "N/A");

  const co2Cur = pickFirstValue(
    item,
    ["epcCo2EmissionsCurrent"],
    ["co2EmissionsCurrent", "co2-emissions-current", "co2_emissions_current"]
  );

  const co2Pot = pickFirstValue(
    item,
    ["epcCo2EmissionsPotential"],
    ["co2EmissionsPotential", "co2-emissions-potential", "co2_emissions_potential"]
  );

  setLabeledText("#epcCo2CurrentText", "CO₂ emissions (current)", co2Cur != null ? formatTonnes(co2Cur) : "N/A");
  setLabeledText("#epcCo2PotentialText", "CO₂ emissions (potential)", co2Pot != null ? formatTonnes(co2Pot) : "N/A");

  const co2PerM2 = pickFirstValue(
    item,
    ["epcCo2CurrentPerFloorArea"],
    [
      "co2EmissionsCurrentPerFloorArea",
      "co2-emissions-current-per-floor-area",
      "co2_emissions_current_per_floor_area"
    ]
  );

  setLabeledText("#epcCo2PerM2Text", "CO₂ per m²", co2PerM2 != null ? formatKgPerM2(co2PerM2) : "N/A");

  const propertyType = pickFirstValue(item, ["epcPropertyType"], ["propertyType", "property-type", "property_type"]);
  const builtForm = pickFirstValue(item, ["epcBuiltForm"], ["builtForm", "built-form", "built_form"]);
  const ageBand = pickFirstValue(
    item,
    ["epcConstructionAgeBand"],
    ["constructionAgeBand", "construction-age-band", "construction_age_band"]
  );
  const transactionType = pickFirstValue(item, ["epcTransactionType"], ["transactionType", "transaction-type", "transaction_type"]);

  const mainsGas = pickFirstValue(item, ["epcMainsGasFlag"], ["mainsGasFlag", "mains-gas-flag", "mains_gas_flag"]);
  const mainsGasNice =
    mainsGas === true || mainsGas === "Y"
      ? "Yes"
      : mainsGas === false || mainsGas === "N"
        ? "No"
        : mainsGas ?? "N/A";

  const localAuth = pickFirstValue(
    item,
    ["epcLocalAuthority"],
    [
      "localAuthority",
      "local-authority",
      "local_authority",
      "localAuthorityLabel",
      "local-authority-label",
      "local_authority_label"
    ]
  );

  const constituency = pickFirstValue(
    item,
    ["epcConstituency"],
    ["constituency", "parliamentaryConstituency", "parliamentary-constituency", "parliamentary_constituency"]
  );

  setLabeledText("#epcPropertyTypeText", "Property type", propertyType ?? "N/A");
  setLabeledText("#epcBuiltFormText", "Built form", builtForm ?? "N/A");
  setLabeledText("#epcAgeBandText", "Construction age band", ageBand ?? "N/A");
  setLabeledText("#epcTransactionTypeText", "Transaction type", transactionType ?? "N/A");
  setLabeledText("#epcMainsGasText", "Mains gas", mainsGasNice);
  setLabeledText("#epcLocalAuthorityText", "Local authority", localAuth ?? "N/A");
  setLabeledText("#epcConstituencyText", "Constituency", constituency ?? "N/A");

  const certNo = pickFirstValue(item, ["epcCertificateNumber"], ["certificateNumber", "certificate-number", "certificate_number"]);
  const epcAddress = pickFirstValue(item, ["epcAddress"], ["address", "propertyAddress", "property-address", "property_address"]);

  setLabeledText("#epcCertificateNumberText", "Certificate number", certNo ?? "N/A");
  setLabeledText("#epcAddressText", "EPC address", epcAddress ?? "N/A");

  const mainFuel = pickFirstValue(
    item,
    ["epcMainFuel"],
    [
      "mainFuel",
      "main-fuel",
      "main_fuel",
      "mainFuelType",
      "main-fuel-type",
      "main_fuel_type",
      "mainHeatingFuel",
      "main-heating-fuel",
      "main_heating_fuel"
    ]
  );

  const heatingDesc = pickFirstValue(
    item,
    ["epcHeatingDescription"],
    [
      "heatingDescription",
      "heating-description",
      "heating_description",
      "mainHeatingDescription",
      "main-heating-description",
      "main_heating_description"
    ]
  );

  const hotWaterDesc = pickFirstValue(
    item,
    ["epcHotWaterDescription"],
    ["hotWaterDescription", "hot-water-description", "hot_water_description"]
  );

  const glazingDesc = pickFirstValue(
    item,
    ["epcGlazingDescription"],
    ["glazingDescription", "glazing-description", "glazing_description"]
  );

  const propertyAge = pickFirstValue(
    item,
    ["epcPropertyAge"],
    [
      "propertyAgeBand",
      "property-age-band",
      "property_age_band",
      "constructionAgeBand",
      "construction-age-band",
      "construction_age_band"
    ]
  );

  const tenure = pickFirstValue(item, ["epcTenure"], ["tenure", "tenureType", "tenure-type", "tenure_type"]);
  const inspectionDate = pickFirstValue(
    item,
    ["epcInspectionDate"],
    ["inspectionDate", "inspection-date", "inspection_date", "assessmentDate", "assessment-date", "assessment_date"]
  );
  const reportType = pickFirstValue(item, ["epcReportType"], ["reportType", "report-type", "report_type"]);
  const assessorName = pickFirstValue(item, ["epcAssessorName"], ["assessorName", "assessor-name", "assessor_name"]);
  const assessorNumber = pickFirstValue(
    item,
    ["epcAssessorNumber"],
    ["assessorNumber", "assessor-number", "assessor_number", "assessorId", "assessor-id", "assessor_id"]
  );

  setLabeledText("#epcMainFuelText", "Main fuel", mainFuel ?? "N/A");
  setLabeledText("#epcHeatingDescriptionText", "Heating", heatingDesc ?? "N/A");
  setLabeledText("#epcHotWaterDescriptionText", "Hot water", hotWaterDesc ?? "N/A");
  setLabeledText("#epcGlazingDescriptionText", "Glazing", glazingDesc ?? "N/A");
  setLabeledText("#epcPropertyAgeText", "Property age", propertyAge ?? "N/A");
  setLabeledText("#epcTenureText", "Tenure", tenure ?? "N/A");
  setLabeledText("#epcInspectionDateText", "Inspection date", inspectionDate ? formatDateUK(inspectionDate) : "N/A");
  setLabeledText("#epcReportTypeText", "Report type", reportType ?? "N/A");
  setLabeledText("#epcAssessorNameText", "Assessor name", assessorName ?? "N/A");
  setLabeledText("#epcAssessorNumberText", "Assessor number", assessorNumber ?? "N/A");

  renderEpcFreshnessMessage(expiry);
}

/* ----------------- EPC freshness helper ----------------- */

function renderEpcFreshnessMessage(expiryDateLike) {
  const node = el(COMPLIANCE_UI.epcFreshnessText);
  if (!node || typeof node.text === "undefined") return;

  const days = daysUntil(expiryDateLike);

  if (days === null) {
    node.text = "We found EPC data, but couldn’t confirm the expiry date.";
    return;
  }

  if (days < 0) {
    node.text = "Sorry — your EPC appears to have expired. Book a new EPC to stay compliant.";
    return;
  }

  node.text = `Yay — we found your latest EPC. You won’t need to worry about this again for another ${days} day${
    days === 1 ? "" : "s"
  }.`;
}

/* ----------------- title + meta ----------------- */

function renderTitle(item) {
  const title = el("#propertyTitleText");
  if (!title || typeof title.text === "undefined") return;

  const hn = String(item.houseNameNumber || "").trim();
  const addr = String(item.propertyAddress || "").trim();
  const pc = safeUpper(item.PostCode || item.Postcode || "");

  const line = [hn, addr].filter(Boolean).join(" ").trim() || addr || hn || "";
  title.text = [line, pc].filter(Boolean).join(", ");
}

function renderMeta(item) {
  const meta = el("#propertyMetaText");
  if (!meta || typeof meta.text === "undefined") return;

  const type = String(item.propertyType || "").trim();
  const beds = item.bedrooms === 0 || item.bedrooms ? `${item.bedrooms} bed` : "";
  const pc = safeUpper(item.PostCode || item.Postcode || "");

  const parts = [type, beds, pc].filter(Boolean);
  meta.text = parts.length ? parts.join(" • ") : "";
}

/* ----------------- nav + delete ----------------- */

function wireNavAndDelete(dataset, itemId) {
  const delBtn = el("#deletePropertyBtn");
  if (delBtn && itemId) {
    bindIfSupported(delBtn, "onClick", async () => {
      const ok = typeof window !== "undefined" ? window.confirm("Delete this property?") : true;
      if (!ok) return;

      try {
        await wixData.remove(COLLECTION, itemId);
        wixLocation.to("/my-properties");
      } catch (e) {
        console.warn("Delete failed:", e);
      }
    });
  }
}

/* =========================================================
   LIVE COMPLIANCE JOURNEY
   ========================================================= */

function getInputValue(id) {
  const node = el(id);
  if (!node) {
    console.warn("⚠️ Missing input:", id);
    return null;
  }

  try {
    if (typeof node.checked !== "undefined") return node.checked;
    if (typeof node.selectedIndex !== "undefined" && typeof node.value !== "undefined") return node.value;
    if (typeof node.value !== "undefined") return node.value;
    if (typeof node.text !== "undefined") return node.text;
  } catch (err) {
    console.warn("⚠️ Could not read input value:", id, err);
  }

  return null;
}

function normaliseAnswer(val) {
  if (val === true) return "yes";
  if (val === false) return "no";

  const raw = String(val ?? "").trim();
  const s = raw.toLowerCase();

  if (!s) return null;

  if (s === "no deposit taken" || s === "deposit not taken") return "no_deposit_taken";
  if (["yes", "y", "true", "valid", "protected", "installed"].includes(s)) return "yes";
  if (["no", "n", "false", "not valid", "unprotected", "not installed"].includes(s)) return "no";
  if (["not applicable", "n/a", "na"].includes(s)) return "na";

  return s;
}

function syncConditionalFields() {
  const gasAnswer = normaliseAnswer(getInputValue(COMPLIANCE_INPUTS.gasHasCert));

  if (gasAnswer === "yes") {
    show("#gasCertificateDate");
    show("#gasCertificateQuestion");
    show("#gasCertificateWrap");
  } else {
    hide("#gasCertificateDate");
    hide("#gasCertificateQuestion");
    hide("#gasCertificateWrap");
  }
}

function getEpcBaseAssessment(item) {
  const rating = normaliseEpcLetter(
    pickFirstValue(item, ["epcCurrentRating"], [
      "currentEnergyRating",
      "current-energy-rating",
      "current_energy_rating"
    ])
  );

  const expiry = pickFirstValue(item, ["epcExpiryDate"], ["expiryDate", "expiry-date", "expiry_date"]);
  const days = daysUntil(expiry);

  if (!rating) {
    return {
      score: 0,
      issue: true,
      action: {
        _id: "epc-missing",
        title: "Book an EPC",
        body: "We could not find a valid EPC rating for this property.",
        priority: "High"
      }
    };
  }

  if (days === null) {
    return {
      score: 30,
      issue: false,
      action: null
    };
  }

  if (days < 0) {
    return {
      score: 5,
      issue: true,
      action: {
        _id: "epc-expired",
        title: "Book a new EPC",
        body: "Your EPC appears to have expired.",
        priority: "High"
      }
    };
  }

  if (days <= 60) {
    return {
      score: 20,
      issue: true,
      action: {
        _id: "epc-expiring",
        title: "Plan your next EPC",
        body: `Your EPC expires in ${days} day${days === 1 ? "" : "s"}.`,
        priority: "Medium"
      }
    };
  }

  return {
    score: 30,
    issue: false,
    action: null
  };
}

function getCardStatusCopy(key, state, extra = {}) {
  if (key === "gasSafety") {
    if (state === "pass") return `Valid until ${formatDateUK(extra.expiry)}`;
    if (state === "warning") return extra.expiry ? `Expires soon: ${formatDateUK(extra.expiry)}` : "Certificate date needed";
    if (state === "fail") return extra.expiry ? `Expired: ${formatDateUK(extra.expiry)}` : "Not covered";
    return "Awaiting answer";
  }

  if (key === "electrical") {
    if (state === "pass") return `Valid until ${formatDateUK(extra.expiry)}`;
    if (state === "warning") return `Expires soon: ${formatDateUK(extra.expiry)}`;
    if (state === "fail") return `Expired: ${formatDateUK(extra.expiry)}`;
    return "Awaiting certificate date";
  }

  if (key === "smokeAlarm") {
    if (state === "pass") return "Confirmed";
    if (state === "fail") return "Needs attention";
    return "Awaiting answer";
  }

  if (key === "coAlarm") {
    if (state === "pass") return "Confirmed";
    if (state === "fail") return "Needs attention";
    return "Awaiting answer";
  }

  if (key === "deposit") {
    if (state === "pass") return "Looks good";
    if (state === "warning") return "No deposit taken";
    if (state === "fail") return "Needs protection";
    return "Awaiting answer";
  }

  return "Awaiting answer";
}

function applyQuestionCardState(base, stateKey, stepNumber, customLabel, statusCopy) {
  const style = CARD_STATE_STYLES[stateKey] || CARD_STATE_STYLES.unanswered;
  const map = CARD_ID_MAP[base];
  if (!map) return;

  setBoxBg(map.bg, style.bg);
  setText(map.icon, style.icon, style.icon);
  setText(map.badge, customLabel || (stateKey === "unanswered" ? `Step ${stepNumber}` : style.badge), "");

  if (map.status) {
    setText(map.status, statusCopy || "", "");
  }
}

function syncQuestionVisibility(resultsByKey = {}) {
  let unlockedNext = true;

  QUESTION_FLOW.forEach((key) => {
    const wrapperId = QUESTION_CARD_WRAPPERS[key] || CARD_ID_MAP[key]?.bg;
    if (!wrapperId) return;

    const result = resultsByKey[key];
    if (!result) {
      hide(wrapperId);
      return;
    }

    const alreadyAnswered = result.state !== "unanswered";
    const shouldShow = alreadyAnswered || unlockedNext;

    if (shouldShow) {
      show(wrapperId);
    } else {
      hide(wrapperId);
    }

    if (unlockedNext && result.state === "unanswered") {
      unlockedNext = false;
    }
  });
}

function renderActions(actions = []) {
  const repeater = el(COMPLIANCE_UI.actionsRepeater);
  if (!repeater) return;

  const safeActions = actions.map((a, idx) => ({
    _id: a._id || `action-${idx}`,
    title: a.title || "Action",
    body: a.body || "",
    priority: a.priority || "Medium"
  }));

  try {
    repeater.data = safeActions;

    repeater.onItemReady(($item, itemData) => {
      const titleIds = ["#actionTitle", "#actionTitleText", "#titleText"];
      const bodyIds = ["#actionBody", "#actionBodyText", "#descriptionText", "#actionText"];
      const priorityIds = ["#actionPriority", "#actionPriorityText", "#priorityText"];

      titleIds.forEach((id) => {
        try {
          const node = $item(id);
          if (node && typeof node.text !== "undefined") node.text = itemData.title;
        } catch (e) {}
      });

      bodyIds.forEach((id) => {
        try {
          const node = $item(id);
          if (node && typeof node.text !== "undefined") node.text = itemData.body;
        } catch (e) {}
      });

      priorityIds.forEach((id) => {
        try {
          const node = $item(id);
          if (node && typeof node.text !== "undefined") node.text = itemData.priority;
        } catch (e) {}
      });
    });
  } catch (err) {
    console.warn("⚠️ Could not render actions repeater:", err);
  }
}

function renderComplianceSummary(score, issuesCount, nextStepLabel, actions) {
  const progressText = `Compliance progress: ${score}%`;

  setTextMulti(COMPLIANCE_UI.percentTextIds, progressText, progressText);
  setText(COMPLIANCE_UI.scoreLabel, "Live compliance score", "Live compliance score");

  const mood =
    score >= 90
      ? "Excellent — this property is looking very healthy."
      : score >= 75
        ? "Great start — only a few things need checking."
        : score >= 50
          ? "You’re making progress — a few important checks still need attention."
          : score > 0
            ? "This property still needs several compliance checks completed."
            : "Start answering the questions below to unlock your live score.";

  setText(COMPLIANCE_UI.moodText, mood, mood);

  const nextMsg = nextStepLabel
    ? `Next step: ${nextStepLabel}`
    : "Nice work — you’ve completed all the current compliance steps.";

  setText(COMPLIANCE_UI.nextStepText, nextMsg, nextMsg);

  const actionsMsg =
    issuesCount === 0
      ? "Nice work — no urgent actions detected right now."
      : issuesCount === 1
        ? "You currently have 1 action remaining."
        : `You currently have ${issuesCount} actions remaining.`;

  setText(COMPLIANCE_UI.actionsSummaryText, actionsMsg, actionsMsg);
  setProgressFill(score);
  applyComplianceTint(score);
  renderActions(actions);
}

function getComplianceRules() {
  return [
    {
      key: "gasSafety",
      step: 1,
      label: "answer the gas safety question",
      evaluate: () => {
        const answer = normaliseAnswer(getInputValue(COMPLIANCE_INPUTS.gasHasCert));
        const issueDate = parseDateMaybe(getInputValue(COMPLIANCE_INPUTS.gasIssueDate));
        const expiry = getGasExpiryFromIssue(issueDate);
        const days = daysUntil(expiry);

        if (!answer) {
          return {
            state: "unanswered",
            score: 0,
            issue: false,
            statusCopy: getCardStatusCopy("gasSafety", "unanswered"),
            action: null
          };
        }

        if (answer === "no") {
          return {
            state: "fail",
            score: 0,
            issue: true,
            statusCopy: getCardStatusCopy("gasSafety", "fail"),
            action: {
              _id: "gas-none",
              title: "Review gas appliance safety",
              body: "You marked this property as not covered for gas safety.",
              priority: "High"
            }
          };
        }

        if (days === null) {
          return {
            state: "warning",
            score: 10,
            issue: true,
            statusCopy: getCardStatusCopy("gasSafety", "warning"),
            action: {
              _id: "gas-date-needed",
              title: "Add gas certificate issue date",
              body: "Gas safety looks present, but the issue date is missing.",
              priority: "Medium"
            }
          };
        }

        if (days < 0) {
          return {
            state: "fail",
            score: 0,
            issue: true,
            statusCopy: getCardStatusCopy("gasSafety", "fail", { expiry }),
            action: {
              _id: "gas-expired",
              title: "Renew gas safety certificate",
              body: `The gas certificate expired on ${formatDateUK(expiry)}.`,
              priority: "High"
            }
          };
        }

        if (days <= 30) {
          return {
            state: "warning",
            score: 12,
            issue: true,
            statusCopy: getCardStatusCopy("gasSafety", "warning", { expiry }),
            action: {
              _id: "gas-expiring",
              title: "Renew gas safety soon",
              body: `The gas certificate expires on ${formatDateUK(expiry)}.`,
              priority: "Medium"
            }
          };
        }

        return {
          state: "pass",
          score: 25,
          issue: false,
          statusCopy: getCardStatusCopy("gasSafety", "pass", { expiry }),
          action: null
        };
      }
    },

    {
      key: "electrical",
      step: 2,
      label: "add your electrical safety details",
      evaluate: () => {
        const issueDate = parseDateMaybe(getInputValue(COMPLIANCE_INPUTS.electricalIssueDate));
        const expiry = getElectricalExpiryFromIssue(issueDate);
        const days = daysUntil(expiry);

        if (!issueDate) {
          return {
            state: "unanswered",
            score: 0,
            issue: false,
            statusCopy: getCardStatusCopy("electrical", "unanswered"),
            action: null
          };
        }

        if (days < 0) {
          return {
            state: "fail",
            score: 0,
            issue: true,
            statusCopy: getCardStatusCopy("electrical", "fail", { expiry }),
            action: {
              _id: "eicr-expired",
              title: "Renew electrical safety certificate",
              body: `Your electrical certificate expired on ${formatDateUK(expiry)}.`,
              priority: "High"
            }
          };
        }

        if (days <= 30) {
          return {
            state: "warning",
            score: 12,
            issue: true,
            statusCopy: getCardStatusCopy("electrical", "warning", { expiry }),
            action: {
              _id: "eicr-expiring",
              title: "Renew electrical safety soon",
              body: `Your electrical certificate expires on ${formatDateUK(expiry)}.`,
              priority: "Medium"
            }
          };
        }

        return {
          state: "pass",
          score: 25,
          issue: false,
          statusCopy: getCardStatusCopy("electrical", "pass", { expiry }),
          action: null
        };
      }
    },

    {
      key: "smokeAlarm",
      step: 3,
      label: "confirm the smoke alarms",
      evaluate: () => {
        const answer = normaliseAnswer(getInputValue(COMPLIANCE_INPUTS.smokeAlarmStatus));

        if (!answer) {
          return {
            state: "unanswered",
            score: 0,
            issue: false,
            statusCopy: getCardStatusCopy("smokeAlarm", "unanswered"),
            action: null
          };
        }

        if (answer === "yes") {
          return {
            state: "pass",
            score: 10,
            issue: false,
            statusCopy: getCardStatusCopy("smokeAlarm", "pass"),
            action: null
          };
        }

        return {
          state: "fail",
          score: 0,
          issue: true,
          statusCopy: getCardStatusCopy("smokeAlarm", "fail"),
          action: {
            _id: "smoke-alarm",
            title: "Install or check smoke alarms",
            body: "Smoke alarms need attention.",
            priority: "High"
          }
        };
      }
    },

    {
      key: "coAlarm",
      step: 4,
      label: "confirm the carbon monoxide alarms",
      evaluate: () => {
        const answer = normaliseAnswer(getInputValue(COMPLIANCE_INPUTS.coAlarmStatus));

        if (!answer || answer === "na") {
          return {
            state: "unanswered",
            score: 0,
            issue: false,
            statusCopy: getCardStatusCopy("coAlarm", "unanswered"),
            action: null
          };
        }

        if (answer === "yes") {
          return {
            state: "pass",
            score: 10,
            issue: false,
            statusCopy: getCardStatusCopy("coAlarm", "pass"),
            action: null
          };
        }

        return {
          state: "fail",
          score: 0,
          issue: true,
          statusCopy: getCardStatusCopy("coAlarm", "fail"),
          action: {
            _id: "co-alarm",
            title: "Install or check CO alarms",
            body: "Carbon monoxide alarm coverage needs attention.",
            priority: "High"
          }
        };
      }
    },

    {
      key: "deposit",
      step: 5,
      label: "answer the deposit protection question",
      evaluate: () => {
        const answer = normaliseAnswer(getInputValue(COMPLIANCE_INPUTS.depositTaken));

        if (!answer) {
          return {
            state: "unanswered",
            score: 0,
            issue: false,
            statusCopy: getCardStatusCopy("deposit", "unanswered"),
            action: null
          };
        }

        if (answer === "yes") {
          return {
            state: "pass",
            score: 10,
            issue: false,
            statusCopy: getCardStatusCopy("deposit", "pass"),
            action: null
          };
        }

        if (answer === "no") {
          return {
            state: "fail",
            score: 0,
            issue: true,
            statusCopy: getCardStatusCopy("deposit", "fail"),
            action: {
              _id: "deposit-protect",
              title: "Protect the tenancy deposit",
              body: "The deposit needs to be protected correctly.",
              priority: "High"
            }
          };
        }

        if (answer === "no_deposit_taken") {
          return {
            state: "warning",
            score: 6,
            issue: false,
            statusCopy: getCardStatusCopy("deposit", "warning"),
            action: {
              _id: "deposit-not-taken",
              title: "No deposit taken",
              body: "You marked this tenancy as having no deposit taken.",
              priority: "Low"
            }
          };
        }

        return {
          state: "unanswered",
          score: 0,
          issue: false,
          statusCopy: getCardStatusCopy("deposit", "unanswered"),
          action: null
        };
      }
    }
  ];
}

function evaluateCompliance(item) {
  console.log("🧠 evaluateCompliance() running");

  syncConditionalFields();

  const epcBase = getEpcBaseAssessment(item);
  let score = epcBase.score;
  let issuesCount = epcBase.issue ? 1 : 0;
  let firstUnanswered = null;
  const actions = epcBase.action ? [epcBase.action] : [];

  const rules = getComplianceRules();
  const resultsByKey = {};

  rules.forEach((rule) => {
    const result = rule.evaluate();
    resultsByKey[rule.key] = result;

    console.log("Rule result:", rule.key, result);

    score += result.score;
    if (result.issue) issuesCount += 1;
    if (!firstUnanswered && result.state === "unanswered") firstUnanswered = rule;
    if (result.action) actions.push(result.action);

    applyQuestionCardState(
      rule.key,
      result.state,
      rule.step,
      undefined,
      result.statusCopy
    );
  });

  syncQuestionVisibility(resultsByKey);

  score = clamp(Math.round(score), 0, 100);

  console.log("✅ Final compliance result:", {
    score,
    issuesCount,
    firstUnanswered,
    actions
  });

  renderComplianceSummary(
    score,
    issuesCount,
    firstUnanswered?.label || null,
    actions
  );
}

function wireComplianceInputs(item) {
  const ids = [...new Set(Object.values(COMPLIANCE_INPUTS))];

  ids.forEach((id) => {
    const node = el(id);
    if (!node) {
      console.warn("⚠️ Missing compliance input on page:", id);
      return;
    }

    console.log("🔌 Wiring input:", id);

    bindIfSupported(node, "onChange", () => {
      console.log("✏️ onChange fired:", id, getInputValue(id));
      evaluateCompliance(item);
    });

    bindIfSupported(node, "onInput", () => {
      console.log("⌨️ onInput fired:", id, getInputValue(id));
      evaluateCompliance(item);
    });

    bindIfSupported(node, "onClick", () => {
      console.log("🖱️ onClick fired:", id, getInputValue(id));
      evaluateCompliance(item);
    });
  });

  syncConditionalFields();
  evaluateCompliance(item);
}

/* ----------------- MAIN ----------------- */

$w.onReady(() => {
  console.log("DYNAMIC PAGE READY");

  wireStreetOverlayUX();

  const dataset = el("#dynamicDataset") || el("#dataset1");
  if (!dataset) {
    console.warn("⚠️ Dataset not found (#dynamicDataset or #dataset1).");
    return;
  }

  dataset.onReady(async () => {
    const item = dataset.getCurrentItem();
    if (!item) return;

    applyPriorityLayout(item);

    console.log("Loaded item:", item);
    console.log("Journey context:", getJourneyContext(item));
    console.log("epcRaw keys:", Object.keys(getEpcRaw(item) || {}));

    wireNavAndDelete(dataset, item._id);
    renderTitle(item);
    renderMeta(item);

    const gallery = el("#gallery1");
    if (gallery) {
      const galleryItems = toGalleryItems(item.photos2);
      if (galleryItems.length) gallery.items = galleryItems;
    }

    const postcodeRaw = item.PostCode || item.Postcode || "";
    let lat = toNum(item.latitude);
    let lng = toNum(item.longitude);

    if ((lat === null || lng === null) && postcodeRaw) {
      try {
        const res = await lookupPostcode(safeUpper(postcodeRaw));
        if (res?.ok && res?.result) {
          lat = toNum(res.result.latitude);
          lng = toNum(res.result.longitude);

          if (lat !== null && lng !== null && item._id) {
            await safeUpdateCms(item._id, {
              latitude: lat,
              longitude: lng,
              PostCode: safeUpper(postcodeRaw)
            });
          }
        }
      } catch (e) {
        console.warn("Postcode backfill failed:", e);
      }
    }

    if (lat !== null && lng !== null) {
      wireLocationTabs(lat, lng);
    } else {
      collapse("#locationStrip");
    }

    if (!postcodeRaw) {
      renderEpcUI(item, {
        currentRating: "N/A",
        currentScore: "N/A",
        potentialRating: "N/A",
        potentialScore: "N/A",
        lodgementDate: null,
        expiryDate: null
      });

      wireComplianceInputs(item);
      return;
    }

    const postcode = safeUpper(postcodeRaw);
    const hint = cleanAddressHint(
      [item.houseNameNumber, item.propertyAddress].filter(Boolean).join(" ")
    );
    const cert = String(item.epcCertificateNumber || "").trim() || null;

    if (hasCachedEpc(item) && isEpcFresh(item, EPC_FRESH_DAYS)) {
      console.log("✅ Using cached EPC (fresh)");

      renderEpcUI(item, {
        currentRating: item.epcCurrentRating || "N/A",
        currentScore: item.epcCurrentScore ?? "N/A",
        potentialRating: item.epcPotentialRating || "N/A",
        potentialScore: item.epcPotentialScore ?? "N/A",
        lodgementDate: item.epcLodgementDate || null,
        expiryDate: item.epcExpiryDate || null
      });

      wireComplianceInputs(item);
      return;
    }

    let epcResult;

    try {
      epcResult = await getLatestDomesticEpc({
        postcode,
        addressHint: hint,
        certificateNumber: cert
      });

      if (!epcResult?.ok) {
        epcResult = await getLatestDomesticEpc({ postcode });
      }
    } catch (err) {
      console.warn("EPC lookup failed:", err);
      renderEpcUI(item, {});
      wireComplianceInputs(item);
      return;
    }

    if (!epcResult?.ok || !epcResult?.data) {
      await safeUpdateCms(item._id, {
        epcFound: false,
        PostCode: postcode,
        epcFetchedAt: new Date()
      });

      renderEpcUI(item, {});
      wireComplianceInputs(item);
      return;
    }

    const d = epcResult.data;

    const hasRealEpc =
      !!String(d.currentEnergyRating || "").trim() ||
      (d.currentEnergyEfficiency !== null && d.currentEnergyEfficiency !== undefined) ||
      !!String(d.potentialEnergyRating || "").trim() ||
      (d.potentialEnergyEfficiency !== null && d.potentialEnergyEfficiency !== undefined);

    if (!hasRealEpc) {
      console.warn("⚠️ EPC returned ok but empty fields. Treating as not found.", epcResult);

      await safeUpdateCms(item._id, {
        epcFound: false,
        PostCode: postcode,
        epcFetchedAt: new Date()
      });

      renderEpcUI(item, {});
      wireComplianceInputs(item);
      return;
    }

    renderEpcUI(item, {
      currentRating: d.currentEnergyRating || "N/A",
      currentScore: d.currentEnergyEfficiency ?? "N/A",
      potentialRating: d.potentialEnergyRating || "N/A",
      potentialScore: d.potentialEnergyEfficiency ?? "N/A",
      lodgementDate: d.lodgementDate || null,
      expiryDate: d.expiryDate || null
    });

    await safeUpdateCms(item._id, {
      epcFound: true,
      epcCurrentRating: d.currentEnergyRating || null,
      epcCurrentScore: toNumberMaybe(d.currentEnergyEfficiency),
      epcPotentialRating: d.potentialEnergyRating || null,
      epcPotentialScore: toNumberMaybe(d.potentialEnergyEfficiency),
      epcLodgementDate: parseDateMaybe(d.lodgementDate),
      epcExpiryDate: parseDateMaybe(d.expiryDate),
      epcCertificateNumber: d.certificateNumber || cert || null,
      epcFetchedAt: new Date(),
      PostCode: postcode,
      epcRaw: d
    });

    wireComplianceInputs({
      ...item,
      epcCurrentRating: d.currentEnergyRating || item.epcCurrentRating,
      epcCurrentScore: toNumberMaybe(d.currentEnergyEfficiency),
      epcPotentialRating: d.potentialEnergyRating || item.epcPotentialRating,
      epcPotentialScore: toNumberMaybe(d.potentialEnergy