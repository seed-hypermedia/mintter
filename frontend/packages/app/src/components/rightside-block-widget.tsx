import {Button, Copy, SizableText, XStack} from '@mintter/ui'
import {WidgetDecorationFactory} from '@prosemirror-adapter/core'
import {useWidgetViewContext} from '@prosemirror-adapter/react'
import {Editor, Extension} from '@tiptap/core'
import {EditorState, Plugin, PluginKey} from '@tiptap/pm/state'
import {Decoration, DecorationSet, EditorView} from '@tiptap/pm/view'
import {useMemo} from 'react'
import {BlockNoteEditor} from '../blocknote-core'
import {HDBlockSchema} from '../client/schema'
import appError from '../errors'
import {useDocCitations} from '../models/content-graph'
import {usePublication} from '../models/documents'
import {toast} from '@mintter/app/src/toast'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {getDocUrl} from '@mintter/shared'
import {useNavigate, useNavRoute} from '@mintter/app/src/utils/navigation'

export function createRightsideBlockWidgetExtension({
  getWidget,
  editor,
}: {
  getWidget: WidgetDecorationFactory
  editor: BlockNoteEditor<HDBlockSchema>
}) {
  return Extension.create({
    name: 'rightside-block',
    addProseMirrorPlugins() {
      return [
        createRightsideBlockWidgetPlugin({
          getWidget,
          editor,
          ttEditor: this.editor,
        }),
      ]
    },
  })
}

let RightSidePluginKey = new PluginKey('rightside-block')

