import { Mark } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        backgroundColor: {
            setBackgroundColor: (color: string) => ReturnType;
        };
    }
}
export declare const BackgroundColorMark: Mark<any, any>;
