import { TypedEvent } from "../General/TypedEvent";

export const OnKeyDownEvent = new TypedEvent<KeyboardEvent>();
export const OnKeyUpEvent = new TypedEvent<KeyboardEvent>();

export function OnKeyDown(e: KeyboardEvent) {
    const key: string = e.key;

    // Ignore KeyboardEvent's for Control, Alt and '"' Keys
    if(key === "Control" || key === "Alt" || key === `"`) {
        return;
    }
    if (e.target instanceof HTMLInputElement) {
        return;
    }

    // numerical keys [0-9] are 'reserved' for use by data-shortcut 
    const dom: Element = document.querySelector(`[data-shortcut="${key.toLowerCase()}-${e.ctrlKey}-${e.shiftKey}-${e.altKey}"]`);

    if (dom) {
        e.stopPropagation();
        dom.dispatchEvent(new Event("click"));
    } else {
        OnKeyDownEvent.emit(e);
    }
}

export function OnKeyUp(e: KeyboardEvent) {
    const key: string = e.key;
    if(key === "Control" || key === "Alt" || key === `"`) {
        return;
    }
    if (e.target instanceof HTMLInputElement) {
        return;
    }
    OnKeyUpEvent.emit(e);
}
