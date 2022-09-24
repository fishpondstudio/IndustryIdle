import { EN } from "../Languages/en";
import { D, Languages } from "./GameData";

export function t(str: keyof typeof EN, substitutions?: Record<string, string | number>) {
    const translation = Languages?.[D.persisted.language]?.[str] ?? EN[str];
    if (translation) {
        return transformPhrase(translation, substitutions);
    }
    return `⚠️${str}`;
}

function transformPhrase(phrase: string, substitutions?: Record<string, any>) {
    if (typeof phrase !== "string") {
        throw new TypeError("Polyglot.transformPhrase expects argument #1 to be string");
    }
    if (substitutions === null) {
        return phrase;
    }
    let result = phrase;
    const interpolationRegex = /%\{(.*?)\}/g;
    const options = substitutions;
    // Interpolate: Creates a `RegExp` object for each interpolation placeholder.
    result = result.replace(interpolationRegex, (expression, argument) => {
        if (!options || options[argument] === undefined) {
            return expression;
        }
        return options[argument];
    });
    return result;
}
