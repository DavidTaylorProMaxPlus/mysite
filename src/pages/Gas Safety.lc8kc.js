import { session, local } from "wix-storage";
import { applyServiceIconToPossibleTargets } from "public/cmpServiceIcons";
import wixLocation from "wix-location";

const ADD_PROPERTY_URL = "/add-a-property";
const CMP_JOURNEY_KEY = "cmpJourney";
const GAS_SCAN_STATUS = "not_scanned";

const IDS = {
    formMessage: "#formMessage",
    continueBtn: "#continueBtn",
    helpTogglePrimary: "#serviceHelpToggle",
    helpToggleFallback: "#gasHelpToggle",
    helpBox: "#HIDDENHELP",
    additionalBox: "#additionalbox",

    journeyHintText: "#journeyHintText",
    heroTitle: "#heroTitle",
    heroSubtitle: "#heroSubtitle",
    introTitle: "#introTitle",
    introSubtitle: "#introSubtitle",
    introBody: "#introBody",

    questionText1: "#text251",
    questionText2: "#text248",
    questionText3: "#text249",
    questionText4: "#text250",

    radioIntent: "#radioGroup1",
    radioDepth: "#radioGroup2",
    radioTenant: "#radioGroup3",
    radioGasStatus: "#radioGroup4",

    gasDatePrimary: "#gasSafetyDate",
    gasDateFallback: "#gassafetydate",
    gasDateAlt: "#gasCertificateDate",
    gasDateShort: "#gasDate",

    gasDateBox: "#gasSafetyDateBox",
    gasDateBoxAlt: "#gasDateBox",
    gasCertificateWrap: "#gasCertificateWrap",
    gasCertificateQuestion: "#gasCertificateQuestion",
    gasQuestionBox: "#questionBox5",
    gasOuterBox: "#box82",

    gasUploadBtn: "#gasCertUpload",
    gasUploadText: "#gasCertUploadText"
};

const GAS_DATE_INPUT_IDS = [
    IDS.gasDatePrimary,
    IDS.gasDateFallback,
    IDS.gasDateAlt,
    IDS.gasDateShort
];

const GAS_DATE_SECTION_IDS = [
    IDS.additionalBox,
    IDS.gasDateBox,
    IDS.gasDateBoxAlt,
    IDS.gasCertificateWrap,
    IDS.gasCertificateQuestion,
    IDS.gasQuestionBox,
    IDS.gasOuterBox
];

const GAS_SERVICE_ICON_TARGET_IDS = [
    "serviceIcon",
    "heroServiceIcon",
    "serviceHeroIcon",
    "serviceShieldIcon",
    "heroIcon",
    "pageServiceIcon",
    "servicePageIcon",
    "gasServiceIcon",
    "gasSafetyIcon"
];

const REQUIRED_RADIOS = [
    {
        key: "intent",
        id: IDS.radioIntent,
        label: "what you need help with today",
        prompt: "Start with the first question so CMP knows what you need help with today."
    },
    {
        key: "depth",
        id: IDS.radioDepth,
        label: "how many properties are involved",
        prompt: "Tell us how many properties you are dealing with so CMP can keep the route focused."
    },
    {
        key: "tenant",
        id: IDS.radioTenant,
        label: "whether the property is tenanted",
        prompt: "Confirm whether the property is currently tenanted before continuing."
    },
    {
        key: "gasStatus",
        id: IDS.radioGasStatus,
        label: "the current gas safety position",
        prompt: "Confirm the current gas safety position so CMP can decide what evidence or follow-up is needed."
    }
];

const PAGE_COPY = {
    heroTitle: "Gas Safety Certificate",
    heroSubtitle:
        "Start with the gas safety position, then carry the certificate context into the property dashboard.",
    introTitle: "Gas Safety Focus.",
    introSubtitle: "Track the certificate. Reduce renewal risk. Keep the property record ready.",
    introBody:
        "Answer the key gas safety questions first. If you already have a certificate, add the latest date or upload the file and CMP will carry that evidence into the property record.",
    questionText1: "What do you need help with today?",
    questionText2: "How many properties are you dealing with?",
    questionText3: "Is the property currently tenanted?",
    questionText4: "What is the current gas safety position?"
};

