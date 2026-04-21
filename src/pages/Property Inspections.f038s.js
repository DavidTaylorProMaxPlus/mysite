import { session } from 'wix-storage';
import wixLocation from 'wix-location';

const IDS = {
    formMessage: "#formMessage",
    continueBtn: "#continueBtn",
    helpToggle: "#inspectionHelpToggle",
    helpBox: "#HIDDENHELP",
    additionalBox: "#additionalbox",

    radioIntent: "#radioGroup1",
    radioDepth: "#radioGroup2",
    radioTenant: "#radioGroup3",
    radioInspectionType: "#radioGroup4",
    radioConcern: "#radioGroup5",

    // Supports both versions just in case
    inspectionDatePrimary: "#inspectionDate",
    inspectionDateFallback: "#propertyInspectionDate",

    inspectionUploadBtn: "#inspectionUpload",
    inspectionUploadText: "#inspectionUploadText"
};

$w.onReady(function () {
    console.log("PROPERTY INSPECTIONS PAGE READY");

    initialiseUi();
    wireHelpToggle();
    wireInspectionLogic();
    wireContinueButton();
});

/* =========================================================
   INIT
========================================================= */

function initialiseUi() {
    clearFormMessage();

    collapseIfPossible(IDS.helpBox);
    hideAdditionalInspectionBox();
    updateInspectionUI();

    console.log("Initial IDs check:", {
        continueBtn: exists(IDS.continueBtn),
        formMessage: exists(IDS.formMessage),
        radioGroup1: exists(IDS.radioIntent),
        radioGroup2: exists(IDS.radioDepth),
        radioGroup3: exists(IDS.radioTenant),
        radioGroup4: exists(IDS.radioInspectionType),
        radioGroup5: exists(IDS.radioConcern),
        inspectionDate: exists(IDS.inspectionDatePrimary),
        propertyInspectionDate: exists(IDS.inspectionDateFallback),
        additionalbox: exists(IDS.additionalBox),
        inspectionHelpToggle: exists(IDS.helpToggle),
        inspectionUpload: exists(IDS.inspectionUploadBtn),
        inspectionUploadText: exists(IDS.inspectionUploadText)
    });
}

/* =========================================================
   HELP TOGGLE
========================================================= */

function wireHelpToggle() {
    const toggle = getEl(IDS.helpToggle);
    if (!toggle) return;

    bindIfSupported(toggle, "onClick", () => {
        const helpBox = getEl(IDS.helpBox);
        if (!helpBox) return;

        console.log("inspectionHelpToggle clicked");

        if (helpBox.collapsed) {
            expandIfPossible(IDS.helpBox);
        } else {
            collapseIfPossible(IDS.helpBox);
        }
    });
}

/* =========================================================
   INSPECTION UI
========================================================= */

function wireInspectionLogic() {
    const inspectionTypeGroup = getEl(IDS.radioInspectionType);
    const concernGroup = getEl(IDS.radioConcern);

    if (inspectionTypeGroup) {
        bindIfSupported(inspectionTypeGroup, "onChange", () => {
            console.log("radioGroup4 changed:", getValue(IDS.radioInspectionType));
            updateInspectionUI();
            clearFormMessage();
        });

        bindIfSupported(inspectionTypeGroup, "onClick", () => {
            console.log("radioGroup4 clicked:", getValue(IDS.radioInspectionType));
            updateInspectionUI();
            clearFormMessage();
        });
    }

    if (concernGroup) {
        bindIfSupported(concernGroup, "onChange", () => {
            console.log("radioGroup5 changed:", getValue(IDS.radioConcern));
            clearFormMessage();
        });

        bindIfSupported(concernGroup, "onClick", () => {
            console.log("radioGroup5 clicked:", getValue(IDS.radioConcern));
            clearFormMessage();
        });
    }

    const dateNode = getInspectionDateNode();

    if (dateNode) {
        bindIfSupported(dateNode, "onChange", () => {
            console.log("inspection date changed:", getInspectionDateInfo());
            clearFormMessage();
        });

        bindIfSupported(dateNode, "onInput", () => {
            console.log("inspection date input:", getInspectionDateInfo());
            clearFormMessage();
        });

        bindIfSupported(dateNode, "onClick", () => {
            console.log("inspection date clicked:", getInspectionDateInfo());
        });
    }
}

