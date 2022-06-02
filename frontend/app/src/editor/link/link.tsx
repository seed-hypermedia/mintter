import {MINTTER_LINK_PREFIX} from '@app/constants'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {getEditorBlock} from '@app/editor/utils'
import {useMainPage} from '@app/main-page-context'
import {styled} from '@app/stitches.config'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {Tooltip} from '@components/tooltip'
import type {Embed, Link as LinkType} from '@mintter/mttast'
import {embed, isLink, link, text} from '@mintter/mttast'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {open} from '@tauri-apps/api/shell'
import isUrl from 'is-url'
import {
  FormEvent,
  ForwardedRef,
  forwardRef,
  MouseEvent,
  useEffect,
  useState,
} from 'react'
import {
  BaseRange,
  BaseSelection,
  Editor,
  Element as SlateElement,
  Path,
  Range,
  Transforms,
} from 'slate'
import {ReactEditor, RenderElementProps, useSlateStatic} from 'slate-react'
import type {UseLastSelectionResult} from '../editor-hovering-toolbar'
import type {EditorPlugin} from '../types'
import {isCollapsed} from '../utils'

export const ELEMENT_LINK = 'link'

const StyledLink = styled('span', {
  textDecoration: 'underline',
  appearance: 'none',
  display: 'inline',
  color: '$base-text-hight',
  width: 'auto',
  wordBreak: 'break-all',
  '&:hover': {
    cursor: 'pointer',
  },
})

type LinkProps = Omit<RenderElementProps, 'element'> & {element: LinkType}

function renderLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  return isMintterLink(props.element.url) ? (
    <MintterLink ref={ref} {...props} />
  ) : (
    <WebLink ref={ref} {...props} />
  )
}

const MintterLink = forwardRef(RenderMintterLink)
const WebLink = forwardRef(RenderWebLink)

function RenderMintterLink(
  props: LinkProps,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  const mainpageService = useMainPage()

  const [docId, version, blockId] = getIdsfromUrl(props.element.url)

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    // debug('\n\n === MINTTER LINK CLICKED', {docId, version, blockId})
    // mainpageService.send({type: 'goToPublication', docId, version, blockId})
  }

  return <StyledLink ref={ref} {...props} onClick={onClick} />
}

function RenderWebLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()

    open(props.element.url)
  }

  return (
    <Tooltip
      content={
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
            fontFamily: '$base',
          }}
        >
          {props.element.url}
          <Icon size="1" name="ExternalLink" color="opposite" />
        </Box>
      }
    >
      <StyledLink ref={ref} onClick={onClick} {...props} />
    </Tooltip>
  )
}

export const Link = forwardRef(renderLink)

Link.displayName = 'Link'

export const createLinkPlugin = (): EditorPlugin => ({
  name: ELEMENT_LINK,
  renderElement:
    () =>
    ({children, attributes, element}) => {
      if (isLink(element)) {
        return (
          <Link attributes={attributes} element={element}>
            {children}
          </Link>
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

export function insertLink(
  editor: Editor,
  {url, selection = editor.selection, wrap = false}: InsertLinkOptions,
): void {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  if (!selection) {
    return
  }

  const newLink: LinkType = link(
    {url},
    isCollapsed(selection) ? [text(url)] : [],
  )

  if (isCollapsed(selection)) {
    Transforms.insertNodes(editor, newLink, {at: selection})
  } else {
    Transforms.wrapNodes(editor, newLink, {at: selection, split: true})
    // Transforms.collapse(editor, {edge: 'end'})
  }
  Transforms.insertNodes(editor, text(''), {
    at: Path.next(selection.focus.path),
  })

  addLinkChange(editor, selection)
}

export function isLinkActive(
  editor: Editor,
  selection: BaseSelection = editor.selection,
): boolean {
  if (!selection) return false

  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type == ELEMENT_LINK,
    at: selection,
  })

  return !!link
}

export function unwrapLink(
  editor: Editor,
  selection: Range | null = editor.selection,
): void {
  addLinkChange(editor, selection)
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type == ELEMENT_LINK,
    at: selection ?? undefined,
  })
  Transforms.collapse(editor, {edge: 'end'})
}

export function wrapLink(
  editor: Editor,
  url: string,
  selection: Range | null = editor.selection,
): void {
  if (isLinkActive(editor)) {
    unwrapLink(editor, selection)
  } else {
    addLinkChange(editor, selection)
  }

  const newLink: LinkType = link(
    {url},
    isCollapsed(selection!) ? [text(url)] : [],
  )

  if (isCollapsed(selection!)) {
    Transforms.insertNodes(editor, newLink, {at: selection ?? undefined})
  } else {
    Transforms.wrapNodes(editor, newLink, {
      split: true,
      at: selection ?? undefined,
    })
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

  if (isCollapsed(selection!)) {
    Transforms.insertNodes(editor, newEmbed)
    addLinkChange(editor)
  } else {
    wrapLink(editor, url)
  }
}

function addLinkChange(editor: Editor, at: Range | null = editor.selection) {
  let blockEntry = getEditorBlock(editor, {
    //@ts-ignore
    at,
  })
  if (blockEntry) {
    let [node] = blockEntry
    changesService.addChange(['replaceBlock', node.id])
  }
}

export interface ToolbarLinkProps extends UseLastSelectionResult {
  sendStoreFocus: (n: boolean) => void
}

export function ToolbarLink({
  sendStoreFocus,
  resetSelection,
  lastSelection,
}: ToolbarLinkProps) {
  const [open, setOpen] = useState(false)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="1"
          color="muted"
          data-testid="toolbar-link-button"
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
        backgroundColor: '$base-component-bg-normal',
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
          data-testid="modal-link-input"
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
            data-testid="modal-link-remove-button"
            disabled={!isLink}
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
