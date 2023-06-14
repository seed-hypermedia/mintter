/**
 * A generic interface used in all suggestion menus (slash menu, mentions, etc)
 */
export declare class SuggestionItem {
    name: string;
    match: (query: string) => boolean;
    constructor(name: string, match: (query: string) => boolean);
}
