import {GearIcon} from '@modulz/radix-icons'

import {IconWrapper} from './wrapper'

export function SettingsIcon({label = 'Settings', ...props}: {label?: string}) {
  return <IconWrapper label={label} icon={<GearIcon {...props} />} />
}
