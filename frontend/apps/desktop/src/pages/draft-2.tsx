// import 'show-keys'
import {AppBanner, BannerText} from '@app/app-banner'
import {Editor, plugins, useDraftEditor} from '@app/editor/editor'
import {EditorHoveringToolbar} from '@app/editor/hovering-toolbar'
import {Node} from '@tiptap/core'
import {Plugin} from 'prosemirror-state'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {useDraftEditor2, useEditorDraft} from '@app/models/documents'
import {useDaemonReady} from '@app/node-status-context'
import {AppError} from '@app/root'
import {useNavRoute} from '@app/utils/navigation'
import {
  BlockNoteEditor,
  Block,
  StyledText,
  DefaultBlockSchema,
  Props,
  defaultProps,
  DefaultProps,
} from '@blocknote/core'
import {useBlockNote, BlockNoteView} from '@blocknote/react'
import Footer from '@components/footer'
import {Placeholder} from '@components/placeholder-box'
import {
  group,
  GroupingContent,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import '@blocknote/core/style.css'
import {
  Button,
  Container,
  MainWrapper,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {useInterpret} from '@xstate/react'
import {useEffect, useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Editor as SlateEditor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

let emptyEditorValue = group({data: {parent: ''}}, [
  statement([paragraph([text('')])]),
])

export default function DraftPage() {
  let route = useNavRoute()
  if (route.key != 'draft')
    throw new Error('Draft actor must be passed to DraftPage')

  const [debugValue, setDebugValue] = useState(false)
  const documentId = route.draftId // TODO, clean this up when draftId != docId

  const editor = useDraftEditor2(documentId)

  let isDaemonReady = useDaemonReady()

  // useTauriListeners(editor)

  return (
    <ErrorBoundary
      FallbackComponent={AppError}
      onReset={() => window.location.reload()}
    >
      <MainWrapper>
        <Container>
          <YStack>
            {!isDaemonReady ? <NotSavingBanner /> : null}
            <BlockNoteView editor={editor.editor} />
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
    </ErrorBoundary>
  )
}

function useInitialFocus(editor: SlateEditor) {
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (editor.children.length == 0) return

      ReactEditor.focus(editor)
      Transforms.select(editor, SlateEditor.end(editor, []))

      if (ReactEditor.isFocused(editor)) {
        clearInterval(intervalId)
      }
    }, 10)
  }, [editor])
}

function DraftShell() {
  // TODO: update shell
  return (
    <YStack
      marginTop="$7"
      width="100%"
      maxWidth="600px"
      gap="$6"
      marginHorizontal="auto"
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack width="600px" gap="$2">
      <Placeholder width="100%" />
      <Placeholder width="92%" />
      <Placeholder width="84%" />
      <Placeholder width="90%" />
    </YStack>
  )
}

function NotSavingBanner() {
  return (
    <AppBanner>
      <BannerText>The Draft is not being saved right now.</BannerText>
    </AppBanner>
  )
}

// let document = {
// 	// ...
// 	children: [
// 		{
// 			id: 'wertyuiop',
// 			type: 'paragraph',
// 			content: 'Hello world',
// 			annotations: [],
// 			attributes: {},
//      children: [],
// 		}
// 	]
// }
