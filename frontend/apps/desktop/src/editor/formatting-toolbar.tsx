import {
  BlockNoteEditor,
  BlockSchema,
  RequiredStaticParams,
} from '@blocknote/core'
import {Toolbar} from './blocknote/Toolbar'
import {ColorStyleButton} from './blocknote/ColorStyleButton'
import {CreateLinkButton} from './blocknote/CreateLinkButton'
import {NestBlockButton, UnnestBlockButton} from './blocknote/NestBlockButtons'
import {ToggledStyleButton} from './blocknote/ToggledStyleButton'
import {BlockTypeDropdown} from './blocknote/BlockTypeDropdown'
import {ReactElementFactory} from './blocknote/ReactElementFactory'
import {getBlockNoteTheme} from './blocknote/BlockNoteTheme'

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
