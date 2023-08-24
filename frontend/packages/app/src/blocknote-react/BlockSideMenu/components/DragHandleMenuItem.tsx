import {Menu} from '@mantine/core'
import {PolymorphicComponentProps} from '@mantine/utils'

export type DragHandleMenuItemProps = PolymorphicComponentProps<'button'> & {
  closeMenu: () => void
}

export const DragHandleMenuItem = (props: DragHandleMenuItemProps) => {
  const {closeMenu, onClick, ...propsToPassThrough} = props
  return (
    <Menu.Item
      {...propsToPassThrough}
    >
      {props.children}
    </Menu.Item>
  )
}
