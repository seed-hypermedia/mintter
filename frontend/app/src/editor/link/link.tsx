import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {queryKeys} from '@app/hooks'
import {useMain} from '@app/main-context'
import {useMouse} from '@app/mouse-context'
import type {Embed, Link as LinkType} from '@mintter/shared'
import {embed, isLink, link, text, getPublication} from '@mintter/shared'
import {getIdsfromUrl} from '@app/utils/get-ids-from-url'
import {isMintterLink} from '@app/utils/is-mintter-link'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {useLocation, useRoute} from '@components/router'
import {TextField} from '@components/text-field'
import {Tooltip} from '@components/tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {useQuery} from '@tanstack/react-query'
import {open} from '@tauri-apps/api/shell'
import {isKeyHotkey} from 'is-hotkey'
import {ForwardedRef, forwardRef, MouseEvent, useEffect, useState} from 'react'
import {
  BaseRange,
  BaseSelection,
  Editor,
  Element as SlateElement,
  Path,
  Range,
  Transforms,
} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useSlate,
  useSlateStatic,
} from 'slate-react'
import type {EditorPlugin} from '../types'
import {findPath, getEditorBlock, isCollapsed} from '../utils'

export const ELEMENT_LINK = 'link'

export const createLinkPlugin = (): EditorPlugin => ({
  name: ELEMENT_LINK,
  renderElement:
    ({mode}) =>
    ({children, attributes, element}) => {
      if (isLink(element)) {
        if (element.data?.void) {
          return (
            <MintterDocumentLink
              attributes={attributes}
              element={element}
              mode={mode}
            >
              {children}
            </MintterDocumentLink>
          )
        }

        return (
          <Link attributes={attributes} element={element} mode={mode}>
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
    /**
     * - when should I create a link:
     *   - paste a link text format
     *   - write a link text
     *   - by selecting and interacting with the toolbar (not in here)
     */
    const {isInline, insertText, insertData, isVoid} = editor

    editor.isVoid = (element) => element.data?.void || isVoid(element)
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
      if (text) {
        if (isMintterLink(text)) {
          if (hasBlockId(text)) {
            wrapMintterLink(editor, text)
          } else {
            insertDocumentLink(editor, text)
          }
        } else if (isUrl(text)) {
          wrapLink(editor, text)
        }
      } else {
        insertData(data)
      }
    }

    return editor
  },
})

function insertDocumentLink(editor: Editor, url: string) {
  let {selection} = editor
  if (isCollapsed(selection)) {
    Transforms.insertNodes(editor, [
      // we are setting the `void` data attribute to true as a temporary value in order to fetch for the document title and convert it to a normal link
      link({url, data: {void: true}}, [text('')]),
      text(''),
    ])
  } else {
    wrapLink(editor, url)
    Transforms.insertNodes(editor, text(''))
  }
}

type LinkProps = Omit<RenderElementProps, 'element'> & {
  element: LinkType
  mode: EditorMode
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
  const [, setLocation] = useLocation()
  const mainService = useMain()
  let mouseService = useMouse()
  let [match, params] = useRoute('/p/:id/:version/:block')
  const [docId, version, blockId] = getIdsfromUrl(props.element.url)

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    let isShiftKey = event.shiftKey || event.metaKey
    event.preventDefault()
    if (isShiftKey) {
      setLocation(`/p/${docId}/${version}/${blockId}`)
    } else {
      if (match && params?.id == docId && params?.version == version) {
        setLocation(`/p/${docId}/${version}/${blockId}`, {replace: true})
      } else {
        mainService.send({
          type: 'COMMIT.OPEN.WINDOW',
          path: `/p/${docId}/${version}/${blockId}`,
        })
      }
    }
  }

  function mouseEnter() {
    mouseService.send({
      type: 'HIGHLIGHT.ENTER',
      ref: blockId ? `${docId}/${blockId}` : docId,
    })
  }

  function mouseLeave() {
    mouseService.send('HIGHLIGHT.LEAVE')
  }

  return (
    <a
      ref={ref}
      {...props}
      onClick={onClick}
      onMouseEnter={mouseEnter}
      onMouseLeave={mouseLeave}
      data-highlight={blockId ? `${docId}/${blockId}` : docId}
      data-reference={props.element.url}
    />
  )
}

function RenderWebLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (props.mode == EditorMode.Embed || props.mode == EditorMode.Discussion)
      return
    open(props.element.url)
  }

  return (
    <Tooltip
      content={
        <span>
          {props.element.url}
          <Icon size="1" name="ExternalLink" color="opposite" />
        </span>
      }
    >
      <a ref={ref} onClick={onClick} {...props} />
    </Tooltip>
  )
}

export const Link = forwardRef(renderLink)

Link.displayName = 'Link'

function MintterDocumentLink({element, attributes}: LinkProps) {
  let editor = useSlateStatic()
  let at = findPath(element)
  let [docId, version] = getIdsfromUrl(element.url)
  let {data} = useQuery([queryKeys.GET_PUBLICATION, docId, version], () =>
    getPublication(docId, version),
  )
  useEffect(() => {
    if (data) {
      Editor.withoutNormalizing(editor, () => {
        Transforms.insertNodes(
          editor,
          link({url: element.url}, [text(data.document?.title || element.url)]),
          {at},
        )
        Transforms.removeNodes(editor, {at: Path.next(at)})
      })
    }
  }, [data, element, at, editor])

  return (
    <span contentEditable={false} {...attributes}>
      ...
    </span>
  )
}

export interface InsertLinkOptions {
  url: string
  selection: BaseRange | null
  wrap: boolean
}

export function insertLink(
  editor: Editor,
  {url, selection = editor.selection}: InsertLinkOptions,
): void {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  if (!selection) {
    return
  }

  const newLink = link({url}, isCollapsed(selection) ? [text(url)] : [])

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
    isCollapsed(selection) ? [text(url)] : [],
  )

  if (isCollapsed(selection)) {
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

function hasBlockId(text: string) {
  let [, , blockId] = getIdsfromUrl(text)

  return !!blockId
}

function wrapMintterLink(editor: Editor, url: string) {
  const {selection} = editor

  if (isCollapsed(selection)) {
    const newEmbed: Embed = embed({url}, [text('')])
    Transforms.insertNodes(editor, newEmbed)
    addLinkChange(editor, selection)
    Transforms.move(editor, {distance: 1, unit: 'offset'})
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
    MintterEditor.addChange(editor, ['replaceBlock', node.id])
  }
}

function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch (_e) {
    return false
  }
}

export function InsertLinkButton() {
  const [link, setLink] = useState('')
  const editor = useSlate()
  const isLink = isLinkActive(editor)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) return
    if (link && (isUrl(link) || isMintterLink(link))) {
      ReactEditor.focus(editor)
      insertLink(editor, {url: link, selection: editor.selection, wrap: true})
      Transforms.move(editor, {
        distance: 1,
        unit: 'offset',
      })
    }

    close()
  }

  function handleRemove() {
    if (isLinkActive(editor, editor.selection)) {
      unwrapLink(editor, editor.selection)
    }
    close()
  }

  useEffect(() => {
    if (!editor) return
    const linkEntry = Editor.above<LinkType>(editor, {
      // eslint-disable-next-line
      match: (n: any) => n.type == ELEMENT_LINK,
    })
    if (!linkEntry) return
    let link = linkEntry[0].url as string
    setLink(link)
  }, [editor])

  return (
    // <Tooltip content={<span>Add Link</span>}>
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="0"
          color="muted"
          data-testid="toolbar-link-button"
        >
          <Icon name="Link" size="2" />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content sideOffset={35}>
          <Box
            css={{
              zIndex: '$max',
              boxShadow: '$menu',
              backgroundColor: '$base-background-normal',
              borderRadius: '2px',
              transition: 'opacity 0.5s',
              display: 'flex',
              gap: '$2',
              paddingHorizontal: '$2',
              padding: '$5',
              width: '300px',
              flexDirection: 'column',
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
              <TextField
                type="url"
                id="address"
                name="address"
                label="Link Address"
                data-testid="modal-link-input"
                autoCorrect="off"
                size={1}
                value={link}
                onChange={(e) => setLink(e.currentTarget.value)}
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
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
    // </Tooltip>
  )
}
