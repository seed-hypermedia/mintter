import { BlockNoteEditor } from '@/editor'
import { YStack } from '@shm/ui'
import { useMemo, useState } from 'react'
import { HyperMediaEditorView } from 'src/components/editor'
import { AppDocContentProvider } from './document-content-provider'

export default function DraftRebase() {
  // const [state, send, actor] = useDraftRebase()
  const [timer, setTimer] = useState(false)
  const editor = useMemo(() => {
    let res = new BlockNoteEditor({
      initialContent: [
        {
          type: 'paragraph',
          id: 'foo',
          props: {
            diff: 'deleted',
          },
          content: [
            {
              type: 'text',
              text: 'Hello World!',
              styles: {},
            },
          ],
        },
        {
          type: 'paragraph',
          id: 'foo1',
          props: {
            diff: 'added',
          },
          content: [
            {
              type: 'text',
              text: 'Hello World!',
              styles: {},
            },
          ],
        },
        {
          type: 'paragraph',
          id: 'foo2',
          props: {
            diff: 'updated',
          },
          content: [
            {
              type: 'text',
              text: 'Hello World!',
              styles: {},
            },
          ],
        },
      ],
    })
    setTimer(true)
    return res
  }, [])

  return (
    <YStack>
      <AppDocContentProvider disableEmbedClick>
        <YStack id="editor-title" onPress={(e) => e.stopPropagation()}>
          <YStack className="editor" paddingLeft={32}>
            {editor && timer && editor.topLevelBlocks.length ? (
              <HyperMediaEditorView editable={true} editor={editor} />
            ) : null}
          </YStack>
        </YStack>
      </AppDocContentProvider>
      <pre>
        <code>{JSON.stringify(editor.topLevelBlocks)}</code>
      </pre>
    </YStack>
  )
}
