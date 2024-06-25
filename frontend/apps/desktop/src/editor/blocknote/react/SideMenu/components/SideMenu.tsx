import {Group} from '@mantine/core'
import {ReactNode} from 'react'

export const SideMenu = (props: {children: ReactNode}) => {
  return <Group spacing={0}>{props.children}</Group>
}
