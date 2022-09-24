import {
    crowdfundingReturnOnResource,
    CROWDFUNDING_TIER_BONUS,
    getCrowdfundingReturn,
    getCrowdfundingTimeLeft,
    sendPledgeMessage,
} from "../CoreGame/Logic/Crowdfunding";
import { addCash, getMarketCap, refundResource, RES, tryDeductResource } from "../CoreGame/Logic/Logic";
import { D, G, T } from "../General/GameData";
import { formatHMS, formatPercent, ifTrue, keysOf, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { progressBar } from "./UIHelper";
import { hideAlert, showAlert, showToast } from "./UISystem";

export function CrowdfundingPage(): m.Component {
    return {
        oninit: () => {
            sendPledgeMessage().catch(cc.warn);
        },
        view: () => {
            return keysOf(D.crowdfunding)
                .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
                .map(renderCf);
        },
    };
}

function renderCf(id: string) {
    const cf = D.crowdfunding[id];
    const timeLeft = getCrowdfundingTimeLeft(id);
    const cfReturn = getCrowdfundingReturn(cf);
    const cfReward = cf.value * (1 + cfReturn);
    return m(".box", [
        m(".two-col.title", [
            m("div", t("CrowdfundingId", { id: "#" + id })),
            m(
                "div",
                ifTrue(timeLeft > 0, () =>
                    t("CrowdfundingEndIn", {
                        time: formatHMS(timeLeft),
                    })
                )
            ),
        ]),
        m(".hr"),
        m(".two-col", [
            m("div", [m("div", t("TotalPledgedValue")), m(".text-s.text-desc", t("TotalPledgedValueDesc"))]),
            m(".ml20", "$" + nf(cf.value)),
        ]),
        m(".hr"),
        m(".two-col", [
            m("div", [m("div", t("ReturnOnPledge")), m(".text-desc.text-s", t("ReturnOnPledgeDescV2"))]),
            m(".ml20", [m("div", "$" + nf(cfReward)), m(".green.text-s", "+" + formatPercent(cfReturn))]),
        ]),
        cf.resources.map((r, index) => {
            const fromServer = G.socket.pledge[id + "." + index];
            if (fromServer) {
                r.actualAmount = fromServer;
            }
            const pledge = async (amount: number) => {
                if (!tryDeductResource(r.resource, amount)) {
                    G.audio.playError();
                    showToast(t("NotEnoughResources"));
                    return;
                }
                try {
                    if (!r.paid) {
                        r.paid = true;
                        await sendPledgeMessage([
                            {
                                id,
                                pledge: {
                                    resource: r.resource,
                                    amount: amount,
                                    index,
                                },
                            },
                        ]);
                    }
                    cf.value += amount * D.price[r.resource].price;
                    G.audio.playEffect(G.audio.kaching);
                    showToast(
                        t("PledgeSuccessful", {
                            amount: `${nf(amount)} ${RES[r.resource].name()}`,
                        })
                    );
                    m.redraw();
                } catch (error) {
                    r.paid = false;
                    refundResource(r.resource, r.requiredAmount);
                    G.audio.playError();
                    showToast(error?.message);
                }
            };

            const showPledgeAlert = (amount: number) => {
                const marketCap = getMarketCap();
                const value = amount * D.price[r.resource].price;
                const totalPledgedValue = cf.value + value;
                const pledgeTooLarge = totalPledgedValue > marketCap - D.stockRating * totalPledgedValue;
                showAlert(
                    t("CrowdfundingAlreadyPledged"),
                    [
                        m(".mb5", t("CrowdfundingAlreadyPledgedDesc")),
                        m("input.block", {
                            type: "range",
                            min: r.requiredAmount,
                            max: T.usableRes[r.resource],
                            step: 1,
                            oninput: (e) => {
                                showPledgeAlert(e.target.value);
                            },
                            value: amount,
                        }),
                        m(".two-col", [
                            m("div", RES[r.resource].name()),
                            m(
                                "div",
                                `${nf(amount)} (${t("PledgeValue", {
                                    amount: nf(value),
                                })})`
                            ),
                        ]),
                    ],
                    [
                        { name: t("Cancel"), class: "outline" },
                        {
                            name: t("PledgeAmount", {
                                amount: nf(amount),
                            }),
                            action: () => {
                                if (pledgeTooLarge) {
                                    G.audio.playError();
                                    showToast(t("CrowdfundingTotalPledgdeValueTooLarge"));
                                } else {
                                    hideAlert();
                                    pledge(amount);
                                }
                            },
                            class: pledgeTooLarge ? "outline grey" : "outline",
                        },
                    ]
                );
            };

            const backers = Math.round(r.actualAmount / r.requiredAmount);
            const currentReturn = crowdfundingReturnOnResource(backers);
            return [
                m(".hr"),
                m(".two-col", [
                    m("div", [
                        m("div", RES[r.resource].name()),
                        m(
                            ".text-desc.text-s",
                            t("CrowdfundingBackersReturn", {
                                backers: backers,
                                return: formatPercent(currentReturn),
                            })
                        ),
                        ifTrue(D.autoSellRes[r.resource], () =>
                            m(
                                ".text-desc.text-s.cursor-help",
                                {
                                    title: t("AutoSellResourceWarningDesc"),
                                },
                                t("AutoSellResourceWarningShortLabel")
                            )
                        ),
                    ]),
                    timeLeft < 0
                        ? m("div")
                        : m(
                              ".pointer",
                              {
                                  onclick: () => {
                                      if (timeLeft < 0) {
                                          G.audio.playError();
                                          return;
                                      }
                                      if (T.usableRes[r.resource] < r.requiredAmount) {
                                          G.audio.playError();
                                          showToast(t("NotEnoughResources"));
                                          return;
                                      }
                                      if (r.paid) {
                                          showPledgeAlert(r.requiredAmount);
                                          return;
                                      }
                                      pledge(r.requiredAmount);
                                  },
                              },
                              [
                                  m(
                                      "div",
                                      {
                                          class: T.usableRes[r.resource] >= r.requiredAmount ? "blue" : "text-desc",
                                      },
                                      t("PledgeAmount", {
                                          amount: nf(r.requiredAmount),
                                      })
                                  ),
                                  m(
                                      ".text-s.text-desc",
                                      t("PledgeValue", {
                                          amount: nf(r.requiredAmount * D.price[r.resource].price),
                                      })
                                  ),
                              ]
                          ),
                ]),
                m(".sep10"),
                progressBar(backers % 10, 10),
                m(".sep5"),
                m(".text-s.text-desc.two-col", [
                    m(
                        "div",
                        t("CrowdfundingBackersNeeded", {
                            backers: 10 - (backers % 10),
                        })
                    ),
                    m(
                        "div",
                        t("CrowdfundingReturnBonus", {
                            return: formatPercent(CROWDFUNDING_TIER_BONUS),
                        })
                    ),
                ]),
            ];
        }),
        ifTrue(timeLeft < 0 && cfReward > 0, () => [
            m(
                ".action",
                {
                    onclick: () => {
                        if (!D.crowdfunding[id]) {
                            return;
                        }
                        delete D.crowdfunding[id];
                        G.audio.playEffect(G.audio.kaching);
                        addCash(cfReward);
                        showToast(
                            t("CrowdfundingClaimSuccessful", {
                                amount: "$" + nf(cfReward),
                            })
                        );
                    },
                },
                m(
                    "div",
                    t("ClaimCrowdfundingReward", {
                        amount: "$" + nf(cfReward),
                    })
                )
            ),
        ]),
    ]);
}
