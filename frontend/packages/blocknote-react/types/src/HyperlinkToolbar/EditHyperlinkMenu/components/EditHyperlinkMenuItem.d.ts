import { IconType } from "react-icons";
export type EditHyperlinkMenuItemProps = {
    icon: IconType;
    mainIconTooltip: string;
    secondaryIconTooltip?: string;
    autofocus?: boolean;
    placeholder?: string;
    value?: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
};
export declare function EditHyperlinkMenuItem(props: EditHyperlinkMenuItemProps): import("react/jsx-runtime").JSX.Element;
