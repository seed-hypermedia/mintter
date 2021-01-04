import {DEFAULTS_PARAGRAPH} from './elements/paragraph'

import {BOLD_OPTIONS} from './marks/bold'
import {ITALIC_OPTIONS} from './marks/italic'
import {CODE_OPTIONS} from './marks/code'
import {UNDERLINE_OPTIONS} from './marks/underline'
import {STRIKETHROUGH_OPTIONS} from './marks/strikethrough'

import {DEFAULTS_HEADINGS} from './heading-plugin/defaults'
import {DEFAULTS_TRANSCLUSION} from './transclusion-plugin/defaults'
import {DEFAULTS_BLOCK} from './block-plugin/defaults'
import {DEFAULTS_BLOCKLIST} from './hierarchy-plugin/defaults'
import {DEFAULTS_READ_ONLY} from './readonly-plugin/defaults'
import {DEFAULTS_LIST} from './list-plugin/defaults'

export const options = {
  ...DEFAULTS_HEADINGS,
  ...DEFAULTS_PARAGRAPH,
  ...DEFAULTS_BLOCK,
  ...DEFAULTS_BLOCKLIST,
  ...DEFAULTS_TRANSCLUSION,
  ...DEFAULTS_READ_ONLY,
  ...DEFAULTS_LIST,
  //marks
  ...BOLD_OPTIONS,
  ...ITALIC_OPTIONS,
  ...CODE_OPTIONS,
  ...UNDERLINE_OPTIONS,
  ...STRIKETHROUGH_OPTIONS,
}
