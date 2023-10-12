// import {Interceptor} from '@bufbuild/connect-web'

// TODO: change to expect-error instead
// @ts-ignore
export const loggingInterceptor = (next) => async (req) => {
  try {
    const result = await next(req)
    // @ts-ignore
    console.log(`🔃 to ${req.method.name} `, req.message, result?.message)
    return result
  } catch (e) {
    console.error(`🚨 to ${req.method.name} `, e)
    throw e
  }
}

// TODO: change to expect-error instead
// @ts-ignore
export const prodInter = (next) => async (req) => {
  const result = await next({
    ...req,
    init: {...req.init, redirect: 'follow'},
  })
  return result
}
