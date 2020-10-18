import * as messaging from "messaging";

const state = {
  stations: []
}

const pipe = (...fns) => (...args) => fns.reduce((acc, cur) => cur(acc), args)


const map = (fn) => (array) => array.map(fn)

const tap = fn => obj => {
  fn(obj)
  return obj
}

messaging.peerSocket.onopen = () => {
  console.log("Ready");
}

messaging.peerSocket.onerror = (err) => {
  console.log(`Connection error: ${err.code} - ${err.message}`);
}

const endpointKeyMap = {
  '/nearbystopsv2': '1cf0921717a5404cbfa4ded21f5f5f33',
  '/realtimedeparturesV4.json': '5850e332248b4f0a9e76f681e4cb0e07',
  '/typeahead.json': '06508dd530fe46e9b831bc530b6a26c4'
}

const baseUrl = 'https://api.sl.se/api2'
const createUrl = (endpoint, params) => baseUrl + endpoint 
  + '?key=' + endpointKeyMap[endpoint] 
  + Object.keys(params).map(key => '&' + key + '=' + params[key]).join('')

const parseResponse = response => response.text()
const parseJson = json => JSON.parse(json)
const extract = (url) => fetch(url).then(parseResponse).then(parseJson)
const extractResData = url => extract(url).then(r => r.ResponseData)

const getNamesOfCloseStops = ({stopLocationOrCoordLocation}) => stopLocationOrCoordLocation.map(({StopLocation}) => StopLocation.name)

const getIdsOfCloseStops = (closeStops) => {  
  const mapper = name => createUrl('/typeahead.json', { searchString: name, MaxResults: 1, StationsOnly: true })
  const urls = closeStops.map(mapper)

  const extractFirstId = url => extractResData(url).then(([first]) => first.SiteId)
  return Promise.all(urls.map(extractFirstId))
}

const extractWantedInfo = ({ Destination, DisplayTime, LineNumber }) => ({ d: Destination, t: DisplayTime, n: LineNumber })

const getNextDeparturesFromCloseStops = (closeStopIds) => {
  const mapper = siteId => createUrl('/realtimedeparturesV4.json', { timewindow: 30, siteId })
  const urls = closeStopIds.map(mapper)
  const getNextArrival = ({ Buses }) => Buses.map(extractWantedInfo)
  const extractBusesAndMetro = url => extractResData(url).then(getNextArrival)
  return Promise.all(urls.map(extractBusesAndMetro))
}

const returnMessage = (data) => messaging.peerSocket.send(data)


const filterEmpty = data => data.filter(arr => arr.length)

const massageNames = (stationName) => stationName.includes(' ') ? stationName.split(' ')[0] : stationName

const saveStationsToState = stationNames => state.stations = stationNames

const gpsRecieved = (data) => {
  const { longitude, latitude } = data 
  
  const url = createUrl('/nearbystopsv2', { originCoordLat: latitude, originCoordLong: longitude, maxNo: 4 })
  return extract(url)
    .then(getNamesOfCloseStops)
    .then(tap(saveStationsToState))
    .then(map(massageNames))
}

const flatten = array => array.reduce((acc, cur) => ([...acc, ...cur]),[])

messaging.peerSocket.onmessage = ({data}) => {
  const { type } = data
  
  gpsRecieved(data)
    .then(getIdsOfCloseStops)
    .then(getNextDeparturesFromCloseStops)
    .then(filterEmpty)
    .then(flatten)
    .then(returnMessage)
 }


// "iconFile": "resources/icon.png",