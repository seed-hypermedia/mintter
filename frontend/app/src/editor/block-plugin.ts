import {EditorPlugin} from '.'
import {copy, cut, paste} from './menu'

export const createBlockPlugin = (): EditorPlugin => ({
  name: 'common block logic',
  menu: (editor) => () => {
    return [cut(), copy(), paste()]
  },
})
