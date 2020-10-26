export const pipe = (...fns) => (args) => fns.reduce((acc, cur) => cur(acc), args)

export const flatten = array => array.reduce((acc, cur) => ([...acc, ...cur]),[])

export const map = (fn) => (array) => array.map(fn)

export const tap = fn => obj => {
  fn(obj)
  return obj
}

export const path = (route) => (obj) => route.reduce((acc, key) => acc[key], obj)

export const sleep = (ms) => () => new Promise(resolve => setTimeout(() => resolve(), ms))

export const doAll = promises => Promise.all(promises)

export const objOf = (key) => (data) => ({ [key]: data })

export const prop = (key) => (obj) => obj[key]

export const both = (fnA, fnB) => (data) => ([...fnA(data), ...fnB(data)])

export const parseResponse = response => response.text()

export const parseJson = json => JSON.parse(json)

export const chain = (fns) => (data) => flatten(fns.map(fn => fn(data)))

export const symbolCounter = pipe(JSON.stringify, str => str.length)

export const unique = (array) => [...new Set(array)]

export const find = (obj) => (array) => array.length && array.find(arrayItem => JSON.stringify(arrayItem) === JSON.stringify(obj))

export const calculateTimeDiff = (time) => {
  const [hour, minute] = time.split(':').map(Number)
  const t = new Date()
  const hourDiff = hour - t.getHours()
  const minuteDiff = minute - t.getMinutes()
  return (hourDiff * 60) + minuteDiff
}

export const splitToChunks = (arr, chunkSize, acc = []) => (
  arr.length > chunkSize ?
      splitToChunks(
          arr.slice(chunkSize),
          chunkSize,
          [...acc, arr.slice(0, chunkSize)]
      ) :
      [...acc, arr]
)

const endpointKeyMap = {
  '/nearbystopsv2': '1cf0921717a5404cbfa4ded21f5f5f33',
  '/realtimedeparturesV4.json': '5850e332248b4f0a9e76f681e4cb0e07',
  '/typeahead.json': '06508dd530fe46e9b831bc530b6a26c4'
}

const baseUrl = 'https://api.sl.se/api2'
export const createUrl = (endpoint, params) => baseUrl + endpoint 
  + '?key=' + endpointKeyMap[endpoint] 
  + Object.keys(params).map(key => '&' + key + '=' + params[key]).join('')
