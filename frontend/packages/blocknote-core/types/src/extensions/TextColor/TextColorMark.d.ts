import { Mark } from "@tiptap/core";
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        textColor: {
            setTextColor: (color: string) => ReturnType;
        };
    }
}
export declare const TextColorMark: Mark<any, any>;
