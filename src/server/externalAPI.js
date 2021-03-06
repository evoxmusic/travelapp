const dotenv = require('dotenv')
const fetch = require('node-fetch')
const converter = require('xml-js')
const { getName } = require('country-list')

dotenv.config()

//Cannnot put those calls before the dotenv.config()
const pixabayKey = process.env.PIXABAY_KEY
const darkskyKey = process.env.DARKSKY_KEY
const geonameUser = process.env.GEONAME_USERNAME
const DEBUG = false

function debug(str) {
    if (DEBUG == true)
        console.log(str)
}


async function getCityInformation(city, tripDate) {

    let latitude = null
    let longitude = null
    let country = null
    let weather = null
    const cityEncoded = encodeURIComponent(city)
    const geonameEndPoint = `http://api.geonames.org/postalCodeSearchJSON?username=${geonameUser}&placename=${cityEncoded}`
    let value = tripDate.split('-')

    if (geonameUser == undefined || pixabayKey == undefined || darkskyKey == undefined || geonameUser == undefined) {
        debug('setup your environment')
        throw new Error ("Server Error - not configured properly")
    }
    debug(value)
    let date = new Date(value[0], value[1] - 1, value[2])
    //Unix time is in seconds versus milliseconds for getTime
    let time = date.getTime() / 1000
    debug("time = "+ time)
    const geoResponse = await fetch(geonameEndPoint).then(res => res.json()).then(value => {
        latitude = value.postalCodes[0].lat
        longitude = value.postalCodes[0].lng
        country = getName(value.postalCodes[0].countryCode)
        debug(`country ${country} - code: ${value.postalCodes[0].countryCode}`)
    }).catch(error => { throw new Error("Server Error " + error.toString()) })

    const darkskyEndpoint = `https://api.darksky.net/forecast/${darkskyKey}/${latitude},${longitude},${time}`
    const darkskyResponse = await fetch(darkskyEndpoint).then(response => response.json()).then(value => {
        weather = value.daily
        debug(value)
        debug("DAILY")
        debug(value.daily)

        if (weather.data[0].summary == undefined)
            weather.data[0].summary = "No clear forecast - Date is too far"
    }).catch(error => { throw new Error("Server Error " + error.toString()) })

    const pixabayEndpoint = `http://pixabay.com/api/?key=${pixabayKey}&q=${cityEncoded}`

    const pixabayData = await getPixabayData(city, country).catch(error => {
        throw new Error("Server Error " + error.toString())
    })

    //TODO: CHECK THE DATE SEARCH FUNCTION FOR WEATHER
    let json = {
        city: city,
        country: country,
        departingDate: tripDate,
        lat: latitude,
        lon: longitude,
        tempLow: weather.data[0].temperatureLow,
        tempHigh: weather.data[0].temperatureHigh,
        imgURL: pixabayData.url,
        description: weather.data[0].summary,
        tags: pixabayData.tags
    }
    debug('JSON ' + JSON.stringify(json))

    return (json)
}

async function getPixabayData(city, country) {
    const cityPixabayEndpoint = `http://pixabay.com/api/?key=${pixabayKey}&q=${city}`
    const countryPixabayEndpoint = `http://pixabay.com/api/?key=${pixabayKey}&q=${country}`
    let result = null
    let success = false

    let resp = await fetch(cityPixabayEndpoint).then(response => response.json()).then(data => {
        debug('got the result')
        debug(data.hits[0])
        success = true
        result = { url: data.hits[0].webformatURL, tags: data.hits[0].tags }
        return result
    })

    if (success == false) {
        debug('failed on the fetch for city')
        resp = await fetch(countryPixabayEndpoint).then(response => response.json()).then(data => {
            debug('fetching results for country only if previous one failed ')
            debug(data.hits[0])
            result = { url: data.hits[0].webformatURL, tags: data.hits[0].tags }
            return result
        }).catch(error => { throw new Error("Server Error " + error.toString()) })
    }

    return resp
}

function testPixabayConnection(city, country){

    let result = getPixabayData(city, country)
    return result
}

function getServerConfig(){

    const json = {
        pixabayKey: pixabayKey,
        darkskyKey: darkskyKey,
        geonameUser: geonameUser
    }
    //console.log(json)
    return (json)

}
module.exports.testPixabayConnection = testPixabayConnection
module.exports.getCityInformation = getCityInformation
module.exports.getServerConfig = getServerConfig


