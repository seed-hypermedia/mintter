import { MantineThemeOverride } from '@mantine/core';
import { TippyProps } from '@tippyjs/react';
import { RequiredDynamicParams } from '@mtt-blocknote/core';
import { FC } from 'react';
/**
 * Component used in the ReactElementFactory to wrap the EditorElementComponent in a MantineProvider and Tippy
 * component. The MantineProvider is used to add theming while the Tippy component is used to control show/hide
 * behavior.
 *
 * @param props The component props. Includes the same props as ReactElementFactory, as well as the current set of
 * EditorDynamicParams. Also provides props to determine if the element should be open and which element it should be
 * mounted under.
 */
export declare function EditorElementComponentWrapper<ElementStaticParams extends Record<string, any>, ElementDynamicParams extends RequiredDynamicParams>(props: {
    rootElement: HTMLElement;
    isOpen: boolean;
    staticParams: ElementStaticParams;
    dynamicParams: ElementDynamicParams;
    editorElementComponent: FC<ElementStaticParams & ElementDynamicParams>;
    theme: MantineThemeOverride;
    tippyProps?: TippyProps;
}): import("react/jsx-runtime").JSX.Element;
