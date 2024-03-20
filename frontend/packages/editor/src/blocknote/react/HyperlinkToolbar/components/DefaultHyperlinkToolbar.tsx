import {useRef, useState} from 'react'
import {RiExternalLinkFill, RiLinkUnlink} from 'react-icons/ri'
import {HyperlinkToolbarProps} from './HyperlinkToolbarPositioner'

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

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={(url, text, latest) => {
          props.editHyperlink(url, text)
        }}
        // TODO: Better way of waiting for fade out
        onBlur={(event) =>
          setTimeout(() => {
            if (editMenuRef.current?.contains(event.relatedTarget)) {
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
