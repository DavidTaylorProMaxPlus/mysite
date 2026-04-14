import { session } from 'wix-storage';
import wixLocation from 'wix-location';

$w.onReady(function () {
    $w('#formMessage').text = "";
    if (typeof $w('#formMessage').collapse === "function") {
        $w('#formMessage').collapse();
    }

    $w('#continueBtn').onClick(() => {
        let intent = "";
        let depth = "";
        let tenant = "";
        let eviction = "";

        try { intent = $w('#radioGroup1').value; } catch (e) { intent = "ID_ERROR"; }
        try { depth = $w('#radioGroup2').value; } catch (e) { depth = "ID_ERROR"; }
        try { tenant = $w('#radioGroup3').value; } catch (e) { tenant = "ID_ERROR"; }
        try { eviction = $w('#radioGroup4').value; } catch (e) { eviction = "ID_ERROR"; }

        console.log("Q1:", intent);
        console.log("Q2:", depth);
        console.log("Q3:", tenant);
        console.log("Q4:", eviction);

        if (!intent || !depth || !tenant || !eviction || intent === "ID_ERROR" || depth === "ID_ERROR" || tenant === "ID_ERROR" || eviction === "ID_ERROR") {
            $w('#formMessage').text =
                `Q1: ${intent || "blank"} | Q2: ${depth || "blank"} | Q3: ${tenant || "blank"} | Q4: ${eviction || "blank"}`;

            if (typeof $w('#formMessage').expand === "function") {
                $w('#formMessage').expand();
            } else if (typeof $w('#formMessage').show === "function") {
                $w('#formMessage').show();
            }
            return;
        }

        $w('#formMessage').text = "";
        if (typeof $w('#formMessage').collapse === "function") {
            $w('#formMessage').collapse();
        }

        session.setItem("sourceServicePage", "epc");
        session.setItem("primaryIntent", intent);
        session.setItem("journeyDepth", depth);
        session.setItem("isTenanted", tenant);
        session.setItem("evictionContext", eviction);

        wixLocation.to("/add-a-property");
    });
});