import { Extension } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        textAlignment: {
            setTextAlignment: (textAlignment: "left" | "center" | "right" | "justify") => ReturnType;
        };
    }
}
export declare const TextAlignmentExtension: Extension<any, any>;
