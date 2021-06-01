import { isUrl } from '@udecode/slate-plugins-common';
import {
  getRenderElement,
  getSlatePluginType,
  SlatePlugin,
  SPEditor,
  WithOverride,
} from '@udecode/slate-plugins-core';
import {
  getLinkDeserialize,
  WithLinkOptions,
  withLink,
} from '@udecode/slate-plugins-link';
import { Transforms } from 'slate';
import { WithMintterLinkOptions, withMintterLink } from './with-mintter-link'

/**
 * This is needed so the popover with a form works.
 * this prevents the editor to unset the selection
 * when the popover with an input opens
 */
Transforms.deselect = () => { };

export const ELEMENT_LINK = 'a';
export const MINTTER_LINK_PREFIX = 'mtt://';
export function createLinkPlugin({ openMintterLinkMenu, ...options }: WithLinkOptions & WithMintterLinkOptions): SlatePlugin {
  return {
    pluginKeys: ELEMENT_LINK,
    inlineTypes: () => [ELEMENT_LINK],
    renderElement: getRenderElement(ELEMENT_LINK),
    deserialize: getLinkDeserialize(),
    withOverrides: [withLink(), withMintterLink({ openMintterLinkMenu })],
  };
}