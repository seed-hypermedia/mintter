import {HyperDocsEditor} from '@mintter/app/models/documents'
import {useOpenUrl} from '@mintter/app/open-url'
import {createHmDocLink, unpackHmId} from '@mintter/shared'
import {
  Button,
  Check,
  Checkbox,
  ExternalLink,
  Input,
  Label,
  LinkIcon,
  Separator,
  SizeTokens,
  TextCursorInput,
  Theme,
  Tooltip,
  Unlink,
  XStack,
  YStack,
} from '@mintter/ui'
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  HyperlinkToolbarProps,
  LinkMenuPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
} from './blocknote'
import './blocknote/core/style.css'
import './editor.css'

export function HyperMediaEditorView({
  editor,
}: {
  editor: HyperDocsEditor
  editable: boolean
}) {
  const openUrl = useOpenUrl()
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner
        hyperlinkToolbar={HypermediaLinkToolbar}
        editor={editor}
        openUrl={openUrl}
      />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} placement="left" />
      <LinkMenuPositioner editor={editor} />
    </BlockNoteView>
  )
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return (
    <YStack
      className="editor"
      onPress={(e) => {
        e.stopPropagation()
      }}
    >
      {children}
    </YStack>
  )
}

function HypermediaLinkToolbar(
  props: HyperlinkToolbarProps & {
    openUrl: (url?: string | undefined, newWindow?: boolean | undefined) => void
  },
) {
  const unpackedRef = unpackHmId(props.url)

  console.log(`== ~ HypermediaLinkToolbar ~ props.url:`, props.url)

  const formSize: SizeTokens = '$2'

  return (
    <Theme name="blue">
      <YStack
        p="$2"
        gap="$2"
        borderRadius="$4"
        overflow="hidden"
        bg="$backgroundStrong"
        elevation="$3"
        zIndex="$zIndex.5"
        bottom="0"
        position="absolute"
        onMouseEnter={props.stopHideTimer}
        onMouseLeave={props.startHideTimer}
      >
        <XStack ai="center" gap="$2" p="$1">
          <TextCursorInput size={12} />
          <Input
            flex={1}
            size={formSize}
            placeholder="link text"
            id="link-text"
            key={props.text}
            value={props.text}
          />
        </XStack>
        <XStack ai="center" gap="$2" p="$1">
          <LinkIcon size={12} />
          <Input flex={1} size="$2" key={props.url} value={props.url} />
        </XStack>
        <Separator />
        <YStack p="$1">
          <XStack ai="center" gap="$2">
            {unpackedRef ? (
              <Tooltip content="Link to latest version?">
                <XStack ai="center" minWidth={200} gap="$2">
                  <Checkbox
                    id="link-latest"
                    key={props.url}
                    size="$2"
                    defaultChecked={!!unpackedRef.latest}
                    onCheckedChange={(newValue) => {
                      let newUrl = createHmDocLink({
                        documentId: unpackedRef?.qid,
                        version: unpackedRef?.version,
                        blockRef: unpackedRef?.blockRef,
                        variants: unpackedRef?.variants,
                        latest: newValue != 'indeterminate' ? newValue : false,
                      })

                      console.log('== NEW URL', newValue)

                      props.editHyperlink(newUrl, props.text, true)
                    }}
                  >
                    <Checkbox.Indicator>
                      <Check />
                    </Checkbox.Indicator>
                  </Checkbox>
                  <Label htmlFor="link-latest" size={formSize}>
                    Link to Latest Version
                  </Label>
                </XStack>
              </Tooltip>
            ) : null}
            <Tooltip content="Open in a new Window">
              <Button
                chromeless
                size="$1"
                icon={Unlink}
                onPress={props.deleteHyperlink}
              />
            </Tooltip>
            <Tooltip content="Open in a new Window">
              <Button
                chromeless
                size="$1"
                icon={ExternalLink}
                onPress={() => props.openUrl(props.url, true)}
              />
            </Tooltip>
          </XStack>
        </YStack>
      </YStack>
    </Theme>
  )
}
