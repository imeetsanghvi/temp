var milesToKms = 1.60934
const myMAP = "my_location_map"
const default_radius_value = 10;

var requestOptions = {
    method: 'GET',
};

function startCodapConnection() {
    var config = {
        title: "Purple Air Plugin",
        version: "001",
        dimensions: {
            width: 380,
            height: 600
        },
        preventBringToFront: false,
    };

    console.info("Starting codap connection");

    codapInterface.init(config).then(
        function() { //  at this point, purple_air.state is populated!
            purple_air.state = codapInterface.getInteractiveState(); // |S| initialize state variable!
            purple_air.initialize();
            return Promise.resolve();
        }
    ).catch(function(msg) {
        console.log('warn: ' + msg);
    });
}

/**
 * This is the one global, a singleton, that we need or this game.
 * @type {{initialize: estimate.initialize, newGame: estimate.newGame, endGame: estimate.endGame, newTurn: estimate.newTurn, endTurn: purple_air.endTurn}}
 */
var purple_air = {

    initialize: function() {
        purple_air.state = {
            ...purple_air.default
        }
        console.log(purple_air.state)
        purple_air.setStartDate();
        purple_air.setEndDate();

        pluginHelper.initDataSet(purple_air.dataSetDescription);
    },

    getStartDate: function() {
        let value = document.getElementById("startDate").value
        purple_air.state.startDate = value
        return value
    },

    setStartDate: function() {
        let startDate = new Date();
        let d = startDate.toLocaleString().split(",")[0].split("/")
        let startDateStr = `${d[2]}-${d[0].padStart(2,0)}-${d[1].padStart(2,0)}`
        document.getElementById('startDate').value = startDateStr
        document.getElementById('startDate').max = startDateStr

        purple_air.state.startDate = startDateStr
    },

    getEndDate: function() {
        let value = document.getElementById("endDate").value
        purple_air.state.endDate = value
        return value
    },

    setEndDate: function() {
        let endDate = new Date()
        let d = endDate.toLocaleString().split(",")[0].split("/")
        let endDateStr = `${d[2]}-${d[0].padStart(2,0)}-${d[1].padStart(2,0)}`
        document.getElementById('endDate').value = endDateStr
        document.getElementById('endDate').max = endDateStr
        purple_air.state.endDate = endDateStr
    },

    getLocationValue: function() {
        return document.getElementById("city_input").value
    },

    setLocationValue: function() {
        document.getElementById("city_input").value = ""
    },

    getLatLongValue: function() {
        return document.getElementById("lat_long_input").value
    },

    setLatLongValue: function() {
        document.getElementById("lat_long_input").value = ""
    },

    getRadiusValue: function() {
        let value = document.getElementById("radiusRange").value
        purple_air.state.radiusInMiles = value
        return value
        // document.getElementById("radiusText").value
    },

    setRadiusValue: function() {
        document.getElementById("radiusRange").value = default_radius_value
        document.getElementById("radiusText").value = default_radius_value
    },

    getMinutesValue: function() {
        let value = document.getElementById("minutes").value
        purple_air.state.averaginMinutes = value
        return value
        // document.getElementById("radiusText").value
    },

    setMinutesValue: function() {
        document.getElementById("minutes").selectedIndex = 0
    },


    clearLocationState: function() {
        purple_air.state.city = ""
        purple_air.state.state = ""
        purple_air.state.zip = ""
    },

    clearLatLongBoundingState: function() {
        purple_air.state.latitude = 0.00
        purple_air.state.longitude = 0.00
        purple_air.state.city = []
    },
    clearStartDateState: function() {},
    clearEndDateState: function() {},


    clearLocation: function() {
        purple_air.setLocationValue()
        purple_air.setLatLongValue()
        purple_air.clearLocationState()
        purple_air.clearLatLongBoundingState()

        console.info(`location Info Cleared ${purple_air.state}`)
    },

    reset: function() {
        purple_air.setLocationValue()
        purple_air.setLatLongValue()

        purple_air.setRadiusValue()

        purple_air.setStartDate()
        purple_air.setEndDate()

        purple_air.setMinutesValue()

        purple_air.state = {
            ...purple_air.default
        }
        console.info('Form has been reset')
        console.info(purple_air.state)
    },

    save_state: async function(city, state, zip, lat, long, bounding_box) {
        purple_air.state.city = await city
        purple_air.state.state = await state
        purple_air.state.zip = await zip
        purple_air.state.latitude = await lat;
        purple_air.state.longitude = await long;
        purple_air.state.bounding_box = await bounding_box

        console.info("State Updated ==> ")
        console.info(purple_air.state)

    },


    searchLocation: async function() {
        // console.log('search for location')
        let search = document.getElementById("city_input").value
        // document.getElementById("city_input").value = "Fetching"

        if (search === "") {
            console.log('inside')
            document.getElementById("msg").innerText = "Please enter city name to search for"
            document.getElementById("msg").style.display = "block"
        } else {
            document.getElementById("lat_long_input").value = "Fetching"
            document.getElementById("msg").style.display = "none"
            console.info('Searching Location ==> ' + search)

            let base_url = `https://api.geoapify.com/v1/geocode/autocomplete?apiKey=cd1a1690ccd74ab1ba583af1dd732ec5&text=` + search + `&type=city&lang=en&filter=countrycode:us&format=json`
            // reverse geocoding api call to geoapify
            // console.log(base_url)

            await fetch(base_url, requestOptions)
                .then(response => response.json())
                .then(response => {

                    let result = response.results[0]
                    let radiusInMiles = document.getElementById("radiusRange").value
                    let city = result.city
                    let state = result.state_code
                    let zip = result.postcode || 0
                    let lat = result.lat
                    let long = result.lon
                    let bounding_box = purple_air.getBoundsFromLatLong(lat, long, radiusInMiles * milesToKms)

                    fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${long}&apiKey=cd1a1690ccd74ab1ba583af1dd732ec5`,
                            requestOptions)
                        .then(response => response.json())
                        .then(result => zip = result.features[0].properties.postcode)
                        .catch(error => console.log('error', error));

                    setTimeout(() => {
                        purple_air.save_state(city, state, zip, lat, long, bounding_box)
                        document.getElementById('lat_long_input').value = `${lat}, ${long}`
                        document.getElementById('city_input').value = `${city}, ${state}`
                    }, 500);

                })
                .catch(error => console.log('error', error));
        }
    },

    getFormData: function() {
        // data = {}
        // data.location = this.getLocationValue()
        // data.LatLong = this.getLatLongValue()
        // data.radiusInMiles = this.getRadiusValue() 
        // data.startDate = this.getStartDate()
        // data.endDate = this.getEndDate()
        // data.averaginMinutes = this.getMinutesValue()
        // console.log(purple_air.state)
        console.log(purple_air.state)
    },


    showError: function(message) {
        document.getElementById("msg").innerText = message
        document.getElementById("msg").style.display = "block"
    },

    hideError: function() {
        document.getElementById("msg").innerText = ""
        document.getElementById("msg").style.display = "none"
    },

    setSpinnerText: function(text) {
        document.getElementById("spinner_text").innerText = text
    },

    disable_form_input: function() {
        document.getElementById("spinner").style.display = 'block'
        document.getElementById("")

        document.getElementById("city_input").disabled = "disabled"
        // document.getElementById("lat_long_input").disabled = "disabled"
        document.getElementById("clearLocation").disabled = "disabled"
        document.getElementById("searchLocation").disabled = "disabled"
        document.getElementById("radiusRange").disabled = "disabled"
        document.getElementById("startDate").disabled = "disabled"
        document.getElementById("endDate").disabled = "disabled"
        document.getElementById("minutes").disabled = "disabled"
        document.getElementById("reset").disabled = "disabled"
        document.getElementById("getPurpleAirData").disabled = "disabled"
    },
    enable_form_input: function() {
        document.getElementById("spinner").style.display = 'none'
        document.getElementById("city_input").disabled = ""
        // document.getElementById("lat_long_input").disabled = True
        document.getElementById("clearLocation").disabled = ""
        document.getElementById("searchLocation").disabled = ""
        document.getElementById("radiusRange").disabled = ""
        document.getElementById("startDate").disabled = ""
        document.getElementById("endDate").disabled = ""
        document.getElementById("minutes").disabled = ""
        document.getElementById("reset").disabled = ""
        document.getElementById("getPurpleAirData").disabled = ""
    },

    getAQIfromPM: function(pm) {
        if (isNaN(pm)) return "-";
        if (pm == undefined) return "-";
        if (pm < 0) return pm;
        if (pm > 1000) return "-";
        /*      
              Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
        Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
        Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
        Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
        Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
        Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
        Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
        */
        if (pm > 350.5) {
            return purple_air.calcAQI(pm, 500, 401, 500, 350.5);
        } else if (pm > 250.5) {
            return purple_air.calcAQI(pm, 400, 301, 350.4, 250.5);
        } else if (pm > 150.5) {
            return purple_air.calcAQI(pm, 300, 201, 250.4, 150.5);
        } else if (pm > 55.5) {
            return purple_air.calcAQI(pm, 200, 151, 150.4, 55.5);
        } else if (pm > 35.5) {
            return purple_air.calcAQI(pm, 150, 101, 55.4, 35.5);
        } else if (pm > 12.1) {
            return purple_air.calcAQI(pm, 100, 51, 35.4, 12.1);
        } else if (pm >= 0) {
            return purple_air.calcAQI(pm, 50, 0, 12, 0);
        } else {
            return undefined;
        }
    },

    getAQIDescription: function(aqi) {
        if (aqi >= 401) {
            return 'Hazardous';
        } else if (aqi >= 301) {
            return 'Hazardous';
        } else if (aqi >= 201) {
            return 'Very Unhealthy';
        } else if (aqi >= 151) {
            return 'Unhealthy';
        } else if (aqi >= 101) {
            return 'Unhealthy for Sensitive Groups';
        } else if (aqi >= 51) {
            return 'Moderate';
        } else if (aqi >= 0) {
            return 'Good';
        } else {
            return undefined;
        }
    },

    calcAQI: function(Cp, Ih, Il, BPh, BPl) {

        var a = (Ih - Il);
        var b = (BPh - BPl);
        var c = (Cp - BPl);
        return Math.round((a / b) * c + Il);

    },

    getPurpleAirData: async function() {
        // let search = document.getElementById("city_input").value
        console.info("*****state*****")
        console.info(purple_air.state)

        if (purple_air.state.city === "" || (purple_air.state.latitude === 0.00 && purple_air.state.longitude === 0.00)) {
            let msg = "Please fetch & search your desired location before moving forward"
            console.warn(msg)
            purple_air.showError(msg)
        }
        // else if (purple_air.radiusInMiles ){}
        else if (purple_air.state.startDate === "") {
            let msg = "Please select start date before moving forward"
            purple_air.showError(msg)
            console.warn(msg)
        } else if (purple_air.state.endDate === "") {
            let msg = "Please select end date before moving forward"
            purple_air.showError(msg)
            console.warn(msg)
        } else if (purple_air.state.averaginMinutes === 0) {
            let msg = "Please select averging minutes before moving forward"
            purple_air.showError(msg)
            console.warn(msg)
        } else {

            purple_air.disable_form_input()


            console.info('fetchin data from purple air api')
            purple_air.setSpinnerText("Fetching Data from Purple Air")

            const BASE_URL = "https://api.purpleair.com/v1/sensors?api_key=CA299E4B-82DF-11EC-B9BF-42010A800003&"
            const REQUIRED_FIELDS = "name,primary_id_a,primary_key_a,primary_id_b,primary_key_b,latitude,longitude"
            // resp sequence ===> sensor index, name, primary id a, key a, primary id b , key b // shown by response.fields

            const bounds = purple_air.state.bounding_box

            const lat1 = bounds[0]
            const long1 = bounds[1]
            const lat2 = bounds[2]
            const long2 = bounds[3]

            // const startTime = (new Date(this.state.startDate)).getTime()/1000
            // startTime = (startTime.getTime()/1000)
            // console.log(`start time = ${startTime}`)

            const bounding_string = `&selat=${lat1}&selng=${long1}&nwlat=${lat2}&nwlng=${long2}`
            const URL = `${BASE_URL}fields=${REQUIRED_FIELDS}${bounding_string}`

            let getPAdata = await fetch(URL, requestOptions)
            if (!getPAdata.ok) {
                const message = `An error has occured: ${response.status}`;
                console.error(message)
                throw new Error(message);
            } else {


                // console.info(purple_air.state)
                let result = await getPAdata.json()
                console.info("*****purple air fetch*****")

                // console.info(result)

                let fields = await result.fields
                let datas = await result.data

                let index_i = 1
                for (data of datas) {
                    purple_air.setSpinnerText(`generating values for sensor ${index_i}`)

                    let caseValues = {}
                    // console.log(data)
                    const sensorIndex = data[0]
                    const sensorname = data[1]
                    caseValues["Location"] = `${purple_air.state.city}, ${purple_air.state.state}`
                    caseValues["Sensor Index"] = sensorIndex
                    caseValues["Sensor Name"] = sensorname

                    let [id_a, key_a] = data.slice(2, 4)
                    let [id_b, key_b] = data.slice(4, 6)

                    let [sensorLat, sensorLong] = data.slice(6, 8)

                    caseValues["latitude"] = sensorLat
                    caseValues["longitude"] = sensorLong

                    // console.log(id_a, key_a)
                    // console.log(id_b, key_b)

                    let base_thingsspeak_url_a = `https://api.thingspeak.com/channels/${id_a}/feed.json?api_key=${key_a}&start=${purple_air.state.startDate}%0000:00:00&end=${purple_air.state.endDate}%0023:59:59&offset=0&round=2&average=${purple_air.state.averaginMinutes}&timezone=America/Phoenix`

                    console.log(base_thingsspeak_url_a)

                    let base_thingsspeak_url_b = `https://api.thingspeak.com/channels/${id_b}/feed.json?api_key=${key_b}&start=${purple_air.state.startDate}%0000:00:00&end=${purple_air.state.endDate}%0023:59:59&offset=0&round=2&average=${purple_air.state.averaginMinutes}&timezone=America/Phoenix`

                    console.log(base_thingsspeak_url_b)

                    let fetch_a = await (await fetch(base_thingsspeak_url_a)).json()

                    let channels_a = fetch_a.channels
                    let feeds_a = fetch_a.feeds

                    // console.log(fetch_a.feeds)

                    let fetch_b = await (await fetch(base_thingsspeak_url_b)).json()
                    // console.log(fetch_b.feeds)

                    let channels_b = fetch_b.channels
                    let feeds_b = fetch_b.feeds

                    for (let i = 0; i < feeds_a.length; i++) {
                        dfa = feeds_a[i]
                        dfb = feeds_b[i]

                        // console.log(dfa, dfb)    


                        caseValues["Created at"] = (new Date(dfa.created_at)).toISOString()

                        caseValues["Humidity A"] = dfa.field7
                        caseValues["Temperature A"] = dfa.field6
                        caseValues["PM 2.5 A"] = dfa.field8
                        caseValues["PM 10.0 A"] = dfa.field3
                        caseValues["AQI A"] = purple_air.getAQIfromPM(dfa.field3)
                        
                        caseValues["Temperature B"] = dfb.field6
                        caseValues["PM 2.5 B"] = dfb.field8
                        caseValues["PM 10.0 B"] = dfb.field3
                        caseValues["AQI B"] = purple_air.getAQIfromPM(dfb.field3)

                        pluginHelper.createItems(caseValues)
                    }
                    index_i = index_i + 1


                }
                this.createMapComponent()
                this.createCaseTable("dataset")

            }



































            purple_air.enable_form_input()
        }
    },

    /**
     * 
     * @param {takes in the latitude for a location} lat 
     * @param {takes in the longitude for a location} long 
     * @param {takes in the radius in kilometers for a location} radiusInKms 
     * @returns a bounding box array lat min, long max, lat max, long min (adjusted according to the purple air api results)
     */
    getBoundsFromLatLong: function(lat, long, radiusInKms) {
        var lat_change = radiusInKms / 111.2
        var long_change = Math.abs(Math.cos(lat * (Math.PI / 180)))

        var bounds = {
            lat_min: lat - lat_change,
            long_max: long + long_change,
            lat_max: lat + lat_change,
            long_min: long - long_change
        }
        // console.log(bounds)
        return [
            bounds.lat_min,
            bounds.long_max,
            bounds.lat_max,
            bounds.long_min
        ]
    },

    changeRadius: async function(value) {
        // let result = response.results[0]
        // let radiusInMiles = document.getElementById("radiusRange").value
        // let city = result.city 
        // let state = result.state_code
        // let zip = result.postcode || 0
        // let lat = result.lat
        // let long =  result.lon

        let lat = purple_air.state.latitude
        let long = purple_air.state.longitude
        if (lat === 0.00 || long === 0.00) {
            document.getElementById("msg").innerText = "Please fetch / search your desired location before moving forward"
            document.getElementById("msg").style.display = "block"
        } else {
            let radiusInMiles = value
            let bounding_box = await purple_air.getBoundsFromLatLong(lat, long, radiusInMiles * milesToKms)
            console.info('Radius Changed')
            purple_air.state.bounding_box = bounding_box
            purple_air.state.radiusInMiles = value
            console.log(purple_air.state)
        }
    },

    createMapComponent: function(datasetName) {
        return codapInterface.sendRequest({
            "action": "create",
            "resource": "component",
            "values": {
                "type": "map",
                "name": myMAP,
                "title": "map",
                "dataContextName": "purple air",
                "legendAttributeName": "Legend",
                "dimensions": {
                    width: 380,
                    height: 380
                }

            }
        }).then(function(result) {
            console.log("Map openend")
            // console.log(result);

        });
    },

    createCaseTable: function(datasetName) {
        return codapInterface.sendRequest({
                action: 'create',
                resource: `component`,
                values: {
                    type: "caseTable",
                    dataContext: datasetName,
                    "dimensions": {
                        width: 1000,
                        height: 500
                    }
                }
            })
            .then(function(result) {
                // console.log(result)
                if (result.success) {
                    let componentID = result.values.id;
                    if (componentID) {
                        return codapInterface.sendRequest({
                            action: 'notify',
                            resource: `component[${componentID}]`,
                            values: {
                                request: 'autoScale',
                                "position": "bottom"
                            }
                        })
                    }
                }
            });
    }
};


