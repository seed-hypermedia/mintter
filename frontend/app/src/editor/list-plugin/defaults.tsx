import {DEFAULTS_PARAGRAPH, Paragraph} from '../elements/paragraph'
// import {ListKeyOption, ListPluginOptionsValues} from '@udecode/slate-plugins'
import {ELEMENT_BLOCK_LIST} from '../hierarchy-plugin/defaults'
import {BlockList} from '../hierarchy-plugin/components/blocklist'
// import {ELEMENT_BLOCK} from '../BlockPlugin/defaults'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'

// export const ELEMENT_UL = 'ul'
// export const ELEMENT_OL = 'ol'
// export const ELEMENT_LI = 'li'

// export const DEFAULTS_LIST: Record<ListKeyOption, ListPluginOptionsValues> = {
export const DEFAULTS_LIST = {
  ul: {
    component: BlockList,
    type: ELEMENT_BLOCK_LIST,
    rootProps: {
      as: 'div',
    },
  },
  ol: {
    component: BlockList,
    type: ELEMENT_BLOCK_LIST,
    rootProps: {
      as: 'div',
    },
  },
  li: {
    component: Paragraph,
    type: ELEMENT_PARAGRAPH,
    rootProps: {
      className: 'LIST_ITEM',
      as: 'p',
    },
  },
  ...DEFAULTS_PARAGRAPH,
}
