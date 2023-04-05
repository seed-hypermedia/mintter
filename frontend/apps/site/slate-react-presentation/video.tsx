import {Video} from '@mintter/shared'
import videoParser from 'js-video-url-parser'
import {useMemo} from 'react'

type VideoType = 'youtube' | 'vimeo' | 'none'

export function Video({element}: {element: Video}) {
  let videoData = useMemo(() => parseEmbedUrl(element.url), [element.url])

  if (videoData.provider == 'youtube') {
    return <YouTube youTubeId={videoData.id} />
  }

  return null
}

// function isYoutube(entry: string) {
// 	let match = entry.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gm)

// 	return !!match
// }

export type EmbedUrlData = {
  url?: string
  provider?: 'youtube' | 'vimeo'
  id?: string
}

export const parseEmbedUrl = (url: string): EmbedUrlData => {
  // const twitterData = parseTwitterUrl(url)
  // if (twitterData) return twitterData

  const videoData = parseVideoUrl(url)
  if (videoData) return videoData

  return {}
}

const YOUTUBE_PREFIX = 'https://www.youtube.com/embed/'
const VIMEO_PREFIX = 'https://player.vimeo.com/video/'
// const DAILYMOTION_PREFIX = 'https://www.dailymotion.com/embed/video/';
// const YOUKU_PREFIX = 'https://player.youku.com/embed/';
// const COUB_PREFIX = 'https://coub.com/embed/';

export const parseVideoUrl = (url: string) => {
  const videoData = videoParser.parse(url)
  if (videoData?.provider && videoData.id) {
    const {id, provider} = videoData

    const providerUrls: Record<string, string> = {
      youtube: `${YOUTUBE_PREFIX}${id}`,
      vimeo: `${VIMEO_PREFIX}${id}`,
      // dailymotion: `${DAILYMOTION_PREFIX}${id}`,
      // youku: `${YOUKU_PREFIX}${id}`,
      // coub: `${COUB_PREFIX}${id}`,
    }

    return {
      id,
      provider,
      url: providerUrls[provider],
    } as EmbedUrlData
  }
}

export type YouTubeProps = {
  /** YouTube id */
  youTubeId?: string
  /** YouTube Playlist id */
  youTubePlaylistId?: string
  /** Aspect ratio of YouTube video */
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2' | '8:5'
  /** Skip to a time in the video */
  skipTo?: {
    h?: number
    m: number
    s: number
  }
  /** Auto play the video */
  autoPlay?: boolean
  /** No Cookie option */
  noCookie?: boolean
}

function YouTube({
  youTubeId,
  youTubePlaylistId,
  aspectRatio = '16:9',
  autoPlay = false,
  skipTo = {h: 0, m: 0, s: 0},
  noCookie = false,
}: YouTubeProps) {
  const {h, m, s} = skipTo

  const tH = h! * 60
  const tM = m * 60

  const startTime = tH + tM + s

  const provider = noCookie
    ? 'https://www.youtube-nocookie.com'
    : 'https://www.youtube.com'
  const baseUrl = `${provider}/embed/`
  const src = `${baseUrl}${
    youTubeId
      ? `${youTubeId}?&autoplay=${autoPlay}&start=${startTime}`
      : `&videoseries?list=${youTubePlaylistId}`
  }`

  return (
    <div
      className="youtube-video"
      style={{
        ...getPadding(aspectRatio),
      }}
    >
      <iframe
        data-testid="youtube"
        title={`youTube-${youTubeId ? youTubeId : youTubePlaylistId}`}
        src={src}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}

function getPadding(aspectRatio: string) {
  const regExp = /^([1-9]\d*):([1-9]\d*)$/
  const [, width, height] = regExp.exec(aspectRatio) || ['', '1', '1']

  return {
    paddingTop: `${(100 * parseInt(height, 10)) / parseInt(width, 10)}%`,
  }
}
