import {
  BlockNoteEditor,
  BlockSchema,
  RequiredStaticParams,
} from '@mintter/app/src/blocknote-core'
import {
  BlockTypeDropdown,
  CreateLinkButton,
  getBlockNoteTheme,
  NestBlockButton,
  ReactElementFactory,
  ToggledStyleButton,
  Toolbar,
  UnnestBlockButton,
} from '@mintter/app/src/blocknote-react'

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

      {/* <ColorStyleButton editor={props.editor} /> */}

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
