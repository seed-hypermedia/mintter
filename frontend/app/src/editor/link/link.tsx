import {mainService as defaultMainService} from '@app/app-providers'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {styled} from '@app/stitches.config'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {debug} from '@app/utils/logger'
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
import {isKeyHotkey} from 'is-hotkey'
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
import {getEditorBlock, isCollapsed} from '../utils'

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

type LinkProps = Omit<RenderElementProps, 'element'> & {
  element: LinkType
  mainService?: typeof defaultMainService
}

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
  let mainService = props.mainService ?? defaultMainService
  const [docId, version, blockId] = getIdsfromUrl(props.element.url)

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    let isShiftKey = event.shiftKey
    event.preventDefault()
    if (isShiftKey) {
      mainService.send({type: 'GO.TO.PUBLICATION', docId, version, blockId})
    } else {
      mainService.send({
        type: 'COMMIT.OPEN.WINDOW',
        path: `/p/${docId}/${version}/${blockId}`,
      })
    }
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
  onKeyDown(editor) {
    return (event) => {
      const {selection} = editor

      // Default left/right behavior is unit:'character'.
      // This fails to distinguish between two cursor positions, such as
      // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
      // Here we modify the behavior to unit:'offset'.
      // This lets the user step into and out of the inline without stepping over characters.
      // You may wish to customize this further to only use unit:'offset' in specific cases.
      if (selection && Range.isCollapsed(selection)) {
        const {nativeEvent} = event
        if (isKeyHotkey('left', nativeEvent)) {
          event.preventDefault()
          Transforms.move(editor, {unit: 'offset', reverse: true})
          return
        }
        if (isKeyHotkey('right', nativeEvent)) {
          event.preventDefault()
          Transforms.move(editor, {unit: 'offset'})
          return
        }
      }
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
        if (hasBlockId(text)) {
          wrapMintterLink(editor, text)
        } else {
          // TODO: add the document title to this link
          wrapLink(editor, text)
        }
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
    Transforms.collapse(editor, {edge: 'end'})
  }
  let nextPath = Path.next(selection.focus.path)
  Transforms.insertNodes(editor, text(''), {
    at: nextPath,
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
    // Editor.withoutNormalizing(editor, () => {
    Transforms.insertNodes(editor, [newLink, text('')])
    // Transforms.insertNodes(editor, , {at: selection ?? undefined})
    // })
  } else {
    Editor.withoutNormalizing(editor, () => {
      Transforms.wrapNodes(editor, newLink, {
        split: true,
        at: selection ?? undefined,
      })

      Transforms.collapse(editor, {edge: 'end'})
      Transforms.move(editor, {distance: 1, unit: 'offset'})
    })
  }
}

export function isValidUrl(entry: string): boolean {
  const urlRegex = new RegExp(
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\\w]*))?)/,
  )
  return urlRegex.test(entry)
}

function isMintterLink(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
}

function hasBlockId(text: string) {
  let [, , blockId] = getIdsfromUrl(text)

  return !!blockId
}

function wrapMintterLink(editor: Editor, url: string) {
  const {selection} = editor

  if (isCollapsed(selection!)) {
    debug('wrapMintterLink: COLLAPSED', selection)
    const newEmbed: Embed = embed({url}, [text('')])
    Transforms.insertNodes(editor, newEmbed)
    Transforms.move(editor, {distance: 1, unit: 'offset'})
  } else {
    debug('wrapMintterLink: NOT COLLAPSED', selection)
    wrapLink(editor, url)
    // Transforms.move(editor, {distance: 1, unit: 'offset'})
  }
}

function addLinkChange(editor: Editor, at: Range | null = editor.selection) {
  let blockEntry = getEditorBlock(editor, {
    //@ts-ignore
    at,
  })
  if (blockEntry) {
    let [node] = blockEntry
    MintterEditor.addChange(editor, ['replaceBlock', node.id])
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
      insertLink(editor, {url: link, selection: lastSelection, wrap: true})
      Transforms.move(editor, {
        distance: 1,
        unit: 'offset',
      })
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
