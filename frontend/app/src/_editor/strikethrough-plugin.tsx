import {css} from '@mintter/ui/stitches.config'
import type {AutoformatRule} from '@udecode/slate-plugins-autoformat'
import {DEFAULTS_STRIKETHROUGH, MARK_STRIKETHROUGH} from '@udecode/slate-plugins-basic-marks'
import type {SlatePluginOptions, SPRenderLeafProps} from '@udecode/slate-plugins-core'
import type {EditorTextRun} from './types'

export type StrikethroughOptions = {
  [MARK_STRIKETHROUGH]: SlatePluginOptions
}

export const strikethroughOptions: StrikethroughOptions = {
  [MARK_STRIKETHROUGH]: {
    ...DEFAULTS_STRIKETHROUGH,
    //@ts-ignore
    component: StrikethroughLeaf,
  },
}

export const strikethroughAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_STRIKETHROUGH,
    between: ['~~', '~~'],
    mode: 'inline',
    insertTrigger: true,
  },
]

const styleClass = css({
  textDecoration: 'line-through',
})

export function StrikethroughLeaf({attributes, children, leaf, ...rest}: SPRenderLeafProps<EditorTextRun>) {
  if (leaf.strikethrough) {
    return (
      <span className={styleClass()} {...attributes}>
        {children}
      </span>
    )
  }
}
