import {getRenderElement, SlatePlugin} from '@udecode/slate-plugins-core'
import {getLinkDeserialize, WithLinkOptions, withLink} from '@udecode/slate-plugins-link'
import {Transforms} from 'slate'
import {WithMintterLinkOptions, withMintterLink} from './with-mintter-link'

/**
 * This is needed so the popover with a form works.
 * this prevents the editor to unset the selection
 * when the popover with an input opens
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
Transforms.deselect = () => {}

export const ELEMENT_LINK = 'a'
export const MINTTER_LINK_PREFIX = 'mtt://'
export function createLinkPlugin({menu, ...options}: WithLinkOptions & WithMintterLinkOptions = {}): SlatePlugin {
  return {
    pluginKeys: ELEMENT_LINK,
    inlineTypes: () => [ELEMENT_LINK],
    renderElement: getRenderElement(ELEMENT_LINK),
    deserialize: getLinkDeserialize(),
    withOverrides: [withLink(), withMintterLink({menu})],
    // withOverrides: [withLink({isUrl: isValidUrl}), withMintterLink()],
  }
}
