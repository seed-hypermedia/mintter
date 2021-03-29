import {ExternalLinkIcon as Icon} from '@modulz/radix-icons'

import {IconWrapper} from './wrapper'

export function ExternalLinkIcon({
  label = 'External Link',
  ...props
}: {
  label?: string
}) {
  return <IconWrapper label={label} icon={<Icon {...props} />} />
}
