import {SlatePlugin} from '@udecode/slate-plugins'
import {ELEMENT_READ_ONLY} from '../ReadOnlyPlugin/defaults'

export const HelperPlugin = (): SlatePlugin => ({
  voidTypes: [ELEMENT_READ_ONLY],
})
