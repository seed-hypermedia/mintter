import { ToolbarButtonProps } from "../../SharedComponents/Toolbar/components/ToolbarButton";
type HyperlinkButtonProps = ToolbarButtonProps & {
    hyperlinkIsActive: boolean;
    activeHyperlinkUrl: string;
    activeHyperlinkText: string;
    setHyperlink: (url: string, text?: string) => void;
};
/**
 * The link menu button opens a tooltip on click
 */
export declare const LinkToolbarButton: (props: HyperlinkButtonProps) => import("react/jsx-runtime").JSX.Element;
export default LinkToolbarButton;
