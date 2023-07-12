import {
  BlockNoteEditor,
  DefaultBlockSchema,
  defaultBlockSchema,
} from '@app/blocknote-core'
import '@app/blocknote-core/style.css'
import {BlockNoteView, useBlockNote} from '@app/blocknote-react'
import {Container, MainWrapper, YStack} from '@mintter/ui'

type HyperdocsBlockSchema = Omit<
  DefaultBlockSchema,
  'bulletListItem' | 'numberedListItem'
>

export default function BlockNoteDemo() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor<HyperdocsBlockSchema> | null =
    useBlockNote<HyperdocsBlockSchema>({
      theme: 'dark',
      onEditorContentChange(editor) {
        console.log('content change!', editor)
      },
      blockSchema: {
        paragraph: defaultBlockSchema.paragraph,
        heading: defaultBlockSchema.heading,
      },
    })

  return (
    <MainWrapper>
      <YStack className="editor" maxWidth={600}>
        <h1>BlockNote demo</h1>
        <BlockNoteView editor={editor} />
      </YStack>
    </MainWrapper>
  )
}
