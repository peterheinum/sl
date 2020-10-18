import * as messaging from "messaging"
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
  console.log("Ready");
}

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`);
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

const sendMessage = (data) => messaging.peerSocket.send(data)

const saveStationsToState = stationNames => state.stations = stationNames

const gpsRecieved = (data) => {
  const { longitude, latitude } = data 
  if (!longitude || !latitude) return Promise.reject('ping')

  const url = createUrl('/nearbystopsv2', { originCoordLat: latitude, originCoordLong: longitude, maxNo: 4 })
  return extract(url)
    .then(getNamesOfCloseStops)
    .then(tap(pipe(flatten, saveStationsToState)))
}

const sendState = () => sendMessage({state})

messaging.peerSocket.onmessage = ({data}) => {
  console.log('companion msg recived')
  gpsRecieved(data)
    .then(getIdsOfCloseStops)
    .then(getNextDeparturesFromCloseStops)
    .then(flatten)
    .then(sendMessage)
    .catch(console.log)
    // .then(sleep(1000))
    // .then(sendState)
 }
