import { G } from "../../General/GameData";
import { ifTrue, mapOf } from "../../General/Helper";
import { t } from "../../General/i18n";
import { iconB, uiRecipeInputOut } from "../../UI/UIHelper";
import { showToast } from "../../UI/UISystem";
import { batchApply, batchModeLabel } from "../Logic/BatchMode";
import { MultipleRecipeEntity } from "../Logic/Entity";
import { BLD } from "../Logic/Logic";

export function MultipleRecipePanel(): m.Comp<{
    entity: MultipleRecipeEntity;
}> {
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity as MultipleRecipeEntity;
            const recipes = BLD[entity.type].recipes();
            return m(".box", [
                m(".title.two-col", [
                    m("div", t("ChooseARecipe")),
                    m(
                        ".blue.pointer",
                        {
                            onclick: () => {
                                G.audio.playClick();
                                let success = 0;
                                let fail = 0;
                                batchApply(entity, (e: MultipleRecipeEntity) => {
                                    if (e.level >= recipes[entity.recipe]) {
                                        e.recipe = entity.recipe;
                                        success++;
                                    } else {
                                        fail++;
                                    }
                                });
                                showToast(t("BatchOperationResult", { success, fail, cost: 0 }));
                            },
                        },
                        t("ApplyToBatch", { batch: batchModeLabel() })
                    ),
                ]),
                mapOf(recipes, (k, v) => {
                    const locked = entity.level < v;
                    return [
                        m(".hr"),
                        m(
                            ".row.pointer",
                            {
                                onclick: () => {
                                    if (locked) {
                                        G.audio.playError();
                                        showToast(t("UnlockAtLevel", { level: v }));
                                        return;
                                    }
                                    G.audio.playClick();
                                    entity.recipe = k;
                                },
                            },
                            [
                                m(
                                    ".f1",
                                    uiRecipeInputOut(
                                        BLD[k].staticInput,
                                        BLD[k].staticOutput,
                                        locked ? "text-m text-desc" : "text-m",
                                        ""
                                    )
                                ),
                                m(
                                    ".ml20",
                                    { style: { margin: "-10px 0" } },
                                    ifTrue(entity.recipe === k, () => m(".green", iconB("check_circle")))
                                ),
                            ]
                        ),
                        ifTrue(locked, () => m(".red.text-s.mt5.uppercase", t("UnlockAtLevel", { level: v }))),
                    ];
                }),
            ]);
        },
    };
}

export function ResourceExplorerPanel(): m.Comp<{
    entity: MultipleRecipeEntity;
}> {
    return {
        view: (vnode) => {
            return [
                m(".banner.box.text-m", t("ResourceExplorerDescLong")),
                m(MultipleRecipePanel, { entity: vnode.attrs.entity }),
            ];
        },
    };
}
