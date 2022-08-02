import {toolsTargetStyles} from '@app/editor/styles'
import {VariantProps} from '@stitches/react'

export function BlockToolsTarget(
  props: VariantProps<typeof toolsTargetStyles>,
) {
  return (
    <span
      contentEditable={false}
      className={[toolsTargetStyles(props), 'blocktools-target'].join(' ')}
    />
  )
}
