import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {usePublication} from '@app/models/documents'
import {useWebLink} from '@app/models/web-links'
import {isMintterScheme, normalizeMintterLink} from '@app/utils/mintter-link'
import {PublicationRoute, useNavigate, useNavRoute} from '@app/utils/navigation'
import {Tooltip} from '@components/tooltip'
import {useFloating} from '@floating-ui/react-dom'
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
import {
  Adapt,
  Button,
  ExternalLink,
  Form,
  Input,
  Label,
  Link as LinkIcon,
  Popover,
  SizableText,
  XStack,
  YGroup,
} from '@mintter/ui'
import {open} from '@tauri-apps/api/shell'
import {isKeyHotkey} from 'is-hotkey'
import {
  ForwardedRef,
  forwardRef,
  MouseEvent,
  useEffect,
  useMemo,
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
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateSelection,
  useSlateStatic,
} from 'slate-react'
import {useLinkingPanel} from '../linking-panel'
import type {EditorPlugin} from '../types'
import {
  findPath,
  getEditorBlock,
  getSelectedNodes,
  isCollapsed,
  useMode,
} from '../utils'

export const ELEMENT_LINK = 'link'

export const createLinkPlugin = (): EditorPlugin => ({
  name: ELEMENT_LINK,
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

    function insertLinkableText(text: string) {
      const mintterLink = normalizeMintterLink(text)
      if (mintterLink) {
        // user is probably pasting a link that is either a mintter scheme or https gateway URL
        if (hasBlockId(mintterLink)) {
          wrapMintterLink(editor, mintterLink)
        } else {
          insertDocumentLink(editor, mintterLink)
        }
      } else if (isUrl(text)) {
        // user is pasting normal url, may be a mintter site which will be asynchronously resolved with useWebLink
        wrapLink(editor, text)
      } else {
        insertText(text)
      }
    }

    editor.insertText = (text: string) => {
      insertLinkableText(text)
    }

    editor.insertData = (data: DataTransfer) => {
      const text = data.getData('text/plain')
      if (text) {
        insertLinkableText(text)
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
  hintPureWebLink?: boolean
  mintterLink?: {
    documentId: string
    version?: string
    blockRef?: string
  }
}

function renderLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  const {element} = props
  const mode = useMode()
  const linkQuery = useWebLink(props.element.url, mode == EditorMode.Draft)
  const {url} = props.element
  const elChildren = props.element.children
  let editor = useSlateStatic()
  const isEmbedInsertion = !!element.data?.isEmbedInsertion

  useEffect(() => {
    if (mode !== EditorMode.Draft) return
    if (!linkQuery.data) return
    if (isMintterScheme(url)) return
    let at = findPath(props.element)
    const [, origBlockId] = url.match(/\#(.*)$/) || []
    const {documentId, documentVersion, documentTitle} = linkQuery.data
    let outputMintterUrl = `${MINTTER_LINK_PREFIX}${documentId}`
    if (documentVersion) {
      outputMintterUrl += `?v=${documentVersion}`
    }
    if (origBlockId) {
      outputMintterUrl += `#${origBlockId}`
    }
    if (isEmbedInsertion) {
      const newEmbed: Embed = embed({url: outputMintterUrl}, [text('')])
      Transforms.removeNodes(editor, {at: at.slice(0, -1)})
      Transforms.insertNodes(editor, newEmbed, {at: at.slice(0, -2)})
    } else {
      const title = documentTitle || url

      const wasURLTextVisible =
        elChildren.length === 1 &&
        elChildren[0].type === 'text' &&
        elChildren[0].text === url
      const newChildren = wasURLTextVisible ? [text(title)] : elChildren
      Editor.withoutNormalizing(editor, () => {
        Transforms.insertNodes(
          editor,
          link({url: outputMintterUrl}, newChildren),
          {at},
        )
        Transforms.removeNodes(editor, {at: Path.next(at)})
      })
    }
  }, [linkQuery.data, url, isEmbedInsertion])

  const [docId, version, blockId] = getIdsfromUrl(url)
  if (isMintterScheme(url) && docId) {
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
  const editor = useSlateStatic()
  const navigateReplace = useNavigate('replace')
  const route = useNavRoute()
  const isDraftMode = route.key === 'draft'

  const {mintterLink, attributes, ...linkProps} = props

  const isSelected = useSelected()

  const {onLinkState} = useLinkingPanel()
  function onUpdate(url: string | null) {
    if (url === null) {
      if (isLinkActive(editor, editor.selection)) {
        unwrapLink(editor, editor.selection)
      }
    } else {
      Transforms.setNodes(editor, {url}, {at: findPath(props.element)})
    }
  }
  useEffect(() => {
    onLinkState?.({isSelected, element: props.element, onUpdate})
  }, [isSelected, props.element])

  if (!mintterLink) return null

  const {documentId, version, blockRef} = mintterLink

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    let isShiftKey = event.shiftKey || event.metaKey
    event.preventDefault()
    if (isDraftMode) {
      onLinkState?.({isSelected: true, element: props.element, onUpdate})
      return
    }
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
    // mouseService.send({
    //   type: 'HIGHLIGHT.ENTER',
    //   ref: blockRef ? `${documentId}/${blockRef}` : documentId,
    // })
  }

  function mouseLeave() {
    // mouseService.send('HIGHLIGHT.LEAVE')
  }

  return (
    <>
      <SizableText
        {...attributes}
        tag="a"
        fontFamily="inherit"
        letterSpacing="inherit"
        // @ts-ignore
        href={props.element.url}
        // color={'#0E868E'}
        // color="$blue"
        // @ts-ignore not sure what the Text ref is..
        ref={ref}
        size="$5"
        onClick={onClick}
        display="inline"
        fontWeight="500"
        color="$link"
        onMouseEnter={mouseEnter}
        onMouseLeave={mouseLeave}
        hoverTheme
        hoverStyle={{
          cursor: isDraftMode ? 'text' : 'pointer',
          backgroundColor: isDraftMode ? undefined : '$color4',
        }}
        {...linkProps}
      />
    </>
  )
}

function RenderWebLink(props: LinkProps, ref: ForwardedRef<HTMLAnchorElement>) {
  let mode = useMode()
  const editor = useSlateStatic()
  const isSelected = useSelected()
  const route = useNavRoute()
  const isDraftMode = route.key === 'draft'
  const {onLinkState} = useLinkingPanel()

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (isDraftMode) {
      onLinkState?.({
        isSelected: true,
        element: props.element,
        onUpdate,
      })
      return
    }
    if (mode == EditorMode.Embed || mode == EditorMode.Discussion) return
    open(props.element.url)
  }
  function onUpdate(url: string | null) {
    if (url === null) {
      if (isLinkActive(editor, editor.selection)) {
        unwrapLink(editor, editor.selection)
      }
    } else {
      Transforms.setNodes(editor, {url}, {at: findPath(props.element)})
    }
  }
  useEffect(() => {
    onLinkState?.({isSelected, element: props.element, onUpdate})
  }, [isSelected, props.element])
  if (isDraftMode) {
    return (
      <>
        <SizableText
          tag="a"
          color="$webLink"
          fontFamily="inherit"
          letterSpacing="inherit"
          // @ts-ignore add the href prop to this element
          href={props.element.url}
          display="inline"
          // @ts-ignore not sure what the Text ref is..
          ref={ref}
          fontWeight="500"
          size="$5"
          cursor="text"
          hoverStyle={{
            cursor: isDraftMode ? 'text' : 'pointer',
            // backgroundColor: isDraftMode ? undefined : '$blue4',
          }}
          backgroundColor={isSelected ? '#f0f0ff' : 'transparent'}
          onClick={onClick}
          {...props.attributes}
        >
          {props.children}
        </SizableText>
      </>
    )
  }
  return (
    <Tooltip
      inline
      content={
        <XStack gap="$1" alignItems="center">
          <SizableText size="$1">{props.element.url}</SizableText>
          <ExternalLink size={12} />
        </XStack>
      }
    >
      <>
        <InlineChromiumBugfix />
        <SizableText
          tag="a"
          color="$webLink"
          fontFamily="inherit"
          letterSpacing="inherit"
          // @ts-ignore add the href prop to this element
          href={props.element.url}
          display="inline"
          // @ts-ignore not sure what the Text ref is..
          ref={ref}
          fontWeight="500"
          hoverTheme
          size="$5"
          hoverStyle={{
            cursor: 'pointer',
            backgroundColor: isDraftMode ? undefined : '$blue4',
          }}
          onClick={onClick}
          {...props.attributes}
        >
          {props.children}
        </SizableText>
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

  console.log('huurrmm', selection)
  const newLink: LinkType = link(
    {
      url,
      data: {
        // if the selection is empty while pasting this link, we want to paste as an embed, but we haven't looked up this URL yet so we defer to the link component by passing isEmbedInsertion:true
        isEmbedInsertion:
          isCollapsed(selection) && selection?.anchor.offset === 0,
      },
    },
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
  const editor = useSlateStatic()
  const selection = useSlateSelection()
  const {reference, refs} = useFloating()

  function handleSubmit() {
    //@ts-ignore
    const linkSpans = refs.reference.current as HTMLSpanElement[]
    if (linkSpans) {
      for (const span of linkSpans) {
        const parent = span.parentElement
        if (parent && parent.nodeName === 'SPAN') {
          const initialText = parent.innerText
          span.remove()
          parent.innerText = initialText
        }
      }
    }
    if (!editor) return
    if (link && (isUrl(link) || isMintterScheme(link))) {
      ReactEditor.focus(editor)
      insertLink(editor, {url: link, selection: editor.selection, wrap: true})
      Transforms.move(editor, {
        distance: 1,
        unit: 'offset',
      })

      setLink('')
      handleChange(false)
    }
  }

  function handleRemove() {
    if (isLinkActive(editor, editor.selection)) {
      unwrapLink(editor, editor.selection)
    }
  }

  function handleChange(open: boolean) {
    if (!open) {
      //@ts-ignore
      const linkSpans = refs.reference.current as HTMLSpanElement[]
      if (linkSpans) {
        for (const span of linkSpans) {
          const parent = span.parentElement
          if (parent && parent.nodeName === 'SPAN') {
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
          const linkSpan = document.createElement('span')
          linkSpan.style.backgroundColor = 'var(--primary-active)'
          linkSpan.style.color = 'white'
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
              domRange = ReactEditor.toDOMRange(editor, {
                anchor: start,
                focus: {
                  path: node.entry[1],
                  offset: Editor.leaf(editor, node.entry[1], {
                    edge: 'start',
                  })[0].text.length,
                },
              })
            else if (index === nodes.length - 1)
              domRange = ReactEditor.toDOMRange(editor, {
                anchor: {path: node.entry[1], offset: 0},
                focus: end,
              })
            else
              domRange = ReactEditor.toDOMRange(editor, {
                anchor: {path: node.entry[1], offset: 0},
                focus: {
                  path: node.entry[1],
                  offset: Editor.leaf(editor, node.entry[1], {
                    edge: 'start',
                  })[0].text.length,
                },
              })
            const linkSpan = document.createElement('span')
            linkSpan.style.backgroundColor = 'var(--primary-active)'
            linkSpan.style.color = 'white'
            try {
              domRange.surroundContents(linkSpan)
            } catch (e) {
              console.log(e)
            }
            linkSpans.push(linkSpan)
            if (node.pathRef) node.pathRef.unref()
          }
          //@ts-ignore
          reference(linkSpans)
        }
      }
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
    <Popover size="$5" stayInFrame allowFlip onOpenChange={handleChange}>
      <Popover.Trigger asChild>
        <Button
          data-testid="toolbar-link-button"
          chromeless
          size="$1"
          icon={LinkIcon}
        />
      </Popover.Trigger>

      <Adapt
        // @ts-ignore
        when="sm"
        platform="web"
      >
        <Popover.Sheet modal dismissOnSnapToBottom>
          <Popover.Sheet.Frame padding="$4">
            <Adapt.Contents />
          </Popover.Sheet.Frame>
          <Popover.Sheet.Overlay />
        </Popover.Sheet>
      </Adapt>
      <Popover.Content
        padding={0}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$backgroundTransparent"
        elevation={5}
        x={-30}
        y={-50}
        opacity={1}
        elevate
      >
        <YGroup space="$3" padding="$2">
          <YGroup.Item>
            <Label size="$1" htmlFor="insert-link-address">
              Insert Link:
            </Label>
            <Form onSubmit={handleSubmit}>
              <Input
                size="$2"
                keyboardType="url"
                id="insert-link-address"
                data-testid="modal-link-input"
                value={link}
                onChangeText={setLink}
                onSubmitEditing={handleSubmit}
                placeholder="https://"
                autoFocus
              />
            </Form>
          </YGroup.Item>
        </YGroup>
      </Popover.Content>
    </Popover>
  )
}

export function LinkElement({element, ...props}: RenderElementProps) {
  let isVoid = useMemo(() => element.data?.void, [element])
  if (isVoid) {
    return <MintterDocumentLink {...props} element={element as LinkType} />
  }

  return <Link {...props} element={element as LinkType} />
}
