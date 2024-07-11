import {useNavRoute} from '@/utils/navigation'
import {useNavigate} from '@/utils/useNavigate'
import {Home} from '@shm/ui'
import {Contact, File, Sparkles} from '@tamagui/lucide-icons'
import {memo} from 'react'
import {GenericSidebarContainer, SidebarItem} from './sidebar-base'
import {SidebarNeo} from './sidebar-neo'

export const AppSidebar = memo(MainAppSidebar)

export function MainAppSidebar() {
  const route = useNavRoute()
  const navigate = useNavigate()

  return (
    <GenericSidebarContainer>
      <SidebarItem
        active={route.key == 'home'}
        onPress={() => {
          navigate({key: 'home'})
        }}
        title="Home"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'feed'}
        onPress={() => {
          navigate({key: 'feed'})
        }}
        title="Feed"
        bold
        icon={Home}
      />
      <SidebarItem
        active={route.key == 'content'}
        onPress={() => {
          navigate({key: 'content'})
        }}
        title="My Content"
        bold
        icon={File}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'explore'}
        onPress={() => {
          navigate({key: 'explore'})
        }}
        title="Explore Content"
        bold
        icon={Sparkles}
        rightHover={[]}
      />
      <SidebarItem
        active={route.key == 'contacts'}
        onPress={() => {
          navigate({key: 'contacts'})
        }}
        icon={Contact}
        title="Contacts"
        bold
      />
      <SidebarNeo />
    </GenericSidebarContainer>
  )
}
