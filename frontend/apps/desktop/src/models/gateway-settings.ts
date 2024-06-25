import {trpc} from '@/trpc'
import {
  HYPERMEDIA_PUBLIC_WEB_GATEWAY,
  StateStream,
  writeableStateStream,
} from '@shm/shared'
import {useEffect, useMemo} from 'react'
import {useQueryInvalidator} from '../app-context'

export function useGatewayUrl() {
  const gatewayUrl = trpc.gatewaySettings.getGatewayUrl.useQuery()
  return gatewayUrl
}
export function useGatewayUrlStream(): StateStream<string> {
  const gatewayUrl = trpc.gatewaySettings.getGatewayUrl.useQuery()
  const [writeGwUrl, gwStateStream] = useMemo(() => {
    return writeableStateStream<string>(HYPERMEDIA_PUBLIC_WEB_GATEWAY)
  }, [])
  useEffect(() => {
    gatewayUrl.data && writeGwUrl(gatewayUrl.data)
  }, [gatewayUrl.data])
  return gwStateStream
}

export function useGatewayHost() {
  const gatewayUrl = useGatewayUrl()
  const gatewayHost = gatewayUrl.data?.replace(/https?:\/\//, '')
  return gatewayHost || 'hyper.media'
}

export function useSetGatewayUrl() {
  const invalidate = useQueryInvalidator()
  const setGatewayUrl = trpc.gatewaySettings.setGatewayUrl.useMutation({
    onSuccess: () => {
      invalidate(['trpc.gatewaySettings.getGatewayUrl'])
    },
  })
  return setGatewayUrl
}

export function usePushOnCopy() {
  const pushOnCopy = trpc.gatewaySettings.getPushOnCopy.useQuery()
  return pushOnCopy
}

export function useSetPushOnCopy() {
  const invalidate = useQueryInvalidator()
  const setPushOnCopy = trpc.gatewaySettings.setPushOnCopy.useMutation({
    onSuccess: () => {
      invalidate(['trpc.gatewaySettings.getPushOnCopy'])
    },
  })
  return setPushOnCopy
}

export function usePushOnPublish() {
  const pushOnPublish = trpc.gatewaySettings.getPushOnPublish.useQuery()
  return pushOnPublish
}

export function useSetPushOnPublish() {
  const invalidate = useQueryInvalidator()
  const setPushOnPublish = trpc.gatewaySettings.setPushOnPublish.useMutation({
    onSuccess: () => {
      invalidate(['trpc.gatewaySettings.getPushOnPublish'])
    },
  })
  return setPushOnPublish
}
