import {GetProps, UIAvatar} from '@shm/ui'

export function Avatar({url: urlProp, ...props}: GetProps<typeof UIAvatar>) {
  return <UIAvatar url={urlProp} {...props} />
}
