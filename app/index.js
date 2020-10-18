import document from 'document'
import { geolocation } from "geolocation";

import * as messaging from "messaging"

import { display } from "display"
display.addEventListener('change', (e) => {
  console.log(display.off)
  console.log(JSON.stringify(e))
  if(display.off) display.on = true 
  console.log(JSON.stringify(display))
})

const startTime = new Date().getTime()
console.log(startTime)

geolocation.getCurrentPosition(({coords}) => {
  console.log(new Date().getTime() - startTime)
  console.log('i know your adress')
  sendMessage(coords)
}, error => console.log(error), { maximumAge: Infinity })


// messaging.peerSocket.onopen = () => {
//   console.log(new Date().getTime() - startTime)
//   console.log('huston')
//   if (Object.keys(fetchedCordinates).length) {
//     sendMessage(fetchedCordinates)
//   } else {
//     geolocation.getCurrentPosition(({coords}) => sendMessage(coords), { maximumAge: Infinity })
//   }
// }

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
  renderStations(data)
  const dateAfterRender = new Date().getTime()
  console.log(dateAfterRender)
  // const { state } = data
  // state 
  //   ? console.log(state)
  //   : 
}

const sendMessage = (data) => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send the data to peer as a message
    messaging.peerSocket.send({
      ...data
    })
  }
}
