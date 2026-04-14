import { lookupPostcode } from "backend/postcodes.web";
import { getDomesticEpcCandidates, getLatestDomesticEpc } from "backend/epc";
import wixLocation from "wix-location";
import wixUsers from "wix-users";
import wixData from "wix-data";
import { session } from "wix-storage";

const COLLECTION = "Properties";

function normalisePostcodeValue(raw) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

function toNumberMaybe(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDateMaybe(v) {
  if (v === null || v === undefined) return null;

  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---- Media Gallery item shape ----
function uploadResultToGalleryItem(file) {
  const src = file?.fileUrl || file?.url || file?.path || file?.src || null;
  if (!src) return null;

  const mime = String(file?.mimeType || file?.type || "").toLowerCase();
  const type =
    mime.includes("pdf") || String(src).toLowerCase().includes(".pdf") ? "document" : "image";

  return {
    src,
    type,
    title: file?.originalFileName || file?.name || "",
    description: ""
  };
}

// ---- EPC -> Dropdown helpers ----
function normaliseTypeFromEpc(raw) {
  const t = String(raw || "").toLowerCase();
  if (t.includes("flat") || t.includes("maisonette")) return "Flat";
  if (t.includes("house") || t.includes("bungalow")) return "House";
  if (t.includes("park")) return "Park home";
  return String(raw || "").trim();
}

function setDropdownByLabelOrValue(dropdown, desiredLabelOrValue) {
  const desired = String(desiredLabelOrValue || "").trim();
  if (!desired || !dropdown?.options) return false;

  const desiredLower = desired.toLowerCase();

  const match =
    dropdown.options.find((o) => String(o.value).toLowerCase() === desiredLower) ||
    dropdown.options.find((o) => String(o.label).toLowerCase() === desiredLower) ||
    null;

  if (!match) return false;

  dropdown.value = match.value;
  return true;
}

$w.onReady(() => {
  console.log("ADD PROPERTY PAGE READY - CODE RUNNING");

  const pcInput = $w("#pcInput");
  const lookupBtn = $w("#lookupBtn");
  const addressDropdown = $w("#addressDropdown");
  const addrInput = $w("#addrInput");

  const propertyTypeDropdown = $w("#dropdown2");
  const bedroomsDropdown = $w("#bedroomsDropdown");

  const uploadFloorplansBtn = $w("#uploadButton1");
  const uploadPhotosBtn = $w("#uploadPhotosButton");
  const submitBtn = $w("#submitBtn");

  console.log("ELEMENTS FOUND:", {
    pcInput: !!pcInput,
    lookupBtn: !!lookupBtn,
    addressDropdown: !!addressDropdown,
    addrInput: !!addrInput,
    submitBtn: !!submitBtn
  });

  let lastLatitude = null;
  let lastLongitude = null;

  let selectedEpcAddress = "";
  let selectedCertificateNumber = null;
  let cachedEpcData = null;

  function normalisePostcode() {
    const value = normalisePostcodeValue(pcInput.value);
    pcInput.value = value;
    return value;
  }

  pcInput.onChange(normalisePostcode);

  addressDropdown.collapse();
  addressDropdown.options = [];

  async function fetchAndApplyEpcPreview() {
    cachedEpcData = null;
    if (!selectedCertificateNumber) return;

    try {
      const epcRes = await getLatestDomesticEpc({
        postcode: normalisePostcodeValue(pcInput.value),
        addressHint: selectedEpcAddress,
        certificateNumber: selectedCertificateNumber
      });

      console.log("EPC preview response:", epcRes);

      if (epcRes?.ok && epcRes?.data) {
        cachedEpcData = epcRes.data;

        const mappedType = normaliseTypeFromEpc(
          cachedEpcData.propertyType || cachedEpcData.property_type
        );

        const didSet = setDropdownByLabelOrValue(propertyTypeDropdown, mappedType);

        console.log("✅ EPC preview applied:", {
          certificateNumber: selectedCertificateNumber,
          address: selectedEpcAddress,
          epcPropertyTypeRaw: cachedEpcData.propertyType || cachedEpcData.property_type,
          mappedType,
          dropdownSet: didSet,
          dropdownValue: propertyTypeDropdown.value
        });
      } else {
        console.warn("⚠️ EPC preview not found for selection:", epcRes);
      }
    } catch (e) {
      console.warn("⚠️ EPC preview fetch failed:", e);
    }
  }

  lookupBtn.onClick(async () => {
    console.log("LOOKUP BUTTON CLICKED");

    const PostCode = normalisePostcode();
    console.log("POSTCODE VALUE:", PostCode);

    if (!PostCode) {
      console.log("NO POSTCODE ENTERED");
      lookupBtn.label = "Enter postcode";
      return;
    }

    lastLatitude = null;
    lastLongitude = null;
    selectedEpcAddress = "";
    selectedCertificateNumber = null;
    cachedEpcData = null;

    addrInput.value = "";
    addressDropdown.options = [];
    addressDropdown.collapse();

    lookupBtn.disable?.();
    lookupBtn.label = "Searching...";

    try {
      const res = await lookupPostcode(PostCode);
      console.log("POSTCODE LOOKUP RESPONSE:", res);

      if (res?.ok && res.result) {
        lastLatitude = Number(res.result.latitude);
        lastLongitude = Number(res.result.longitude);
        console.log("Lookup lat/lng:", { lastLatitude, lastLongitude });
      }
    } catch (e) {
      console.warn("POSTCODE LOOKUP FAILED:", e);
    }

    try {
      const epc = await getDomesticEpcCandidates({ postcode: PostCode });
      console.log("EPC CANDIDATES RESPONSE:", epc);

      const candidates = Array.isArray(epc?.candidates) ? epc.candidates : [];
      const options = candidates
        .filter((c) => c?.address)
        .map((c, i) => ({
          label: c.address,
          value: JSON.stringify({
            address: c.address,
            certificateNumber: c.certificateNumber || null,
            idx: i
          })
        }));

      console.log("ADDRESS OPTIONS:", options);

      if (options.length) {
        addressDropdown.options = options;
        addressDropdown.selectedIndex = 0;

        const parsed = JSON.parse(addressDropdown.value);
        selectedEpcAddress = parsed.address || "";
        selectedCertificateNumber = parsed.certificateNumber || null;

        addrInput.value = selectedEpcAddress;
        addressDropdown.expand();

        await fetchAndApplyEpcPreview();
      } else {
        console.log("NO ADDRESS OPTIONS FOUND");
        addressDropdown.collapse();
      }
    } catch (e) {
      console.warn("EPC candidate lookup failed:", e);
    } finally {
      lookupBtn.enable?.();
      lookupBtn.label = "Find address";
    }
  });

  addressDropdown.onChange(async () => {
    try {
      const parsed = JSON.parse(addressDropdown.value);
      selectedEpcAddress = parsed.address || "";
      selectedCertificateNumber = parsed.certificateNumber || null;
      addrInput.value = selectedEpcAddress;
    } catch (e) {
      selectedEpcAddress = addressDropdown.value || "";
      selectedCertificateNumber = null;
      addrInput.value = selectedEpcAddress;
    }

    await fetchAndApplyEpcPreview();
  });

  submitBtn.onClick(async () => {
    console.log("SUBMIT CLICKED");

    submitBtn.disable();
    submitBtn.label = "Checking...";

    try {
      const user = wixUsers.currentUser;
      if (!user.loggedIn) {
        submitBtn.label = "Login required";
        submitBtn.enable();
        return;
      }

      const PostCode = normalisePostcode();
      if (!PostCode) {
        submitBtn.label = "Missing postcode";
        submitBtn.enable();
        return;
      }

      if (
        lastLatitude === null ||
        lastLongitude === null ||
        Number.isNaN(lastLatitude) ||
        Number.isNaN(lastLongitude)
      ) {
        submitBtn.label = "Click Find address first";
        submitBtn.enable();
        return;
      }

      if (!selectedEpcAddress || !selectedCertificateNumber) {
        submitBtn.label = "Select an address";
        submitBtn.enable();
        return;
      }

      if (!cachedEpcData) {
        submitBtn.label = "Fetching EPC...";
        await fetchAndApplyEpcPreview();
      }

      // Photos temporarily optional for testing
      let photos2 = [];

      if (uploadPhotosBtn.value && uploadPhotosBtn.value.length > 0) {
        try {
          submitBtn.label = "Uploading photos...";
          const uploadedPhotos = await uploadPhotosBtn.uploadFiles();

          photos2 = (Array.isArray(uploadedPhotos) ? uploadedPhotos : [])
            .map(uploadResultToGalleryItem)
            .filter(Boolean);

          console.log("PHOTO UPLOAD RESULT:", photos2);
        } catch (photoErr) {
          console.warn("⚠️ Photo upload failed, continuing without photos:", photoErr);
          photos2 = [];
        }
      }

      // Floorplans temporarily optional for testing
      let floorplan2 = [];
      if (uploadFloorplansBtn.value && uploadFloorplansBtn.value.length > 0) {
        try {
          submitBtn.label = "Uploading floorplans...";
          const uploadedFloorplans = await uploadFloorplansBtn.uploadFiles();

          floorplan2 = (Array.isArray(uploadedFloorplans) ? uploadedFloorplans : [])
            .map(uploadResultToGalleryItem)
            .filter(Boolean);

          console.log("FLOORPLAN UPLOAD RESULT:", floorplan2);
        } catch (floorplanErr) {
          console.warn("⚠️ Floorplan upload failed, continuing without floorplans:", floorplanErr);
          floorplan2 = [];
        }
      }

      const epcTypeMapped = normaliseTypeFromEpc(
        cachedEpcData?.propertyType || cachedEpcData?.property_type
      );

      if (epcTypeMapped) setDropdownByLabelOrValue(propertyTypeDropdown, epcTypeMapped);

      const propertyTypeToSave = propertyTypeDropdown.value || epcTypeMapped || "";
      const bedroomsNum = toNumberMaybe(bedroomsDropdown.value);

      const d = cachedEpcData || {};

      const epcPayload = cachedEpcData
        ? {
            epcFound: true,
            epcCurrentRating: d.currentEnergyRating || d.current_energy_rating || null,
            epcCurrentScore: toNumberMaybe(d.currentEnergyEfficiency || d.current_energy_efficiency),
            epcPotentialRating: d.potentialEnergyRating || d.potential_energy_rating || null,
            epcPotentialScore: toNumberMaybe(
              d.potentialEnergyEfficiency || d.potential_energy_efficiency
            ),
            epcLodgementDate: parseDateMaybe(d.lodgementDate || d.lodgement_date),
            epcExpiryDate: parseDateMaybe(d.expiryDate || d.expiry_date),
            epcCertificateNumber: d.certificateNumber || selectedCertificateNumber || null,
            epcFetchedAt: new Date(),
            epcRaw: d?._raw || d || null,

            epcTotalFloorArea: toNumberMaybe(d.totalFloorArea || d.total_floor_area),
            epcPropertyType: String(d.propertyType || d.property_type || "").trim() || null,
            epcInspectionDate: parseDateMaybe(d.inspectionDate || d.inspection_date),
            epcBuiltForm: String(d.builtForm || d.built_form || "").trim() || null,
            epcHeatingCostCurrent: toNumberMaybe(d.heatingCostCurrent || d.heating_cost_current),
            epcHeatingCostPotential: toNumberMaybe(d.heatingCostPotential || d.heating_cost_potential),
            epcHotWaterCostCurrent: toNumberMaybe(d.hotWaterCostCurrent || d.hot_water_cost_current),
            epcHotWaterCostPotential: toNumberMaybe(d.hotWaterCostPotential || d.hot_water_cost_potential),
            epcLightingCostCurrent: toNumberMaybe(d.lightingCostCurrent || d.lighting_cost_current),
            epcLightingCostPotential: toNumberMaybe(d.lightingCostPotential || d.lighting_cost_potential)
          }
        : {
            epcFound: false,
            epcCertificateNumber: selectedCertificateNumber || null,
            epcFetchedAt: new Date(),
            epcRaw: null
          };

      submitBtn.label = "Saving...";

      const sourceServicePage = session.getItem("sourceServicePage") || "";

      const item = {
        ownerId: user.id,
        PostCode,
        propertyAddress: selectedEpcAddress,
        propertyType: propertyTypeToSave,
        bedrooms: bedroomsNum,
        photos2,
        floorplan2,
        latitude: lastLatitude,
        longitude: lastLongitude,

        sourceServicePage,
        primaryIntent: session.getItem("primaryIntent") || "",
        journeyDepth: session.getItem("journeyDepth") || "",
        isTenanted: session.getItem("isTenanted") || "",
        evictionContext: session.getItem("evictionContext") || "",
        priorityModule: sourceServicePage === "evictions" ? "eviction" : "epc",

        ...epcPayload
      };

      console.log("INSERT ITEM PREVIEW:", item);

      const inserted = await wixData.insert(COLLECTION, item);
      console.log("Inserted item:", inserted);

      session.removeItem("sourceServicePage");
      session.removeItem("primaryIntent");
      session.removeItem("journeyDepth");
      session.removeItem("isTenanted");
      session.removeItem("evictionContext");

      submitBtn.label = "Saved! Redirecting...";
      wixLocation.to("/my-properties");

    } catch (err) {
      console.log("SAVE FAILED:", err);
      try {
        console.log("SAVE FAILED JSON:", JSON.stringify(err, null, 2));
      } catch (jsonErr) {
        console.log("Could not stringify error:", jsonErr);
      }
      submitBtn.label = "Save failed";
      submitBtn.enable();
    }
  });
});