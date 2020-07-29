import {useCallback, useState} from 'react'

import {
  Range,
  Editor,
  Transforms,
  // Transforms, Path
} from 'slate'
// import {nodeTypes} from '../nodeTypes'
import {
  getNextIndex,
  getPreviousIndex,
  getText,
  isCollapsed,
  isWordAfterTrigger,
  isPointAtWordEnd,
} from '@udecode/slate-plugins'
import {insertBlock} from './transforms'

export interface HelperOptionsNodeData {
  name: string
  type: string
}

export interface UseHelperOptions {
  trigger?: string
}

export const useHelper = (
  options: HelperOptionsNodeData[],
  {trigger = '/', ...restOptions}: UseHelperOptions = {},
) => {
  const [targetRange, setTargetRange] = useState<Range | null>(null)
  const [valueIndex, setValueIndex] = useState(0)
  const [search, setSearch] = useState('')
  const values = options.filter((o: HelperOptionsNodeData) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  )

  const onAddBlock = useCallback(
    (editor: Editor, block: HelperOptionsNodeData) => {
      if (targetRange !== null) {
        Transforms.select(editor, targetRange)
        insertBlock(editor, block, targetRange, restOptions)
        return setTargetRange(null)
      }
    },
    [restOptions, targetRange],
  )

  const onKeyDownHelper = useCallback(
    (e: any, editor: Editor) => {
      if (targetRange) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          return setValueIndex(getNextIndex(valueIndex, values.length - 1))
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          return setValueIndex(getPreviousIndex(valueIndex, values.length - 1))
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          return setTargetRange(null)
        }

        if (['Tab', 'Enter'].includes(e.key)) {
          e.preventDefault()
          return onAddBlock(editor, values[valueIndex])
        }
      }
    },
    [
      values,
      valueIndex,
      setValueIndex,
      targetRange,
      setTargetRange,
      onAddBlock,
    ],
  )

  const onChangeHelper = useCallback(
    (editor: Editor) => {
      const {selection} = editor

      if (selection && isCollapsed(selection)) {
        const cursor = Range.start(selection)
        const [, parentPath] = Editor.parent(editor, selection)

        const val = getText(editor, parentPath)
        if (val === trigger) {
          setTargetRange(selection)
          setSearch('')
          setValueIndex(0)
          return
        } else {
          setTargetRange(null)
        }

        const {range, match: beforeMatch} = isWordAfterTrigger(editor, {
          at: cursor,
          trigger,
        })

        if (beforeMatch && isPointAtWordEnd(editor, {at: cursor})) {
          setTargetRange(range as Range)
          const [, word] = beforeMatch
          setSearch(word)
          setValueIndex(0)
          return
        }
      }
    },
    [setTargetRange, setSearch, setValueIndex, trigger],
  )

  return {
    search,
    index: valueIndex,
    target: targetRange,
    setValueIndex,
    values,
    onChangeHelper,
    onKeyDownHelper,
    onAddBlock,
  }
}
