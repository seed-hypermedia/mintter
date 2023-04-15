import {useAccount} from '@app/hooks/accounts'
import {useDaemonReady} from '@app/node-status-context'
import {GetProps, UIAvatar} from '@mintter/ui'
import {useMemo} from 'react'

export function Avatar({url: urlProp, ...props}: GetProps<typeof UIAvatar>) {
  const {data: account} = useAccount(props.accountId)
  let isDaemonReady = useDaemonReady()
  let url = useMemo(() => {
    if (!isDaemonReady) return
    if (urlProp) return urlProp
    if (account?.profile?.bio) {
      console.log('🚀 ~ file: avatar.tsx:15 ~ url ~ url:', account.profile.bio)
      let [, avatar] = account.profile.bio.split('__AVATAR__')
      if (!avatar) return
      return `http://localhost:55001/ipfs/${avatar}`
    }
  }, [account, props.accountId, urlProp, isDaemonReady])

  return <UIAvatar url={url} {...props} />
}
