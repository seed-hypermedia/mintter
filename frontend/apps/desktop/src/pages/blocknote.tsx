import {
  BlockNoteEditor,
  BlockNoteView,
  defaultBlockSchema,
  HMBlockSchema,
  useBlockNote,
} from '@/editor'
import {YStack} from '@shm/ui'

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
    <YStack className="editor" maxWidth={600}>
      <h1>BlockNote demo</h1>
      <BlockNoteView editor={editor} />
    </YStack>
  )
}
