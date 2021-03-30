import * as React from 'react'
import {ViewVerticalIcon as Icon} from '@modulz/radix-icons'
import {IconWrapper} from './wrapper'

export function SidepanelIcon({
  label = 'Sidepanel',
  color = 'currentColor',
  ...props
}: {
  label?: string
  color?: string
}) {
  return <IconWrapper label={label} icon={<Icon color={color} {...props} />} />
}
