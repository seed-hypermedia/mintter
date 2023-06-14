/// <reference types="react" />
export type EditHyperlinkMenuProps = {
    url: string;
    text: string;
    update: (url: string, text: string) => void;
};
/**
 * Menu which opens when editing an existing hyperlink or creating a new one.
 * Provides input fields for setting the hyperlink URL and title.
 */
export declare const EditHyperlinkMenu: import("react").ForwardRefExoticComponent<EditHyperlinkMenuProps & import("react").RefAttributes<HTMLDivElement>>;
