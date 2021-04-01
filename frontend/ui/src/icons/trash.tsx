import * as React from 'react'
import {TrashIcon as Icon} from '@modulz/radix-icons'
import {IconWrapper} from './wrapper'

export function TrashIcon({
  label = 'Trash',
  color = 'currentColor',
  ...props
}: {
  label?: string
  color?: string
}) {
  return <IconWrapper label={label} icon={<Icon color={color} {...props} />} />
}
