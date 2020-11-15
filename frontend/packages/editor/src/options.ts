import {PARAGRAPH_OPTIONS} from './elements'
import {
  BOLD_OPTIONS,
  ITALIC_OPTIONS,
  CODE_OPTIONS,
  UNDERLINE_OPTIONS,
  STRIKETHROUGH_OPTIONS,
} from './marks'
import {DEFAULTS_TRANSCLUSION} from './TransclusionPlugin'
import {DEFAULTS_BLOCK} from './BlockPlugin'
import {DEFAULTS_BLOCKLIST} from './HierarchyPlugin'
import {DEFAULTS_READ_ONLY} from './ReadOnlyPlugin'

export const options = {
  ...PARAGRAPH_OPTIONS,
  ...DEFAULTS_BLOCK,
  ...DEFAULTS_BLOCKLIST,
  ...DEFAULTS_TRANSCLUSION,
  ...DEFAULTS_READ_ONLY,
  //marks
  ...BOLD_OPTIONS,
  ...ITALIC_OPTIONS,
  ...CODE_OPTIONS,
  ...UNDERLINE_OPTIONS,
  ...STRIKETHROUGH_OPTIONS,
}
