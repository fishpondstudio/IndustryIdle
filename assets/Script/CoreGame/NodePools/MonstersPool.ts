import Monster from "../TowerDefense/Monster";
import NodePoolManager from "./NodePoolManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class MonstersPool extends NodePoolManager<Monster> {
    @property(cc.Prefab) protected monster: cc.Prefab = null;

    public monsters: Record<string, Monster> = {};

    protected override make(): Monster {
        const node = cc.instantiate(this.monster);
        const monster = node.getComponent(Monster);
        node.parent = this.node;
        return monster;
    }

    public override get(): Monster {
        const monster = super.get();
        this.monsters[monster.uuid] = monster;
        return monster;
    }

    public override putAll(): void {
        this.monsters = {};
        super.putAll(Monster);
    }

    public override put(monster: Monster): void {
        delete this.monsters[monster.uuid];
        super.put(monster);
    }
}
