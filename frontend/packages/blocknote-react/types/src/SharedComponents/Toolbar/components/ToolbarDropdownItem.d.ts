import { IconType } from "react-icons";
import { MouseEvent } from "react";
export type ToolbarDropdownItemProps = {
    text: string;
    icon?: IconType;
    onClick?: (e: MouseEvent) => void;
    isSelected?: boolean;
    isDisabled?: boolean;
};
export declare function ToolbarDropdownItem(props: ToolbarDropdownItemProps): import("react/jsx-runtime").JSX.Element;
