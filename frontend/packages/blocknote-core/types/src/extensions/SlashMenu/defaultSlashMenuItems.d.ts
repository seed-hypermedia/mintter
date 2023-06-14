import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
/**
 * An array containing commands for creating all default blocks.
 */
export declare const defaultSlashMenuItems: BaseSlashMenuItem<{
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
        readonly node: import("../Blocks/api/blockTypes").TipTapNode<"paragraph">;
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
        readonly node: import("../Blocks/api/blockTypes").TipTapNode<"heading">;
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
        readonly node: import("../Blocks/api/blockTypes").TipTapNode<"bulletListItem">;
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
        readonly node: import("../Blocks/api/blockTypes").TipTapNode<"numberedListItem">;
    };
}>[];
