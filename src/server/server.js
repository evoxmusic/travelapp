const templateData = require('./templateData.js')
const assert = require('assert')
const { getServerConfig, getCityInformation } = require('./externalAPI')
const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const PORT = 8080
const DEBUG = false
const PRELOAD_DATA = false
/*
const apiVideo = require('@api.video/nodejs-sdk');

// Create client for Production and authenticate
const client = new apiVideo.Client({ apiKey: 'M2g0b2uoIGLtzIbgtt2tRVdgYgza0WjyrEUECHmv8zT' });
console.log("created the client")
// Create and upload a video ressource
let result = client.videos.upload('data/superbowl.mp4', {title: 'Superbowl'});
console.log('called the upload')
result.then(function(video) {
  console.log(video.title);
}).catch(function(error) {
  console.error(error);
});

// Create players with default values
let playerClient = client.players.create();
let playerId = null

playerClient.then(function(player) {
  console.log(player.playerId);
  playerId = player.playerId
});
*/
function debug(str) {
    if (DEBUG == true)
        console.log(str)
}

let savedTrips = []

if (PRELOAD_DATA == true) {
    // This is an array with all the saved trips but only the city and departingDate are keys the rest is updated when the client requests the information
   savedTrips = templateData.templateSavedTrips
}

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('dist'))

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    next()
})

app.listen(PORT, function () {
    debug('server listening on port ' + PORT)
    const conf = getServerConfig()
    
    try { assert(conf.pixabayKey)
        assert(conf.darkskyKey)
        assert(conf.geonameUser)
    } catch(error) {
        console.log("THE SERVER KEYS ARE NOT CONFIGURED")
        process.exit()
    }
})

//Returning the website html page
app.get('/', function (req, res) {
    res.sendFile('dist/index.html')
})

//Function returning the saved trips
app.get('/savedTrips', function (req, res) {
    debug('sending trips back')
    refreshTripData().then(result => {
        res.send(JSON.stringify(savedTrips))
    }).catch(error => {
        res.statusText = error.toString()
        res.statusCode = 500
        res.send()
    })
})

//Function to search information on a trip before saving it 
app.get('/searchTrips/:location/:date', function (req, res) {
    debug('searching trips')
    debug(req.params.location)
    debug(req.params.date)

    getCityInformation(req.params.location, req.params.date).then(result => {
        debug('sending result ' + result)
        res.send(JSON.stringify(result))
    }).catch(error => {
        debug(error.toString())
        res.status(500)
        res.statusText = error.toString()
        res.send()
    })
})

//Function adding a trip to the saved trips
app.post('/newtrip', function (req, res) {
    debug('logging a new trip')
    debug(req.body)
    res.status(200)
    res.statusText = "Data Successfully Added"
    savedTrips.push({
        city: req.body.city,
        departingDate: req.body.departingDate,
        country: req.body.country
    })

    res.send()
})

//Function adding a trip to the saved trips
app.post('/removetrip', function (req, res) {
    debug('removing an old trip')
    debug(req.body)
    debug(savedTrips.length)
    for (let i = 0; i < savedTrips.length; i++) {
        debug(savedTrips[i].departingDate, req.body.departingDate, savedTrips[i].city, req.body.city)

        if (savedTrips[i].departingDate == req.body.departingDate && savedTrips[i].city == req.body.city && savedTrips[i].country == req.body.country) {
            savedTrips.splice(i, 1)
            res.status(200)
            res.statusText = "Data Successfully Removed"
            debug("found the element - new data")
            debug(savedTrips)
            break
        }

        if (i == savedTrips.length - 1) {
            res.status(500)
            res.statusText = "Data could not be found"
            debug("couldn't find the data in the array")
        }
    }

    res.send()
})


async function refreshTripData() {
    let resp = []

    for (let i = 0; i < savedTrips.length; i++) {
        resp[i] = getCityInformation(savedTrips[i].city, savedTrips[i].departingDate).then(res => savedTrips[i] = res)
    }

    return Promise.all(resp)
}