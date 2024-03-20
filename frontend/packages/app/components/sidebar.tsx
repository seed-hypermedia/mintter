import {memo, useEffect, useState} from 'react'
import {useNavRoute} from '../utils/navigation'
import {getRouteGroupId} from './sidebar-base'
import {GroupSidebar} from './sidebar-group'
import {MainAppSidebar} from './sidebar-main'

export const AppSidebar = memo(FullAppSidebar)

function FullAppSidebar() {
  let [sidebarGroupId, setSidebarGroupId] = useState<string | null>(null)
  const route = useNavRoute()
  const activeGroupRouteId = getRouteGroupId(route)
  useEffect(() => {
    setSidebarGroupId(activeGroupRouteId)
  }, [activeGroupRouteId])

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
  return (
    <MainAppSidebar
      onSelectGroupId={(groupId: string) => {
        setSidebarGroupId(groupId)
      }}
    />
  )
}
