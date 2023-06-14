import { MouseEvent } from "react";
import { IconType } from "react-icons";
export type ToolbarButtonProps = {
    onClick?: (e: MouseEvent) => void;
    icon?: IconType;
    mainTooltip: string;
    secondaryTooltip?: string;
    isSelected?: boolean;
    children?: any;
    isDisabled?: boolean;
};
/**
 * Helper for basic buttons that show in the formatting toolbar.
 */
export declare const ToolbarButton: import("react").ForwardRefExoticComponent<ToolbarButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
