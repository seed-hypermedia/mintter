import {DEFAULTS_PARAGRAPH} from './elements'
import {
  BOLD_OPTIONS,
  ITALIC_OPTIONS,
  CODE_OPTIONS,
  UNDERLINE_OPTIONS,
  STRIKETHROUGH_OPTIONS,
} from './marks'
import {DEFAULTS_HEADINGS} from './HeadingPlugin/defaults'
import {DEFAULTS_TRANSCLUSION} from './TransclusionPlugin/defaults'
import {DEFAULTS_BLOCK} from './block-plugin/defaults'
import {DEFAULTS_BLOCKLIST} from './HierarchyPlugin/defaults'
import {DEFAULTS_READ_ONLY} from './ReadOnlyPlugin/defaults'
import {DEFAULTS_LIST} from './ListPlugin/defaults'

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
