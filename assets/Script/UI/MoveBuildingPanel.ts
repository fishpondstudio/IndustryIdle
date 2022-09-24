import { gridToString } from "../CoreGame/GridHelper";
import { Entity } from "../CoreGame/Logic/Entity";
import { D, G } from "../General/GameData";
import { t } from "../General/i18n";
import { routeTo, showToast } from "./UISystem";

export function MoveBuildingPanel(): m.Comp<{ entity: Entity }> {
    let moving = false;
    return {
        view: (vnode) => {
            const entity = vnode.attrs.entity;
            if (entity.type !== "DefenseCommand") {
                return null;
            }
            return [
                m(
                    ".blue.pointer",
                    {
                        onclick: async () => {
                            G.audio.playClick();
                            try {
                                cc.game.canvas.style.cursor = "cell";
                                moving = true;
                                const grid = await G.world.playerInput.hijackGridSelect();
                                const xy = gridToString(grid);
                                if (D.buildings[xy] || D.buildingsToConstruct[xy]) {
                                    throw new Error();
                                }
                                const result = await G.world.waveManager.recalculateWormholePath({
                                    [xy]: 1,
                                    [entity.grid]: 0,
                                });
                                if (result.some((r) => r.path.length <= 0)) {
                                    throw new Error();
                                }
                                if (!G.world.moveBuilding(entity.grid, xy)) {
                                    throw new Error();
                                }
                                G.world.playerInput.select(grid);
                                routeTo("/inspect", { xy: xy });
                                m.redraw();
                            } catch (error) {
                                G.audio.playError();
                                showToast(t("MoveBuildingInvalidTarget"));
                            } finally {
                                cc.game.canvas.style.cursor = "";
                                moving = false;
                            }
                        },
                    },
                    m("div", moving ? t("MoveBuildingMoving") : t("MoveBuilding"))
                ),
                m(".hr"),
            ];
        },
    };
}
