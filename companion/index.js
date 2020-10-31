import { geolocation } from "geolocation"


import * as messaging from 'messaging'
import {
  pipe,
  flatten,
  map,
  tap,
  createUrl,
  doAll,
  prop,
  path,
  unique,
  chain,
  parseResponse,
  parseJson,
  symbolCounter,
  splitToChunks,
  calculateTimeDiff,
  find,
  objOf,
  log
} from './utils'

const stations = []

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

const get = (url) => fetch(url).then(parseResponse).then(parseJson)
const extractResData = url => get(url).then(r => r.ResponseData)

const extractFirstId = url => extractResData(url).then(([first]) => first.SiteId)

const sortByTime = (data) => data.sort((a, b) => {
  if (a.t === 'Nu') return -1
  if (b.t === 'Nu') return 1
  return Number(a.t) - Number(b.t)
})

const filterNonUnique = (array) => array.reduce((acc, cur) => {
  !find(cur)(acc) && acc.push(cur)
  return acc
}, [])

const removeNonInformative = (array) => array.filter(({t}) => t !== '-')

// 6 min --> 6 to send less data
const fixTime = (time) => time.includes(' ') 
  ? time.split(' ')[0]
  : time.includes(':') 
    ? calculateTimeDiff(time)
    : time

const commuteTypes = [
  'Metros',
  'Buses',
  'Trains',
  'Trams'
  //Ships // mans not a sailor
]
const sendMessage = pipe(
  tap(map(log)),
  map(messaging.peerSocket.send),
  () => messaging.peerSocket.send({complete: true})
)

const saveStations = pipe(
  flatten,
  map(objOf('name')),
  (names) => stations.push(...names),
)

const createNearbyStopsUrl = (originCoordLat, originCoordLong) => createUrl('/nearbystopsv2', {
  originCoordLat, 
  originCoordLong, 
  maxNo: 3,
  r: 1000
})

const createTypeAheadUrl = (searchString) => createUrl('/typeahead.json', { 
  searchString, 
  MaxResults: 1, 
  StationsOnly: true 
})

const saveIds = pipe(
  map((value, index) => stations[index].id = value)
)

const createRealtimeDepartureUrl = siteId => createUrl('/realtimedeparturesV4.json', { 
  timewindow: 30, 
  siteId 
})

const extractProps = (props) => (obj) => flatten(props.reduce((acc, cur) => ([...acc, obj[cur]]), []))

const extractStationNames = pipe(
  prop('stopLocationOrCoordLocation'), 
  map(path(['StopLocation', 'name'])),
  tap(saveStations),
)

const fetchRealTimeInfo = pipe(
  createRealtimeDepartureUrl,
  extractResData
)

const fetchStationIds = pipe(
  createTypeAheadUrl, 
  extractFirstId
)

const extractCommuteTypes = pipe(
  map(extractProps(commuteTypes)),
  flatten
)

const extractTimeLineAndDest = ({ 
  Destination, 
  DisplayTime, 
  LineNumber, 
  TransportMode, 
  StopAreaName 
}) => ({
    d: Destination, 
    t: fixTime(DisplayTime), 
    l: LineNumber, 
    type: TransportMode,
    name: StopAreaName 
  })

const sensuallyMassageData = pipe(
  // filterNonUnique,
  // removeNonInformative, 
  sortByTime
)

const getAllInfo = ({ longitude, latitude }) => {
  if (!longitude || !latitude) return Promise.reject('Missing coordinates')
  return get(createNearbyStopsUrl(latitude, longitude))
    .then(extractStationNames)
    .then(map(fetchStationIds))
    .then(doAll)
    .then(tap(saveIds))
    .then(map(fetchRealTimeInfo))
    .then(doAll)
    .then(extractCommuteTypes)
    .then(map(extractTimeLineAndDest))
}

messaging.peerSocket.onmessage = () => {
  geolocation.getCurrentPosition(({coords}) => {
    getAllInfo(coords)
      .then(sensuallyMassageData)
      .then(tap(log))
      .then(sendMessage)
  })
 }