function updateInspectionUI() {
    const inspectionType = getValue(IDS.radioInspectionType);
    console.log("updateInspectionUI()", { inspectionType });

    if (inspectionType) {
        showAdditionalInspectionBox();
    } else {
        hideAdditionalInspectionBox();
        clearInspectionDateField();
    }
}

function showAdditionalInspectionBox() {
    expandIfPossible(IDS.additionalBox);
    showInspectionDateField();
    showIfPossible(IDS.inspectionUploadBtn);
    showIfPossible(IDS.inspectionUploadText);
}

function hideAdditionalInspectionBox() {
    collapseIfPossible(IDS.additionalBox);
    hideInspectionDateField();
    hideIfPossible(IDS.inspectionUploadBtn);
    hideIfPossible(IDS.inspectionUploadText);
}

/* =========================================================
   CONTINUE
========================================================= */

function wireContinueButton() {
    const btn = getEl(IDS.continueBtn);
    if (!btn) {
        console.error("Missing continue button:", IDS.continueBtn);
        return;
    }

    bindIfSupported(btn, "onClick", () => {
        console.log("CONTINUE BUTTON CLICKED");

        const intent = getValue(IDS.radioIntent);
        const depth = getValue(IDS.radioDepth);
        const tenant = getValue(IDS.radioTenant);
        const inspectionType = getValue(IDS.radioInspectionType);
        const concern = getValue(IDS.radioConcern);

        console.log("Collected values:", {
            intent,
            depth,
            tenant,
            inspectionType,
            concern
        });

        if (!intent || !depth || !tenant || !inspectionType || !concern) {
            console.warn("Blocked: missing main answers");
            setFormMessage("Please answer all questions before continuing.");
            return;
        }

        try {
            session.setItem("sourceServicePage", "property-inspections");
            session.setItem("priorityModule", "propertyInspections");
            session.setItem("primaryIntent", String(intent || ""));
            session.setItem("journeyDepth", String(depth || ""));
            session.setItem("isTenanted", String(tenant || ""));
            session.setItem("inspectionType", String(inspectionType || ""));
            session.setItem("inspectionConcern", String(concern || ""));

            console.log("Session saved successfully");
        } catch (err) {
            console.error("Failed saving session:", err);
            setFormMessage("Something went wrong saving your answers. Please try again.");
            return;
        }

        console.log("Redirecting to /add-a-property");
        wixLocation.to("/add-a-property");
    });
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getInspectionDateNode() {
    return getEl(IDS.inspectionDatePrimary) || getEl(IDS.inspectionDateFallback);
}

function getInspectionDateInfo() {
    const node = getInspectionDateNode();

    if (!node) {
        return {
            raw: "",
            display: "",
            iso: "",
            parsedDate: null,
            hasValue: false
        };
    }

    let rawValue = null;
    let textValue = "";
    let placeholderValue = "";
    let renderedValue = "";

    try {
        rawValue = node.value;
    } catch (e) {}

    try {
        if (typeof node.text !== "undefined") {
            textValue = String(node.text || "").trim();
        }
    } catch (e) {}

    try {
        if (typeof node.placeholder !== "undefined") {
            placeholderValue = String(node.placeholder || "").trim();
        }
    } catch (e) {}

    try {
        if (typeof node.rendered === "object" && node.rendered && typeof node.rendered.value !== "undefined") {
            renderedValue = String(node.rendered.value || "").trim();
        }
    } catch (e) {}

    let rawString = "";
    let parsedDate = null;

    if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
        parsedDate = rawValue;
        rawString = rawValue.toString();
    } else if (rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== "") {
        rawString = String(rawValue).trim();
        parsedDate = tryParseDate(rawString);
    }

    if (!parsedDate && textValue) {
        parsedDate = tryParseDate(textValue);
    }

    if (!parsedDate && renderedValue) {
        parsedDate = tryParseDate(renderedValue);
    }

    const display =
        formatDisplayDate(parsedDate) ||
        textValue ||
        renderedValue ||
        rawString ||
        "";

    const hasRealDisplayValue =
        !!display &&
        display.trim().toLowerCase() !== "select" &&
        display.trim() !== "";

    const hasRealPlaceholderValue =
        !!placeholderValue &&
        placeholderValue.trim().toLowerCase() !== "select" &&
        placeholderValue.trim() !== "";

    const hasValue =
        !!parsedDate ||
        hasRealDisplayValue ||
        (!!rawString && rawString.trim() !== "") ||
        hasRealPlaceholderValue;

    return {
        raw: rawString,
        display,
        iso: parsedDate ? parsedDate.toISOString() : "",
        parsedDate,
        hasValue
    };
}

