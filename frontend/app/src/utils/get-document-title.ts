import { EditorDocument } from '@app/editor/use-editor-draft'
import { debug } from '@app/utils/logger'
import { Node } from 'slate'

export function getTitleFromContent(entry: {
  children: Array<EditorDocument['children']>
}): string {
  return Node.string(Node.get(entry, [0, 0, 0])) || ''
}

export function getDocumentTitle(document: any) {
  debug('getDocumentTitle: ', document)
  let titleText = document?.content
    ? getTitleFromContent({
      children: document.content,
    })
    : document?.title ?? ''

  return titleText
    ? titleText.length < 50
      ? titleText
      : `${titleText.substring(0, 49)}...`
    : 'Untitled Document'
}