/**
 * Called when the user selects a case (or cases) in CODAP
 * We deal with this in session 2.
 * @param iMessage
 */
purple_air.codapSelects = function(iMessage) { //  |N| part of session 2 solution
    var tMessageValue = iMessage.values;
    if (Array.isArray(tMessageValue)) {
        tMessageValue = tMessageValue[0]; //      the first of the values in the message
    }
    console.log("Received a " + tMessageValue.operation + " message");
};

/**
 * The "state" member variable.
 * Anything you want saved and restored that is NOT in CODAP, you put here,
 * @type {{playerName: string, lastClickPosition: number, lastInputNumber: number, gameNumber: number, turnNumber: number, currentScore: number, currentTruth: number, playing: boolean, restored: boolean}}
 */
purple_air.state = {
    latitude: 0.00,
    longitude: 0.00,
    city: "",
    state: "",
    zip: "",
    bounding_box: [],
    radiusInMiles: default_radius_value,
    startDate: "",
    endDate: "",
    averaginMinutes: 0
};

purple_air.default = {
    latitude: 0.00,
    longitude: 0.00,
    city: "",
    state: "",
    zip: "",
    bounding_box: [],
    radiusInMiles: default_radius_value,
    startDate: "",
    endDate: "",
    averaginMinutes: 0
}

