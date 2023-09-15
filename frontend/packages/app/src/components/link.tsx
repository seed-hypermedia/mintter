import {ButtonText} from '@mintter/ui'
import {ComponentProps} from 'react'
import {NavRoute, useNavigate} from '../utils/navigation'

export function AppLinkText(
  props: ComponentProps<typeof ButtonText> & {toRoute: NavRoute},
) {
  const navigate = useNavigate()
  return (
    <ButtonText
      {...props}
      onPress={() => {
        navigate(props.toRoute)
      }}
    />
  )
}
