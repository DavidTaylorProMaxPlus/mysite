import { session } from 'wix-storage';
import wixLocation from 'wix-location';

const IDS = {
    formMessage: "#formMessage",
    continueBtn: "#continueBtn",

    helpToggle: "#AMLHelpToggle",
    helpBox: "#HIDDENHELP",

    additionalBox: "#additionalbox",

    radioIntent: "#radioGroup1",
    radioDepth: "#radioGroup2",
    radioTenant: "#radioGroup3",
    radioAmlStatus: "#radioGroup4",

    // Main AML docs question
    radioDocsPrimary: "#radioGroup5",
    radioDocsFallback: "#amlDocsRadio",

    uploadBtnPrimary: "#AMLUpload",
    uploadBtnFallback: "#amlUpload",

    uploadTextPrimary: "#amlUploadText",
    uploadTextFallback: "#gasCertUploadText"
};

$w.onReady(function () {
    console.log("AML CHECKS PAGE READY");

    initialiseUi();
    wireHelpToggle();
    wireAmlStatusLogic();
    wireDocsLogic();
    wireContinueButton();
});

/* =========================================================
   INIT
========================================================= */

function initialiseUi() {
    clearFormMessage();

    collapseIfPossible(IDS.helpBox);
    updateAmlUI();

    console.log("Initial IDs check:", {
        continueBtn: exists(IDS.continueBtn),
        formMessage: exists(IDS.formMessage),
        AMLHelpToggle: exists(IDS.helpToggle),
        HIDDENHELP: exists(IDS.helpBox),
        additionalbox: exists(IDS.additionalBox),
        radioGroup1: exists(IDS.radioIntent),
        radioGroup2: exists(IDS.radioDepth),
        radioGroup3: exists(IDS.radioTenant),
        radioGroup4: exists(IDS.radioAmlStatus),
        radioGroup5: exists(IDS.radioDocsPrimary),
        amlDocsRadio: exists(IDS.radioDocsFallback),
        AMLUpload: exists(IDS.uploadBtnPrimary),
        amlUpload: exists(IDS.uploadBtnFallback),
        amlUploadText: exists(IDS.uploadTextPrimary),
        gasCertUploadText: exists(IDS.uploadTextFallback)
    });
}

/* =========================================================
   HELP TOGGLE
========================================================= */

function wireHelpToggle() {
    const toggle = getEl(IDS.helpToggle);
    if (!toggle) {
        console.warn("AML help toggle not found:", IDS.helpToggle);
        return;
    }

    bindIfSupported(toggle, "onClick", () => {
        console.log("AMLHelpToggle clicked");

        const helpBox = getEl(IDS.helpBox);
        if (!helpBox) {
            console.warn("Help box not found:", IDS.helpBox);
            return;
        }

        if (helpBox.collapsed) {
            expandIfPossible(IDS.helpBox);
        } else {
            collapseIfPossible(IDS.helpBox);
        }
    });
}

/* =========================================================
   AML STATUS UI
========================================================= */

function wireAmlStatusLogic() {
    const amlStatusGroup = getEl(IDS.radioAmlStatus);
    if (!amlStatusGroup) {
        console.warn("AML status radio group not found:", IDS.radioAmlStatus);
        return;
    }

    bindIfSupported(amlStatusGroup, "onChange", () => {
        console.log("radioGroup4 changed:", getValue(IDS.radioAmlStatus));
        updateAmlUI();
        clearFormMessage();
    });

    bindIfSupported(amlStatusGroup, "onClick", () => {
        console.log("radioGroup4 clicked:", getValue(IDS.radioAmlStatus));
        updateAmlUI();
        clearFormMessage();
    });
}

function wireDocsLogic() {
    const docsNode = getDocsNode();
    if (!docsNode) {
        console.warn("AML docs radio group not found.");
        return;
    }

    bindIfSupported(docsNode, "onChange", () => {
        console.log("AML docs changed:", getDocsValue());
        clearFormMessage();
    });

    bindIfSupported(docsNode, "onClick", () => {
        console.log("AML docs clicked:", getDocsValue());
        clearFormMessage();
    });
}

function updateAmlUI() {
    const amlStatus = getValue(IDS.radioAmlStatus);
    console.log("updateAmlUI()", { amlStatus });

    if (requiresDocsQuestion(amlStatus)) {
        showAdditionalAmlBox();
    } else {
        hideAdditionalAmlBox();
    }
}

