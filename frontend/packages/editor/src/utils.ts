export function youtubeParser(url: string) {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  var match = url.match(regExp)
  return match && match[7].length == 11 ? match[7] : false
}

export function isValidUrl(urlString: string) {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    console.log(e)
    return false
  }
}
