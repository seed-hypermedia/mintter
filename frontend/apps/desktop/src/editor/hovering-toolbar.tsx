import {commentsClient} from '@app/api-clients'
import {features} from '@app/constants'
import {OutsideClick} from '@app/editor/outside-click'
import {toolbarMachine} from '@app/editor/toolbar-machine'
import {queryKeys} from '@app/hooks/query-keys'
import {appInvalidateQueries} from '@app/query-client'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useNavRoute} from '@app/utils/navigation'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {TextField} from '@components/text-field'
import {Tooltip} from '@components/tooltip'
import {flip, inline, offset, shift, useFloating} from '@floating-ui/react-dom'
import {
  blockToApi,
  image,
  isCode,
  isFlowContent,
  Mark,
  paragraph,
  Selector,
  statement,
  text,
} from '@mintter/shared'
import {css} from '@stitches/react'
import {useInterpret, useSelector} from '@xstate/react'
import {
  ComponentProps,
  FormEvent,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {toast} from 'react-hot-toast'
import {Descendant, Editor, Range, Text, Transforms} from 'slate'
import {ReactEditor, useFocused, useSlate, useSlateSelection} from 'slate-react'
import {assign} from 'xstate'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_CODE} from './inline-code'
import {InsertLinkButton} from './link'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'
import {isMarkActive, toggleFormat} from './utils'

export function EditorHoveringToolbar({mouseDown}: {mouseDown: boolean}) {
  const editor = useSlate()
  const [selectionColor, setSelectionColor] = useState<string>('')

  useEffect(() => {
    const nodes = Editor.nodes(editor, {
      match: Text.isText,
      mode: 'all',
    })

    const selectionColors = new Set([...nodes].map(([node]) => node.color))

    const maybeColor =
      selectionColors.size === 1 ? [...selectionColors.values()][0] : null

    setSelectionColor(maybeColor || '#000000')
    // console.log(selectionColor)
  }, [editor])

  const codeInSelection = useMemo(
    () => [...Editor.nodes(editor)].some(([node]) => isCode(node)),
    [editor],
  )

  return (
    <HoveringToolbar mouseDown={false}>
      <Box
        css={{
          zIndex: '$max',
          boxShadow: '$menu',
          padding: '$2',
          backgroundColor: '$base-background-normal',
          borderRadius: '2px',
          transition: 'opacity 0.5s',
          display: 'flex',
          gap: '$2',
          paddingHorizontal: '$2',
          '& > *': {
            display: 'inline-block',
          },
          '& > * + *': {
            marginLeft: 2,
          },
        }}
      >
        <FormatButton format={MARK_STRONG} icon="Strong" />
        <FormatButton format={MARK_EMPHASIS} icon="Emphasis" />
        <FormatButton format={MARK_UNDERLINE} icon="Underline" />
        <FormatButton format={MARK_CODE} icon="Code" />
        <Tooltip content={<span>Text color</span>}>
          {!codeInSelection ? (
            <input
              type="color"
              className={textSelectorStyles()}
              value={selectionColor}
              onChange={(ev) =>
                Transforms.setNodes(
                  editor,
                  {color: ev.target.value},
                  {match: Text.isText, split: true, mode: 'highest'},
                )
              }
            />
          ) : null}
        </Tooltip>
        <InsertLinkButton />
        <InsertImageButton />
      </Box>
    </HoveringToolbar>
  )
}

const textSelectorStyles = css({
  '$$outlined-border-size': '1px',
  width: '1.5em',
  height: '1.5em',
  fontSize: '$2',
  lineHeight: '$1',
  padding: '$1',
  // margin
  transition: 'width 2s, margin: 2s',
  '::invalid': {
    border: '2px solid red',
  },
})

function FormatButton({
  format,
  icon,
}: {
  format: Mark
  icon: keyof typeof icons
}) {
  const editor = useSlate()

  return (
    <Button
      variant="ghost"
      size="0"
      color="muted"
      css={
        isMarkActive(editor, format)
          ? {
              backgroundColor: '$base-component-bg-active',
              color: '$base-text-high',
              '&:hover': {
                backgroundColor: '$base-border-normal !important',
                color: '$base-text-high !important',
              },
            }
          : {
              // noop
            }
      }
      onClick={() => toggleFormat(editor, format)}
    >
      <Icon name={icon} size="2" />
    </Button>
  )
}

function InsertImageButton() {
  const editor = useSlate()

  function insertImageHandler(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) {
    event.preventDefault()

    let img = image({url: ''}, [text('')])
    Transforms.insertNodes(editor, [text(''), img, text('')])
  }

  return (
    <Tooltip content={<span>Insert Image</span>}>
      <Button
        onClick={insertImageHandler}
        variant="ghost"
        size="0"
        color="muted"
      >
        <Icon name="Image" size="2" />
      </Button>
    </Tooltip>
  )
}

