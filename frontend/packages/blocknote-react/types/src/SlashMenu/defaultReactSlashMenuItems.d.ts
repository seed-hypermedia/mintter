import { ReactSlashMenuItem } from './ReactSlashMenuItem';
export declare const defaultReactSlashMenuItems: ReactSlashMenuItem<{
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
        readonly node: import("@mtt-blocknote/core").TipTapNode<"paragraph", any, any>;
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
        readonly node: import("@mtt-blocknote/core").TipTapNode<"heading", any, any>;
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
        readonly node: import("@mtt-blocknote/core").TipTapNode<"bulletListItem", any, any>;
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
        readonly node: import("@mtt-blocknote/core").TipTapNode<"numberedListItem", any, any>;
    };
}>[];
