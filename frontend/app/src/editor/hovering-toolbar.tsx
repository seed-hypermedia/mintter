import {
  blockToApi,
  Comments,
  image,
  isCode,
  isFlowContent,
  paragraph,
  Selector,
  statement,
  text,
  transport,
} from '@mintter/shared'
import {Mark} from '@mintter/shared'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {flip, inline, offset, shift, useFloating} from '@floating-ui/react-dom'
import {css} from '@stitches/react'
import {FormEvent, PropsWithChildren, useEffect, useMemo, useState} from 'react'
import {Editor, Range, Text, Transforms} from 'slate'
import {ReactEditor, useFocused, useSlate} from 'slate-react'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_CODE} from './inline-code'
import {InsertLinkButton} from './link'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'
import {isMarkActive, toggleFormat} from './utils'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {toolbarMachine} from '@app/editor/toolbar-machine'
import {assign} from 'xstate'
import {TextField} from '@components/text-field'
import {OutsideClick} from '@app/editor/outside-click'
import {createPromiseClient} from '@bufbuild/connect-web'
import {useRoute} from 'wouter'
import {useConversations} from '@app/editor/comments/conversations-context'
import {useQueryClient} from '@tanstack/react-query'
import {queryKeys} from '@app/hooks'

export function EditorHoveringToolbar() {
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

    setSelectionColor(maybeColor || 'invalid color')
  }, [editor])

  const codeInSelection = useMemo(
    () => [...Editor.nodes(editor)].some(([node]) => isCode(node)),
    [editor],
  )

  return (
    <HoveringToolbar>
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

function HoveringToolbar({children}: PropsWithChildren) {
  const editor = useSlate()
  const inFocus = useFocused()

  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
  })

  useEffect(() => {
    const {selection} = editor
    if (
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      return reference(defaultVirtualEl)
    }
    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [reference, editor, inFocus, editor.selection])

  return (
    <Box
      ref={floating}
      css={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
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

export function PublicationToolbar() {
  let client = useQueryClient()
  let [, params] = useRoute('/p/:id/:version/:block?')
  let editor = useSlate()
  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
  })

  let service = useInterpret(() => toolbarMachine, {
    guards: {
      isNotValid: (_, event) =>
        !editor.selection ||
        Range.isCollapsed(editor.selection) ||
        Editor.string(editor, editor.selection) === '',
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
        Editor.removeMark(editor, 'conversations')
      },
      restoreDOMSelection: (context) => {
        let selection = window.getSelection()
        if (selection) {
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
    /**
     * - get block selected
     * - convert conversation mark to selector
     * - create comment block
     * - create conversation with initial comment
     */

    // get block selected
    let currentEntry = Editor.nodes(editor, {
      match: isFlowContent,
    })

    if (!currentEntry) return

    // get block from entry
    // TODO: get all the blocks from selection, now it's capped by just one block.
    let [block] = [...currentEntry][0]

    // convert conversation to selector
    let apiBlock = blockToApi(block)

    let commentAnnotation = apiBlock.annotations.find(
      (annotation) =>
        annotation.type == 'conversation' &&
        annotation.attributes.conversations == 'current',
    )

    if (!commentAnnotation) return

    let selector = new Selector({
      blockId: block.id,
      blockRevision: block.revision,
      start: commentAnnotation.starts[0],
      end: commentAnnotation.ends[0],
    })

    let data = new FormData(event.currentTarget)
    let commentValue = data.get('comment')?.toString().replace(/\s/g, ' ')
    if (!commentValue) return
    let initialComment = blockToApi(
      statement([paragraph([text(commentValue)])]),
    )

    let commentsClient = createPromiseClient(Comments, transport)

    commentsClient
      .createConversation({
        documentId: params?.id,
        initialComment,
        selectors: [selector],
      })
      .then((res) => {
        service.send('TOOLBAR.DISMISS')
        client.invalidateQueries({
          queryKey: [queryKeys.GET_PUBLICATION_CONVERSATIONS],
        })
      })
  }

  let isToolbarActive = useSelector(service, (state) => state.matches('active'))
  let toolbarSelection = useSelector(service, (state) => state.context.domRange)
  let isCommentActive = useSelector(service, (state) =>
    state.matches('active.commenting'),
  )

  useEffect(() => {
    const {selection} = editor

    if (selection) {
      service.send({type: 'TOOLBAR.SELECT', selection})
    } else {
      service.send('TOOLBAR.DISMISS')
    }
  }, [editor, editor.selection])

  useEffect(() => {
    if (isToolbarActive) {
      reference(toolbarSelection)
    }
  }, [isToolbarActive, toolbarSelection])

  return (
    <OutsideClick onClose={() => service.send('TOOLBAR.DISMISS')}>
      <Box
        ref={floating}
        css={{
          position: strategy,
          top: y ?? -1000,
          left: x ?? -1000,
          zIndex: '$max',
        }}
      >
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
          <Button
            variant="ghost"
            size="0"
            color="muted"
            onClick={() => service.send('START.CONVERSATION')}
          >
            <Icon name="MessageBubble" size="2" />
            <span>Add comment</span>
          </Button>
        </Box>
        {isCommentActive ? (
          <Box as="form" onSubmit={createConversation}>
            <TextField
              name="comment"
              textarea
              placeholder="initial comment here"
            />
            <button>submit</button>
          </Box>
        ) : null}
      </Box>
    </OutsideClick>
  )
}
