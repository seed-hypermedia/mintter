import {toolsTargetStyles} from '@app/editor/styles'
import {classnames} from '@app/utils/classnames'
import {VariantProps} from '@stitches/react'

export function BlockToolsTarget(
  props: VariantProps<typeof toolsTargetStyles>,
) {
  return (
    <span
      contentEditable={false}
      className={classnames(toolsTargetStyles(props), 'blocktools-target')}
    />
  )
}
