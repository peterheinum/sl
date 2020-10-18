import document from 'document'
import * as messaging from "messaging"

import { geolocation } from "geolocation";

messaging.peerSocket.onopen = () => {
  console.log("Ready")
  
  const onPositionRetrieved = ({coords}) => sendMessage(coords, 'gpsRecieved')
  
  geolocation.getCurrentPosition(onPositionRetrieved)
}

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
  console.log(JSON.stringify(data))
  const { state } = data
  state 
    ? console.log(state)
    : renderStations(data)
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
