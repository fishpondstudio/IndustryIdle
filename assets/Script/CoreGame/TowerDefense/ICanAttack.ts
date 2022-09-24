import { G, T } from "../../General/GameData";
import { forEach } from "../../General/Helper";
import EntityVisual from "../EntityVisual";
import { DefenseCommandEntity } from "../Logic/Entity";
import { deductFromAssertEnough } from "../Logic/Logic";
import { BASE_MODULE_MIN, getModuleDamage } from "./DefenseModules";

const { ccclass, property } = cc._decorator;

@ccclass
export default class ICanAttack extends cc.Component {
    private _entityVisual: EntityVisual;
    private _entity: DefenseCommandEntity;
    private _timeSinceLastAttack = 0;

    public init(entityVisual: EntityVisual) {
        this._entityVisual = entityVisual;
        this._entity = entityVisual.entity as DefenseCommandEntity;
    }

    protected override update(dt: number): void {
        if (T.currentWaveStatus !== "inProgress" || this._entityVisual.notEnoughPower) {
            return;
        }

        if (!this._entity.attackSpeed) {
            this._entity.attackSpeed = BASE_MODULE_MIN.attackSpeed;
        }

        if (this._timeSinceLastAttack < 1 / this._entity.attackSpeed) {
            this._timeSinceLastAttack += dt;
            return;
        }
        this._timeSinceLastAttack = 0;

        let bulletShot = 0;
        const range = this._entity.range;
        const bulletSpeed = this._entity.bulletSpeed;
        let moduleIdx = 0;
        forEach(G.world.monstersPool.monsters, (_, monster) => {
            const module = this._entity.modules[moduleIdx];
            if (!module) {
                return true;
            }
            let damage = getModuleDamage(this._entity, module);
            if (Math.random() < module.criticalDamageChance / 100) {
                damage *= module.criticalDamageMultiplier;
            }
            // TODO: This means first module will block, need to improve
            if (this._entity.resources.Dmg < damage) {
                return true;
            }
            const distSqr = monster.node.position.sub(this.node.position).magSqr();
            if (distSqr > range * range) {
                return false;
            }
            if (monster.expectedHp <= 0) {
                return false;
            }
            const bm = G.world.bulletsPool.get();
            bm.node.position = this.node.position;
            bm.init(monster.node, damage, bulletSpeed);
            monster.expectedHp -= damage;
            deductFromAssertEnough(this._entity, "Dmg", damage, true);
            bulletShot++;
            moduleIdx++;
            return false;
        });

        if (bulletShot > 0) {
            this._entityVisual.sprite.node.angle += dt * 90;
        }
    }
}
