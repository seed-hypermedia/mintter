export type HyperlinkToolbarProps = {
    url: string;
    text: string;
    editHyperlink: (url: string, text: string) => void;
    deleteHyperlink: () => void;
};
/**
 * Main menu component for the hyperlink extension.
 * Renders a toolbar that appears on hyperlink hover.
 */
export declare const HyperlinkToolbar: (props: HyperlinkToolbarProps) => import("react/jsx-runtime").JSX.Element;
