import {findPath} from '@app/editor/utils'
import {useFileEditor} from '@app/file-provider'
import {
  FlowContent,
  GroupingContent,
  isFlowContent,
  isGroupContent,
  Paragraph,
  StaticParagraph,
} from '@app/mttast'
import {useMemo} from 'react'
import {Editor} from 'slate'

export function useBlockProps(element: FlowContent) {
  let editor = useFileEditor()
  let path = findPath(element)
  let parentGroup = Editor.above<GroupingContent>(editor, {
    match: isGroupContent,
    mode: 'lowest',
    at: path,
  })

  return useMemo(memoizedProps, [element, parentGroup])

  function memoizedProps() {
    return {
      blockProps: {
        'data-element-type': element.type,
        'data-block-id': element.id,
        'data-parent-group': parentGroup?.[0].type,
      },
      parentNode: parentGroup?.[0],
      parentPath: parentGroup?.[1],
    }
  }
}

export function usePhrasingProps(element: Paragraph | StaticParagraph) {
  let editor = useFileEditor()
  let path = findPath(element)
  let parentBlock = Editor.above<FlowContent>(editor, {
    match: isFlowContent,
    mode: 'lowest',
    at: path,
  })

  return useMemo(memoizeProps, [element, parentBlock])

  function memoizeProps() {
    return {
      elementProps: {
        'data-element-type': element.type,
        'data-parent-block': parentBlock?.[0].id,
      },
      parentNode: parentBlock?.[0],
      parentPath: parentBlock?.[1],
    }
  }
}
