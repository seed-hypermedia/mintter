import type {Embed, Link as LinkType} from '@mintter/mttast'
import {isLink} from '@mintter/mttast'
import {embed, link, text} from '@mintter/mttast-builder'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {open} from '@tauri-apps/api/shell'
import isUrl from 'is-url'
import {FormEvent, PropsWithChildren, useEffect, useState} from 'react'
import type {BaseRange, BaseSelection, Range} from 'slate'
import {Editor, Element as SlateElement, Transforms} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useLocation} from 'wouter'
import {Tooltip} from '../../components/tooltip'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {getEmbedIds} from '../embed'
import type {UseLastSelectionResult} from '../hovering-toolbar'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'

export const ELEMENT_LINK = 'link'

const StyledLink = styled('span', {
  textDecoration: 'underline',
  display: 'inline',
  color: '$text-default',
  width: 'auto',
  wordBreak: 'break-all',
  '&:hover': {
    cursor: 'pointer',
  },
})

export const Link = ({element, ...props}: PropsWithChildren<{element: LinkType}>) => {
  const [, setLocation] = useLocation()

  async function handleClick() {
    if (isMintterLink(element.url)) {
      const [pubId, version] = getEmbedIds(element.url)
      setLocation(`/p/${pubId}/${version}`)
    } else {
      open(element.url)
    }
  }

  return <StyledLink onClick={handleClick} {...props} />
}

Link.displayName = 'Link'

export const createLinkPlugin = (): EditorPlugin => ({
  name: ELEMENT_LINK,
  renderElement:
    () =>
    ({attributes, children, element}) => {
      if (isLink(element)) {
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
            <Link element={element} {...attributes}>
              {children}
            </Link>
          </Tooltip>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    /**
     * - when should I create a link:
     *   - paste a link text format
     *   - write a link text
     *   - by selecting and interacting with the toolbar (not in here)
     */
    const {isInline, insertText, insertData} = editor

    editor.isInline = (element) => isLink(element) || isInline(element)

    editor.insertText = (text: string) => {
      if (text && isUrl(text)) {
        wrapLink(editor, text)
      } else {
        insertText(text)
      }
    }

    editor.insertData = (data: DataTransfer) => {
      const text = data.getData('text/plain')

      if (text && isMintterLink(text)) {
        wrapMintterLink(editor, text)
      } else if (text && isUrl(text)) {
        wrapLink(editor, text)
      } else {
        insertData(data)
      }
    }

    return editor
  },
})

export interface InsertLinkOptions {
  url: string
  selection: BaseRange | null
  wrap: boolean
}

export function insertLink(editor: Editor, {url, selection = editor.selection, wrap = false}: InsertLinkOptions): void {
  console.log('insertLink: ', url, selection, wrap)

  /*
   * @todo Refactor wrapLink
   * @body this code below is the same as the `wrapLink` implementation just that here we are passing the current selection. I tried to refactor it but got errors.
   *
   * Either you can paste a link at it will wrap it in a link component or create a link from the link modal. both does not wotk if you use wrapLink here.
   */
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  if (!selection) {
    return
  }

  const newLink: LinkType = link({url}, isCollapsed(selection) ? [text(url)] : [])

  if (isCollapsed(selection)) {
    Transforms.insertNodes(editor, newLink, {at: selection})
  } else {
    Transforms.wrapNodes(editor, newLink, {at: selection, split: true})
    Transforms.collapse(editor, {edge: 'end'})
  }
}

export function isLinkActive(editor: Editor, selection: BaseSelection = editor.selection): boolean {
  if (!selection) return false

  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type == ELEMENT_LINK,
    at: selection,
  })

  return !!link
}

export function unwrapLink(editor: Editor, selection: Range | null = editor.selection): void {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type == ELEMENT_LINK,
    at: selection ?? undefined,
  })
}

export function wrapLink(editor: Editor, url: string, selection: Range | null = editor.selection): void {
  if (isLinkActive(editor)) {
    unwrapLink(editor, selection)
  }

  const newLink: LinkType = link({url}, isCollapsed(selection!) ? [text(url)] : [])

  if (isCollapsed(selection!)) {
    Transforms.insertNodes(editor, newLink, {at: selection ?? undefined})
  } else {
    Transforms.wrapNodes(editor, newLink, {split: true, at: selection ?? undefined})
    Transforms.collapse(editor, {edge: 'end'})
  }
}

export function isValidUrl(entry: string): boolean {
  const urlRegex = new RegExp(
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/,
  )
  return urlRegex.test(entry)
}

function isMintterLink(text: string) {
  return text.includes(MINTTER_LINK_PREFIX)
}

function wrapMintterLink(editor: Editor, url: string) {
  const {selection} = editor

  const newEmbed: Embed = embed({url}, [text('')])
  // const newLink: LinkType = link({url}, isCollapsed(selection!) ? [text(url)] : [])

  if (isCollapsed(selection!)) {
    Transforms.insertNodes(editor, newEmbed)
  } else {
    wrapLink(editor, url)
  }
}

export interface ToolbarLinkProps extends UseLastSelectionResult {
  sendStoreFocus: (n: boolean) => void
}

export function ToolbarLink({sendStoreFocus, resetSelection, lastSelection}: ToolbarLinkProps) {
  const [open, setOpen] = useState(false)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="1"
          color="muted"
          onClick={() => {
            setOpen((v) => {
              sendStoreFocus(!v)
              return !v
            })
            resetSelection()
          }}
        >
          <Icon name="Link" />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Content>
        <LinkModal
          lastSelection={lastSelection}
          close={() => {
            setOpen(false)
            resetSelection()
          }}
        />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}

export interface LinkModalProps {
  lastSelection: Range | null
  close: () => void
}
export function LinkModal({close, lastSelection}: LinkModalProps) {
  const [link, setLink] = useState('')
  const editor = useSlateStatic()
  const isLink = isLinkActive(editor)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) return
    if (link && (isUrl(link) || isMintterLink(link))) {
      ReactEditor.focus(editor)
      setTimeout(() => {
        Transforms.setSelection(editor, lastSelection!)
        insertLink(editor, {url: link, selection: lastSelection, wrap: true})
      }, 0)
    }

    close()
  }

  function handleRemove() {
    if (isLinkActive(editor, lastSelection)) {
      console.log('remove link!', editor)
      unwrapLink(editor, lastSelection)
    }
    close()
  }

  useEffect(() => {
    if (!editor) return
    const linkEntry = Editor.above<LinkType>(editor, {
      /* eslint-disable */
      match: (n: any) => n.type == ELEMENT_LINK,
    })
    if (!linkEntry) return
    let link = linkEntry[0].url as string
    setLink(link)
  }, [editor])

  return (
    <Box
      css={{
        padding: '$5',
        width: '300px',
        backgroundColor: '$background-muted',
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
        boxShadow: '$3',
      }}
    >
      <Box
        as="form"
        onSubmit={handleSubmit}
        css={{
          width: '$full',
          display: 'flex',
          flexDirection: 'column',
          gap: '$5',
        }}
      >
        <Text size="5">Link Information</Text>
        <TextField
          type="url"
          id="address"
          name="address"
          label="Link Address"
          value={link}
          onChange={(e) => setLink(e.currentTarget.value)}
          size={1}
        />
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button size="1" type="submit">
            save
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              handleRemove()
            }}
            disabled={isLink}
            variant="outlined"
            color="danger"
            size="1"
          >
            <span>remove link</span>
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
