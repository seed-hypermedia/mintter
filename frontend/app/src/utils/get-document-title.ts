import { EditorDocument } from "@app/editor/use-editor-draft";
import { Node } from "slate";

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

  if (titleText) {
    if (titleText.length < 50) {
      return titleText
    } else {
      return `${titleText.substring(0, 49)}...`
    }
  } else {
    return ""
  }
}