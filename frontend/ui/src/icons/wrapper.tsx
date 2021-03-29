import * as AccessibleIcon from '@radix-ui/react-accessible-icon'

export type IconWrapperProps = {
  icon: React.ReactNode
  label: string
}
export function IconWrapper({icon, label}: IconWrapperProps) {
  return <AccessibleIcon.Root label={label}>{icon}</AccessibleIcon.Root>
}
