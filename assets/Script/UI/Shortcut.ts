// DEAD SOURCE FILE : REMOVE
// import { isAndroid, isIOS } from "../General/NativeSdk";
// import { TypedEvent } from "../General/TypedEvent";
//
// export const OnKeyDownEvent = new TypedEvent<KeyboardEvent>();
// export const OnKeyUpEvent = new TypedEvent<KeyboardEvent>();
//
// export function OnKeyDown(e: KeyboardEvent) {
//     const key: string = e.key;
//     // Ignore \ discard KeyboardEvent's for Control, Alt and '"' Keys
//     if(key === "Control" || key === "Alt" || key === `"`) {
//         return;
//     }
//     if (e.target instanceof HTMLInputElement) {
//         return;
//     }
//     const dom: Element = document.querySelector(`[data-shortcut="${key.toLowerCase()}-${e.ctrlKey}-${e.shiftKey}-${e.altKey}"]`);
//     if (dom) { // where present; 'data-shortcut'(s) supersede Hotkey def events
//         e.stopPropagation();
//         dom.dispatchEvent(new Event("click"));
//         //dom.dispatchEvent(e);
//     } else {
//         OnKeyDownEvent.emit(e);
//     }
// }
// export function OnKeyUp(e: KeyboardEvent) {
//     const key: string = e.key;
//     if(key === "Control" || key === "Alt" || key === `"`) {
//         return;
//     }
//     if (e.target instanceof HTMLInputElement) {
//         return;
//     }
//     OnKeyUpEvent.emit(e);
// }