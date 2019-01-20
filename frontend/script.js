var stories = []
var map;
var infowindow;
var markers = null;
var highlight_marker = null;

var popup;

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
        stories[stories.length-1].url = key;
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
        markers[i].addListener('mouseover', function() {
            showInfoWindow(markers[i], stories[i], infoWindow);
        });
        markers[i].addListener('mouseout', function() {
            hideInfoWindow(infoWindow);
        })
        markers[i].addListener('click', function() {
            showStory(stories[i]);
        });
    }
}

function showStory(story) {
    let default_text_div = document.getElementById('default-sidebar-text');
    let text_div = document.getElementById('sidebar-text');
    
    default_text_div.style.display = 'none';
    text_div.style.display = 'block';

    text_div.innerHTML = `<h4><a href="${story.url}">${story.headline}</a></h4>${story.html}`;

    // text_div.innerText = story.content;
    // text_div.innerHTML = `<h4><a href="${story.url}">${story.headline}</a></h4>` + text_div.innerHTML;

    for (let lnk of document.getElementsByClassName('pos-link')) {
        lnk.addEventListener('mouseover', function() {
            for (let obj of story.referenced_places) {
                if (obj.name.toUpperCase() == lnk.innerHTML.toUpperCase()) {
                    highlightCoordinates(obj.lat, obj.lon);
                    break;
                }
            }
        });
        lnk.addEventListener('mouseout', removeHighlight);
    }

    let tags_div = document.getElementById('sidebar-tags');
    let tags_str = '';
    for (let obj of story.referenced_places) {
        tags_str += `<button class="btn btn-default btn-xs" onmouseover="highlightCoordinates(${obj.lat}, ${obj.lon})" onmouseout="removeHighlight();">${obj.name}</button>`;
    }
    tags_div.innerHTML = tags_str;
}

function showInfoWindow(marker, story, info) {
    info.setContent(`<div id="info-window-content-marker"></div><h4>${story.location_string} -- ${story.headline}</h4><p>${story.blurb}</p>`);
    info.open(map, marker);
    let window = document.getElementById('info-window-content-marker').parentElement.parentElement.parentElement.parentElement;
    window.classList.add('info-window');
}

function hideInfoWindow(info) {
    info.close();
}

function highlightCoordinates(lat, lon) {
    highlight_marker.setPosition({lat: lat, lng: lon});
    highlight_marker.setMap(map);
}

function removeHighlight() {
    highlight_marker.setMap(null);
}


function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 1
    });
    infoWindow = new google.maps.InfoWindow({});
    console.log(infoWindow);

    refreshMarkersAndInfo();

    highlight_marker = new google.maps.Marker({
        icon: 'libraries/markerclusterer/m1.png',
    });

    definePopupClass();
    popup = new Popup(
        new google.maps.LatLng(-33.866, 151.196),
        document.getElementById('popup-content'));
    popup.setMap(map);
}