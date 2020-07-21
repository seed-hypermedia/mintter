import {useCallback, useState} from 'react'

import {Range, Editor, Transforms, Path} from 'slate'
import {nodeTypes} from '../nodeTypes'
import {getNextIndex, getPreviousIndex, getText} from '@udecode/slate-plugins'

const options = [
  {
    type: nodeTypes.typeBlock,
    name: 'Text Block',
  },
  {
    type: nodeTypes.typeImg,
    name: 'Image Block',
  },
]

export const useHelper = () => {
  const [targetRange, setTargetRange] = useState<Range | null>(null)
  const [valueIndex, setValueIndex] = useState(0)

  const onAddBlock = useCallback((editor: Editor, blockType) => {
    console.log('onAddBlock -> blockType', blockType)
    if (editor.selection) {
      const [paragraphNode, paragraphPath] = Editor.parent(
        editor,
        editor.selection,
      )
      if (paragraphNode.type === nodeTypes.typeP) {
        const [blockNode, blockPath] = Editor.parent(editor, paragraphPath)

        if (blockNode.type === nodeTypes.typeBlock) {
          console.log('onAddBlock -> blockPath', blockPath)
          Transforms.insertNodes(
            editor,
            {type: blockType, url: '', children: [{text: ''}]},
            {at: blockPath},
          )
          console.log('block text => ', getText(editor, blockPath))
          console.log('next block path', Path.next(blockPath))

          setTargetRange(null)
        }
      }
    }

    /*
    if (blockType !== nodeTypes.typeBlock) {
      const match = Editor.above(editor, {
        match: n => n.type === nodeTypes.typeBlock,
      })

      if (match) {
        const [, path] = match

        // Transforms.setNodes(editor, {text: ''}, {at: path})

        Transforms.insertNodes(
          editor,
          {
            type: nodeTypes.typeImg,
            url: '',
            children: [{text: ''}],
          },
          {
            at: path,
          },
        )
        Transforms.move(editor)
      }
    }
    */
  }, [])

  const onKeyDownHelper = useCallback(
    (e: any, editor: Editor) => {
      if (targetRange) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          return setValueIndex(getNextIndex(valueIndex, options.length - 1))
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          return setValueIndex(getPreviousIndex(valueIndex, options.length - 1))
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          return setTargetRange(null)
        }

        if (['Tab', 'Enter'].includes(e.key)) {
          e.preventDefault()
          return onAddBlock(editor, options[valueIndex].type)
        }
      } else {
        if (
          e.key === '/' &&
          editor.selection &&
          Range.isCollapsed(editor.selection)
        ) {
          const {anchor} = editor.selection
          const block = Editor.above(editor, {
            match: n => Editor.isBlock(editor, n),
          })

          const path = block ? block[1] : []
          const beforeText = Editor.string(editor, path)

          const start = Editor.start(editor, path)

          const range = {anchor, focus: start}

          if (!beforeText) {
            setTargetRange(range)
            return
          }
        }
      }

      setTargetRange(null)
    },
    [targetRange, setTargetRange, onAddBlock, valueIndex],
  )

  return {
    index: valueIndex,
    target: targetRange,
    options,
    onKeyDownHelper,
    onAddBlock,
  }
}