const defaultVirtualEl = {
  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: -9999,
      left: -9999,
      bottom: 20,
      right: 20,
      width: 20,
      height: 20,
    }
  },
  getClientRects() {
    return [this.getBoundingClientRect()]
  },
}

function HoveringToolbar({
  children,
  mouseDown,
}: {
  children: ReactNode
  mouseDown: boolean
}) {
  const editor = useSlate()
  const inFocus = useFocused()
  const selection = useSlateSelection()

  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
  })

  useEffect(() => {
    if (
      mouseDown ||
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      return reference(defaultVirtualEl)
    }
    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [reference, inFocus, selection, mouseDown])

  return (
    <Box
      ref={floating}
      css={{
        position: strategy,
        top: y && y > 0 ? y : -999,
        left: x && x > 0 ? x : -999,
        zIndex: '$max',
      }}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
    >
      {children}
    </Box>
  )
}

function handledErrors<A, V>(unsafeHandler: (a: A) => V) {
  return (a: A) => {
    try {
      return unsafeHandler(a)
    } catch (e: unknown) {
      //@ts-ignore
      toast.error(e.message)
      console.error(e)
      //@ts-ignore
      throw new Error(e)
    }
  }
}

type BlockCSS = ComponentProps<typeof Box>['css']

export function EditorHoveringActions({
  onComment,
  onCopyLink,
  copyLabel,
  css,
}: {
  onComment?: () => void
  onCopyLink?: (v: void) => string
  copyLabel?: string
  css: BlockCSS
}) {
  return (
    <Box
      contentEditable={false}
      css={{
        background: '$base-background-normal',
        borderRadius: '$2',
        display: 'flex',
        boxShadow: '$menu',
        ...css,
      }}
    >
      {onCopyLink && (
        <Button
          variant="ghost"
          color="primary"
          size="1"
          onClick={() => {
            let link = onCopyLink()
            if (link) {
              copyTextToClipboard(link).then(() => {
                toast.success(
                  copyLabel
                    ? `Copied link to ${copyLabel}`
                    : 'Link copied to clipboard',
                )
              })
            }
          }}
          css={{
            background: '$base-background-normal',
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
            '&:hover': {
              background: '$base-background-normal',
            },
          }}
        >
          <Icon name="Copy" />
        </Button>
      )}
      {onComment && features.comments && (
        <Button
          variant="ghost"
          color="primary"
          size="1"
          onClick={onComment}
          css={{
            background: '$base-background-normal',
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
            '&:hover': {
              background: '$base-background-normal',
            },
          }}
        >
          <Icon name="MessageBubble" />
        </Button>
      )}
    </Box>
  )
}