let gasUploadStatusText = "";
let lastCertificateDetailsVisible = false;

$w.onReady(function () {
    console.log("GAS SAFETY PAGE READY");
    applyServiceIconToPossibleTargets($w, "Gas Safety.lc8kc.js", "gasSafety", GAS_SERVICE_ICON_TARGET_IDS);

    applyPageText();
    initialiseUi();
    wireHelpToggle();
    wireFormInputs();
    wireContinueButton();
    renderGasJourney();
});

/* =========================================================
   INIT
========================================================= */

function applyPageText() {
    setTextIfExists(IDS.heroTitle, PAGE_COPY.heroTitle);
    setTextIfExists(IDS.heroSubtitle, PAGE_COPY.heroSubtitle);
    setTextIfExists(IDS.introTitle, PAGE_COPY.introTitle);
    setTextIfExists(IDS.introSubtitle, PAGE_COPY.introSubtitle);
    setTextIfExists(IDS.introBody, PAGE_COPY.introBody);

    setTextIfExists(IDS.questionText1, PAGE_COPY.questionText1);
    setTextIfExists(IDS.questionText2, PAGE_COPY.questionText2);
    setTextIfExists(IDS.questionText3, PAGE_COPY.questionText3);
    setTextIfExists(IDS.questionText4, PAGE_COPY.questionText4);
}

function initialiseUi() {
    clearFormMessage();
    collapseIfPossible(IDS.helpBox);
    hideAdditionalGasBox();
    setGasUploadText("");
    setContinueButtonLabel("Continue");

    console.log("Initial IDs check:", {
        continueBtn: exists(IDS.continueBtn),
        formMessage: exists(IDS.formMessage),
        journeyHintText: exists(IDS.journeyHintText),
        heroTitle: exists(IDS.heroTitle),
        heroSubtitle: exists(IDS.heroSubtitle),
        introTitle: exists(IDS.introTitle),
        introSubtitle: exists(IDS.introSubtitle),
        introBody: exists(IDS.introBody),
        questionText1: exists(IDS.questionText1),
        questionText2: exists(IDS.questionText2),
        questionText3: exists(IDS.questionText3),
        questionText4: exists(IDS.questionText4),
        radioGroup1: exists(IDS.radioIntent),
        radioGroup2: exists(IDS.radioDepth),
        radioGroup3: exists(IDS.radioTenant),
        radioGroup4: exists(IDS.radioGasStatus),
        gasSafetyDate: exists(IDS.gasDatePrimary),
        gassafetydate: exists(IDS.gasDateFallback),
        gasCertificateDate: exists(IDS.gasDateAlt),
        gasDate: exists(IDS.gasDateShort),
        gasSafetyDateBox: exists(IDS.gasDateBox),
        gasDateBox: exists(IDS.gasDateBoxAlt),
        gasCertificateWrap: exists(IDS.gasCertificateWrap),
        gasCertificateQuestion: exists(IDS.gasCertificateQuestion),
        questionBox5: exists(IDS.gasQuestionBox),
        box82: exists(IDS.gasOuterBox),
        additionalbox: exists(IDS.additionalBox),
        serviceHelpToggle: exists(IDS.helpTogglePrimary),
        gasHelpToggle: exists(IDS.helpToggleFallback),
        gasCertUpload: exists(IDS.gasUploadBtn),
        gasCertUploadText: exists(IDS.gasUploadText)
    });
}

/* =========================================================
   HELP TOGGLE
========================================================= */

function wireHelpToggle() {
    const toggle = getHelpToggleNode();
    if (!toggle) return;

    bindIfSupported(toggle, "onClick", () => {
        const helpBox = getEl(IDS.helpBox);
        if (!helpBox) return;

        if (helpBox.collapsed) {
            expandIfPossible(IDS.helpBox);
        } else {
            collapseIfPossible(IDS.helpBox);
        }
    });
}

function getHelpToggleNode() {
    return getEl(IDS.helpTogglePrimary) || getEl(IDS.helpToggleFallback);
}

/* =========================================================
   FORM STATE
========================================================= */

