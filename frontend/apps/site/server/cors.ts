import {ServerResponse} from 'http'
import {NextApiResponse} from 'next'

export function setAllowAnyHostGetCORS(
  res: NextApiResponse | ServerResponse<any>,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
}
