console.log('=================== mock loaded!')

export const connectToPeerById = async perrIds => {
  return await Promise.resolve({
    ok: true,
  })
}

export const allConnections = async () => {
  return await Promise.resolve({
    toObject: () => ({
      profilesList: [],
    }),
  })
}
