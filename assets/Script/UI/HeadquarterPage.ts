import { ACH, getAchievementsToClaim } from "../CoreGame/AchievementDefinitions";
import {
    canBuild,
    getBuildingCount,
    getBuildingPermit,
    getBuildingPermitCost,
    getCash,
    getMapExtraPermit,
    isProfitable,
    trySpendCash,
} from "../CoreGame/Logic/Logic";
import { BAD_WORDS } from "../General/Badwords";
import { BUILD_NUMBER } from "../General/BuildNumber";
import {
    API_HOST,
    clearTrades,
    D,
    DLC,
    G,
    getCurrentVersion,
    hasAnyDlc,
    hasDLC,
    syncPurchases,
} from "../General/GameData";
import { getFlagUrl, getResourceUrl, hasValue, HOUR, ifTrue, nf, resolveIn, sizeOf } from "../General/Helper";
import { t } from "../General/i18n";
import { hasSteamWebSignIn, isAndroid, isIOS, isSteam, isSteamWebSignedIn, NativeSdk } from "../General/NativeSdk";
import { serverNow } from "../General/ServerClock";
import { CrazyGameAdBanner } from "./CrazyGameAdBanner";
import { ExpansionPackPanel } from "./ExpansionPacks";
import { ImportExportPanel } from "./ImportExport";
import { SettingsPage } from "./SettingsPage";
import { SteamBackupComponent } from "./SteamBackupComponent";
import { StreamingPage } from "./StreamingPage";
import { iconB, leftOrRight, reloadGame, uiHeaderRoute } from "./UIHelper";
import { routeTo, showAlert, showLoader, showToast } from "./UISystem";
import { UserVerification } from "./UserVerification";

const NAME_CHANGE_COOLDOWN_HOUR = 24;

export function startWebLogin() {
    const popup = window.open(`${API_HOST}/steam`, "_blank", "popup");
    const onMessage = (e: MessageEvent<{ url: string }>) => {
        if (e.data.url) {
            popup.close();
            window.location.replace(e.data.url);
        }
    };
    window.addEventListener("message", onMessage);
}

