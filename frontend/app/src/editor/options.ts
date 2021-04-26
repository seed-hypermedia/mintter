import { DEFAULTS_BLOCK } from './block-plugin/defaults';
import { DEFAULTS_PARAGRAPH } from './elements/paragraph';
import { DEFAULTS_HEADINGS } from './heading-plugin/defaults';
import { DEFAULTS_BLOCKLIST } from './hierarchy-plugin/defaults';
import { DEFAULTS_LINK } from './link-plugin';
import { DEFAULTS_LIST } from './list-plugin/defaults';
import { BOLD_OPTIONS } from './marks/bold';
import { CODE_OPTIONS } from './marks/code';
import { ITALIC_OPTIONS } from './marks/italic';
import { STRIKETHROUGH_OPTIONS } from './marks/strikethrough';
import { UNDERLINE_OPTIONS } from './marks/underline';
import { DEFAULTS_READ_ONLY } from './readonly-plugin/defaults';

export const options = {
  ...DEFAULTS_PARAGRAPH,
  ...DEFAULTS_HEADINGS,
  ...DEFAULTS_BLOCK,
  ...DEFAULTS_BLOCKLIST,
  ...DEFAULTS_READ_ONLY,
  ...DEFAULTS_LIST,
  ...DEFAULTS_LINK,
  //marks
  ...BOLD_OPTIONS,
  ...ITALIC_OPTIONS,
  ...CODE_OPTIONS,
  ...UNDERLINE_OPTIONS,
  ...STRIKETHROUGH_OPTIONS,
};
