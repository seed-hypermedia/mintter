import { Extension } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        blockBackgroundColor: {
            setBlockBackgroundColor: (posInBlock: number, color: string) => ReturnType;
        };
    }
}
export declare const BackgroundColorExtension: Extension<any, any>;
