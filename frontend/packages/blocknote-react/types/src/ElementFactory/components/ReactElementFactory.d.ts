import { FC } from 'react';
import { TippyProps } from '@tippyjs/react';
import { EditorElement, RequiredDynamicParams } from '@mtt-blocknote/core';
import { MantineThemeOverride } from '@mantine/core';
/**
 * The ReactElementFactory is a generic function used to create all other ElementFactories, which are then used in the
 * BlockNote editor. The type of ElementFactory created depends on the provided ElementStaticParams and
 * ElementDynamicParams, which determine what static/dynamic properties are used in rendering the element.
 * ElementStaticParams are initialized when the editor mounts and do not change, while ElementDynamicParams change based
 * on the editor state.
 *
 * @param staticParams Properties used in rendering the element which do not change, regardless of editor state.
 * @param EditorElementComponent The element to render, which is a React component. Takes EditorStaticParams and
 * EditorDynamicParams as props.
 * @param theme The Mantine theme used to style the element.
 * @param tippyProps Tippy props, which affect the elements' popup behaviour, e.g. popup position, animation, etc.
 */
export declare const ReactElementFactory: <ElementStaticParams extends Record<string, any>, ElementDynamicParams extends RequiredDynamicParams>(staticParams: ElementStaticParams, EditorElementComponent: FC<ElementStaticParams & ElementDynamicParams>, theme: MantineThemeOverride, tippyProps?: TippyProps) => EditorElement<ElementDynamicParams>;
