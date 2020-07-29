import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHelper} from './onKeyDownHelper'
import {ELEMENT_IMAGE} from '../elements'

export const HelperPlugin = (): SlatePlugin => ({
  onKeyDown: onKeyDownHelper(),
  voidTypes: [ELEMENT_IMAGE],
})
