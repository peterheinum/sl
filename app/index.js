import document from 'document'
import * as messaging from "messaging"

import { display } from "display"
import { vibration } from "haptics";


messaging.peerSocket.onopen = () => {
  console.log('Ready')
  sendMessage({})
}

const selectId = (id) => document.getElementById(id)

const renderStations = (stations) => {
  console.log(stations.length)
  for (let i = 0; i < stations.length; i++) {
    const {d, t, n} = stations[i]

    const lineEl = selectId(`line_${i}`) 
    const timeEl = selectId(`time_${i}`) 
    const lineText = `${n} ${d}`
    if (lineEl) {
      lineEl.text = lineText
      if (lineText.length > 17) { 
        lineEl.style.fontSize = 
          lineEl.style.fontSize * 
          ((1 - (lineText.length/17) + 1)*1.25) // handle too long text
      }
    } 

    if (timeEl) {
      timeEl.text = `${t}`
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
  console.log('we want to send message in the app')
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send the data to peer as a message
    messaging.peerSocket.send({
      ...data
    })
  } else {
    console.log('but we cant')
    setTimeout(() => {
      sendMessage(data)
    }, 500)
  }
}
