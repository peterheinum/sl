export const pipe = (...fns) => (...args) => fns.reduce((acc, cur) => cur(acc), args)

export const flatten = array => array.reduce((acc, cur) => ([...acc, ...cur]),[])

export const map = (fn) => (array) => array.map(fn)

export const tap = fn => obj => {
  fn(obj)
  return obj
}

export const sleep = (ms) => () => new Promise(resolve => setTimeout(() => resolve(), ms))

export const doAll = promises => Promise.all(promises)

export const prop = (key) => (obj) => obj[key]

const endpointKeyMap = {
  '/nearbystopsv2': '1cf0921717a5404cbfa4ded21f5f5f33',
  '/realtimedeparturesV4.json': '5850e332248b4f0a9e76f681e4cb0e07',
  '/typeahead.json': '06508dd530fe46e9b831bc530b6a26c4'
}

const baseUrl = 'https://api.sl.se/api2'
export const createUrl = (endpoint, params) => baseUrl + endpoint 
  + '?key=' + endpointKeyMap[endpoint] 
  + Object.keys(params).map(key => '&' + key + '=' + params[key]).join('')
