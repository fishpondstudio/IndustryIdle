import { D, G } from "../General/GameData";
import { CountryCode, getFlagUrl, keysOf } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight, uiHeaderActionBack } from "./UIHelper";

export function ChooseFlagPage(): m.Component {
    return {
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("PlayerCountryFlag"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(".box", [
                        m(".title", t("PlayerCountryChooseFlag")),
                        m(".hr"),
                        m(
                            ".text-center",
                            keysOf(CountryCode).map((key) => {
                                return m("img.pointer", {
                                    title: flagToName(key),
                                    style: { height: "48px" },
                                    src: getFlagUrl(key),
                                    onclick: () => {
                                        D.persisted.flag = key;
                                        G.world.routeTo(G.headquarter.grid);
                                    },
                                });
                            })
                        ),
                    ]),
                ]),
            ]);
        },
    };
}

export function flagToName(flag: string): string {
    const name = flag.toUpperCase();
    return `${CountryCode[name]} (${name})` ?? "";
}
