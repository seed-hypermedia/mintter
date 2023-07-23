import {RiIndentDecrease, RiIndentIncrease} from 'react-icons/ri'

import {BlockNoteEditor, BlockSchema} from '@mintter/app/src/blocknote-core'
import {useCallback} from 'react'
import {ToolbarButton} from '../../../SharedComponents/Toolbar/components/ToolbarButton'
import {formatKeyboardShortcut} from '../../../utils'

export const NestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>
}) => {
  const nestBlock = useCallback(() => {
    props.editor.focus()
    props.editor.nestBlock()
  }, [props.editor])

  return (
    <ToolbarButton
      onClick={nestBlock}
      isDisabled={!props.editor.canNestBlock()}
      mainTooltip="Nest Block"
      secondaryTooltip={formatKeyboardShortcut('Tab')}
      icon={RiIndentIncrease}
    />
  )
}

export const UnnestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>
}) => {
  const unnestBlock = useCallback(() => {
    props.editor.focus()
    props.editor.unnestBlock()
  }, [props])

  return (
    <ToolbarButton
      onClick={unnestBlock}
      isDisabled={!props.editor.canUnnestBlock()}
      mainTooltip="Unnest Block"
      secondaryTooltip={formatKeyboardShortcut('Shift+Tab')}
      icon={RiIndentDecrease}
    />
  )
}
