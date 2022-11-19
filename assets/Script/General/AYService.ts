/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/ban-types */

import { GA_KEY, GA_SECRET } from "../Config/Config";

declare global {
    const GameAnalytics: Function;
}

if (!CC_EDITOR && !CC_DEBUG) {
    (function (w, d, a, m) {
        const s = "script";
        const g = "GameAnalytics";
        (w[g] =
            w[g] ||
            function () {
                (w[g].q = w[g].q || []).push(arguments);
            }),
            (a = d.createElement(s)),
            (m = d.getElementsByTagName(s)[0]);
        a.async = 1;
        a.src = "https://download.gameanalytics.com/js/GameAnalytics-4.4.5.min.js";
        m.parentNode.insertBefore(a, m);
    })(window, document);
    GameAnalytics("initialize", GA_KEY, GA_SECRET);
}

export class AYService {
    public static trackEvent(name: string, value = 1) {
        if (CC_EDITOR || CC_DEBUG) {
            return;
        }
        GameAnalytics("addDesignEvent", name, value);
    }
    public static trackError(message: string) {
        if (CC_EDITOR || CC_DEBUG) {
            return;
        }
        GameAnalytics("addErrorEvent", "Error", message);
    }
    public static trackWarning(message: string) {
        if (CC_EDITOR || CC_DEBUG) {
            return;
        }
        GameAnalytics("addErrorEvent", "Warning", message);
    }
    public static trackResource(type: "Sink" | "Source", name: string, value: number) {
        if (CC_EDITOR || CC_DEBUG) {
            return;
        }
        GameAnalytics("addResourceEvent", type, name, value);
    }
}
