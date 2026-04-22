import { session } from 'wix-storage';
import wixLocation from 'wix-location';

const IDS = {
    formMessage: "#formMessage",
    continueBtn: "#continueBtn",
    helpToggle: "#complianceHelpToggle",
    helpBox: "#HIDDENHELP",
    additionalBox: "#additionalbox",

    radioIntent: "#radioGroup1",
    radioDepth: "#radioGroup2",
    radioTenant: "#radioGroup3",
    radioFocusArea: "#radioGroup4",
    radioPriority: "#radioGroup5",

    complianceAreasBox: "#complianceAreasBox",
    complianceChecklist: "#complianceChecklist",

    complianceUploadBtn: "#complianceUploadBtn",
    complianceUploadText: "#complianceUploadText"
};

$w.onReady(function () {
    console.log("COMPLIANCE CHECKER A-Z PAGE READY");

    initialiseUi();
    wireHelpToggle();
    wireComplianceLogic();
    wireContinueButton();
});

/* =========================================================
   INIT
========================================================= */

function initialiseUi() {
    clearFormMessage();

    collapseIfPossible(IDS.helpBox);
    hideAdditionalComplianceBox();
    updateComplianceUI();

    console.log("Initial IDs check:", {
        continueBtn: exists(IDS.continueBtn),
        formMessage: exists(IDS.formMessage),
        radioGroup1: exists(IDS.radioIntent),
        radioGroup2: exists(IDS.radioDepth),
        radioGroup3: exists(IDS.radioTenant),
        radioGroup4: exists(IDS.radioFocusArea),
        radioGroup5: exists(IDS.radioPriority),
        complianceAreasBox: exists(IDS.complianceAreasBox),
        complianceChecklist: exists(IDS.complianceChecklist),
        complianceHelpToggle: exists(IDS.helpToggle),
        complianceUpload: exists(IDS.complianceUploadBtn),
        complianceUploadText: exists(IDS.complianceUploadText)
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

        console.log("complianceHelpToggle clicked");

        if (helpBox.collapsed) {
            expandIfPossible(IDS.helpBox);
        } else {
            collapseIfPossible(IDS.helpBox);
        }
    });
}

/* =========================================================
   COMPLIANCE UI
========================================================= */

function wireComplianceLogic() {
    const intentGroup = getEl(IDS.radioIntent);
    const focusAreaGroup = getEl(IDS.radioFocusArea);
    const priorityGroup = getEl(IDS.radioPriority);

    if (intentGroup) {
        bindIfSupported(intentGroup, "onChange", () => {
            console.log("radioGroup1 changed:", getValue(IDS.radioIntent));
            updateComplianceUI();
            clearFormMessage();
        });

        bindIfSupported(intentGroup, "onClick", () => {
            console.log("radioGroup1 clicked:", getValue(IDS.radioIntent));
            updateComplianceUI();
            clearFormMessage();
        });
    }

    if (focusAreaGroup) {
        bindIfSupported(focusAreaGroup, "onChange", () => {
            console.log("radioGroup4 changed:", getValue(IDS.radioFocusArea));
            clearFormMessage();
        });

        bindIfSupported(focusAreaGroup, "onClick", () => {
            console.log("radioGroup4 clicked:", getValue(IDS.radioFocusArea));
            clearFormMessage();
        });
    }

    if (priorityGroup) {
        bindIfSupported(priorityGroup, "onChange", () => {
            console.log("radioGroup5 changed:", getValue(IDS.radioPriority));
            clearFormMessage();
        });

        bindIfSupported(priorityGroup, "onClick", () => {
            console.log("radioGroup5 clicked:", getValue(IDS.radioPriority));
            clearFormMessage();
        });
    }
}

function updateComplianceUI() {
    const intent = getValue(IDS.radioIntent);
    console.log("updateComplianceUI()", { intent });

    if (intent) {
        showAdditionalComplianceBox();
    } else {
        hideAdditionalComplianceBox();
    }
}

function showAdditionalComplianceBox() {
    expandIfPossible(IDS.additionalBox);
    showIfPossible(IDS.complianceAreasBox);
    showIfPossible(IDS.complianceUploadBtn);
    showIfPossible(IDS.complianceUploadText);
}

function hideAdditionalComplianceBox() {
    collapseIfPossible(IDS.additionalBox);
    hideIfPossible(IDS.complianceAreasBox);
    hideIfPossible(IDS.complianceUploadBtn);
    hideIfPossible(IDS.complianceUploadText);
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
        const focusArea = getValue(IDS.radioFocusArea);
        const priority = getValue(IDS.radioPriority);

        console.log("Collected values:", {
            intent,
            depth,
            tenant,
            focusArea,
            priority
        });

        if (!intent || !depth || !tenant || !focusArea) {
            console.warn("Blocked: missing main answers");
            setFormMessage("Please answer all questions before continuing.");
            return;
        }

        try {
            session.setItem("sourceServicePage", "compliance-checker");
            session.setItem("priorityModule", "complianceChecker");
            session.setItem("primaryIntent", String(intent || ""));
            session.setItem("journeyDepth", String(depth || ""));
            session.setItem("isTenanted", String(tenant || ""));
            session.setItem("complianceFocusArea", String(focusArea || ""));
            session.setItem("compliancePriority", String(priority || ""));

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