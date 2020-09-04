import {SlatePlugin} from '@udecode/slate-plugins'
import {ELEMENT_IMAGE} from '../ImagePlugin'

export const HelperPlugin = (): SlatePlugin => ({
  voidTypes: [ELEMENT_IMAGE],
})
