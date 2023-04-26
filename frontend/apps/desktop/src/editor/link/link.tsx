import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {usePublication} from '@app/models/documents'
import {useWebLink} from '@app/models/web-links'
import {useMouse} from '@app/mouse-context'
import {isMintterLink} from '@app/utils/is-mintter-link'
import {PublicationRoute, useNavigate, useNavRoute} from '@app/utils/navigation'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import { useFloating } from '@floating-ui/react-dom'
import {
  Embed,
  embed,
  getIdsfromUrl,
  isLink,
  link,
  Link as LinkType,
  MINTTER_LINK_PREFIX,
  text,
} from '@mintter/shared'
import {Fieldset, Input, Label} from '@mintter/ui'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {Text} from '@tamagui/web'
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
  useFocused,
  useSelected,
  useSlate,
  useSlateSelection,
  useSlateStatic,
} from 'slate-react'
import type {EditorPlugin} from '../types'
import {findPath, getEditorBlock, getSelectedNodes, isCollapsed, NodeRef} from '../utils'

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

    //@ts-ignore
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
  hintPureWebLink?: boolean
  mintterLink?: {
    documentId: string
    version?: string
    blockRef?: string
  }
}

function renderLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  const linkQuery = useWebLink(
    props.element.url,
    props.mode == EditorMode.Draft,
  )
  const {url} = props.element
  let editor = useSlateStatic()

  useEffect(() => {
    if (props.mode !== EditorMode.Draft) return
    if (!linkQuery.data) return
    if (isMintterLink(url)) return
    let at = findPath(props.element)
    const {documentId, documentVersion, documentTitle} = linkQuery.data
    const title = documentTitle || url
    let outputMintterUrl = `${MINTTER_LINK_PREFIX}${documentId}`
    if (documentVersion) {
      outputMintterUrl += `?v=${documentVersion}`
    }
    Editor.withoutNormalizing(editor, () => {
      Transforms.insertNodes(
        editor,
        link({url: outputMintterUrl}, [text(title)]),
        {at},
      )
      Transforms.removeNodes(editor, {at: Path.next(at)})
    })
  }, [linkQuery.data, url, props.mode])

  if (isMintterLink(url)) {
    const [docId, version, blockId] = getIdsfromUrl(url)
    return (
      <MintterLink
        ref={ref}
        {...props}
        mintterLink={{
          documentId: docId,
          version,
          blockRef: blockId,
        }}
      />
    )
  }
  if (linkQuery.isLoading) {
    return <WebLink ref={ref} {...props} />
  }
  if (linkQuery.data?.documentId) {
    return (
      <MintterLink
        ref={ref}
        {...props}
        mintterLink={{
          documentId: linkQuery.data?.documentId,
          version: linkQuery.data?.documentVersion || undefined,
        }}
      />
    )
  }
  return <WebLink hintPureWebLink ref={ref} {...props} />
}

const MintterLink = forwardRef(RenderMintterLink)
const WebLink = forwardRef(RenderWebLink)

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
const InlineChromiumBugfix = () => null
// (
//   <Text tag="span" contentEditable={false} fontSize={0} display="inline">
//     {String.fromCodePoint(160) /* Non-breaking space */}
//   </Text>
// )

function RenderMintterLink(
  props: LinkProps,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  const navigate = useNavigate()
  const spawn = useNavigate()
  const navigateReplace = useNavigate('replace')

  let mouseService = useMouse()
  const route = useNavRoute()

  const {mintterLink, attributes, ...linkProps} = props

  if (!mintterLink) return null

  const {documentId, version, blockRef} = mintterLink

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    let isShiftKey = event.shiftKey || event.metaKey
    event.preventDefault()
    const destRoute: PublicationRoute = {
      key: 'publication',
      documentId,
      versionId: version,
      blockId: blockRef,
    }
    if (isShiftKey) {
      navigate(destRoute)
    } else {
      if (
        route.key === 'publication' &&
        route.documentId === documentId &&
        route?.versionId === version
      ) {
        navigateReplace(destRoute)
      } else {
        spawn(destRoute)
      }
    }
  }

  function mouseEnter() {
    mouseService.send({
      type: 'HIGHLIGHT.ENTER',
      ref: blockRef ? `${documentId}/${blockRef}` : documentId,
    })
  }

  function mouseLeave() {
    mouseService.send('HIGHLIGHT.LEAVE')
  }

  return (
    <>
      <InlineChromiumBugfix />
      <Text
        {...attributes}
        tag="a"
        fontFamily="inherit"
        letterSpacing="inherit"
        href={props.element.url}
        // color={'#0E868E'}
        // color="$blue"
        // @ts-ignore not sure what the Text ref is..
        ref={ref}
        {...linkProps}
        onClick={onClick}
        display="inline"
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
        data-highlight={blockRef ? `${documentId}/${blockRef}` : documentId}
        data-reference={props.element.url}
      />
      <InlineChromiumBugfix />
    </>
  )
}

function RenderWebLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (
      props.mode == EditorMode.Embed ||
      props.mode == EditorMode.Discussion ||
      props.mode == EditorMode.Draft
    )
      return
    open(props.element.url)
  }

  return (
    <Tooltip
      inline
      content={
        <span>
          {props.element.url}
          <Icon size="1" name="ExternalLink" color="opposite" />
        </span>
      }
    >
      <>
        <InlineChromiumBugfix />
        <Text
          tag="a"
          fontFamily="inherit"
          letterSpacing="inherit"
          // @ts-ignore add the href prop to this element
          href={props.element.url}
          color={props.hintPureWebLink ? '$blue' : '$color'}
          display="inline"
          // @ts-ignore not sure what the Text ref is..
          ref={ref}
          onClick={onClick}
          {...props.attributes}
        >
          {props.children}
        </Text>
        <InlineChromiumBugfix />
      </>
    </Tooltip>
  )
}

export const Link = forwardRef(renderLink)

Link.displayName = 'Link'

function MintterDocumentLink({element, attributes}: LinkProps) {
  let editor = useSlateStatic()
  let at = findPath(element)
  let [docId, versionId] = getIdsfromUrl(element.url)
  let {data} = usePublication({
    documentId: docId,
    versionId,
  })
  useEffect(() => {
    if (data) {
      Editor.withoutNormalizing(editor, () => {
        Transforms.insertNodes(
          editor,
          link({url: element.url}, [
            text(data?.document?.title || element.url),
          ]),
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
  const selection = useSlateSelection()
  const {reference, refs} = useFloating()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    //@ts-ignore
    const linkSpans = refs.reference.current as HTMLSpanElement[]
    if (linkSpans) {
      for (const span of linkSpans) {
        const parent = span.parentElement
        if (parent && parent.nodeName === "SPAN") {
          const initialText = parent.innerText
          span.remove()
          parent.innerText = initialText
        }
      }
    }
    if (!editor) return
    if (link && (isUrl(link) || isMintterLink(link))) {
      console.log('ADD LINK', event, editor)

      ReactEditor.focus(editor)
      insertLink(editor, {url: link, selection: editor.selection, wrap: true})
      Transforms.move(editor, {
        distance: 1,
        unit: 'offset',
      })
    }
  }

  function handleRemove() {
    if (isLinkActive(editor, editor.selection)) {
      unwrapLink(editor, editor.selection)
    }
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
    <PopoverPrimitive.Root onOpenChange={(open) => {
      if (!open) {
        //@ts-ignore
        const linkSpans = refs.reference.current as HTMLSpanElement[]
        if (linkSpans) {
          for (const span of linkSpans) {
            const parent = span.parentElement
            if (parent && parent.nodeName === "SPAN") {
              const initialText = parent.innerText
              span.remove()
              parent.innerText = initialText
            }
          }
        }
      } else {
        if (selection) {
          const {anchor, focus} = selection

          let start, end

          if (Path.isAfter(anchor.path, focus.path)) {
            start = focus
            end = anchor
          } else {
            start = anchor
            end = focus
          }
          const nodes = getSelectedNodes(editor, start.path, end.path)
          if (nodes.length === 1) {
            const domRange = ReactEditor.toDOMRange(editor, selection)
            const linkSpan = document.createElement("span");
            linkSpan.style.backgroundColor = "var(--primary-active)"
            linkSpan.style.color = "white"
            try {
              domRange.surroundContents(linkSpan)
            } catch (e) {
              console.log(e)
            }
            //@ts-ignore
            reference([linkSpan])
          } else {
            const linkSpans: HTMLSpanElement[] = []
            for (const [index, node] of nodes.entries()) {
              let domRange
              if (index === 0) 
                domRange = ReactEditor.toDOMRange(editor, {anchor: start, focus: {path: node.entry[1], offset: Editor.leaf(editor, node.entry[1], {edge: 'start'})[0].text.length}})
              else if (index === nodes.length-1) 
                domRange = ReactEditor.toDOMRange(editor, {anchor: {path: node.entry[1], offset: 0}, focus: end})
              else 
                domRange = ReactEditor.toDOMRange(editor, {anchor: {path: node.entry[1], offset: 0}, focus: {path: node.entry[1], offset: Editor.leaf(editor, node.entry[1], {edge: 'start'})[0].text.length}})
              const linkSpan = document.createElement("span");
              linkSpan.style.backgroundColor = "var(--primary-active)"
              linkSpan.style.color = "white"
              try {
                domRange.surroundContents(linkSpan)
              } catch (e) {
                console.log(e)
              }
              linkSpans.push(linkSpan)
              if (node.pathRef)
                node.pathRef.unref()
            }
            //@ts-ignore
            reference(linkSpans)
          }
        }
      }
    }}>
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
              <Fieldset>
                <Label htmlFor="address">Link Address</Label>
                <Input
                  keyboardType="url"
                  id="address"
                  data-testid="modal-link-input"
                  value={link}
                  onChangeText={setLink}
                />
              </Fieldset>
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