// purple_air.state = {
//     "latitude": 35.1987522,
//     "longitude": -111.6518229,
//     "city": "Flagstaff",
//     "state": "AZ",
//     "zip": 0,
//     "bounding_box": [
//       35.054027379856116,
//       -110.83466544818978,
//       35.34347702014389,
//       -112.46898035181022
//     ],
//     "radiusInMiles": 10,
//     "startDate": "2022-03-21",
//     "endDate": "2022-03-21",
//     "fullUTCStartDate": "",
//     "fullUTCEndDate": "",
//     "averaginMinutes": 60
//   }

// purple_air.default = {
//     "latitude": 35.1987522,
//     "longitude": -111.6518229,
//     "city": "Flagstaff",
//     "state": "AZ",
//     "zip": 0,
//     "bounding_box": [
//       35.054027379856116,
//       -110.83466544818978,
//       35.34347702014389,
//       -112.46898035181022
//     ],
//     "radiusInMiles": 10,
//     "startDate": "2022-03-21",
//     "endDate": "2022-03-21",
//     "fullUTCStartDate": "",
//     "fullUTCEndDate": "",
//     "averaginMinutes":60
//   }


/**
 * A convenient place to stash constants
 * @type
 */
purple_air.constants = {
    version: "001"
};


/**
 * Constant object CODAP uses to initialize our data set (a.k.a. Data Context)
 *
 * @type {{name: string, title: string, description: string, collections: [*]}}
 */
