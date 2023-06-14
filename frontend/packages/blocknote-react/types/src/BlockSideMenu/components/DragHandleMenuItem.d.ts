import { PolymorphicComponentProps } from "@mantine/utils";
export type DragHandleMenuItemProps = PolymorphicComponentProps<"button"> & {
    closeMenu: () => void;
};
export declare const DragHandleMenuItem: (props: DragHandleMenuItemProps) => import("react/jsx-runtime").JSX.Element;
