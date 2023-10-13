import {
  BlockNoteEditor,
  defaultBlockSchema,
  HMBlockSchema,
} from '@mintter/editor'
// import '@mintter/editor/style.css'
import {BlockNoteView, useBlockNote} from '@mintter/editor'
import {MainWrapper, YStack} from '@mintter/ui'

export default function BlockNoteDemo() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor<HMBlockSchema> | null =
    useBlockNote<HMBlockSchema>({
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
