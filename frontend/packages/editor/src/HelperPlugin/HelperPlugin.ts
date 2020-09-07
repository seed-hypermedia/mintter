import {SlatePlugin} from '@udecode/slate-plugins'
import {ELEMENT_IMAGE} from '../ImagePlugin/defaults'
import {ELEMENT_TRANSCLUSION} from '../TransclusionPlugin/defaults'

export const HelperPlugin = (): SlatePlugin => ({
  voidTypes: [ELEMENT_IMAGE, ELEMENT_TRANSCLUSION],
})
