import { RES } from "../CoreGame/Logic/Logic";
import { ILocalTrade } from "../CoreGame/Logic/PlayerTrade";
import { API_HOST, D } from "../General/GameData";
import { formatHM, nf, truncate } from "../General/Helper";
import { t } from "../General/i18n";
import { leftOrRight, uiHeaderRoute } from "./UIHelper";

export interface IHistoricalTrade extends ILocalTrade {
    timestamp: number;
}

export function PlayerTradeHistoryPage(): m.Comp {
    let trades: IHistoricalTrade[] = [];

    return {
        oncreate: () => {
            fetch(`${API_HOST}/trade/history`, {
                method: "get",
                headers: { "X-User-Id": D.persisted.userId },
            })
                .then((r) => r.json())
                .then((j) => (trades = (j as IHistoricalTrade[]).reverse()));
        },
        view: () => {
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("PlayerTradesHistory"), "/player-trade"),
                m(".scrollable", [
                    trades.length === 0
                        ? m(".loader.mt20")
                        : m(
                              ".data-table",
                              m("table", [
                                  m("tr", [
                                      m("th", t("PlayerTradeResource")),
                                      m("th.r", t("PlayerTradeValue")),
                                      m("th.r", t("PlayerTradeFillBy")),
                                  ]),
                                  trades.map((trade) => {
                                      return m("tr.text-m", [
                                          m("td", [
                                              m("div", RES[trade.resource].name()),
                                              m(".text-s.text-desc", [
                                                  trade.side === "buy"
                                                      ? m("span.red", t("PlayerTradeBid"))
                                                      : m("span.green", t("PlayerTradeAsk")),
                                                  " · ",
                                                  m("span", { title: trade.from }, truncate(trade.from, 12, 6)),
                                              ]),
                                          ]),
                                          m("td.r", [
                                              m(".text-m", `$${nf(trade.price * trade.amount)}`),
                                              m(".text-desc.text-s", [
                                                  m("span", `$${nf(trade.price)}`),
                                                  ` x ${nf(trade.amount)}`,
                                              ]),
                                          ]),
                                          m("td.r", [
                                              m(
                                                  ".text-m",
                                                  m("span", { title: trade.fillBy }, truncate(trade.fillBy, 12, 6))
                                              ),
                                              m(
                                                  ".text-desc.text-s",
                                                  t("FormatTimeAgo", { time: formatHM(Date.now() - trade.timestamp) })
                                              ),
                                          ]),
                                      ]);
                                  }),
                              ])
                          ),
                ]),
            ]);
        },
    };
}
