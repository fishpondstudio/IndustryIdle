import { MINUTE } from "../General/Helper";
import { isCrazyGames } from "../General/NativeSdk";

const bannerCache: { dom: Element; validUntil: number } = { dom: null, validUntil: 0 };

export function CrazyGameAdBanner(): m.Comp {
    return {
        oncreate: (vnode) => {
            if (!isCrazyGames()) {
                return;
            }
            if (bannerCache.validUntil > Date.now()) {
                vnode.dom.replaceWith(bannerCache.dom);
                return;
            }
            const { CrazySDK } = window.CrazyGames;
            CrazySDK.getInstance().requestBanner([
                {
                    containerId: "crazygame-banner-container",
                    size: "320x50",
                },
            ]);
            bannerCache.dom = vnode.dom;
            bannerCache.validUntil = Date.now() + 1 * MINUTE;
        },
        view: () => {
            if (!isCrazyGames()) {
                return null;
            }
            return m("#crazygame-banner-container");
        },
    };
}