function wireFormInputs() {
    REQUIRED_RADIOS.forEach(({ id }) => {
        const node = getEl(id);
        if (!node) return;

        bindIfSupported(node, "onChange", handleFormProgressChanged);
        bindIfSupported(node, "onClick", handleFormProgressChanged);
    });

    getGasDateNodes().forEach((dateNode) => {
        bindIfSupported(dateNode, "onChange", handleFormProgressChanged);
        bindIfSupported(dateNode, "onInput", handleFormProgressChanged);
        bindIfSupported(dateNode, "onClick", () => {
            console.log("gas date clicked:", getGasDateInfo());
        });
    });

    const uploadNode = getEl(IDS.gasUploadBtn);
    if (uploadNode) {
        bindIfSupported(uploadNode, "onChange", () => {
            updateGasUploadSelectionText();
            handleFormProgressChanged();
        });
    }
}

function handleFormProgressChanged() {
    clearFormMessage();
    renderGasJourney();
}

// The page keeps the same storage contract, but all guidance now comes from
// a single derived state so copy, validation, and reveal logic stay aligned.
function getGasJourneyState() {
    const answers = {
        intent: getValue(IDS.radioIntent),
        depth: getValue(IDS.radioDepth),
        tenant: getValue(IDS.radioTenant),
        gasStatus: getValue(IDS.radioGasStatus)
    };
    const normalisedGasStatus = normaliseGasStatus(answers.gasStatus);
    const gasStatusMode = classifyGasStatus(normalisedGasStatus);
    const gasDateInfo = getGasDateInfo();
    const hasDateInput = hasGasDateInput();
    const shouldShowCertificateDetails =
        gasStatusMode === "current" || gasStatusMode === "maybe_expired";
    const dateRequired = gasStatusMode === "current";
    const dateRecommended = gasStatusMode === "maybe_expired";
    const missingRequiredRadio = REQUIRED_RADIOS.find(({ key }) => !answers[key]);
    const missingDate =
        shouldShowCertificateDetails && dateRequired && hasDateInput && !gasDateInfo.hasValue;
    const firstIncompleteStep = missingRequiredRadio
        ? {
              key: missingRequiredRadio.key,
              id: missingRequiredRadio.id,
              prompt: missingRequiredRadio.prompt
          }
        : missingDate
          ? {
                key: "gasDate",
                id: getGasDateFocusId(),
                prompt: "Add the latest gas safety check date so CMP can track the renewal window."
            }
          : null;

    return {
        answers,
        normalisedGasStatus,
        gasStatusMode,
        gasDateInfo,
        hasDateInput,
        shouldShowCertificateDetails,
        dateRequired,
        dateRecommended,
        hasUploadSelection: hasSelectedUploadFile(),
        firstIncompleteStep,
        canSubmit: !firstIncompleteStep,
        shouldWarnMissingDateField: shouldShowCertificateDetails && !hasDateInput
    };
}

function classifyGasStatus(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";

    if (
        raw === "yes_up_to_date" ||
        raw.includes("up to date") ||
        raw.includes("up_to_date") ||
        raw.includes("current") ||
        raw.includes("valid") ||
        raw.includes("in date")
    ) {
        return "current";
    }

    if (raw === "maybe_expired" || raw.includes("maybe expired") || raw.includes("expired")) {
        return "maybe_expired";
    }

    if (
        raw === "not_applicable" ||
        raw === "no_gas" ||
        raw.includes("no gas") ||
        raw.includes("not required") ||
        raw.includes("not applicable") ||
        raw.includes("does not apply")
    ) {
        return "not_applicable";
    }

    if (
        raw === "no" ||
        raw === "no_certificate" ||
        raw.includes("no certificate") ||
        raw.includes("don't have") ||
        raw.includes("do not have") ||
        raw.includes("missing")
    ) {
        return "missing";
    }

    return "other";
}

function renderGasJourney() {
    const state = getGasJourneyState();

    syncCertificateVisibility(state);
    renderDynamicCopy(state);
    setContinueButtonLabel(getContinueButtonLabel(state));

    console.log("GAS SAFETY STATE", {
        gasStatusMode: state.gasStatusMode,
        shouldShowCertificateDetails: state.shouldShowCertificateDetails,
        dateRequired: state.dateRequired,
        canSubmit: state.canSubmit,
        hasDateInput: state.hasDateInput,
        hasDateValue: state.gasDateInfo.hasValue
    });
}

