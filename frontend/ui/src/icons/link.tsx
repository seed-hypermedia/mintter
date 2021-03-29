import {Link2Icon as Icon} from '@modulz/radix-icons'

import {IconWrapper} from './wrapper'

export function LinkIcon({label = 'Link', ...props}: {label?: string}) {
  return <IconWrapper label={label} icon={<Icon {...props} />} />
}
