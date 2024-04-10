import {memo} from 'react'
import {MainAppSidebar} from './sidebar-main'

export const AppSidebar = memo(FullAppSidebar)

function FullAppSidebar() {
  return <MainAppSidebar sidebarHeader={null} />
}
