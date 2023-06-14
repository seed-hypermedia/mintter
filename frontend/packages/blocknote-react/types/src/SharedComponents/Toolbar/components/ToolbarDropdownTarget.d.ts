/// <reference types="react" />
import { IconType } from "react-icons";
export type ToolbarDropdownTargetProps = {
    text: string;
    icon?: IconType;
    isDisabled?: boolean;
};
export declare const ToolbarDropdownTarget: import("react").ForwardRefExoticComponent<ToolbarDropdownTargetProps & import("react").RefAttributes<HTMLButtonElement>>;