function requiresDocsQuestion(value) {
    const v = String(value || "").trim();
    return v === "partial_documents" || v === "no_documents";
}

function showAdditionalAmlBox() {
    expandIfPossible(IDS.additionalBox);

    const docsNode = getDocsNode();
    if (docsNode) {
        showNode(docsNode);
    }

    showUploadUi();
}

function hideAdditionalAmlBox() {
    collapseIfPossible(IDS.additionalBox);

    const docsNode = getDocsNode();
    if (docsNode) {
        hideNode(docsNode);
        clearNodeValue(docsNode);
    }

    hideUploadUi();
}

function showUploadUi() {
    if (exists(IDS.uploadBtnPrimary)) showIfPossible(IDS.uploadBtnPrimary);
    if (exists(IDS.uploadBtnFallback)) showIfPossible(IDS.uploadBtnFallback);
    if (exists(IDS.uploadTextPrimary)) showIfPossible(IDS.uploadTextPrimary);
    if (exists(IDS.uploadTextFallback)) showIfPossible(IDS.uploadTextFallback);
}

function hideUploadUi() {
    if (exists(IDS.uploadBtnPrimary)) hideIfPossible(IDS.uploadBtnPrimary);
    if (exists(IDS.uploadBtnFallback)) hideIfPossible(IDS.uploadBtnFallback);
    if (exists(IDS.uploadTextPrimary)) hideIfPossible(IDS.uploadTextPrimary);
    if (exists(IDS.uploadTextFallback)) hideIfPossible(IDS.uploadTextFallback);
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
        const amlStatus = getValue(IDS.radioAmlStatus);
        const docsHeld = getDocsValue();

        console.log("Collected values:", {
            intent,
            depth,
            tenant,
            amlStatus,
            docsHeld
        });

        if (!intent || !depth || !tenant || !amlStatus) {
            console.warn("Blocked: missing main answers");
            setFormMessage("Please answer all questions before continuing.");
            return;
        }

        if (requiresDocsQuestion(amlStatus) && !docsHeld) {
            console.warn("Blocked: AML documents question still missing");
            setFormMessage("Please tell us what AML documents you currently have.");
            return;
        }

        try {
            session.setItem("sourceServicePage", "aml-checks");
            session.setItem("priorityModule", "aml");
            session.setItem("primaryIntent", String(intent || ""));
            session.setItem("journeyDepth", String(depth || ""));
            session.setItem("isTenanted", String(tenant || ""));
            session.setItem("amlStatus", String(amlStatus || ""));
            session.setItem("amlDocumentsHeld", String(docsHeld || ""));

            console.log("AML session saved successfully");
            console.log("Redirecting to /add-a-property");

            wixLocation.to("/add-a-property");
        } catch (err) {
            console.error("Failed saving AML session:", err);
            setFormMessage("Something went wrong saving your answers. Please try again.");
        }
    });
}

/* =========================================================
   DOCS HELPERS
========================================================= */

function getDocsNode() {
    return getEl(IDS.radioDocsPrimary) || getEl(IDS.radioDocsFallback);
}

function getDocsValue() {
    const node = getDocsNode();
    if (!node) return "";

    try {
        if (node.value !== undefined && node.value !== null && String(node.value).trim() !== "") {
            return String(node.value).trim();
        }
    } catch (e) {}

    try {
        if (typeof node.selectedIndex !== "undefined" && Array.isArray(node.options)) {
            const idx = node.selectedIndex;
            if (idx >= 0 && node.options[idx]) {
                return String(node.options[idx].value || "").trim();
            }
        }
    } catch (e) {}

    return "";
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
    if (!node) return "";

    try {
        if (node.value !== undefined && node.value !== null) {
            return String(node.value).trim();
        }
    } catch (e) {}

    return "";
}

function clearNodeValue(node) {
    if (!node) return;

    try {
        node.value = "";
    } catch (e) {}

    try {
        node.value = null;
    } catch (e) {}
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

function showNode(node) {
    if (!node) return;

    try {
        if (typeof node.show === "function") node.show();
    } catch (e) {}

    try {
        if (typeof node.expand === "function") node.expand();
    } catch (e) {}
}

function hideNode(node) {
    if (!node) return;

    try {
        if (typeof node.hide === "function") node.hide();
    } catch (e) {}

    try {
        if (typeof node.collapse === "function") node.collapse();
    } catch (e) {}
}

function showIfPossible(id) {
    showNode(getEl(id));
}

function hideIfPossible(id) {
    hideNode(getEl(id));
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