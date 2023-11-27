import {Extension} from '@tiptap/core'
import {ResolvedPos} from '@tiptap/pm/model'
import {EditorView} from '@tiptap/pm/view'
import {Node} from 'prosemirror-model'
import {NodeSelection, Plugin, PluginKey} from 'prosemirror-state'
import {getBlockInfoFromPos} from '../Blocks/helpers/getBlockInfoFromPos'

export const BlockManipulationExtension = Extension.create({
  name: 'BlockManupulation',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('SelectPlugin'),
        props: {
          handleClickOn: (
            view: EditorView,
            _,
            node: Node,
            nodePos: number,
            event: MouseEvent,
          ) => {
            if (!view.editable) return false
            if (
              (node.type.name === 'image' &&
                // @ts-ignore
                event.target?.nodeName === 'IMG') ||
              ['file', 'embed', 'video'].includes(node.type.name)
            ) {
              let tr = view.state.tr
              const selection = NodeSelection.create(view.state.doc, nodePos)
              tr = tr.setSelection(selection)
              view.dispatch(tr)
              return true
            }
            return false
          },
        },
      }),
      new Plugin({
        key: new PluginKey('DeletePlugin'),
        props: {
          handleKeyDown(view, event) {
            if (event.key === 'Delete') {
              const {doc, selection, tr} = view.state
              if (selection.empty) {
                const $pos = selection.$anchor
                const isEnd = $pos.pos === $pos.end()
                if (isEnd) {
                  const node = getBlockInfoFromPos(doc, $pos.pos)
                  if (node.contentNode.textContent.length === 0) {
                    tr.deleteRange($pos.start() - 1, $pos.end() + 1)
                    view.dispatch(tr)
                    return true
                  }
                  let $nextPos: ResolvedPos | undefined
                  let nextNode
                  if (node.numChildBlocks > 0) {
                    $nextPos = doc.resolve($pos.after() + 3)
                    nextNode = $nextPos.parent
                  } else {
                    doc.descendants((testNode, testPos) => {
                      if (
                        testNode.type.name === 'blockContainer' &&
                        testPos > $pos.pos
                      )
                        if (!$nextPos || $nextPos.pos < $pos.pos) {
                          $nextPos = doc.firstChild!.resolve(testPos)
                          nextNode = testNode.firstChild
                        }
                    })
                  }
                  if ($nextPos && nextNode) {
                    if (
                      ['file', 'embed', 'image', 'video'].includes(
                        nextNode.type.name,
                      )
                    ) {
                      return false
                    }
                    const mergedTextContent =
                      node.contentNode.textContent + nextNode.textContent
                    const newNode = view.state.schema.node(
                      node.contentType.name,
                      node.contentNode.attrs,
                      view.state.schema.text(
                        mergedTextContent,
                        node.contentNode.lastChild?.marks,
                      ),
                      node.contentNode.marks,
                    )
                    tr.deleteRange(
                      $nextPos.start() - 1,
                      $nextPos.end() < $nextPos.start() + nextNode.nodeSize
                        ? $nextPos.end() + 1
                        : $nextPos.start() + nextNode.nodeSize + 1,
                    )
                    tr.replaceWith($pos.start() - 1, $pos.end() + 1, newNode)
                    view.dispatch(tr)
                    return true
                  }
                  return false
                }
              }
            }
            return false
          },
        },
      }),
    ]
  },
})
