import { MantineThemeOverride } from "@mantine/core";
type ColorScheme = [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string
];
export declare const blockNoteColorScheme: ColorScheme;
export declare const getBlockNoteTheme: (useDarkTheme?: boolean) => MantineThemeOverride;
export {};