export function HeadquarterPage(): m.Comp {
    let editingName = false;
    let newName: string;
    return {
        oninit: () => {
            newName = D.persisted.userName;
        },
        oncreate: (vnode) => {
            if (hasValue(m.route.param("settings"))) {
                vnode.dom.querySelector(".settings").scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
            }
        },
        view: (vnode) => {
            if (!hasAnyDlc()) {
                D.persisted.hideDiscordBanner = false;
                D.persisted.hideRewardAd = false;
            }
            const buildingCount = getBuildingCount();
            const buildingPermit = getBuildingPermit();
            const mapExtraPermit = getMapExtraPermit();
            const toClaim = getAchievementsToClaim();
            return m("div.modal", { class: leftOrRight() }, [
                uiHeaderRoute(t("Headquarter"), "/main"),
                m(".scrollable", [
                    m(CrazyGameAdBanner),
                    m(
                        ".discord.row.pointer",
                        {
                            style: {
                                display: D.persisted.hideDiscordBanner ? "none" : "flex",
                            },
                            onclick: () => NativeSdk.openUrl("https://discord.com/invite/m5JWZtEKMZ"),
                        },
                        [
                            m("div", t("JoinDiscord")),
                            m("img.ml10", {
                                src: getResourceUrl("images/Discord.png"),
                            }),
                        ]
                    ),
                    m(
                        ".storefronts",
                        {
                            style: {
                                display:
                                    !D.persisted.hideDiscordBanner && !isIOS() && !isAndroid() && !isSteam()
                                        ? "flex"
                                        : "none",
                            },
                        },
                        [
                            m("img.pointer", {
                                src: getResourceUrl("/images/AppStore.png"),
                                onclick: () =>
                                    NativeSdk.openUrl(
                                        "https://apps.apple.com/us/app/industry-idle-factory-tycoon/id1554773046"
                                    ),
                            }),
                            m("img.pointer", {
                                src: getResourceUrl("/images/GooglePlay.png"),
                                onclick: () =>
                                    NativeSdk.openUrl(
                                        "https://play.google.com/store/apps/details?id=com.fishpondstudio.industryidle"
                                    ),
                            }),
                            m("img.pointer", {
                                src: getResourceUrl("/images/Steam.png"),
                                onclick: () => NativeSdk.openUrl("https://store.steampowered.com/app/1574000"),
                            }),
                        ]
                    ),
                    ifTrue(hasValue(G.banner), () => m.trust(G.banner)),
                    m(ExpansionPackPanel),
                    m(
                        ".box",
                        m(".row", [
                            m("input.user-name.f1", {
                                type: "text",
                                value: newName,
                                readonly: !editingName,
                                oninput: (e: InputEvent) => {
                                    if (editingName) {
                                        newName = (e.target as HTMLInputElement).value;
                                    }
                                },
                            }),
                            m(
                                ".ml10.pointer.blue",
                                {
                                    onclick: () => {
                                        const input = vnode.dom.querySelector(".user-name") as HTMLInputElement;
                                        if (editingName) {
                                            if (newName.match(BAD_WORDS)) {
                                                G.audio.playError();
                                                input.select();
                                                showToast(t("NameValidationRuleProfanity"));
                                            } else if (CC_DEBUG || newName.match(/^[a-z0-9]{5,15}$/i)) {
                                                G.audio.playClick();
                                                if (D.persisted.userName !== newName) {
                                                    D.persisted.lastNameChangedAt = serverNow();
                                                }
                                                D.persisted.userName = newName;
                                                window?.getSelection()?.removeAllRanges();
                                                editingName = false;
                                                showToast(t("NameSaved"));
                                            } else {
                                                G.audio.playError();
                                                input.select();
                                                showToast(t("NameValidationRule"));
                                            }
                                        } else {
                                            if (
                                                serverNow() - D.persisted.lastNameChangedAt <
                                                NAME_CHANGE_COOLDOWN_HOUR * HOUR
                                            ) {
                                                G.audio.playError();
                                                showToast(
                                                    t("ChangeNameCooldown", {
                                                        hour: NAME_CHANGE_COOLDOWN_HOUR,
                                                    })
                                                );
                                                return;
                                            }
                                            G.audio.playClick();
                                            editingName = true;
                                            input.select();
                                        }
                                    },
                                },
                                editingName ? t("SaveName") : t("ChangeName")
                            ),
                        ]),
                        m(".hr"),
                        m(UserVerification),
                        ifTrue(navigator.onLine, () => [
                            m(".hr"),
                            m(".row.pointer", { onclick: () => routeTo("/choose-flag") }, [
                                m(".f1", [m("div", t("PlayerCountryFlag"))]),
                                m(
                                    ".mr10",
                                    m("img.country-flag", {
                                        style: {
                                            height: "18px",
                                            display: "block",
                                        },
                                        src: getFlagUrl(D.persisted.flag),
                                    })
                                ),
                                iconB("arrow_forward", 24, 0, { margin: "-10px 0" }, { class: "blue" }),
                            ]),
                        ]),
                        m(".hr"),
                        m(".row.pointer", { onclick: () => routeTo("/achievements") }, [
                            m(".f1", [
                                m("div", t("Achievements")),
                                m(
                                    ".text-desc.text-s",
                                    t("AchievementsDesc", {
                                        number: sizeOf(D.persisted.achievements),
                                        total: sizeOf(ACH),
                                    })
                                ),
                            ]),
                            ifTrue(toClaim > 0, () => m(".blue.ml10", toClaim)),
                            iconB("arrow_forward", 24, 0, { margin: "-10px 0 -10px 10px" }, { class: "blue" }),
                        ]),
                        ifTrue(!D.persisted.leaderboardOptOut && navigator.onLine, () => [
                            m(".hr"),
                            m(".row.pointer", { onclick: () => routeTo("/leaderboard") }, [
                                m(".f1", [m("div", t("Leaderboard")), m(".text-desc.text-s", t("LeaderboardDescV2"))]),
                                m(".ml10.blue", iconB("arrow_forward")),
                            ]),
                        ]),
                        m(".hr"),
                        m(".row.pointer", { onclick: () => routeTo("/patch-notes") }, [
                            m(".f1", [m("div", t("PatchNotes")), m(".text-desc.text-s", t("PatchNotesDesc"))]),
                            m(".ml10.blue", iconB("arrow_forward")),
                        ]),
                        ifTrue(hasSteamWebSignIn() && !isSteamWebSignedIn(), () => [
                            m(".hr"),
                            m(
                                ".two-col.pointer.banner",
                                {
                                    onclick: startWebLogin,
                                },
                                [
                                    m("div", [m("div", t("SteamLogin")), m(".text-desc.text-s", t("SteamLoginDesc"))]),
                                    m(".ml10", iconB("login")),
                                ]
                            ),
                        ])
                    ),
                    m(StreamingPage),
                    m(".box", [
                        m(".title", t("HighlightBuildings")),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => v.entity.turnOff, []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightTurnedOff")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => v.entity.inputBuffer === "auto", []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightStockpileModeOn")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => v.entity.tickSec > 1, []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightProductionCycleNotDefault")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => v.entity.maxTile > 0, []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightMaxInputDistanceNotDefault")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => !isProfitable(v), []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightNotMakingProfit")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings((v) => hasValue(v.entity.construction), []),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightUnderConstruction")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings(
                                                (v) => canBuild(v.entity.type) && v.entity.level < 10,
                                                []
                                            ),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightUnderLevel10")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings(
                                                (v) => canBuild(v.entity.type) && v.entity.level < 20,
                                                []
                                            ),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightUnderLevel20")), m(".ml20", "🔍")]
                        ),
                        m(".hr"),
                        m(
                            ".two-col.pointer",
                            {
                                onclick: () => {
                                    G.audio.playClick();
                                    showToast(
                                        t("NBuildingsAreHighlighted", {
                                            n: G.world.highlightBuildings(
                                                (v) => canBuild(v.entity.type) && v.entity.level < 30,
                                                []
                                            ),
                                        })
                                    );
                                },
                            },
                            [m(".text-desc.text-m", t("HighlightUnderLevel30")), m(".ml20", "🔍")]
                        ),
                    ]),
                    m(".box", [
                        m(".two-col", [
                            m("div", [m("div", t("MaxBuilders")), m(".text-desc.text-s", t("MaxBuildersDesc"))]),
                            m(".text-desc", nf(D.persisted.maxBuilders)),
                        ]),
                        m(".hr"),
                        m(".two-col", [
                            m("div", [
                                m("div", t("BuildingPermit")),
                                m(
                                    ".text-s.text-desc",
                                    t("BuildingPermitDesc", {
                                        amount: buildingPermit,
                                        amountBuilt: buildingCount,
                                        amountLeft: buildingPermit - buildingCount,
                                    })
                                ),
                            ]),
                            m(".ml10.blue", nf(buildingPermit)),
                        ]),
                        [1, 5, 10].map((l) => {
                            const getCost = () => getBuildingPermitCost(l);
                            const cost = getCost();
                            return [
                                m(".hr"),
                                m(
                                    ".two-col.pointer",
                                    {
                                        class: getCash() >= cost ? "blue" : "text-desc",
                                        onclick: () => {
                                            if (trySpendCash(getCost())) {
                                                G.audio.playClick();
                                                D.buildingPermit += l;
                                            } else {
                                                showToast(t("NotEnoughCash"));
                                                G.audio.playError();
                                            }
                                        },
                                    },
                                    [m("div", `${t("BuyPermit")} x${l}`), m("div", `$${nf(cost)}`)]
                                ),
                            ];
                        }),
                        ifTrue(mapExtraPermit > 0, () => [
                            m(".hr"),
                            m(
                                ".banner.blue.text-m",
                                t("MapExtraPermitDesc", {
                                    number: mapExtraPermit,
                                })
                            ),
                        ]),
                    ]),
                    m(SettingsPage),
                    m(".box", [
                        m(".title", t("ExpansionPacks")),
                        m(".hr"),
                        m(".two-col", [
                            m("div", t("ExpansionPack1")),
                            hasDLC(DLC[0]) ? m(".green", iconB("check_circle")) : m(".red", iconB("cancel")),
                        ]),
                        ifTrue(hasDLC(DLC[1]), () => [
                            m(".hr"),
                            m(".two-col", [
                                m("div", t("ExpansionPack2")),
                                hasDLC(DLC[1]) ? m(".green", iconB("check_circle")) : m(".red", iconB("cancel")),
                            ]),
                        ]),
                        m(".action", [
                            m(
                                "div",
                                {
                                    onclick: () => {
                                        G.audio.playClick();
                                        NativeSdk.restorePurchases()
                                            .then((purchases) => {
                                                syncPurchases(purchases);
                                                m.redraw();
                                                showToast(t("RestorePurchasesSuccess"));
                                            })
                                            .catch(() => {
                                                showToast(t("RestorePurchasesFailed"));
                                            });
                                    },
                                },
                                t("RestorePurchases")
                            ),
                        ]),
                    ]),
                    ifTrue(isSteam(), () => m(SteamBackupComponent)),
                    m(".box", [
                        m(".title", t("Credits")),
                        m(".hr"),
                        m(".two-col.text-desc.text-m", [m("div", t("Icons")), m(".ml20", "game-icons.net")]),
                        D.persisted.language === "EN"
                            ? null
                            : [
                                  m(".hr"),
                                  m(".two-col.text-desc.text-m", [
                                      m("div", t("Translator")),
                                      m(".ml20", t("TranslatorName")),
                                  ]),
                              ],
                        m(".hr"),
                        m(".two-col.text-desc.text-m", [
                            m("div", "Build Version"),
                            m(".ml20", `${getCurrentVersion()}-build.${BUILD_NUMBER}`),
                        ]),
                    ]),
                    m(ImportExportPanel),
                    m(".box.red", [
                        m(
                            ".pointer",
                            {
                                onclick: async () => {
                                    showAlert(t("ClearTradesTitle"), t("ClearTradesDescription"), [
                                        {
                                            name: t("ClearTradesNo"),
                                            class: "outline",
                                        },
                                        {
                                            name: t("ClearTradesYes"),
                                            class: "outline red",
                                            action: async () => {
                                                showLoader();
                                                try {
                                                    await Promise.race([clearTrades(D.persisted.userId), resolveIn(2)]);
                                                } finally {
                                                    reloadGame();
                                                }
                                            },
                                        },
                                    ]);
                                },
                            },
                            t("ClearMyTradesV2")
                        ),
                    ]),
                ]),
            ]);
        },
    };
}
