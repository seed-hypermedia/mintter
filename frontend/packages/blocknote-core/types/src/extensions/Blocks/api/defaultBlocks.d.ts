import { TypesMatch } from "./blockTypes";
export declare const defaultProps: {
    backgroundColor: {
        default: "transparent";
    };
    textColor: {
        default: "black";
    };
    textAlignment: {
        default: "left";
        values: readonly ["left", "center", "right", "justify"];
    };
};
export type DefaultProps = typeof defaultProps;
export declare const defaultBlockSchema: {
    readonly paragraph: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("./blockTypes").TipTapNode<"paragraph">;
    };
    readonly heading: {
        readonly propSchema: {
            readonly level: {
                readonly default: "1";
                readonly values: readonly ["1", "2", "3"];
            };
            readonly backgroundColor: {
                default: "transparent";
            };
            readonly textColor: {
                default: "black";
            };
            readonly textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("./blockTypes").TipTapNode<"heading">;
    };
    readonly bulletListItem: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("./blockTypes").TipTapNode<"bulletListItem">;
    };
    readonly numberedListItem: {
        readonly propSchema: {
            backgroundColor: {
                default: "transparent";
            };
            textColor: {
                default: "black";
            };
            textAlignment: {
                default: "left";
                values: readonly ["left", "center", "right", "justify"];
            };
        };
        readonly node: import("./blockTypes").TipTapNode<"numberedListItem">;
    };
};
export type DefaultBlockSchema = TypesMatch<typeof defaultBlockSchema>;
