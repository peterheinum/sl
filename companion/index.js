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
  prop
} from './utils'

const state = {
  stations: []
}

messaging.peerSocket.onopen = () => {
  console.log('Ready')
}

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

const parseResponse = response => response.text()
const parseJson = json => JSON.parse(json)
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

const getNextArrival = pipe(
  prop('0'),
  prop('Buses'),
  map(({ Destination, DisplayTime, LineNumber }) => 
    ({ d: Destination, t: DisplayTime, n: LineNumber })
  )
)

const extractBusesAndMetro = url => extractResData(url).then(getNextArrival)

const getNextDeparturesFromCloseStops = (closeStopIds) => {
  const mapper = siteId => createUrl('/realtimedeparturesV4.json', { 
    timewindow: 30, 
    siteId 
  })
  
  const urls = closeStopIds.map(mapper)

  return doAll(urls.map(extractBusesAndMetro))
}

const symbolCounter = pipe(JSON.stringify, str => str.length)

const splitToChunks = (arr, chunkSize, acc = []) => (
  arr.length > chunkSize ?
      splitToChunks(
          arr.slice(chunkSize),
          chunkSize,
          [...acc, arr.slice(0, chunkSize)]
      ) :
      [...acc, arr]
)

const sendMessage = (data) => {
  messaging.peerSocket.send(data)
} 

const chunkAndSend = (data) => {
  const safeByteAmount = symbolCounter(data) > 260 
    ? splitToChunks(data, 3)
    : [data]
  safeByteAmount.forEach(chunk => sendMessage(chunk))
  sendMessage({complete: true})
}

const saveStationsToState = stationNames => state.stations = stationNames

const gpsRecieved = (data) => {
  const { longitude, latitude } = data

  if (!longitude || !latitude) return Promise.reject('ping')

  const url = createUrl('/nearbystopsv2', { originCoordLat: latitude, originCoordLong: longitude, maxNo: 4 })
  return extract(url)
    .then(getNamesOfCloseStops)
    .then(tap(pipe(flatten, saveStationsToState)))
}



messaging.peerSocket.onmessage = () => {
  console.log('companion msg recived')
  
  geolocation.getCurrentPosition(({coords}) => {
    gpsRecieved(coords)
    .then(getIdsOfCloseStops)
    .then(getNextDeparturesFromCloseStops)
    .then(flatten)
    .then(chunkAndSend)
    .catch(console.log)
  })
 }