purple_air.dataSetDescription = {
    name: "dataset",
    title: "Purple Air Table",
    description: "A set of values including humidity, precipitation, temperature, pm2.5 & pm10.0, AQI",
    dimensions: {
        width: 1000,
        height: 500
    },
    collections: [{
            name: "Sensors",
            parent: null, //  this.gameCollectionName,    //  this.bucketCollectionName,
            labels: {
                singleCase: "sensor",
                pluralCase: "sensors",
                setOfCasesWithArticle: "Set of Values"
            },

            attrs: [{
                    "name": "Location",
                    "type": "Categorical",
                    "description": "user's searched location / current location"
                },
                {
                    name: "Sensor Index",
                    type: 'numeric',
                    description: "Sensors id"
                },
                {
                    name: "Sensor Name",
                    type: 'categorical',
                    description: "Sensors Name"
                },
                {
                    name: "latitude",
                    type: 'numeric',
                    description: "user's location"
                },
                {
                    name: "longitude",
                    type: 'numeric',
                    description: "user's location"
                },
            ]
        },
        {
            "name": "Sensor Data",
            "title": "List of Measures",
            "parent": "Sensors",
            "labels": {
                "singleCase": "measure",
                "pluralCase": "measures"
            },
            "attrs": [{
                    name: "Created at",
                    type: 'date',
                    description: "date created data"
                },
                {
                    name: "Humidity A",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value"
                },
                {
                    name: "Temperature A ",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value"
                },
                {
                    name: "PM 10.0 A",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value of pm 10.0"
                },
                {
                    name: "PM 2.5 A",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value of pm 2.5"
                },
                {
                    name: "AQI A ",
                    type: 'numeric',
                    precision: 3,
                    description: "Air Quality Index"
                },
                {
                    name: "Temperature B",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value"
                },
                {
                    name: "PM 10.0 B",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value of pm 10.0"
                },
                {
                    name: "PM 2.5 B",
                    type: 'numeric',
                    precision: 3,
                    description: "estimated value of pm 2.5"
                },
                {
                    name: "AQI B",
                    type: 'numeric',
                    precision: 3,
                    description: "Air Quality Index"
                },

            ]
        }
    ]
};