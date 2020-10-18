import document from 'document'
import * as messaging from "messaging"

import { display } from "display"
import { vibration } from "haptics";


messaging.peerSocket.onopen = () => {
  sendMessage({})
}

const selectId = (id) => document.getElementById(id)

const hideRow = (i) => {
  selectId(`row_${i}`).style.display = 'none'
}

const renderStations = (stations) => {
  console.log(stations.length)
  for (let i = 0; i < 17; i++) {
    if (!stations[i]) {
      hideRow(i)
      continue
    }
    const {d, t, n} = stations[i]

    const lineEl = selectId(`line_${i}`) 
    const timeEl = selectId(`time_${i}`) 
    const lineText = `${n} ${d}`
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

const state = []

messaging.peerSocket.onmessage = ({data}) => {
  const { complete } = data
  if (complete) {
    vibration.start("nudge-max")
    display.poke()
    renderStations(state)
  } else {
    state.push(...data)
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
