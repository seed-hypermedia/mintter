export const isProduction = import.meta.env.PROD
export const MINTTER_LINK_PREFIX = 'mintter://'
export const MINTTER_GATEWAY_URL =
  import.meta.env.VITE_MINTTER_GATEWAY_URL || 'https://mintter.com/'

export const features = {
  comments: false,
  nostr: false,
}