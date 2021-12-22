import {EditorPlugin} from 'frontend/app/src/editor'
import {EditorMode} from 'frontend/app/src/editor/plugin-utils'

export const ELEMENT_DISCUSSION_BLOCK = 'discussionBlock'

export function createDiscussionBlock(): EditorPlugin {
  return {
    name: ELEMENT_DISCUSSION_BLOCK,
    apply: EditorMode.Discussion,
    renderElement:
      (editor) =>
      ({attributes, element, children}) => {
        if (element.type == ELEMENT_DISCUSSION_BLOCK) {
          return null
        }
      },
  }
}
