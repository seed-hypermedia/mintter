import {ButtonText} from '@shm/ui'
import {ComponentProps} from 'react'
import {NavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

export function AppLinkText({
  toRoute,
  ...props
}: ComponentProps<typeof ButtonText> & {toRoute: NavRoute}) {
  const navigate = useNavigate()
  return (
    <ButtonText
      {...props}
      onPress={() => {
        navigate(toRoute)
      }}
    />
  )
}
