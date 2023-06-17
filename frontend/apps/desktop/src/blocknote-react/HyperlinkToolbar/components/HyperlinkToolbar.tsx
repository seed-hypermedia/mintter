import {useState} from 'react'
import {Button} from '@mantine/core'
import {EditHyperlinkMenu} from '../EditHyperlinkMenu/components/EditHyperlinkMenu'
import {Toolbar} from '../../SharedComponents/Toolbar/components/Toolbar'
import {ToolbarButton} from '../../SharedComponents/Toolbar/components/ToolbarButton'
import {RiExternalLinkFill, RiLinkUnlink} from 'react-icons/ri'
// import rootStyles from "../../../root.module.css";
import {open} from '@tauri-apps/api/shell'

export type HyperlinkToolbarProps = {
  url: string
  text: string
  editHyperlink: (url: string, text: string) => void
  deleteHyperlink: () => void
}

/**
 * Main menu component for the hyperlink extension.
 * Renders a toolbar that appears on hyperlink hover.
 */
export const HyperlinkToolbar = (props: HyperlinkToolbarProps) => {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={props.editHyperlink}
      />
    )
  }

  return (
    <Toolbar>
      <Button onClick={() => setIsEditing(true)} size={'xs'}>
        Edit Link
      </Button>

      <ToolbarButton
        mainTooltip="Open"
        isSelected={false}
        onClick={() => {
          open(props.url)
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
