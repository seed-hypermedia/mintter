import {useAccount} from '@mintter/app/src/models/accounts'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {GetProps, UIAvatar} from '@mintter/ui'
import {useMemo} from 'react'
import {BACKEND_FILE_URL} from '../constants'

export function Avatar({url: urlProp, ...props}: GetProps<typeof UIAvatar>) {
  return <UIAvatar url={urlProp} {...props} />
}