function syncCertificateVisibility(state) {
    if (state.shouldShowCertificateDetails) {
        showAdditionalGasBox();
        renderGasCertificateQuestion(state);
        renderGasUploadGuidance(state);
    } else {
        if (lastCertificateDetailsVisible) {
            clearGasCertificateInputs();
        }
        hideAdditionalGasBox();
    }

    lastCertificateDetailsVisible = state.shouldShowCertificateDetails;
}

function renderDynamicCopy(state) {
    setTextIfExists(IDS.journeyHintText, buildJourneyHint(state));
}

function renderGasCertificateQuestion(state) {
    const message =
        state.gasStatusMode === "current"
            ? "Add the latest gas safety check date next. CMP uses it to track the next renewal window."
            : state.gasStatusMode === "maybe_expired"
              ? "If you know the last certificate date, add it here. This helps CMP judge the renewal risk, but you can continue without it."
              : "Add the latest gas safety details if you have them.";

    setTextIfExists(IDS.gasCertificateQuestion, message);
}

function renderGasUploadGuidance(state) {
    if (!state.shouldShowCertificateDetails) {
        setGasUploadText("");
        return;
    }

    if (gasUploadStatusText) {
        setGasUploadText(gasUploadStatusText);
        showIfPossible(IDS.gasUploadText);
        return;
    }

    const message =
        state.gasStatusMode === "current"
            ? "Optional: upload the current certificate now so the property record starts with the evidence attached."
            : "Optional: upload the latest certificate if you have it. You can still continue without a file.";

    setGasUploadText(message);
    showIfPossible(IDS.gasUploadText);
}

function buildJourneyHint(state) {
    if (state.shouldWarnMissingDateField) {
        return "Gas safety check started. The date field is missing on this page, so you can continue with the certificate status and upload the evidence later if needed.";
    }

    if (state.firstIncompleteStep) {
        if (state.firstIncompleteStep.key === "gasDate") {
            return "Gas safety check started. Add the latest gas safety date next so CMP can carry the renewal context into the property record.";
        }

        return "Gas safety check started. Work through the questions below, then add the property so CMP can build the wider compliance dashboard around it.";
    }

    if (state.gasStatusMode === "current") {
        return state.gasDateInfo.hasValue
            ? "Your gas safety date is ready. Continue to add the property now, or upload the certificate first so the evidence follows the record."
            : "Add the current gas safety date next. Once that is saved, CMP can track the renewal date from the property dashboard.";
    }

    if (state.gasStatusMode === "maybe_expired") {
        return state.gasDateInfo.hasValue
            ? "We will carry the last known gas safety date into the property record and flag the renewal context for follow-up."
            : "If you know the last certificate date, add it now. You can still continue without it and review the renewal risk from the property dashboard.";
    }

    if (state.gasStatusMode === "missing") {
        return "CMP will carry the missing gas safety status into the property record so the next compliance step is clear.";
    }

    if (state.gasStatusMode === "not_applicable") {
        return "CMP will note that gas safety may not apply here, then move you into the wider property compliance setup.";
    }

    if (state.canSubmit) {
        return "Your gas safety route is ready. Continue to add the property and CMP will keep this context attached to the record.";
    }

    return "Gas safety check started. Answer the questions below so CMP can understand whether this property needs a certificate, renewal reminder or follow-up support.";
}

function getContinueButtonLabel(state) {
    if (!state) return "Continue";
    if (state.canSubmit) return "Continue to add property";
    if (state.firstIncompleteStep?.key === "gasDate") return "Add date to continue";
    return "Continue";
}

/* =========================================================
   CONTINUE
========================================================= */

function wireContinueButton() {
    const btn = getEl(IDS.continueBtn);
    if (!btn) {
        console.error("Missing continue button:", IDS.continueBtn);
        setFormMessage(`This page is missing the required continue button (${IDS.continueBtn}).`);
        return;
    }

    bindIfSupported(btn, "onClick", handleContinueClick);
}

