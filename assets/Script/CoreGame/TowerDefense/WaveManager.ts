import { D, G, T } from "../../General/GameData";
import { findComponent, forEach, sizeOf, uuidv4 } from "../../General/Helper";
import { TypedEvent } from "../../General/TypedEvent";
import GoldAnimation from "../../MetaGame/GoldAnimation";
import { PathFindingResult, Pathway } from "../../Shared/CommonDataTypes";
import { getCurrentColor } from "../ColorThemes";
import { gridToPosition, gridToString, stringToPoint, stringToPosition } from "../GridHelper";
import { Entity } from "../Logic/Entity";
import { addCash } from "../Logic/Logic";
import MonstersPool from "../NodePools/MonstersPool";
import { SelectionChangeArgs } from "../PlayerInput";
import { getWaveInfo, getWaveReward, IWaveDefinition } from "./DefenseModules";
import { findPath } from "./PathFinder";

export class WaveManager {
    // Needed by cc.Scheduler
    private _id = uuidv4();
    // Needed by cc.Scheduler
    private paused = false;

    public readonly pathwayCache: Record<string, Pathway> = {};
    public readonly wormholes: Entity[] = [];
    public autoStart = false;

    public pathTileCache: Record<string, true> = {};
    private readonly _monstersPool: MonstersPool;
    private _currentWave: IWaveDefinition;
    private readonly _scheduler: cc.Scheduler;
    private readonly _pathIndicators: cc.Graphics;

    private _currentWaveCount = 0;
    private _shouldRedrawPathNext = false;

    private _successCount = 0;

    public get successCount() {
        return this._successCount;
    }
    public set successCount(value) {
        this._successCount = value;
        this.checkFinished();
    }

    private _failCount = 0;
    public get failCount() {
        return this._failCount;
    }
    public set failCount(value) {
        this._failCount = value;
        this.checkFinished();
    }

    private checkFinished(): void {
        if (this._successCount + this._failCount < this._currentWaveCount) {
            return;
        }
        if (this._failCount > 0) {
            T.currentWaveStatus = "fail";
        } else {
            T.currentWaveStatus = "success";
            if (this.autoStart) {
                this.claimReward();
                this.startNextWave();
            }
        }
    }

    constructor(
        monstersPool: MonstersPool,
        pathIndicators: cc.Graphics,
        onSelectionChange: TypedEvent<SelectionChangeArgs>
    ) {
        this._monstersPool = monstersPool;
        this._scheduler = cc.director.getScheduler();
        this._pathIndicators = pathIndicators;

        onSelectionChange.on((e) => {
            if (e.new) {
                const xy = gridToString(e.new);
                // Ignore HQ and wormhole
                if (
                    this.pathTileCache[xy] &&
                    G.headquarter.grid !== xy &&
                    !this.pathwayCache[xy] &&
                    T.currentWaveStatus !== "inProgress"
                ) {
                    this.redrawWormholePath({ [xy]: 1 });
                    this._shouldRedrawPathNext = true;
                    return;
                }
            }
            if (this._shouldRedrawPathNext) {
                this.redrawWormholePath();
                this._shouldRedrawPathNext = false;
            }
        });
    }

    public claimReward(): void {
        const reward = getWaveReward(this.wormholes.length);
        findComponent(GoldAnimation).play(() => addCash(reward / 10), 10);
        T.currentWaveStatus = "init";
        D.waveCount++;
    }

    private spawnMonsters(): void {
        cc.assert(!!this._currentWave, "`spawnMonsters` expect `currentWave` to be set!");
        const wormhole = this.wormholes[this._currentWaveCount % this.wormholes.length];
        const pathway = this.pathwayCache[wormhole.grid];
        if (pathway && pathway.length > 0) {
            const monster = this._monstersPool.get();
            monster.node.position = stringToPosition(wormhole.grid);
            monster.init(this.pathwayCache[wormhole.grid], this._currentWave.unitHp, this._currentWave.speed);
            ++this._currentWaveCount;
        }
        if (this._currentWaveCount >= this._currentWave.totalCount * this.wormholes.length) {
            this._scheduler.unschedule(this.spawnMonsters, this);
        }
    }

    public tick(dt: number): void {
        forEach(this._monstersPool.monsters, (_, monster) => {
            monster.tick(dt);
        });
    }

    public startNextWave(): void {
        T.currentWaveStatus = "inProgress";
        this._currentWave = getWaveInfo();
        this._currentWaveCount = 0;
        this._successCount = 0;
        this._failCount = 0;
        this._scheduler.schedule(this.spawnMonsters, this, this._currentWave.spawnDelay / this.wormholes.length);
    }

    public stopNextWave(): void {
        this._scheduler.unschedule(this.spawnMonsters, this);
        T.currentWaveStatus = "fail";
        G.world.bulletsPool.putAll();
        G.world.monstersPool.putAll();
    }

    public getProgress(): [number, number] {
        return [this._currentWaveCount, this._currentWave.totalCount * this.wormholes.length];
    }

    public recalculateWormholePath(additionalMarkers: Record<string, 1 | 0> = {}): Promise<PathFindingResult[]> {
        return Promise.all(
            this.wormholes.map((entity) => {
                return findPath(stringToPoint(entity.grid), additionalMarkers);
            })
        );
    }

    public async redrawWormholePath(additionalMarkers: Record<string, 1 | 0> = {}): Promise<void> {
        const results = await this.recalculateWormholePath(additionalMarkers);
        // Only update cache when there's no additional markers
        const shouldUpdateCache = sizeOf(additionalMarkers) === 0;
        const g = this._pathIndicators;
        g.clear();
        g.strokeColor = getCurrentColor().grid.lerp(getCurrentColor().background, 0.5);
        if (shouldUpdateCache) {
            this.pathTileCache = {};
        }
        results.forEach((result, index) => {
            if (shouldUpdateCache) {
                this.pathwayCache[this.wormholes[index].grid] = result.path;
            }
            result.path.forEach((val, idx) => {
                if (shouldUpdateCache) {
                    this.pathTileCache[`${val[0]},${val[1]}`] = true;
                }
                const pos = gridToPosition(cc.v3(val[0], val[1]));
                if (idx === 0) {
                    g.moveTo(pos.x, pos.y);
                } else {
                    g.lineTo(pos.x, pos.y);
                }
            });
            g.stroke();
        });
    }
}