export function PublicationToolbar() {
  const route = useNavRoute()
  const documentId = route.key === 'publication' ? route.documentId : undefined
  const version = route.key === 'publication' ? route.versionId : undefined
  const editor = useSlate()
  let selection = useSlateSelection()
  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
  })

  let [currentComment, setCurrentComment] = useState('')

  let service = useInterpret(() => toolbarMachine, {
    guards: {
      isNotValid: (_, event) =>
        !selection ||
        Range.isCollapsed(selection) ||
        Editor.string(editor, selection) === '',
    },
    actions: {
      assignDefaultSelection: () => {
        reference(defaultVirtualEl)
      },
      assignSelection: assign((_, e) => {
        return {
          selection: e.selection,
          domRange: e.selection
            ? ReactEditor.toDOMRange(editor, e.selection)
            : null,
        }
      }),
      setSelectorMark: (context) => {
        console.log('setSelectorMark', context)
        Editor.addMark(editor, 'conversations', ['current'])
      },
      removeSelectorMark: (context) => {
        console.log('REMOVE SELECTOR')
        ReactEditor.focus(editor)
        setTimeout(() => {
          //@ts-ignore
          Transforms.setSelection(editor, context.selection)
          Editor.removeMark(editor, 'conversations')
        }, 10)
      },
      restoreDOMSelection: (context) => {
        let selection = window.getSelection()
        if (selection) {
          //@ts-ignore
          selection.addRange(context.domRange)
        }
      },
      removeDOMSelection: () => {
        let selection = window.getSelection()

        if (selection) {
          selection.removeAllRanges()
        }
      },
    },
  })

  async function createConversation(event: FormEvent) {
    event.preventDefault()
    if (!currentComment) return
    /**
     * - get block selected
     * - convert conversation mark to selector
     * - create comment block
     * - create conversation with initial comment
     */

    // get block selected
    let currentEntry = Editor.nodes(editor, {
      match: isFlowContent,
      mode: 'lowest',
    })

    invariant(
      currentEntry,
      `"currentEntry" is not available - ${JSON.stringify(currentEntry)}`,
    )

    // get block from entry
    // TODO: get all the blocks from selection, now it's capped by just one block.
    let [block] = [...currentEntry][0]

    // convert conversation to selector
    let apiBlock = blockToApi(block)

    invariant(apiBlock.annotations, `the "apiBlock" does not have annotations`)

    let commentAnnotation = apiBlock.annotations.find(
      (annotation) =>
        annotation.type == 'conversation' &&
        annotation.attributes.conversationId == 'current',
    )

    // invariant(commentAnnotation, 'No commentAnnotation available')
    if (!commentAnnotation) return

    let selector = new Selector({
      blockId: block.id,
      blockRevision: block.revision,
      start: commentAnnotation.starts[0],
      end: commentAnnotation.ends[0],
    })

    let commentValue = currentComment.replace(/\s/g, ' ')
    let initialComment = blockToApi(
      statement([paragraph([text(commentValue)])]),
    )

    await commentsClient
      .createConversation({
        documentId,
        initialComment,
        selectors: [selector],
      })
      .then((res) => {
        service.send('TOOLBAR.DISMISS')
        setCurrentComment('')
        ReactEditor.blur(editor)
        appInvalidateQueries([queryKeys.GET_PUBLICATION_CONVERSATIONS])
      })
  }

  let isToolbarActive = useSelector(service, (state) => state.matches('active'))
  let toolbarSelection = useSelector(service, (state) => state.context.domRange)
  let isCommentActive = useSelector(service, (state) =>
    state.matches('active.commenting'),
  )

  useEffect(() => {
    if (selection) {
      service.send({type: 'TOOLBAR.SELECT', selection})
    } else {
      service.send('TOOLBAR.DISMISS')
    }
  }, [selection])

  useEffect(() => {
    if (isToolbarActive) {
      reference(toolbarSelection)
    }
  }, [isToolbarActive, toolbarSelection])

  function sizeNode(d: Descendant): number {
    if (!d) return 0
    //@ts-ignore
    const children =
      //@ts-ignore
      d.children?.reduce((acc, child) => acc + sizeNode(child), 0) ?? 0
    //@ts-ignore
    const text = d.text?.length ?? 0
    return children + text
  }

  function convertRange(path: number[], children: Descendant[]): number {
    let i = 0
    let nodes = children
    path.forEach((address) => {
      const child = nodes[address]
      for (let siblingIndex = 0; siblingIndex < address; siblingIndex++) {
        const sib = nodes[siblingIndex]
        i += sizeNode(sib)
      }
      //@ts-ignore
      nodes = child.children
    })
    return i
  }

  function getCopyLink(): string {
    if (!selection) throw new Error('No selection')
    const selectedBlock = selection.anchor.path[1]
    //@ts-ignore
    const block = editor.children[0].children[selectedBlock]
    const blockChildren = block.children
    const anchor =
      convertRange(selection.anchor.path.slice(2), blockChildren) +
      selection.anchor.offset
    const focus =
      convertRange(selection.focus.path.slice(2), blockChildren) +
      selection.focus.offset
    const start = Math.min(anchor, focus)
    const end = Math.max(anchor, focus)
    // console.log('... : ', {
    //   selection,
    //   c: editor.children,
    //   start,
    //   end,
    //   documentId,
    //   version,
    // })
    return `https://mintter.com/p/${documentId}?v=${version}#${block.id}:${start}:${end}`
  }

  return (
    <OutsideClick onClose={() => service.send('TOOLBAR.DISMISS')}>
      <Box
        ref={floating}
        css={{
          position: strategy,
          top: y ? y : -1000,
          left: x ? x : -1000,
          zIndex: '$max',
        }}
      >
        {isCommentActive ? (
          <CommentForm
            onSubmit={handledErrors(createConversation)}
            comment={currentComment}
            onChange={setCurrentComment}
          />
        ) : (
          <EditorHoveringActions
            onComment={
              features.comments
                ? () => service.send('START.CONVERSATION')
                : undefined
            }
            onCopyLink={handledErrors(getCopyLink)}
            copyLabel="range"
            css={{
              zIndex: '$max',
              boxShadow: '$menu',
              backgroundColor: '$base-background-normal',
              borderRadius: '2px',
              transition: 'opacity 0.5s',
              display: 'flex',
              position: 'relative',
              left: 20,
            }}
          />
        )}
      </Box>
    </OutsideClick>
  )
}

export function CommentForm({
  onSubmit,
  comment,
  onChange,
}: {
  onSubmit: (e: FormEvent) => void
  comment: string
  onChange: (value: string) => void
}) {
  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      contentEditable={false}
      css={{
        display: 'flex',
        gap: '$3',
        padding: '$3',
        borderRadius: '$3',
        background: '$base-background-normal',
        flexDirection: 'column',
        boxShadow: '$menu',
      }}
    >
      <TextField
        name="comment"
        textarea
        placeholder="initial comment here"
        value={comment}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button variant="solid" color="muted" size="2">
        submit
      </Button>
    </Box>
  )
}

function invariant(value: unknown, message: string) {
  if (!value) {
    throw new Error(`Error: ${message}`)
  }
}