async function handleContinueClick() {
    const missingRequiredIds = REQUIRED_RADIOS.filter(({ id }) => !exists(id)).map(({ id }) => id);
    if (missingRequiredIds.length) {
        setFormMessage(`This page is missing required form elements: ${missingRequiredIds.join(", ")}`);
        return;
    }

    const state = getGasJourneyState();
    renderGasJourney();

    console.log("CONTINUE BUTTON CLICKED", {
        intent: state.answers.intent,
        depth: state.answers.depth,
        tenant: state.answers.tenant,
        gasStatus: state.answers.gasStatus,
        normalisedGasStatus: state.normalisedGasStatus,
        gasDateInfo: state.gasDateInfo
    });

    if (state.firstIncompleteStep) {
        guideToNextStep(state.firstIncompleteStep);
        return;
    }

    if (state.shouldWarnMissingDateField) {
        warnMissingGasDateInput();
    }

    let uploadedFileInfo = null;

    try {
        if (state.shouldShowCertificateDetails) {
            uploadedFileInfo = await uploadGasCertificateIfSelected();
        }
    } catch (uploadError) {
        console.error("Gas certificate upload failed:", uploadError);
        setFormMessage("We couldn’t upload the gas certificate just now. Please try again, or remove the file and continue without it.");
        return;
    }

    try {
        session.setItem("sourceServicePage", "gas-safety");
        session.setItem("priorityModule", "gasSafety");
        session.setItem("primaryIntent", String(state.answers.intent || ""));
        session.setItem("journeyDepth", String(state.answers.depth || ""));
        session.setItem("isTenanted", String(state.answers.tenant || ""));
        session.setItem("gasCertificateStatus", String(state.answers.gasStatus || ""));

        session.setItem("gasSafetyDateRaw", state.gasDateInfo.raw || "");
        session.setItem("gasSafetyDateDisplay", state.gasDateInfo.display || "");
        session.setItem("gasSafetyDateISO", state.gasDateInfo.iso || "");

        const gasSafetyJourney = buildGasSafetyJourneyData(
            state.answers.gasStatus,
            state.gasDateInfo,
            uploadedFileInfo
        );

        saveCmpJourneyGasSafety({
            gasSafetyJourney,
            intent: state.answers.intent,
            depth: state.answers.depth,
            tenant: state.answers.tenant,
            gasStatus: state.answers.gasStatus,
            gasDateInfo: state.gasDateInfo
        });

        console.log("Session saved successfully");
    } catch (error) {
        console.error("Failed saving session:", error);
        setFormMessage("Something went wrong saving your answers. Please try again.");
        return;
    }

    console.log("Redirecting to", ADD_PROPERTY_URL);
    wixLocation.to(ADD_PROPERTY_URL);
}

function guideToNextStep(step) {
    if (!step) return;

    if (step.key === "gasDate") {
        showAdditionalGasBox();
    }

    focusOrScrollToFirstAvailable(getStepFocusIds(step));
    setFormMessage(step.prompt);
}

function getStepFocusIds(step) {
    if (!step) return [];

    if (step.key === "gasDate") {
        return [getGasDateFocusId(), IDS.gasDateBox, IDS.gasCertificateWrap, IDS.additionalBox].filter(Boolean);
    }

    return [step.id].filter(Boolean);
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getGasDateFocusId() {
    return GAS_DATE_INPUT_IDS.find((id) => exists(id)) || IDS.gasDateBox || IDS.additionalBox;
}

function getGasDateNode() {
    return getGasDateNodes()[0] || null;
}

function getGasDateNodes() {
    const seen = new Set();

    return GAS_DATE_INPUT_IDS
        .map((id) => ({ id, node: getEl(id) }))
        .filter(({ id, node }) => {
            if (!node || seen.has(id)) return false;
            seen.add(id);
            return true;
        })
        .map(({ node }) => node);
}

function hasGasDateInput() {
    return getGasDateNodes().length > 0;
}

function getGasDateInfo() {
    const node = getGasDateNode();

    if (!node) {
        return {
            raw: "",
            display: "",
            iso: "",
            parsedDate: null,
            hasValue: false,
            exists: false
        };
    }

    let rawValue = null;
    let textValue = "";
    let placeholderValue = "";
    let renderedValue = "";

    try {
        rawValue = node.value;
    } catch (error) {}

    try {
        if (typeof node.text !== "undefined") {
            textValue = String(node.text || "").trim();
        }
    } catch (error) {}

    try {
        if (typeof node.placeholder !== "undefined") {
            placeholderValue = String(node.placeholder || "").trim();
        }
    } catch (error) {}

    try {
        if (typeof node.rendered === "object" && node.rendered && typeof node.rendered.value !== "undefined") {
            renderedValue = String(node.rendered.value || "").trim();
        }
    } catch (error) {}

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

    const display = formatDisplayDate(parsedDate) || textValue || renderedValue || rawString || "";
    const hasRealDisplayValue =
        !!display && display.trim().toLowerCase() !== "select" && display.trim() !== "";
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
        hasValue,
        exists: true
    };
}

