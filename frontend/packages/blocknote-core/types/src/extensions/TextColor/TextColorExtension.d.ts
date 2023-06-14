import { Extension } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        blockTextColor: {
            setBlockTextColor: (posInBlock: number, color: string) => ReturnType;
        };
    }
}
export declare const TextColorExtension: Extension<any, any>;
