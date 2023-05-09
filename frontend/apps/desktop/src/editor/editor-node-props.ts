import {findPath} from '@app/editor/utils'
import {
  FlowContent,
  GroupingContent,
  isFlowContent,
  isGroupContent,
  Paragraph,
  StaticParagraph as StaticParagraphType,
} from '@mintter/shared'
import {useMemo} from 'react'
import {Editor} from 'slate'

export function useBlockProps(editor: Editor, element: FlowContent) {
  return useMemo(() => {
    let path = findPath(element)
    let parentGroup = Editor.above<GroupingContent>(editor, {
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })
    return {
      blockPath: path,
      blockProps: {
        'data-element-type': element.type,
        'data-block-id': element.id,
      },
      parentNode: parentGroup?.[0],
      parentPath: parentGroup?.[1],
    }
  }, [element])
}

export function usePhrasingProps(
  editor: Editor,
  element: Paragraph | StaticParagraphType,
) {
  return useMemo(() => {
    let path = findPath(element)

    let parentBlock = Editor.above<FlowContent>(editor, {
      match: isFlowContent,
      mode: 'lowest',
      at: path,
    })

    let parentGroup = Editor.above<GroupingContent>(editor, {
      match: isGroupContent,
      mode: 'lowest',
      at: path,
    })

    let elementProps = {
      'data-element-type': element.type,
      'data-parent-block': parentBlock?.[0].id,
      'data-parent-group': parentGroup?.[0].type,
    }

    return {
      elementProps,
      parentNode: parentBlock?.[0],
      parentPath: parentBlock?.[1],
    }
  }, [element])
}