export function createRightsideBlockWidgetPlugin({
  getWidget,
  editor,
  ttEditor,
}: {
  getWidget: WidgetDecorationFactory
  editor: BlockNoteEditor<HDBlockSchema>
  ttEditor: Editor
}) {
  return new Plugin({
    key: RightSidePluginKey,
    view: () => new MouseMoveView({editor, ttEditor: ttEditor}),
    state: {
      init() {
        return DecorationSet.empty
      },
      apply(tr, decos, oldState, newState) {
        let hoveredBlockId = tr.getMeta(RightSidePluginKey)
        if (hoveredBlockId) {
          return updateDecorations(newState, getWidget, hoveredBlockId)
        }
        if (oldState.doc.eq(newState.doc)) return decos

        return updateDecorations(newState, getWidget)
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })
}

function updateDecorations(
  state: EditorState,
  getWidget: WidgetDecorationFactory,
  activeId?: string,
) {
  const decorations: Decoration[] = []

  state.doc.descendants((node, pos) => {
    if (!node.attrs.id) return

    const widget = getWidget(pos + node.nodeSize - 1, {
      id: node.attrs.id,
      active: node.attrs.id == activeId,
      ignoreSelection: true,
    })
    decorations.push(widget)
  })

  return DecorationSet.create(state.doc, decorations)
}

export function RightsideWidget() {
  let {citations, spec} = useBlockCitation()

  let route = useNavRoute()
  let replace = useNavigate('replace')
  let pub = usePublication({
    documentId: route.key == 'publication' ? route.documentId : undefined,
    versionId: route.key == 'publication' ? route.versionId : undefined,
    enabled: route.key == 'publication' && !!route.documentId,
  })

  function onCopy() {
    let docUrl = getDocUrl(pub.data)
    if (docUrl && spec && spec.id) {
      copyTextToClipboard(`${docUrl}#${spec.id}`)
      toast.success('Block reference copied!')
    } else {
      appError('Block reference copy failed', {docUrl, spec})
    }
  }

  function onCitation() {
    if (route.key == 'publication') {
      // if (route.accessory) return replace({...route, accessory: null})
      replace({...route, accessory: {key: 'citations'}})
    }
  }

  return (
    <XStack
      // @ts-expect-error
      contentEditable={false}
      height="100%"
      position="absolute"
      right={-100}
      width={80}
      top={16}
    >
      {citations?.length ? (
        <Button
          size="$1"
          padding="$2"
          borderRadius="$2"
          chromeless
          onPress={onCitation}
        >
          <SizableText color="$blue11" fontWeight="700" size="$1">
            {citations.length}
          </SizableText>
        </Button>
      ) : null}

      <Button
        size="$1"
        chromeless
        padding="$2"
        borderRadius="$2"
        color="$blue11"
        fontWeight="700"
        opacity={spec && spec.active ? 1 : 0}
        zIndex={100}
        icon={Copy}
        onPress={onCopy}
      />
    </XStack>
  )
}

function useBlockCitation() {
  const {spec} = useWidgetViewContext()
  const route = useNavRoute()

  const _citations = useDocCitations(
    route.key == 'publication' ? route.documentId : undefined,
  )

  let citations = useMemo(() => {
    if (spec && _citations.data?.links.length) {
      return _citations.data?.links.filter((link) => {
        return link.target?.blockId == spec.id
      })
    }

    return []
  }, [])

  return {
    citations,
    spec,
  }
}

class MouseMoveView {
  editor: BlockNoteEditor<HDBlockSchema>
  ttEditor: Editor

  hoveredBlock: HTMLElement | undefined

  constructor({
    editor,
    ttEditor,
  }: {
    editor: BlockNoteEditor<HDBlockSchema>
    ttEditor: Editor
  }) {
    this.editor = editor
    this.ttEditor = ttEditor
    document.body.addEventListener('mousemove', this.onMouseMove, true)
  }

  onMouseMove = (event: MouseEvent) => {
    // copied from draggableBlocksPlugin

    const editorBoundingBox = (
      this.ttEditor.view.dom.firstChild! as HTMLElement
    ).getBoundingClientRect()
    const editorOuterBoundingBox =
      this.ttEditor.view.dom.getBoundingClientRect()
    const cursorWithinEditor =
      event.clientX >= editorOuterBoundingBox.left &&
      event.clientX <= editorOuterBoundingBox.right &&
      event.clientY >= editorOuterBoundingBox.top &&
      event.clientY <= editorOuterBoundingBox.bottom

    if (
      cursorWithinEditor &&
      event &&
      event.target &&
      this.ttEditor.view.dom !== event.target &&
      !this.ttEditor.view.dom.contains(event.target as HTMLElement)
    ) {
      return
    }

    const coords = {
      left: editorBoundingBox.left + editorBoundingBox.width / 2,
      top: event.clientY,
    }

    const block = getBlockFromCoords(coords, this.ttEditor.view)

    if (!block || this.editor.isEditable) return
    if (
      this.hoveredBlock?.hasAttribute('data-id') &&
      this.hoveredBlock?.getAttribute('data-id') == block.id
    )
      return

    this.hoveredBlock = block.node

    const blockContent = block.node.firstChild as HTMLElement

    if (!blockContent) return

    this.ttEditor.view.dispatch(
      this.ttEditor.state.tr.setMeta(RightSidePluginKey, block.id),
    )
  }

  destroy() {
    document.body.removeEventListener('mousemove', this.onMouseMove)
  }
}

function getBlockFromCoords(
  coords: {left: number; top: number},
  view: EditorView,
) {
  if (!view.dom.isConnected) {
    // view is not connected to the DOM, this can cause posAtCoords to fail
    // (Cannot read properties of null (reading 'nearestDesc'), https://github.com/TypeCellOS/BlockNote/issues/123)
    return undefined
  }

  let pos = view.posAtCoords(coords)

  if (!pos) {
    return undefined
  }
  // this is the text node from the block content
  let node = view.domAtPos(pos.pos).node as HTMLElement

  if (node === view.dom) {
    // mouse over root
    return undefined
  }

  if (node.parentNode === null) {
    let parentNode = view.domAtPos(pos.inside).node as HTMLElement

    if (parentNode.getAttribute('data-id') !== null) {
      node = parentNode
    } else return undefined
  }

  while (
    node &&
    node.parentNode &&
    node.parentNode !== view.dom &&
    !node.hasAttribute?.('data-id')
  ) {
    node = node.parentNode as HTMLElement
  }

  if (!node) {
    return undefined
  }
  return {node, id: node.getAttribute('data-id')!}
}