function tryParseDate(input) {
    if (!input) return null;

    if (input instanceof Date && !isNaN(input.getTime())) {
        return input;
    }

    const str = String(input).trim();
    if (!str) return null;
    if (str.toLowerCase() === "select") return null;

    const nativeParsed = new Date(str);
    if (!isNaN(nativeParsed.getTime())) {
        return nativeParsed;
    }

    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const day = Number(slashMatch[1]);
        const month = Number(slashMatch[2]) - 1;
        const year = Number(slashMatch[3]);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
        const day = Number(dashMatch[1]);
        const month = Number(dashMatch[2]) - 1;
        const year = Number(dashMatch[3]);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }

    return null;
}

function formatDisplayDate(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";

    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yyyy = dateObj.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
}

function clearInspectionDateField() {
    const node = getInspectionDateNode();
    if (!node) return;

    try {
        node.value = null;
    } catch (e) {}

    try {
        if (typeof node.text !== "undefined") {
            node.text = "";
        }
    } catch (e) {}
}

function showInspectionDateField() {
    if (exists(IDS.inspectionDatePrimary)) showIfPossible(IDS.inspectionDatePrimary);
    if (exists(IDS.inspectionDateFallback)) showIfPossible(IDS.inspectionDateFallback);
}

function hideInspectionDateField() {
    if (exists(IDS.inspectionDatePrimary)) hideIfPossible(IDS.inspectionDatePrimary);
    if (exists(IDS.inspectionDateFallback)) hideIfPossible(IDS.inspectionDateFallback);
}

/* =========================================================
   FORM MESSAGE
========================================================= */

function setFormMessage(message) {
    const msg = getEl(IDS.formMessage);
    if (!msg) return;

    try {
        msg.text = message || "";
    } catch (e) {}

    if (message) {
        showIfPossible(IDS.formMessage);
    } else {
        clearFormMessage();
    }
}

function clearFormMessage() {
    const msg = getEl(IDS.formMessage);
    if (!msg) return;

    try {
        msg.text = "";
    } catch (e) {}

    collapseIfPossible(IDS.formMessage);
    hideIfPossible(IDS.formMessage);
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function exists(id) {
    try {
        return !!$w(id);
    } catch (e) {
        return false;
    }
}

function getEl(id) {
    try {
        return $w(id);
    } catch (e) {
        return null;
    }
}

function getValue(id) {
    const node = getEl(id);
    if (!node) return null;

    try {
        return node.value;
    } catch (e) {
        return null;
    }
}

function bindIfSupported(node, methodName, handler) {
    try {
        if (node && typeof node[methodName] === "function") {
            node[methodName](handler);
            return true;
        }
    } catch (e) {
        console.warn(`Could not bind ${methodName}`, e);
    }
    return false;
}

function showIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.show === "function") node.show();
    } catch (e) {}

    try {
        if (typeof node.expand === "function") node.expand();
    } catch (e) {}
}

function hideIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.hide === "function") node.hide();
    } catch (e) {}

    try {
        if (typeof node.collapse === "function") node.collapse();
    } catch (e) {}
}

function expandIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.expand === "function") node.expand();
    } catch (e) {}
}

function collapseIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.collapse === "function") node.collapse();
    } catch (e) {}
}