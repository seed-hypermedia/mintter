import { EditorDocument } from '@app/draft-machine'
import { GroupingContent } from '@mintter/shared'
import { Node } from 'slate'

export function getTitleFromContent(entry: { children: Array<GroupingContent> }): string {
  // @ts-ignore
  return Node.string(Node.get(entry, [0, 0, 0])) || ''
}

export function getDocumentTitle(document?: EditorDocument) {
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
