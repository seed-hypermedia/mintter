import {usePublication} from '@app/models/documents'
import {useDocPublications} from '@app/models/sites'
import {toast} from '@app/toast'
import {getDocUrl} from '@app/utils/doc-url'
import {isMintterScheme} from '@app/utils/mintter-link'
import {useNavigate} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Tooltip} from '@components/tooltip'
import {AccessURLRow} from '@components/url'
import {flip, inline, offset, shift, useFloating} from '@floating-ui/react-dom'
import {getIdsfromUrl} from '@mintter/shared'
import {Button, XStack} from '@mintter/ui'
import {ChevronRightSquare, Pencil, X} from '@tamagui/lucide-icons'
import {P} from '@tauri-apps/api/event-2a9960e7'
import {createContext, ReactNode, useContext, useEffect, useState} from 'react'
import {ReactEditor, useSlate, useSlateSelection} from 'slate-react'

type LinkState = {
  isSelected: boolean
  element: any
  onUpdate: (url: string | null) => void
  hyper?: {}
}

type LinkingPanelContextType = {
  onLinkState: (linkState: LinkState) => void
}

const LinkingPanel = createContext<null | LinkingPanelContextType>(null)

export function useLinkingPanel(): Partial<LinkingPanelContextType> {
  const ctx = useContext(LinkingPanel)
  if (!ctx) return {}
  return ctx
}
const baseShadow = {
  shadowColor: '#0004',
  shadowRadius: 8,
} as const

function RemoveLinkButton({
  onUpdate,
}: {
  onUpdate: (url: string | null) => void
}) {
  return (
    <Tooltip content="Remove Link">
      <Button
        theme="red"
        chromeless
        size="$2"
        onPress={() => {
          onUpdate(null)
        }}
        icon={X}
      />
    </Tooltip>
  )
}

function EditLinkButton({}: {}) {
  return (
    <Tooltip content="Edit Link">
      <Button chromeless size="$2" onPress={() => {}} icon={Pencil} />
    </Tooltip>
  )
}

function PanelContainer({children}: {children: ReactNode}) {
  return (
    <XStack
      gap="$2"
      padding="$2"
      backgroundColor={'$background'}
      {...baseShadow}
      borderRadius="$4"
    >
      {children}
    </XStack>
  )
}

function HyperLinkingPanel({
  url,
  onUpdate,
}: {
  url: string
  onUpdate?: (url: string | null) => void
}) {
  const [docId, version, blockRef] = getIdsfromUrl(url)
  const {data: pub} = usePublication({
    documentId: docId,
    versionId: version,
  })
  const webPubs = useDocPublications(docId)
  const webPub = webPubs.data?.find(
    (pub) => docId && pub.hostname === webUrl && pub.documentId === docId,
  )
  const webUrl = getDocUrl(pub, webPub)
  const navigate = useNavigate()
  return (
    <PanelContainer>
      {url && docId && (
        <AccessURLRow
          url={webUrl || url}
          icon={ChevronRightSquare}
          onPress={() => {
            navigate({
              key: 'publication',
              documentId: docId,
              versionId: version,
              blockId: blockRef,
            })
          }}
          title={pub?.document?.title || '??'}
        />
      )}
      {onUpdate ? <RemoveLinkButton onUpdate={onUpdate} /> : null}
    </PanelContainer>
  )
}
function WebLinkingPanel({
  url,
  onUpdate,
}: {
  url: string
  onUpdate?: (url: string | null) => void
}) {
  return (
    <PanelContainer>
      {url && <AccessURLRow url={url} title={hostnameStripProtocol(url)} />}
      <EditLinkButton />
      {onUpdate ? <RemoveLinkButton onUpdate={onUpdate} /> : null}
    </PanelContainer>
  )
}

function LinkingPanelOverlay({
  linkState,
  onClearLinkState,
}: {
  linkState: LinkState | null
  onClearLinkState: () => void
}) {
  const editor = useSlate()
  // const inFocus = useFocused()

  const selection = useSlateSelection()
  // const [mouseDown, setMouseDown] = useState(false)
  // function handleMouseDown() {
  //   setMouseDown(true)
  // }

  // function handleMouseUp() {
  //   setMouseDown(false)
  // }

  const {x, y, reference, floating, strategy} = useFloating({
    placement: 'top',
    middleware: [inline(), offset(8), shift(), flip()],
    strategy: 'absolute',
  })

  useEffect(() => {
    // if (
    //   mouseDown ||
    //   !selection ||
    //   !inFocus ||
    //   Range.isCollapsed(selection) ||
    //   Editor.string(editor, selection) === ''
    // ) {
    //   document.onmousedown = handleMouseDown
    //   document.onmouseup = handleMouseUp
    //   return reference(defaultVirtualEl)
    // }
    if (!selection) return
    // document.onmousedown = null
    // document.onmouseup = null
    // setMouseDown(false)
    const domRange = ReactEditor.toDOMRange(editor, selection)
    reference(domRange)
  }, [
    reference,
    //inFocus,
    selection,
    // mouseDown
  ])
  const visible = !!linkState?.isSelected
  const url = linkState?.element?.url

  function handleUpdate(url: string | null) {
    if (!linkState) return
    linkState.onUpdate(url)
    if (url === null) onClearLinkState()
  }
  let content = null
  if (isMintterScheme(url) && linkState) {
    content = <HyperLinkingPanel url={url} onUpdate={handleUpdate} />
  } else if (url && linkState) {
    content = <WebLinkingPanel url={url} onUpdate={handleUpdate} />
  }

  return (
    <XStack
      ref={floating}
      position="absolute"
      top={y && y > 0 ? y : -999}
      left={x && x > 0 ? x : -999}
      zIndex={10000}
      display={visible ? undefined : 'none'}
      minWidth={200}
      minHeight={200}
      onPointerDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
    >
      {content}
    </XStack>
  )
}

export function LinkingPanelProvider(props: {children: ReactNode}) {
  const [linkState, setLinkState] = useState<LinkState | null>(null)
  return (
    <>
      <LinkingPanel.Provider
        value={{
          onLinkState: (linkState) => {
            setLinkState(linkState)
          },
        }}
      >
        {props.children}
      </LinkingPanel.Provider>
      <LinkingPanelOverlay
        linkState={linkState}
        onClearLinkState={() => {
          setLinkState(null)
        }}
      />
    </>
  )
}
