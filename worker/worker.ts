import { AStarFinder } from "astar-typescript";
import { PathFindingRequest } from "../assets/Script/Shared/CommonDataTypes";

onmessage = (e) => {
    const req = e.data as PathFindingRequest;
    const finder = new AStarFinder({
        grid: {
            matrix: req.grid,
        },
        diagonalAllowed: false,
        heuristic: "Manhattan",
    });
    req.input.forEach(([start, end]) => {
        const result = finder.findPath(start, { x: end.x, y: end.y });
        postMessage({
            id: req.id,
            path: result,
        });
    });
};
