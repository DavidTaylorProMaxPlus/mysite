import { session } from 'wix-storage';
import wixLocation from 'wix-location';

$w.onReady(function () {
    if ($w('#formMessage')) {
        $w('#formMessage').text = "";
        if (typeof $w('#formMessage').collapse === "function") {
            $w('#formMessage').collapse();
        }
    }

    $w('#continueBtn').onClick(() => {
        const intent = $w('#radioGroup1').value;
        const depth = $w('#radioGroup2').value;
        const tenant = $w('#radioGroup3').value;
        const eviction = $w('#radioGroup4').value;

        if (!intent || !depth || !tenant || !eviction) {
            if ($w('#formMessage')) {
                $w('#formMessage').text = "Please answer all questions before continuing.";
                if (typeof $w('#formMessage').expand === "function") {
                    $w('#formMessage').expand();
                } else if (typeof $w('#formMessage').show === "function") {
                    $w('#formMessage').show();
                }
            }
            return;
        }

        if ($w('#formMessage')) {
            $w('#formMessage').text = "";
            if (typeof $w('#formMessage').collapse === "function") {
                $w('#formMessage').collapse();
            }
        }

        session.setItem("sourceServicePage", "evictions");
        session.setItem("primaryIntent", intent);
        session.setItem("journeyDepth", depth);
        session.setItem("isTenanted", tenant);
        session.setItem("evictionContext", eviction);

        wixLocation.to("/add-a-property");
    });
});