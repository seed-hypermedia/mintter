import {ArrowUpLeft} from '@tamagui/lucide-icons'
import {ReactNode, memo, useEffect, useState} from 'react'
import {useMyAccount} from '../models/accounts'
import {useNavRoute} from '../utils/navigation'
import {AccountSidebar} from './sidebar-account'
import {
  AccountContextButton,
  DocumentContextButton,
  GroupContextButton,
  SidebarItem,
  getRouteSidebars,
} from './sidebar-base'
import {DocumentSidebar} from './sidebar-document'
import {GroupSidebar} from './sidebar-group'
import {MainAppSidebar} from './sidebar-main'

export const AppSidebar = memo(FullAppSidebar)

function FullAppSidebar() {
  const [sidebarDepth, setSidebarDepth] = useState(-1)
  const route = useNavRoute()
  const myAccount = useMyAccount()
  const sidebars = getRouteSidebars(route, myAccount.data)
  const activeSidebar = sidebars?.[sidebarDepth]
  const header: ReactNode[] = []
  if (sidebarDepth > -1) {
    header.push(
      <SidebarItem
        minHeight={30}
        paddingVertical="$2"
        color="$color10"
        title="Home"
        onPress={() => {
          setSidebarDepth(-1)
        }}
        icon={ArrowUpLeft}
      />,
    )
  }
  useEffect(() => {
    const depth = sidebars ? sidebars.length - 1 : -1
    setSidebarDepth(depth)
  }, [sidebars?.at(-1)?.key])
  sidebars?.forEach((sidebar, index) => {
    if (index === sidebarDepth) return
    if (index < sidebarDepth) return
    if (sidebar.type === 'group') {
      header.push(
        <GroupContextButton
          focus={sidebar}
          onPress={() => {
            setSidebarDepth(index)
          }}
        />,
      )
    }
    if (sidebar.type === 'account') {
      header.push(
        <AccountContextButton
          focus={sidebar}
          onPress={() => {
            setSidebarDepth(index)
          }}
        />,
      )
    }
    if (sidebar.type === 'document') {
      header.push(
        <DocumentContextButton
          focus={sidebar}
          onPress={() => {
            setSidebarDepth(index)
          }}
        />,
      )
    }
  })
  if (activeSidebar?.type === 'group') {
    return (
      <GroupSidebar groupId={activeSidebar.groupId} sidebarHeader={header} />
    )
  }
  if (activeSidebar?.type === 'account') {
    return (
      <AccountSidebar
        accountId={activeSidebar.accountId}
        sidebarHeader={header}
      />
    )
  }
  if (activeSidebar?.type === 'document') {
    return <DocumentSidebar focus={activeSidebar} sidebarHeader={header} />
  }
  return <MainAppSidebar sidebarHeader={header} />
}
