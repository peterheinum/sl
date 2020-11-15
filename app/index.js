import document from 'document'
import * as messaging from "messaging"

import { display } from "display"
import { vibration } from "haptics";

const log = data => console.log(JSON.stringify(data, null, 2))

messaging.peerSocket.onopen = () => {
  sendMessage({})
}

const selectId = (id) => document.getElementById(id)

const hideRow = (i) => selectId(`row_${i}`).style.display = 'none'


const selectHeader = (i) => selectId(`header_${i}`)

const hideHeader = (i) => selectHeader(i).style.display = 'none'

const displayHeader = (i) => selectHeader(i).style.display = 'block'

const renderStations = (stations) => {
  for (let i = 0; i < 22; i++) {
    if (!stations[i]) {
      hideRow(i)
      continue
    }
    const {d, t, l} = stations[i]
    
    const lineEl = selectId(`line_${i}`) 
    const timeEl = selectId(`time_${i}`) 
    const lineText = `${l} ${d}`
    if (lineEl) {
      if (lineText.length > 20) lineText.slice(0, 15)
      lineEl.text = lineText
      if (lineText.length > 16) {
        lineEl.style.fontSize = 
          lineEl.style.fontSize * 
          ((1 - (lineText.length/17) + 1)) // handle too long text
      }
    } 

    if (timeEl) {
      t === 'Nu'
        ? timeEl.text = `${t}`
        : timeEl.text = `${t} min`
    }
  }
}

messaging.peerSocket.onerror = err => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

const state = {}

messaging.peerSocket.onmessage = ({data}) => {
  const { complete, departure, station } = data
  if (complete) {
    vibration.start("nudge-max")
    display.poke()
    renderState()
    hideUnusedRows()
  } else {
    state[station] = [...state[station], departure]
  }
}

const hideUnusedRows = () => {
  for (let i = 0; i < 22; i++) {
    !selectId(`line_${i}`).text && hideRow(i)    
  }
}

const renderState = () => {
  let headerIndex = 0
  Object.keys(state).forEach(station => {
    displayHeader(headerIndex)
    selectHeader(headerIndex).text = station
    console.log(`header_${headerIndex} ${station}`)
    console.log(state[station].filter(Boolean).length)
    renderEntries(state[station].filter(Boolean), headerIndex * 5, headerIndex * 5 + 5)
    headerIndex++
  })
}

const renderEntries = (entries, i, roof) => {
  entries.forEach(log)
  entries.forEach(entry => {
    renderEntry(entry, i)
    i++
  })
  for (; i < roof; i++) {
    hideRow(i)    
  }
}

const renderEntry = ({d, t, l, m}, i) => {
  const lineEl = selectId(`line_${i}`) 
  const timeEl = selectId(`time_${i}`) 
  const lineText = `${l} ${d}`

  if (lineEl) {
    if (lineText.length > 20) lineText.slice(0, 15)
    lineEl.text = lineText
    if (lineText.length > 16) {
      lineEl.style.fontSize = 
        lineEl.style.fontSize * 
        ((1 - (lineText.length/17) + 1)) // handle too long text
    }
  } 

  if (timeEl) {
    t === 'Nu'
      ? timeEl.text = `${t}`
      : timeEl.text = `${t} min`
      // console.log(lineText + `${t} min` + ' current i: ' + i)
  }
}

const sendMessage = (data) => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send the data to peer as a message
    messaging.peerSocket.send({
      ...data
    })
  } else {
    setTimeout(() => {
      sendMessage(data)
    }, 500)
  }
}
