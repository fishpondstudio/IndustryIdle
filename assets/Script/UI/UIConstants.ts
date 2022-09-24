import { APPSTORE_URL, GOOGLE_PLAY_URL } from "../General/Constants";
import { getResourceUrl } from "../General/Helper";
import { isAndroid, isIOS } from "../General/NativeSdk";

export let STORE_BADGES = [];

cc.game.once(cc.game.EVENT_ENGINE_INITED, () => {
    if (!CC_EDITOR && !isAndroid() && !isIOS()) {
        STORE_BADGES = [
            m(
                "a",
                { href: APPSTORE_URL, target: "_blank" },
                m("img", {
                    style: { width: "45%" },
                    src: getResourceUrl("images/AppStore.png"),
                })
            ),
            m(
                "a",
                { href: GOOGLE_PLAY_URL, target: "_blank" },
                m("img", {
                    style: { width: "45%", marginLeft: "2.5%" },
                    src: getResourceUrl("images/GooglePlay.png"),
                })
            ),
        ];
    }
});
