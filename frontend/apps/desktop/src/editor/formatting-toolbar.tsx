import {
  BlockNoteEditor,
  BlockSchema,
  RequiredStaticParams,
} from '@app/blocknote-core'
import {Toolbar, getBlockNoteTheme} from '@app/blocknote-react'
import {ColorStyleButton} from '@app/blocknote-react'
import {CreateLinkButton} from '@app/blocknote-react'
import {NestBlockButton, UnnestBlockButton} from '@app/blocknote-react'
import {ToggledStyleButton} from '@app/blocknote-react'
import {BlockTypeDropdown} from '@app/blocknote-react'
import {ReactElementFactory} from '@app/blocknote-react'
import {blockNoteColorScheme} from '@app/blocknote-react'

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
      <ToggledStyleButton editor={props.editor} toggledStyle={'code'} />

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
