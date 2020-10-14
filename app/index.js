import document from 'document'
import * as messaging from "messaging"

import { geolocation } from "geolocation";

messaging.peerSocket.onopen = () => {
  console.log("Ready")
  
  const onPositionRetrieved = ({coords}) => sendMessage(coords, 'gpsRecieved')
  
  geolocation.getCurrentPosition(onPositionRetrieved)
}

const createClickableStation = (stations) => {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(i) 
    el.text = stations[i] || ''
    stations[i] && el.addEventListener('click', () => console.log('stations[i]'))
  }
}

messaging.peerSocket.onerror = err => {
  console.log(`Connection error: ${err.code} - ${err.message}`)
}

messaging.peerSocket.onmessage = ({data}) => {
  console.log(JSON.stringify(data))
  const type = data[0]
  type === 'stRC' && createClickableStation(data.slice(1, data.length))
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
