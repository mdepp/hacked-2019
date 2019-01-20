var stories = []
var map;
var infoWindow;
var markers = null;
var highlight_marker = null;

var highlightInfoWindow;

var prevPosition = null;
var prevZoom = null;

var defaultIcon = null;
var articleSelectedIcon = null;
var articleSelectedMarker = null;

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
        stories[stories.length-1].lat = stories[stories.length-1].spidered_lat;
        stories[stories.length-1].lon = stories[stories.length-1].spidered_lon;
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
            map: map,
            icon: defaultIcon
        });
    });
    // Add event listeners to open info windows
    for (let i=0; i < stories.length; i++) {
        markers[i].addListener('click', function() {
            showInfoWindow(i, [0, 1, 2, 3, 4]);
        });
    }
}

function showStory(marker, story) {
    let default_text_div = document.getElementById('default-sidebar-text');
    let text_div = document.getElementById('sidebar-text');
    
    default_text_div.style.display = 'none';
    text_div.style.display = 'block';

    text_div.innerHTML = `<h4><a href="${story.url}">${story.headline}</a></h4>${story.html}`;
    text_div.scrollIntoView();

    let tags_div = document.getElementById('sidebar-tags');
    let tags_str = '';
    for (let obj of story.referenced_places) {
        //tags_str += `<button class="btn btn-default btn-xs" onmouseover="highlightCoordinates(${obj.lat}, ${obj.lon}, '${obj.name}')" onmouseout="removeHighlight();">${obj.name}</button>`;
        tags_str += `<button class="btn btn-default btn-xs pos-link">${obj.name}</button>`;
    }
    tags_div.innerHTML = tags_str;

    for (let lnk of document.getElementsByClassName('pos-link')) {
        let place_entry = 0;
        for (let obj of story.referenced_places) {
            if (obj.name.toUpperCase() == lnk.innerHTML.toUpperCase().trim()) {
                place_entry = obj;
                break;
            }
        }
        lnk.addEventListener('mouseover', function() { highlightCoordinates(place_entry.lat, place_entry.lon, place_entry.name); });
        lnk.addEventListener('mousedown', function() { zoomTo(place_entry.lat, place_entry.lon); });
        lnk.addEventListener('mouseup', resetZoom);
        lnk.addEventListener('mouseout', function() { removeHighlight(); resetZoom() });
    }
}

function storyBtnPressed(marker_index, story_index) {
    let story = stories[story_index];
    let marker = markers[marker_index];
    showStory(marker, story);
    updateArticleSelectedMarker(marker);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {marker.setAnimation(null)}, 100);
    hideInfoWindow();
}

function showInfoWindow(marker_index, story_indices) {
    infoWindowOpen = true;
    content = `<div id="info-window-content">`;
    for (let i of story_indices) {
        content += 
        `<div class="card" onclick="storyBtnPressed(${marker_index}, ${i})">
            <div class="card-title"><h4>${stories[i].location_string} -- ${stories[i].headline}</h4></div>
            <div class="card-text"><p>${stories[i].blurb}</p></div>
        </div>`;
    }
    content += `</div>`;
    console.log(content);
    infoWindow.setContent(content);
    infoWindow.open(map, markers[marker_index]);
}

function hideInfoWindow() {
    infoWindowOpen = false;
    infoWindow.close();
}

function highlightCoordinates(lat, lon, label) {
    highlight_marker.setPosition({lat: lat, lng: lon});
    highlight_marker.setMap(map);
    highlightInfoWindow.setContent(label);
    highlightInfoWindow.open(map, highlight_marker);
    movePosition(lat, lon, 3);
}

function removeHighlight() {
    highlight_marker.setMap(null);
    highlightInfoWindow.close();
    resetPosition();
}

function movePosition(lat, lon) {
    prevPosition = map.getCenter();
    map.panTo({lat: lat, lng: lon});
}
function resetPosition() {
    if (prevPosition !== null) {
        map.panTo(prevPosition);
        prevPosition = null;
    }
}
function zoomTo(lat, lon) {
    prevZoom = map.getZoom();
    map.setZoom(5);
}
function resetZoom() {
    if (prevZoom !== null) {
        map.setZoom(prevZoom);
        prevZoom = null;
    }
}

function updateArticleSelectedMarker(new_marker)
{
    if (articleSelectedMarker !== null)
    {
        articleSelectedMarker.setIcon(defaultIcon);
    }
    articleSelectedMarker = new_marker;
    articleSelectedMarker.setIcon(articleSelectedIcon);
}


function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 31.7917, lng: 7.0926},
        zoom: 2
    });
    infoWindow = new google.maps.InfoWindow({});
    highlightInfoWindow = new google.maps.InfoWindow({});

    defaultIcon = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FF6347",
        new google.maps.Size(21, 34),
        new google.maps.Point(0,0),
        new google.maps.Point(10, 34));
    articleSelectedIcon = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|FFD700",
        new google.maps.Size(21, 34),
        new google.maps.Point(0,0),
        new google.maps.Point(10, 34));

    refreshMarkersAndInfo();

    highlight_marker = new google.maps.Marker({
        icon: 'libraries/markerclusterer/m1.png',
        zIndex: 999999
    });

    google.maps.event.addListener(map, 'click', function(e) {
        if (infoWindowOpen) {
            hideInfoWindow();
        }
    });
}