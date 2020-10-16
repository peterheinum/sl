import document from 'document'
import * as messaging from "messaging"

import { geolocation } from "geolocation";

messaging.peerSocket.onopen = () => {
  console.log("Ready")
  
  const onPositionRetrieved = ({coords}) => sendMessage(coords, 'gpsRecieved')
  
  geolocation.getCurrentPosition(onPositionRetrieved)
}

const createClickableStation = (stations) => {
  for (let i = 0; i < stations.length; i++) {
    const lineEl = document.getElementById(`line${i}`) 
    const departureEl = document.getElementById(`departure${i}`) 
    const {d, t, n} = stations[i]
    console.log(lineEl, `line${i}`)
    console.log(departureEl)
    lineEl && (lineEl.text = `${n} ${d}`)
    departureEl && (departureEl.text = `${t}`)
  }
}

messaging.peerSocket.onerror = err => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

messaging.peerSocket.onmessage = ({data}) => {
  console.log(JSON.stringify(data))
  console.log('yo')
  createClickableStation(data)
}

const sendMessage = (data, type) => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send the data to peer as a message
    messaging.peerSocket.send({
      ...data,
      type
    })
  }
}
