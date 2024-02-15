import {Checkbox} from '@mantine/core'
import {useCallback, useRef, useState} from 'react'
import {RiExternalLinkFill, RiLinkUnlink} from 'react-icons/ri'
import {HyperlinkToolbarProps} from './HyperlinkToolbarPositioner'

import {createHmDocLink, isHypermediaScheme, unpackHmId} from '@mintter/shared'
import {Toolbar} from '../../SharedComponents/Toolbar/components/Toolbar'
import {ToolbarButton} from '../../SharedComponents/Toolbar/components/ToolbarButton'
import {EditHyperlinkMenu} from '../EditHyperlinkMenu/components/EditHyperlinkMenu'

export const DefaultHyperlinkToolbar = (
  props: HyperlinkToolbarProps & {
    openUrl: (url?: string | undefined, newWindow?: boolean | undefined) => void
  },
) => {
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const editMenuRef = useRef<HTMLDivElement | null>(null)
  const editCheckboxRef = useRef<any | null>(null)
  const isHmHref = isHypermediaScheme(props.url)
  const [currentLatest, setCurrentLatest] = useState(() => {
    if (isHmHref) {
      if (props.url.includes('&l') || props.url.includes('?l')) {
        return true
      }
    }
    return false
  })

  const handleLatest = useCallback(
    (versionMode: boolean) => {
      let unpackedRef = unpackHmId(props.url)
      if (unpackedRef) {
        let newUrl = createHmDocLink({
          documentId: unpackedRef?.qid,
          version: unpackedRef?.version,
          blockRef: unpackedRef?.blockRef,
          variants: unpackedRef?.variants,
          latest: versionMode,
        })
        setCurrentLatest(versionMode)
        props.editHyperlink(newUrl, props.text, true)
      }
    },
    [props.url],
  )

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        editCheckboxRef={editCheckboxRef}
        isLatest={currentLatest}
        handleLatest={handleLatest}
        update={(url, text, latest) => {
          props.editHyperlink(url, text, latest)
        }}
        // TODO: Better way of waiting for fade out
        onBlur={(event) =>
          setTimeout(() => {
            if (
              editMenuRef.current?.contains(event.relatedTarget) ||
              /**
               * this is needed because if we interact with the checkbox inside
               * the edit component, we dont want to close the edit component
               */
              editCheckboxRef.current === event.target
            ) {
              return
            }
            setIsEditing(false)
          }, 500)
        }
        ref={editMenuRef}
      />
    )
  }

  return (
    <Toolbar
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}
    >
      <ToolbarButton
        mainTooltip="Edit"
        isSelected={false}
        onClick={() => setIsEditing(true)}
      >
        Edit Link
      </ToolbarButton>
      {isHmHref ? (
        <ToolbarButton
          mainTooltip="Link to Latest version"
          secondaryTooltip="This Hypermedia Link will send to the latest available version"
          isSelected={false}
        >
          <Checkbox
            size="xs"
            checked={currentLatest}
            label="Latest"
            onChange={(event) => {
              setCurrentLatest(event.currentTarget.checked)
              handleLatest(event.currentTarget.checked)
            }}
          />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        mainTooltip="Open in New Window"
        isSelected={false}
        onClick={() => {
          props.openUrl(props.url, true)
        }}
        icon={RiExternalLinkFill}
      />
      <ToolbarButton
        mainTooltip="Remove link"
        isSelected={false}
        onClick={props.deleteHyperlink}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  )
}
