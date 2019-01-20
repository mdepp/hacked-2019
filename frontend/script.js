var stories = []
var map;
var infowindow;
var markers = null;

const http = new XMLHttpRequest();
const api_url = 'http://localhost:5000/all/';
http.open('GET', api_url);
http.send();
http.onreadystatechange=(e)=>{
    if (http.readyState != 4 || http.status != 200) return;
    console.log('Fetched data.');
    stories = []
    let response = JSON.parse(http.responseText);
    for (let key in response) {
        if (!response.hasOwnProperty(key)) continue;
        let data = response[key];
        stories.push(data);
    }
    refreshMarkersAndInfo();
}

function refreshMarkersAndInfo() {
    // Delete existing markers
    if (markers != null) {
        for (let marker of markers) {
            marker.setMap(null);
        }
    }
    // Add markers for each story
    markers = stories.map(function(story, i) {
        return new google.maps.Marker({
            position: {lat: story.lat, lng: story.lon},
            map: map
        });
    });
    // Add event listeners to open info windows
    for (let i=0; i < stories.length; i++) {
        markers[i].addListener('click', function() {
            showInfoWindow(markers[i], stories[i], infoWindow);
        });
    }
}

function showInfoWindow(marker, story, info) {
    console.log(infoWindow);
    referenced_names = [];
    for (let obj of story.referenced_places) {
        referenced_names.push(obj.name);
    }
    info.setContent(`<h4>${story.location_string} -- ${story.headline}</h4><p>${story.blurb}</p><br>${referenced_names}`);
    info.open(map, marker);
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 1
    });
    infoWindow = new google.maps.InfoWindow({});
    console.log(infoWindow);

    refreshMarkersAndInfo();
}