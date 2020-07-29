import {Editor} from 'slate'
import {isCollapsed} from '@udecode/slate-plugins'

export const onKeyDownHelper = () => (e: KeyboardEvent, editor: Editor) => {
  if (e.key === '/') {
    if (editor.selection && isCollapsed(editor.selection)) {
      console.log('--- Helper trigger!!')
    }
  }
}
