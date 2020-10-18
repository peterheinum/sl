import { geolocation } from "geolocation"


import * as messaging from 'messaging'
import {
  pipe,
  flatten,
  map,
  tap,
  sleep,
  createUrl,
  doAll,
  prop,
  both,
  parseResponse,
  parseJson,
  symbolCounter,
  splitToChunks
} from './utils'

const state = {
  stations: []
}

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

const extract = (url) => fetch(url).then(parseResponse).then(parseJson)
const extractResData = url => extract(url).then(r => r.ResponseData)

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
}

const calculateTimeDiff = (time) => {
  const [hour, minute] = time.split(':').map(str => parseInt(str))
  const t = new Date()
  const hourDiff = hour - t.getHours()
  const minuteDiff = minute - t.getMinutes()
  return (hourDiff * 60) + minuteDiff
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

const extractBusesAndMetro = url => extractResData(url).then(both(getNextArrival('Buses'), getNextArrival('Metros')))

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
    ? splitToChunks(data.slice(0, 17), 3)
    : [data]
  safeByteAmount.forEach(chunk => sendMessage(chunk))
  sendMessage({complete: true})
}

const saveStationsToState = stationNames => state.stations = stationNames

const gpsRecieved = (data) => {
  const { longitude, latitude } = data

  if (!longitude || !latitude) return Promise.reject('ping')

  const url = createUrl('/nearbystopsv2', {
    originCoordLat: latitude, 
    originCoordLong: longitude, 
    maxNo: 4 
  })
  
  return extract(url)
    .then(getNamesOfCloseStops)
    .then(tap(pipe(flatten, saveStationsToState)))
}

const sortByTime = (data) => data.sort((a, b) => {
  if (a.t === 'nu') return 1
  return a.t - b.t
})

messaging.peerSocket.onmessage = () => {
  geolocation.getCurrentPosition(({coords}) => {
    gpsRecieved(coords)
    .then(getIdsOfCloseStops)
    .then(getNextDeparturesFromCloseStops)
    .then(flatten)
    .then(sortByTime)
    .then(chunkAndSend)
    .catch(console.log)
  })
 }
