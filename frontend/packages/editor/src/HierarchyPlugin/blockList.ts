import {BlockList} from './components/blockList'

export const ELEMENT_BLOCK_LIST = 'block_list'

export const BLOCK_LIST_OPTIONS = {
  block_list: {
    type: ELEMENT_BLOCK_LIST,
    component: BlockList,
    rootProps: {
      as: 'div',
    },
  },
}
