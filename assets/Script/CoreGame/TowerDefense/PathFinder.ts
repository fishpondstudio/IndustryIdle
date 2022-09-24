import { D, G } from "../../General/GameData";
import { hasValue } from "../../General/Helper";
import { GridMarker, PathFindingRequest, PathFindingResult, Point } from "../../Shared/CommonDataTypes";
import { stringToGrid } from "../GridHelper";

let jobId = 0;
const jobs: Record<string, (r: PathFindingResult) => void> = {};

export function initPathFinderWorker() {
    G.pfWorker.onmessage = (message) => {
        const r = message.data as PathFindingResult;
        if (jobs[r.id]) {
            jobs[r.id](r);
            delete jobs[r.id];
        }
    };
}

export function findPath(start: Point, additionalMarkers: Record<string, 1 | 0>): Promise<PathFindingResult> {
    return new Promise((resolve) => {
        const grid: GridMarker[][] = [];
        const maxTile = G.grid.getMaxTile();
        for (let y = 0; y < maxTile; y++) {
            const row: GridMarker[] = [];
            for (let x = 0; x < maxTile; x++) {
                let marker: GridMarker = 0;
                const entity = D.buildings[`${x},${y}`];
                if (entity) {
                    marker = entity.type === "Headquarter" || entity.type === "Wormhole" ? 0 : 1;
                }
                const xy = `${x},${y}`;
                const construction = D.buildingsToConstruct[xy];
                if (construction && construction.construction !== "unpaid") {
                    marker = 1;
                }
                if (hasValue(additionalMarkers[xy])) {
                    marker = additionalMarkers[xy];
                }
                row.push(marker);
            }
            grid.push(row);
        }
        const hq = stringToGrid(G.headquarter.grid);
        const end = { x: hq.x, y: hq.y };
        const req: PathFindingRequest = {
            id: String(++jobId),
            grid,
            input: [[start, end]],
        };
        jobs[req.id] = resolve;
        G.pfWorker.postMessage(req);
    });
}
