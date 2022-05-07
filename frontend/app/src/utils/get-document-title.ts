import { EditorDocument } from "@app/editor/use-editor-draft"
import { Node } from "slate"

export function getTitleFromContent(entry: {
  children: Array<EditorDocument['children']>
}): string {
  return Node.string(Node.get(entry, [0, 0, 0])) || ''
}


export function getDocumentTitle(document: any) {
  let titleText = document?.content
    ? getTitleFromContent({
      children: document.content,
    })
    : document?.title ?? ''

  return titleText.length < 50 ? titleText : `${titleText.substring(0, 49)}...`
}