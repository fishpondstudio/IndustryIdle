export class Shortcut {
    private _ctrlKey: boolean;
    private _shiftKey: boolean;
    private _altKey: boolean;
    private _key: string;

    public get ctrlKey() : boolean {
        return this._ctrlKey;
    }
    public get shiftKey() : boolean {
        return this._shiftKey;
    }
    public get altKey() : boolean {
        return this._altKey;
    }     
    public get key() : string {
        return this._key;
    }

    public set ctrlKey(newVal: boolean) : void {
        this._ctrlKey = newVal;
    }
    public set shiftKey(newVal: boolean) : void {
        this._shiftKey = newVal;
    }
    public set altKey(newVal: boolean) : void {
        this._altKey = newVal;
    }
    public set key(newVal: string) : void {
        this._key = newVal;
    }

    constructor(key: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean) {
        this.key = key;
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
    }
}

export class Hotkey extends Shortcut {
    private _hasExecuted: boolean;
    private _onExecute: Function;

    public get hasExecuted() : boolean {
        return this._hasExecuted;
    }    
    public set hasExecuted(newVal: boolean) : void {
        this._hasExecuted = newVal;
    }

    public onExecute() : void {
        this._onExecute();
        this._hasExecuted = true;
    }

    constructor(shortcut: Shortcut, onExecute: Function) {
        super(shortcut.key, shortcut.ctrlKey, shortcut.shiftKey, shortcut.altKey);
        this._onExecute = onExecute;
        this._hasExecuted = false;
    }
}
