import { BLD, MAP, POLICY } from "../CoreGame/Logic/Logic";
import { addPurchases, D, DLC, DownloadableContent, G, PlatformSKUs } from "../General/GameData";
import { getResourceUrl, ifTrue, keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { IProductInfo, isSteam, NativeSdk } from "../General/NativeSdk";
import { showToast } from "./UISystem";

let products: IProductInfo[] = [];

NativeSdk.canPurchase().then((can) => {
    if (can) {
        NativeSdk.queryProducts(keysOf(PlatformSKUs[NativeSdk.name()] ?? {})).then((p) => {
            products = p;
        });
    }
});

function getDLCPrices(products: IProductInfo[]): Record<DownloadableContent, IProductInfo> {
    const platform = NativeSdk.name();
    const result: Record<DownloadableContent, IProductInfo> = {
        [DLC[0]]: null,
        [DLC[1]]: null,
    };
    products.forEach((product) => {
        const dlc = PlatformSKUs[platform]?.[product.sku];
        if (dlc) {
            result[dlc] = product;
        }
    });
    return result;
}

export function ExpansionPackPanel(): m.Comp {
    return {
        view: () => {
            const dlcPrices = getDLCPrices(products);
            const result = [];
            if (dlcPrices.dlc1 && !D.persisted.dlc.dlc1) {
                result.push(m(DLCBanner, { dlc: DLC[0], product: dlcPrices.dlc1 }));
            }
            if (dlcPrices.dlc2 && !D.persisted.dlc.dlc2) {
                result.push(m(DLCBanner, { dlc: DLC[1], product: dlcPrices.dlc2 }));
            }
            return result;
        },
    };
}

function DLCBanner(): m.Comp<{ dlc: DownloadableContent; product: IProductInfo }> {
    let showContent = false;
    return {
        view: (vnode) => {
            return m(".box", [
                m("img.dlc", {
                    src: getResourceUrl(`images/banner-${vnode.attrs.dlc}.png`),
                }),
                ifTrue(showContent, () => getDLCContentBox(vnode.attrs.dlc)),
                m(".action.text-m.uppercase", [
                    m(
                        "div",
                        {
                            onclick: () => (showContent = !showContent),
                        },
                        showContent ? t("HideContent") : t("ShowContent")
                    ),
                    m(
                        "div",
                        {
                            onclick: async () => {
                                G.audio.playClick();
                                try {
                                    const result = await NativeSdk.buyProduct(vnode.attrs.product.sku);
                                    if (isSteam()) {
                                        showToast(t("PurchaseSteamContinue"));
                                    } else {
                                        addPurchases(result);
                                        G.audio.playEffect(G.audio.kaching);
                                        showToast(t("PurchaseSuccess"));
                                    }
                                } catch (error) {
                                    showToast(t("PurchaseFailed"));
                                }
                            },
                        },
                        t("BuyExpansionPack", { price: vnode.attrs.product.price })
                    ),
                ]),
            ]);
        },
    };
}

function getDLCContentBox(dlc: DownloadableContent): m.Children {
    return [
        m(".hr"),
        m(".title", t("Buildings")),
        m(".hr"),
        m(
            ".text-m",
            keysOf(BLD)
                .filter((b) => BLD[b].dlc === dlc)
                .map((b) => BLD[b].name())
                .join(", ")
        ),
        m(".hr"),
        m(".title", t("Policies")),
        m(".hr"),
        m(
            ".text-m",
            keysOf(POLICY)
                .filter((b) => POLICY[b].dlc === dlc)
                .map((b) => POLICY[b].name())
                .join(", ")
        ),
        m(".hr"),
        m(".title", t("Cities")),
        m(".hr"),
        m(
            ".text-m",
            keysOf(MAP)
                .filter((b) => MAP[b].dlc === dlc)
                .map((b) => MAP[b].name())
                .join(", ")
        ),
    ];
}
