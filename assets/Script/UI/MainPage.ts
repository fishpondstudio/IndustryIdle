import { priceUpdateInterval } from "../CoreGame/Logic/Price";
import { TIPS } from "../CoreGame/Tips";
import { SCENES } from "../General/Constants";
import { D, G } from "../General/GameData";
import { formatHMS } from "../General/Helper";
import { t } from "../General/i18n";
import { NativeSdk } from "../General/NativeSdk";
import { serverNow } from "../General/ServerClock";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { goToChat } from "./HudPage";
import { iconB, leftOrRight } from "./UIHelper";
import { routeTo } from "./UISystem";

export function MainPage(): m.Component {
    let tip: string;
    return {
        oninit: () => {
            tip = TIPS.randOne();
        },
        oncreate: () => {
            cc.game.canvas.focus();
            G.world?.clearSelection();
        },
        view: () => {
            if (
                D.persisted.panelPosition === "auto" ||
                D.persisted.panelPosition === "leftFloat" ||
                D.persisted.panelPosition === "rightFloat" ||
                cc.director.getScene().name === SCENES.World
            ) {
                return null;
            }
            return m(".modal", { class: leftOrRight() }, [
                m(
                    ".header",
                    t("MarketUpdateIn", {
                        time: formatHMS((D.lastPricedAt + 1) * priceUpdateInterval() - serverNow()),
                    })
                ),
                m(".scrollable", [
                    m(CrazyGameAdBanner),
                    m(
                        ".box",
                        m(".mv15.fcc.column.text-desc", [iconB("highlight_alt", 48), m(".mt10", t("SelectATile"))])
                    ),
                    m(".box.banner.blue.text-m", "💡 " + tip),
                    m(".box", [
                        m(".title", t("QuickLinks")),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.headquarter.grid) }, [
                            m("div", t("Headquarter")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.tradeCenter.grid) }, [
                            m("div", t("TradeCenter")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => routeTo("/player-trade") }, [
                            m("div", t("PlayerTrade")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.researchLab.grid) }, [
                            m("div", t("ResearchLab")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.statBureau.grid) }, [
                            m("div", t("StatisticsBureau")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.policyCenter.grid) }, [
                            m("div", t("PolicyCenter")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.logisticsDept.grid) }, [
                            m("div", t("LogisticsDepartment")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.centralBank.grid) }, [
                            m("div", t("CentralBank")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.wholesaleCenter.grid) }, [
                            m("div", t("WholesaleCenter")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                        m(".hr"),
                        m(".two-col.pointer.blue", { onclick: () => G.world.routeTo(G.swissShop.grid) }, [
                            m("div", t("SwissShop")),
                            m(".mv-10", iconB("arrow_forward")),
                        ]),
                    ]),
                    m(".box", [
                        m(".title", t("GetHelp")),
                        m(".hr"),
                        m(
                            ".two-col.pointer.blue",
                            {
                                onclick: goToChat,
                            },
                            [m("div", t("GetHelpInGameChat")), m(".mv-10", iconB("question_answer"))]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer.blue",
                            {
                                onclick: () =>
                                    NativeSdk.openUrl(
                                        "https://steamcommunity.com/sharedfiles/filedetails/?id=2450367986"
                                    ),
                            },
                            [m("div", t("GetHelpBeginnerGuides")), m(".mv-10", iconB("open_in_new"))]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer.blue",
                            {
                                onclick: () => NativeSdk.openUrl("https://steamcommunity.com/app/1574000/guides/"),
                            },
                            [m("div", t("GetHelpSteamGuides")), m(".mv-10", iconB("open_in_new"))]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer.blue",
                            {
                                onclick: () => NativeSdk.openUrl("https://discord.com/invite/m5JWZtEKMZ"),
                            },
                            [m("div", t("GetHelpDiscord")), m(".mv-10", iconB("open_in_new"))]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer.blue",
                            {
                                onclick: () => NativeSdk.openUrl("https://industryidle.fandom.com/"),
                            },
                            [m("div", t("GetHelpWiki")), m(".mv-10", iconB("open_in_new"))]
                        ),
                    ]),
                ]),
            ]);
        },
    };
}
