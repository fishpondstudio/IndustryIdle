import { Entity } from "../CoreGame/Logic/Entity";
import { getWaveInfo, getWaveReward } from "../CoreGame/TowerDefense/DefenseModules";
import { D, G, T } from "../General/GameData";
import { ifTrue, nf } from "../General/Helper";
import { t } from "../General/i18n";
import { getContainerClass, uiBoxToggleContent, uiHeaderRoute } from "./UIHelper";

export function WormholePage(): m.Comp<{ entity: Entity; docked: boolean }> {
    return {
        view: (vnode) => {
            const nextWave = getWaveInfo();
            const reward = getWaveReward(G.world.waveManager.wormholes.length);
            return m("div", { class: getContainerClass(vnode.attrs.docked) }, [
                uiHeaderRoute(t("Wormhole"), "/main"),
                m("div.scrollable", [
                    m(".box", [
                        m(".title", t("NextWave")),
                        m(".hr"),
                        m(".two-col", [m("div", t("NextWaveUnitHP")), m(".ml20", nf(nextWave.unitHp))]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("NextWaveTotalCount")),
                                m(".text-s.text-desc", t("NextWaveTotalCountDesc")),
                            ]),
                            m(".ml20", nf(nextWave.totalCount)),
                        ]),
                        m(".hr"),
                        m(".two-col", [m("div", t("NextWaveSpeed")), m(".ml20", nf(nextWave.speed))]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("NextWaveSpawnDelay")),
                            m(".ml20", t("NextWaveSpawnDelayValue", { number: nextWave.spawnDelay })),
                        ]),
                        m(".hr"),
                        m(".two-col", [m("div", t("NextWaveTotalReward")), m(".ml20", "$" + nf(reward))]),
                        m(".two-col.text-desc.text-s.mt5", [
                            m("div", t("NextWaveTotalDamageNeeded")),
                            m(".ml20", nf(nextWave.unitHp * nextWave.totalCount)),
                        ]),
                        m(".two-col.text-desc.text-s.mt5", [
                            m("div", t("NextWaveBonusMultiplier")),
                            m(".ml20", t("NextWaveBonusMultiplierValue", { number: nextWave.bonusMultiplier })),
                        ]),
                        ifTrue(T.currentWaveStatus === "init", () =>
                            m(
                                ".action.filled",
                                m(
                                    "div",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            G.world.waveManager.startNextWave();
                                        },
                                    },
                                    t("StartWave")
                                )
                            )
                        ),
                        ifTrue(T.currentWaveStatus !== "init", () => {
                            const [current, total] = G.world.waveManager.getProgress();
                            return [
                                m(".hr"),
                                m(".two-col", [m("div", t("WaveSpawned")), m(".ml20", `${current} / ${total}`)]),
                                m(".hr"),
                                m(".two-col", [
                                    m("div", t("WaveEliminated")),
                                    m(".ml20.green", G.world.waveManager.successCount),
                                ]),
                                m(".hr"),
                                m(".two-col", [
                                    m("div", t("WaveFailed")),
                                    m(".ml20.red", G.world.waveManager.failCount),
                                ]),
                            ];
                        }),
                        ifTrue(T.currentWaveStatus === "inProgress", () => {
                            return m(
                                ".action.red",
                                m(
                                    "div",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            G.world.waveManager.stopNextWave();
                                        },
                                    },
                                    t("WaveForfeit")
                                )
                            );
                        }),
                        ifTrue(T.currentWaveStatus === "success", () => {
                            return m(
                                ".action.filled",
                                m(
                                    "div",
                                    {
                                        onclick: () => {
                                            G.world.waveManager.claimReward();
                                        },
                                    },
                                    t("ClaimAmount", { amount: `$` + nf(reward) })
                                )
                            );
                        }),
                        ifTrue(T.currentWaveStatus === "fail", () => {
                            return m(
                                ".action.filled",
                                m(
                                    "div",
                                    {
                                        onclick: () => {
                                            G.audio.playClick();
                                            G.world.waveManager.startNextWave();
                                        },
                                    },
                                    t("WaveRetry")
                                )
                            );
                        }),
                    ]),
                    m(".box", [
                        m(".two-col", [m("div", t("WavesSurvived")), m(".ml20", D.waveCount)]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("NumberOfWormholes")),
                            m(".ml20", G.world.waveManager.wormholes.length),
                        ]),
                        m(".hr"),
                        uiBoxToggleContent(
                            [m("div", t("WaveAutoNext")), m(".text-s.text-desc", t("WaveAutoNextDesc"))],
                            G.world.waveManager.autoStart,
                            () => {
                                G.world.waveManager.autoStart = !G.world.waveManager.autoStart;
                            }
                        ),
                    ]),
                ]),
            ]);
        },
    };
}