function tryParseDate(input) {
    if (!input) return null;

    if (input instanceof Date && !isNaN(input.getTime())) {
        return input;
    }

    const value = String(input).trim();
    if (!value || value.toLowerCase() === "select") return null;

    const nativeParsed = new Date(value);
    if (!isNaN(nativeParsed.getTime())) {
        return nativeParsed;
    }

    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const day = Number(slashMatch[1]);
        const month = Number(slashMatch[2]) - 1;
        const year = Number(slashMatch[3]);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed;
    }

    const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
        const day = Number(dashMatch[1]);
        const month = Number(dashMatch[2]) - 1;
        const year = Number(dashMatch[3]);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed;
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

function clearGasDateField() {
    getGasDateNodes().forEach((node) => {
        try {
            node.value = null;
        } catch (error) {}

        try {
            if (typeof node.text !== "undefined") {
                node.text = "";
            }
        } catch (error) {}
    });
}

function showGasDateField() {
    GAS_DATE_INPUT_IDS.forEach((id) => {
        if (exists(id)) showIfPossible(id);
    });
}

function hideGasDateField() {
    GAS_DATE_INPUT_IDS.forEach((id) => {
        if (exists(id)) hideIfPossible(id);
    });
}

function clearGasCertificateInputs() {
    clearGasDateField();
    clearGasUploadSelection();
    gasUploadStatusText = "";
}

function normaliseGasStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function warnMissingGasDateInput() {
    console.warn("Gas Safety date input element is missing. Checked IDs:", GAS_DATE_INPUT_IDS);
    setFormMessage("The gas safety date field is missing on this page. You can continue without it for now.");
}

/* =========================================================
   UPLOAD + JOURNEY DATA
========================================================= */

function safeJsonParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function normaliseIsoDate(value) {
    if (!value) return "";
    const parsed = tryParseDate(value);
    return parsed ? parsed.toISOString() : "";
}

function getGasExpiryDate(dateLike) {
    const baseDate = dateLike instanceof Date ? dateLike : tryParseDate(dateLike);
    if (!baseDate || isNaN(baseDate.getTime())) return null;

    const expiry = new Date(baseDate.getTime());
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
}

function hasSelectedUploadFile() {
    const uploadNode = getEl(IDS.gasUploadBtn);
    if (!uploadNode) return false;

    try {
        return Array.isArray(uploadNode.value) ? uploadNode.value.length > 0 : Boolean(uploadNode.value);
    } catch (error) {
        return false;
    }
}

function getSelectedUploadFileName() {
    const uploadNode = getEl(IDS.gasUploadBtn);
    if (!uploadNode) return "";

    try {
        const files = Array.isArray(uploadNode.value) ? uploadNode.value : [];
        const first = files[0];
        return String(first?.name || first?.fileName || first?.originalFileName || "").trim();
    } catch (error) {
        return "";
    }
}

function clearGasUploadSelection() {
    const uploadNode = getEl(IDS.gasUploadBtn);
    if (!uploadNode) return;

    try {
        if (typeof uploadNode.reset === "function") {
            uploadNode.reset();
            return;
        }
    } catch (error) {}

    try {
        uploadNode.value = [];
    } catch (error) {}

    try {
        uploadNode.value = null;
    } catch (error) {}
}

function setGasUploadText(message) {
    const textNode = getEl(IDS.gasUploadText);
    if (!textNode) return;

    try {
        if (typeof textNode.text !== "undefined") {
            textNode.text = message || "";
        }
    } catch (error) {}
}

