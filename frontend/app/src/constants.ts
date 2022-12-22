export const isLocalNode = window.location.hostname == 'localhost'
export const MINTTER_LINK_PREFIX = 'mintter://'
export const MINTTER_GATEWAY_URL =
  import.meta.env.VITE_MINTTER_GATEWAY_URL || 'http://localhost:3000/p/'
