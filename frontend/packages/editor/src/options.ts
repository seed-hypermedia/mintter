import {
  PARAGRAPH_OPTIONS,
  HEADING_OPTIONS,
  BLOCKQUOTE_OPTIONS,
} from './elements'
import {BOLD_OPTIONS, ITALIC_OPTIONS} from './marks'

export const options = {
  ...PARAGRAPH_OPTIONS,
  ...HEADING_OPTIONS,
  ...BLOCKQUOTE_OPTIONS,
  //marks
  ...BOLD_OPTIONS,
  ...ITALIC_OPTIONS,
}
