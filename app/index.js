import document from 'document'
import { geolocation } from "geolocation";

import * as messaging from "messaging"

import { display } from "display"
import { vibration } from "haptics";


messaging.peerSocket.onopen = () => {
}

const startTime = new Date().getTime()
console.log(startTime)
const succesCallback = ({coords}) => {
  console.log(new Date().getTime() - startTime)
  console.log('i know your adress')
  display.poke()
  sendMessage(coords)
}
const errorCallback = error => console.log(JSON.stringify(error))

const options = {
  maximumAge: 1200000,
  timeout: 60000
}

geolocation.getCurrentPosition(succesCallback, errorCallback, options)

const selectId = (id) => document.getElementById(id)

const renderStations = (stations) => {
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

messaging.peerSocket.onmessage = ({data}) => {
  vibration.start("nudge-max")
  setTimeout(() => {
    vibration.start("ping")
  }, 1000)

  display.poke()
  console.log('data has arrived')
  renderStations(data)
  const dateAfterRender = new Date().getTime()
  console.log(dateAfterRender)
}

const sendMessage = (data) => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send the data to peer as a message
    messaging.peerSocket.send({
      ...data
    })
  }
}
