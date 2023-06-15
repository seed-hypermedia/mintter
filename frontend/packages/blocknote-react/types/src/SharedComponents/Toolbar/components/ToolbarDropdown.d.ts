import { MouseEvent } from 'react';
import { IconType } from 'react-icons';
export type ToolbarDropdownProps = {
    items: Array<{
        onClick?: (e: MouseEvent) => void;
        text: string;
        icon?: IconType;
        isSelected?: boolean;
        isDisabled?: boolean;
    }>;
    isDisabled?: boolean;
};
export declare function ToolbarDropdown(props: ToolbarDropdownProps): import("react/jsx-runtime").JSX.Element | null;
