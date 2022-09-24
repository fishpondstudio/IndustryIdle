import { isAndroid, isIOS } from "../General/NativeSdk";
import { TypedEvent } from "../General/TypedEvent";

export const OnKeydownEvent = new TypedEvent<KeyboardEvent>();

export function OnKeydown(e: KeyboardEvent) {
    OnKeydownEvent.emit(e);

    if (e.target instanceof HTMLInputElement || e.key === `"`) {
        return;
    }

    const dom = document.querySelector(`[data-shortcut="${e.key.toLowerCase()}"]`);

    if (dom) {
        dom.dispatchEvent(new Event("click"));
    }
}

export function shortcut(key: string | number, pre = "", post = ""): string {
    if (isIOS() || isAndroid()) {
        return "";
    }
    return `${pre}[${key}]${post}`;
}
