import {Transforms, Editor, Range} from 'slate'
import {ReactEditor} from 'slate-react'
import isUrl from 'is-url'

export default function withLinks<T extends Editor>(
  editor: T,
): Editor & ReactEditor {
  const e = editor as T & ReactEditor

  const {insertData, insertText, isInline} = e

  e.isInline = element => {
    return element.type === 'link' ? true : isInline(element)
  }

  e.insertText = text => {
    if (text && isUrl(text)) {
      wrapLink(e, text)
    } else {
      insertText(text)
    }
  }

  e.insertData = data => {
    const text = data.getData('text/plain')

    if (text && isUrl(text)) {
      wrapLink(e, text)
      return
    }

    insertData(data)
  }

  return e
}

export const insertLink = (editor: ReactEditor, url: string): void => {
  if (editor.selection) {
    wrapLink(editor, url)
  }

  return
}

export const isLinkActive = (editor: ReactEditor): boolean => {
  const [link] = Array.from(
    Editor.nodes(editor, {match: n => n.type === 'link'}),
  )
  return !!link
}

export const unwrapLink = (editor: ReactEditor): void => {
  Transforms.unwrapNodes(editor, {match: n => n.type === 'link'})
}

export const wrapLink = (editor: ReactEditor, url: string): void => {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  const {selection} = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link = {
    type: 'link',
    url,
    children: isCollapsed ? [{text: url}] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, link)
  } else {
    Transforms.wrapNodes(editor, link, {split: true})
    Transforms.collapse(editor, {edge: 'end'})
  }
}
