export type SlashMenuItemProps = {
    name: string;
    icon: JSX.Element;
    hint: string | undefined;
    shortcut?: string;
    isSelected: boolean;
    set: () => void;
};
export declare function SlashMenuItem(props: SlashMenuItemProps): import("react/jsx-runtime").JSX.Element;
