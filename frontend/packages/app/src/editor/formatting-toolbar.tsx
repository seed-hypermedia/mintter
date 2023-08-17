import {
  BlockNoteEditor,
  BlockSchema,
  RequiredStaticParams,
} from '@mintter/app/src/blocknote-core'
import {
  BlockTypeDropdown,
  CreateLinkButton,
  blockNoteToMantineTheme,
  NestBlockButton,
  ReactElementFactory,
  ToggledStyleButton,
  Toolbar,
  UnnestBlockButton,
  darkDefaultTheme,
  lightDefaultTheme,
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
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  return ReactElementFactory<any, any>(
    staticParams,
    FormattingToolbar,
    blockNoteToMantineTheme(preferDark ? darkDefaultTheme : lightDefaultTheme),
    {
      animation: 'fade',
      placement: 'top-start',
    },
  )
}