function updateGasUploadSelectionText() {
    const selectedName = getSelectedUploadFileName();
    gasUploadStatusText = selectedName ? `Selected: ${selectedName}` : "";

    if (!gasUploadStatusText) return;

    setGasUploadText(gasUploadStatusText);
    showIfPossible(IDS.gasUploadText);
}

function normaliseUploadedGasFile(file) {
    if (!file || typeof file !== "object") return null;

    const uploadedFileRef = String(file.fileUrl || "").trim();
    const uploadedFileUrl = String(uploadedFileRef || file.url || file.src || "").trim();
    const uploadedFileMediaId = String(file.mediaId || file.id || "").trim();
    if (!uploadedFileUrl && !uploadedFileRef) return null;

    const normalised = {
        uploadedFileUrl: uploadedFileUrl || uploadedFileRef,
        uploadedFileRef,
        uploadedFileName: String(
            file.originalFileName || file.displayName || file.name || file.title || ""
        ).trim(),
        uploadedFileMediaId,
        uploadedAt: new Date().toISOString(),
        scanStatus: GAS_SCAN_STATUS,
        uploadResultRaw: {
            fileUrl: uploadedFileRef,
            url: String(file.url || "").trim(),
            src: String(file.src || "").trim(),
            mediaId: uploadedFileMediaId,
            originalFileName: String(file.originalFileName || "").trim(),
            displayName: String(file.displayName || "").trim(),
            name: String(file.name || "").trim(),
            title: String(file.title || "").trim()
        }
    };

    console.log("GAS CERT STORED FILE DEBUG", {
        uploadedFileUrl: normalised.uploadedFileUrl,
        uploadedFileRef: normalised.uploadedFileRef,
        uploadedFileMediaId: normalised.uploadedFileMediaId,
        uploadedFileName: normalised.uploadedFileName
    });

    return normalised;
}

async function uploadGasCertificateIfSelected() {
    const uploadNode = getEl(IDS.gasUploadBtn);
    if (!uploadNode || typeof uploadNode.uploadFiles !== "function" || !hasSelectedUploadFile()) {
        return null;
    }

    gasUploadStatusText = "Uploading certificate...";
    setGasUploadText(gasUploadStatusText);
    showIfPossible(IDS.gasUploadText);

    const uploadedFiles = await uploadNode.uploadFiles();
    const uploadedFile = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
    const normalisedFile = normaliseUploadedGasFile(uploadedFile);

    if (normalisedFile) {
        const fileLabel = normalisedFile.uploadedFileName || "Gas certificate uploaded";
        gasUploadStatusText = `Uploaded: ${fileLabel}`;
        setGasUploadText(gasUploadStatusText);
        showIfPossible(IDS.gasUploadText);
    }

    return normalisedFile;
}

function buildGasSafetyJourneyData(gasStatus, gasDateInfo, uploadedFileInfo) {
    const normalisedStatus = normaliseGasStatus(gasStatus);
    const expiryDate = gasDateInfo?.parsedDate ? getGasExpiryDate(gasDateInfo.parsedDate) : null;
    const hasCertificate = normalisedStatus === "yes_up_to_date" || normalisedStatus === "maybe_expired";

    return {
        hasCertificate,
        certificateStatus: normalisedStatus || "",
        issueDateRaw: gasDateInfo?.display || gasDateInfo?.raw || "",
        issueDateISO: gasDateInfo?.iso || "",
        expiryDateISO: expiryDate ? expiryDate.toISOString() : "",
        uploadedFileUrl: uploadedFileInfo?.uploadedFileUrl || "",
        uploadedFileName: uploadedFileInfo?.uploadedFileName || "",
        uploadedAt: uploadedFileInfo?.uploadedAt || "",
        scanStatus: uploadedFileInfo?.scanStatus || GAS_SCAN_STATUS
    };
}

