const config = require("./config")
const StatusLed = require("./status-led")
const CurrentStatus = require("./current-status")
const five = require("johnny-five")
const fetch = require("node-fetch")
const admin = require("firebase-admin")
const serviceAccount = require(config.firebase.accountKeyPath)
const scanner = require('plott-wifi-scanner')

var led, tempRef, wifiNetworks
const board = new five.Board()
const currentStatus = new CurrentStatus()

async function externalTemp() {
    return fetch(config.weatherApi.endpoint)
        .then(res => res.json())
        .then(json => json.results.temp)
        .catch(err => {
            console.error(err)
            led.error()
        })
}

board.on("ready", function() {
    // Setup firebase
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.firebase.databaseURL
    })
    tempRef = admin.database().ref("temp/"+config.historyApi.location)

    led = new StatusLed(config.led)
    led.intensity(10).off()

    const thermometer = new five.Thermometer(config.thermometer);
    thermometer.on("data", function() {
        currentStatus.temperature = this.C.toFixed(1)
        if (tempRef) {
            tempRef.set({
                temp: currentStatus.temperature,
                humid: 123,
                noise: 15,
                wifi: wifiNetworks
            })
        }
    });
    
    waitToUpdate(500)
    scanWiFi()
})

board.on("exit", function() {
    led.off()
})

async function updateData() {
    if (currentStatus.temperature === null) {
        // Sensor isn't ready, lets wait a little bit...
        waitToUpdate(500)
        return;
    }
    led.updating()
    const payload = JSON.stringify(
        config.historyApi.payload(await externalTemp(), currentStatus)
    )

    const params = {
        method: 'POST',
        body: payload,
        headers: {
            "Authorization": "Basic " + config.historyApi.key,
            "Content-Type": "application/json"
        }
    }

    console.log("Updating...", payload)
    fetch(config.historyApi.endpoint, params)
        .then(() => {
            led.waiting()
        })
        .catch(error => {
            console.error(error)
            led.error()
        })
        .then(() => {
            waitToUpdate(config.historyApi.updateInterval)
        })
}

function scanWiFi() {
    console.log("Scanning wifi...")
    scanner((err, networks) => {
        if (err) {
            console.error(err)
            return
        }
        wifiNetworks = networks
        console.log(networks.length, "networks found")
    })
    setTimeout(scanWiFi, 10000)
}

function waitToUpdate(time) {
    led.waiting()
    console.log("Setting the timeout to", time)
    setTimeout(updateData, time)
}
