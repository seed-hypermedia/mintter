import {BlockSchema} from '@/blocknote/core'
import {ReactNode} from 'react'

import {XStack} from '@mintter/ui'
import {Trash} from '@tamagui/lucide-icons'
import {DragHandleMenuProps} from '../DragHandleMenu'
import {DragHandleMenuItem} from '../DragHandleMenuItem'

export const RemoveBlockButton = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema> & {children: ReactNode},
) => {
  return (
    <DragHandleMenuItem
      onClick={() => props.editor.removeBlocks([props.block])}
    >
      <XStack gap="$2">
        <Trash size={14} />
        {props.children}
      </XStack>
    </DragHandleMenuItem>
  )
}