function loadCmpJourney() {
    const rawJourney = session.getItem(CMP_JOURNEY_KEY) || local.getItem(CMP_JOURNEY_KEY) || "";
    const parsed = safeJsonParse(rawJourney, {});

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function saveCmpJourneyGasSafety({ gasSafetyJourney, intent, depth, tenant, gasStatus, gasDateInfo }) {
    const existingJourney = loadCmpJourney();
    const existingAnswers =
        existingJourney.answers && typeof existingJourney.answers === "object" && !Array.isArray(existingJourney.answers)
            ? existingJourney.answers
            : {};

    const mergedJourney = {
        ...existingJourney,
        sourceServicePage: "gas-safety",
        priorityModule: "gasSafety",
        primaryIntent: String(intent || existingJourney.primaryIntent || ""),
        journeyDepth: String(depth || existingJourney.journeyDepth || ""),
        isTenanted: String(tenant || existingJourney.isTenanted || ""),
        createdAt: existingJourney.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        gasSafety: gasSafetyJourney,
        answers: {
            ...existingAnswers,
            gasCertificateStatus: String(gasStatus || ""),
            gasSafetyDateRaw: gasDateInfo?.raw || "",
            gasSafetyDateDisplay: gasDateInfo?.display || "",
            gasSafetyDateISO: normaliseIsoDate(gasDateInfo?.iso || ""),
            gasSafety: gasSafetyJourney
        }
    };

    const serialisedJourney = JSON.stringify(mergedJourney);
    session.setItem(CMP_JOURNEY_KEY, serialisedJourney);
    local.setItem(CMP_JOURNEY_KEY, serialisedJourney);
}

/* =========================================================
   FORM MESSAGE
========================================================= */

function setFormMessage(message) {
    const msg = getEl(IDS.formMessage);
    if (!msg) return;

    try {
        msg.text = message || "";
    } catch (error) {}

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
    } catch (error) {}

    collapseIfPossible(IDS.formMessage);
    hideIfPossible(IDS.formMessage);
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function exists(id) {
    try {
        return !!$w(id);
    } catch (error) {
        return false;
    }
}

function getEl(id) {
    try {
        return $w(id);
    } catch (error) {
        return null;
    }
}

function getValue(id) {
    const node = getEl(id);
    if (!node) return null;

    try {
        return node.value;
    } catch (error) {
        return null;
    }
}

function setTextIfExists(id, value) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.text !== "undefined") {
            node.text = value || "";
        }
    } catch (error) {}
}

function setContinueButtonLabel(label) {
    const button = getEl(IDS.continueBtn);
    if (!button) return;

    try {
        if (typeof button.label !== "undefined") {
            button.label = label;
            return;
        }
    } catch (error) {}

    try {
        if (typeof button.text !== "undefined") {
            button.text = label;
        }
    } catch (error) {}
}

function bindIfSupported(node, methodName, handler) {
    try {
        if (node && typeof node[methodName] === "function") {
            node[methodName](handler);
            return true;
        }
    } catch (error) {
        console.warn(`Could not bind ${methodName}`, error);
    }

    return false;
}

function focusOrScrollToFirstAvailable(ids) {
    (ids || []).forEach((id) => expandIfPossible(id));

    for (const id of ids || []) {
        const node = getEl(id);
        if (!node) continue;

        try {
            if (typeof node.scrollTo === "function") {
                node.scrollTo();
            }
        } catch (error) {}

        try {
            if (typeof node.focus === "function") {
                node.focus();
                return true;
            }
        } catch (error) {}
    }

    return false;
}

function showAdditionalGasBox() {
    GAS_DATE_SECTION_IDS.forEach((id) => {
        expandIfPossible(id);
        showIfPossible(id);
    });

    showGasDateField();
    showIfPossible(IDS.gasUploadBtn);
    showIfPossible(IDS.gasUploadText);
}

function hideAdditionalGasBox() {
    GAS_DATE_SECTION_IDS.forEach((id) => {
        hideIfPossible(id);
    });

    hideGasDateField();
    hideIfPossible(IDS.gasUploadBtn);
    hideIfPossible(IDS.gasUploadText);
}

function showIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.show === "function") node.show();
    } catch (error) {}

    try {
        if (typeof node.expand === "function") node.expand();
    } catch (error) {}
}

function hideIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.hide === "function") node.hide();
    } catch (error) {}

    try {
        if (typeof node.collapse === "function") node.collapse();
    } catch (error) {}
}

function expandIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.expand === "function") node.expand();
    } catch (error) {}
}

function collapseIfPossible(id) {
    const node = getEl(id);
    if (!node) return;

    try {
        if (typeof node.collapse === "function") node.collapse();
    } catch (error) {}
}
