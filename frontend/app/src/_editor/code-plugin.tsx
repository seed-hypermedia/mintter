import {Box} from '@mintter/ui'
import type {AutoformatRule} from '@udecode/slate-plugins-autoformat'
import {DEFAULTS_CODE, MARK_CODE} from '@udecode/slate-plugins-basic-marks'
import type {SlatePluginComponent, SlatePluginOptions, SPRenderLeafProps} from '@udecode/slate-plugins-core'
import type {EditorTextRun} from './types'

export type CodeOptions = {
  [MARK_CODE]: SlatePluginOptions
}

export const codeOptions: CodeOptions = {
  //@ts-ignore
  [MARK_CODE]: {
    ...DEFAULTS_CODE,
    component: CodeLeaf as SlatePluginComponent,
  },
}

export const codeAutoformatRules: AutoformatRule[] = [
  {
    type: MARK_CODE,
    between: ['`', '`'],
    mode: 'inline',
    insertTrigger: true,
  },
]

export function CodeLeaf({attributes, children, leaf}: SPRenderLeafProps<EditorTextRun>) {
  if (leaf.code) {
    return (
      <Box
        as="code"
        css={{
          paddingHorizontal: '$3',
          paddingVetical: '$3',
          fontSize: '$2',
          backgroundColor: '$background-contrast-strong',
          borderRadius: '$2',
          color: '$text-contrast',
        }}
        {...attributes}
      >
        {children}
      </Box>
    )
  }
}
