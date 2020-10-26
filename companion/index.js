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
  objOf
} from './utils'

const stations = []

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

const get = (url) => fetch(url).then(parseResponse).then(parseJson)
const extractResData = url => get(url).then(r => r.ResponseData)

const getNamesOfCloseStops = ({stopLocationOrCoordLocation}) => stopLocationOrCoordLocation.map(({StopLocation}) => StopLocation.name)

const extractFirstId = url => extractResData(url).then(([first]) => first.SiteId)

const getIdsOfCloseStops = (closeStops) => {  
  const mapper = name => createUrl('/typeahead.json', { 
    searchString: name, 
    MaxResults: 1, 
    StationsOnly: true 
  })

  const urls = map(mapper)(closeStops)
  return doAll(map(extractFirstId)(urls))
    .then(tap(console.log))
}

// 6 min --> 6 to send less data
const fixTime = (time) => time.includes(' ') 
  ? time.split(' ')[0]
  : time.includes(':') 
    ? calculateTimeDiff(time)
    : time

const getNextArrival = (transportation) => pipe(
  prop('0'),
  prop(transportation),
  map(({ Destination, DisplayTime, LineNumber }) => 
    ({ d: Destination, t: fixTime(DisplayTime), n: LineNumber })
  )
)

const commuteTypes = [
  'Metros',
  'Buses',
  'Trains',
  'Trams'
  //Ships // mans not a sailor
]

const extractBusesAndMetro = url => extractResData(url)
  .then(chain(commuteTypes.map(getNextArrival)))

const getNextDeparturesFromCloseStops = (closeStopIds) => {
  const mapper = siteId => createUrl('/realtimedeparturesV4.json', { 
    timewindow: 30, 
    siteId 
  })
  
  const urls = closeStopIds.map(mapper)

  return doAll(urls.map(extractBusesAndMetro))
}

const sendMessage = (data) => {
  messaging.peerSocket.send(data)
} 

const chunkAndSend = (data) => {
  const safeByteAmount = symbolCounter(data) > 260 
    ? splitToChunks(data.slice(0, 22), 3)
    : [data]
  safeByteAmount.forEach(chunk => sendMessage(chunk))
  sendMessage({complete: true})
}



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

const getAllInfo = ({ longitude, latitude }) => {
  if (!longitude || !latitude) return Promise.reject('Missing coordinates')
  get(createNearbyStopsUrl(latitude, longitude))
    .then(pipe(
      prop('stopLocationOrCoordLocation'), 
      map(path(['StopLocation', 'name'])),
      tap(saveStations),
    ))
    .then(map(pipe(createTypeAheadUrl, extractFirstId)))
    .then(doAll)
    .then(tap(console.log))
    .then(map(pipe(createRealtimeDepartureUrl, extractResData)))
    .then(doAll)
    .then(pipe(
      map(extractProps(commuteTypes)),
      flatten
    ))
    .then(tap(console.log))
}

const gpsRecieved = (data) => {
  const { longitude, latitude } = data

  if (!longitude || !latitude) return Promise.reject('ping')

  const url = createUrl('/nearbystopsv2', {
    originCoordLat: latitude, 
    originCoordLong: longitude, 
    maxNo: 3,
    r: 1000
  })
  
  return get(url)
    .then(getNamesOfCloseStops)
    .then(tap(saveStations))
}

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

messaging.peerSocket.onmessage = () => {
  geolocation.getCurrentPosition(({coords}) => {
    getAllInfo(coords)
    // gpsRecieved(coords)
    // .then(getIdsOfCloseStops)
    // .then(getNextDeparturesFromCloseStops)
    // .then(flatten)
    // .then(removeNonInformative)
    // .then(filterNonUnique)
    // .then(sortByTime)
    // .then(chunkAndSend)
    // .catch(console.log)
  })
 }
