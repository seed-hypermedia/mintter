import {memo, useEffect, useState} from 'react'
import {useNavRoute} from '../utils/navigation'
import {AccountSidebar} from './sidebar-account'
import {getRouteAccountId, getRouteGroupId} from './sidebar-base'
import {GroupSidebar} from './sidebar-group'
import {MainAppSidebar} from './sidebar-main'

export const AppSidebar = memo(FullAppSidebar)

function FullAppSidebar() {
  let [sidebarGroupId, setSidebarGroupId] = useState<string | null>(null)
  let [sidebarAccountId, setSidebarAccountId] = useState<string | null>(null)
  const route = useNavRoute()
  const activeGroupRouteId = getRouteGroupId(route)
  const activeAccountRouteId = getRouteAccountId(route)
  useEffect(() => {
    setSidebarGroupId(activeGroupRouteId)
  }, [activeGroupRouteId])
  useEffect(() => {
    setSidebarAccountId(activeAccountRouteId)
  }, [activeAccountRouteId])

  if (sidebarGroupId) {
    return (
      <GroupSidebar
        groupId={sidebarGroupId}
        onBackToMain={() => {
          setSidebarGroupId(null)
        }}
      />
    )
  }
  if (sidebarAccountId) {
    return (
      <AccountSidebar
        accountId={sidebarAccountId}
        onBackToMain={() => {
          setSidebarAccountId(null)
        }}
      />
    )
  }
  return (
    <MainAppSidebar
      onSelectGroupId={(groupId: string) => {
        setSidebarGroupId(groupId)
      }}
      onSelectAccountId={(accountId: string) => {
        setSidebarAccountId(accountId)
      }}
    />
  )
}
