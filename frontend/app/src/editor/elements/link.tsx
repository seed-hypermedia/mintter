import {isLink} from '@mintter/mttast'
import type {Link as LinkType} from '@mintter/mttast'
import isUrl from 'is-url'
import {styled} from '@mintter/ui/stitches.config'
import {link, text} from '@mintter/mttast-builder'
import {Editor, Element as SlateElement, Transforms} from 'slate'
import type {BaseEditor} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'
import {forwardRef} from 'react'
import {Tooltip} from '../../components/tooltip'
import {Box} from '@mintter/ui/box'
import {Icon} from '@mintter/ui/icon'

export const ELEMENT_LINK = 'link'

const StyledLink = styled('a', {
  textDecoration: 'underline',
  display: 'inline',
  color: '$text-default',
  width: 'auto',
  wordBreak: 'break-all',
  '&:hover': {
    cursor: 'pointer',
  },
})

export const Link = forwardRef((props, ref) => {
  return <StyledLink ref={ref} {...props} />
})

export const createLinkPlugin = (): EditorPlugin => ({
  name: ELEMENT_LINK,
  renderElement({attributes, children, element}) {
    if (element.type === ELEMENT_LINK) {
      return (
        <Tooltip
          content={
            <Box
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: '$2',
              }}
            >
              {element.url}
              <Icon size="1" name="ExternalLink" color="opposite" />
            </Box>
          }
        >
          <Link href={element.url} onClick={() => window.open(element.url as string, '_blank')} {...attributes}>
            {children}
          </Link>
        </Tooltip>
      )
    }
  },
  configureEditor(editor) {
    /**
     * - when should I create a link:
     *   - paste a link text format
     *   - write a link text
     *   - by selecting and interacting with the toolbar (not in here)
     */
    const {isInline, insertText, insertData} = editor

    editor.isInline = (element) => {
      return isLink(element) ? true : isInline(element)
    }

    editor.insertText = (text: string) => {
      if (text && isUrl(text)) {
        wrapLink(editor, text)
      } else {
        insertText(text)
      }
    }

    editor.insertData = (data) => {
      const text = data.getData('text/plain')

      if (text && isUrl(text)) {
        wrapLink(editor, text)
      } else {
        insertData(data)
      }
    }

    return editor
  },
})

export function insertLink(editor: BaseEditor & ReactEditor, url: string): void {
  if (editor.selection) {
    wrapLink(editor, url)
  }
}

export function isLinkActive(editor: BaseEditor & ReactEditor): boolean {
  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type == ELEMENT_LINK,
  })

  return !!link
}

export function unwrapLink(editor: BaseEditor & ReactEditor): void {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type == ELEMENT_LINK,
  })
}

export function wrapLink(editor: BaseEditor & ReactEditor, url: string): void {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  const {selection} = editor
  const newLink: LinkType = link({url}, isCollapsed(selection) ? [text(url)] : [])

  if (isCollapsed(selection)) {
    Transforms.insertNodes(editor, newLink)
  } else {
    Transforms.wrapNodes(editor, newLink, {split: true})
    Transforms.collapse(editor, {edge: 'end'})
  }
}
