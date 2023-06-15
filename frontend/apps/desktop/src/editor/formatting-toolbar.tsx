import {
  BlockNoteEditor,
  BlockSchema,
  RequiredStaticParams,
} from '@mtt-blocknote/core'
import {Toolbar, getBlockNoteTheme} from '@mtt-blocknote/react'
import {ColorStyleButton} from '@mtt-blocknote/react'
import {CreateLinkButton} from '@mtt-blocknote/react'
import {NestBlockButton, UnnestBlockButton} from '@mtt-blocknote/react'
import {ToggledStyleButton} from '@mtt-blocknote/react'
import {BlockTypeDropdown} from '@mtt-blocknote/react'
import {ReactElementFactory} from '@mtt-blocknote/react'
import {blockNoteColorScheme} from '@mtt-blocknote/react'

console.log('blockNoteColorScheme', blockNoteColorScheme)

export const FormattingToolbar = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>
}) => {
  return (
    <Toolbar>
      <BlockTypeDropdown {...props} />

      <ToggledStyleButton editor={props.editor} toggledStyle={'bold'} />
      <ToggledStyleButton editor={props.editor} toggledStyle={'italic'} />
      <ToggledStyleButton editor={props.editor} toggledStyle={'underline'} />
      <ToggledStyleButton editor={props.editor} toggledStyle={'strike'} />

      <ColorStyleButton editor={props.editor} />

      <NestBlockButton editor={props.editor} />
      <UnnestBlockButton editor={props.editor} />

      <CreateLinkButton editor={props.editor} />
    </Toolbar>
  )
}

export const formattingToolbarFactory = (
  staticParams: RequiredStaticParams,
) => {
  return ReactElementFactory<any, any>(
    staticParams,
    FormattingToolbar,
    getBlockNoteTheme(false),
    {
      animation: 'fade',
      placement: 'top-start',
    },
  )
}
