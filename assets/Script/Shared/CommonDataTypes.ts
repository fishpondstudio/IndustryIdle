export interface Point {
    x: number;
    y: number;
}

export type GridMarker = 1 | 0;

export interface PathFindingRequest {
    id: string;
    grid: GridMarker[][];
    input: [Point, Point][];
}

export type PathFindingResult = {
    id: string;
    path: Pathway;
};

export type Pathway = [number, number][];
