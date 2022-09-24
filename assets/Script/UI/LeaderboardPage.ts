import { MAP } from "../CoreGame/Logic/Logic";
import { Maps } from "../CoreGame/MapDefinitions";
import { G } from "../General/GameData";
import { forEach, getFlagUrl, getResourceUrl, ifTrue, keysOf, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { flagToName } from "./ChooseFlagPage";
import { leftOrRight, uiHeaderActionBack } from "./UIHelper";

const leaderboards = {
    byAllPrestigeCurrency: () => t("LeaderboardByAllPrestigeCurrency"),
    byValuationPerHour: () => t("LeaderboardValuationPerHour"),
    byFlag: () => t("LeaderboardByFlag"),
    byMap: () => t("LeaderboardByMap"),
    byCash: () => t("LeaderboardByCash"),
    byValuation: () => t("LeaderboardTotalValuation"),
    byValuationPerHourPerSwiss: () => t("LeaderboardValuationPerHourPerSwiss"),
    byValuationPerHourNewPlayers: () => t("LeaderboardValuationPerHourNewPlayers"),
    byValuationPerBuilding: () => t("LeaderboardValuationPerBuilding"),
};

forEach(MAP, (k) => {
    leaderboards[`byValuation${k}`] = () => `${t("LeaderboardValuationPerHour")}: ${MAP[k].name()}`;
});

let selected = "byAllPrestigeCurrency";

export function LeaderboardPage(): m.Comp {
    let loading = true;
    let response = null;

    async function loadLeaderboard() {
        loading = true;
        const r = await fetch(`https://api.fishpondstudio.com/leaderboard/v4?name=${selected}`);
        // const r = await fetch(`http://localhost:5000/leaderboard/v4?name=${selected}`);
        response = await r.json();
        loading = false;
    }

    return {
        oninit: loadLeaderboard,
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderActionBack(t("Leaderboard"), () => G.world.routeTo(G.headquarter.grid)),
                m(".scrollable", [
                    m(
                        ".data-table.text-m",
                        m("table", [
                            m(
                                "tr",
                                m(
                                    "th.p5",
                                    { colspan: 9999 },
                                    m(
                                        "select.text-m",
                                        {
                                            style: { width: "100%" },
                                            onchange: (e) => {
                                                selected = e.target.value;
                                                loadLeaderboard();
                                            },
                                        },
                                        keysOf(leaderboards).map((key) =>
                                            m(
                                                "option",
                                                {
                                                    key,
                                                    value: key,
                                                    selected: selected === key,
                                                },
                                                leaderboards[key]()
                                            )
                                        )
                                    )
                                )
                            ),
                            ifTrue(!loading, () => {
                                if (selected === "byFlag") {
                                    return renderByFlag(response.data);
                                }
                                if (selected === "byMap") {
                                    return renderByMap(response.data);
                                }
                                return renderLeaderboard(response.data);
                            }),
                        ])
                    ),
                    ifTrue(loading, () => m(".mt20", m(".loader"))),
                    ifTrue(!loading, () =>
                        m(".m15.text-s.text-desc.two-col", [
                            m("div", t("LastUpdatedAt")),
                            m("div", new Date(response.updatedAt).toLocaleString()),
                        ])
                    ),
                ]),
            ]);
        },
    };
}

function renderLeaderboard(items: any[]) {
    return items.map((item, idx) => {
        return m("tr", [
            m("td", idx + 1),
            m(
                "td",
                ifTrue(item[2] > 0, () =>
                    m("img", {
                        style: { display: "block", height: "13px" },
                        src: getResourceUrl(`images/Exp${item[2]}.png`),
                    })
                )
            ),
            m(
                "td",
                ifTrue(item[3], () =>
                    m(
                        "span.text-s.text-desc",
                        m("img.ml5", {
                            style: { display: "block", height: "13px" },
                            title: flagToName(item[3]),
                            src: getFlagUrl(item[3]),
                        })
                    )
                )
            ),
            m("td", [item[1], m("span.text-s.text-desc", ` (${MAP[item[4]].name()})`)]),
            m("td.text-right", nf(item[0])),
        ]);
    });
}

function renderByFlag(items: any[]) {
    const result = items.map((item, idx) => {
        return m("tr", [
            m("td", idx + 1),
            m(
                "td",
                m("img.ml5", {
                    style: { display: "block", height: "13px" },
                    title: flagToName(item[0]),
                    src: getFlagUrl(item[0]),
                })
            ),
            m("td", { title: flagToName(item[0]) }, item[0]),
            m("td.text-right", item[1]),
            m("td.text-right", nf(item[2])),
            m("td.text-right", nf(item[3])),
        ]);
    });
    result.unshift(
        m("tr", [
            m("th"),
            m("th", { colspan: 2 }, t("LeaderboardByFlagPlayerFlag")),
            m("th.text-right", t("LeaderboardByFlagPayerCount")),
            m("th.text-right", t("LeaderboardByFlagPayerValuationPerHour") + " ▼"),
            m("th.text-right", t("LeaderboardByFlagPayerSwissMoney")),
        ])
    );
    return result;
}

function renderByMap(items: any[]) {
    const result = items
        .filter((i) => MAP[i[0]])
        .map((item, idx) => {
            return m("tr", [
                m("td", idx + 1),
                m("td", MAP[item[0] as keyof Maps].name()),
                m("td.text-right", item[1]),
                m("td.text-right", nf(item[2])),
                m("td.text-right", nf(item[3])),
            ]);
        });
    result.unshift(
        m("tr", [
            m("th"),
            m("th"),
            m("th.text-right", t("LeaderboardByFlagPayerCount")),
            m("th.text-right", t("LeaderboardByFlagPayerValuationPerHour") + " ▼"),
            m("th.text-right", t("LeaderboardByFlagPayerSwissMoney")),
        ])
    );
    return result;
}
