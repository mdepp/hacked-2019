var stories = {};
var story_groups = [];

fetch("data.json")
  .then(response => response.json())
  .then(json => {
      console.log(json);
      stories = json.stories;
      story_groups = json.story_groups;
      refreshMarkersAndInfo();
  });


var map;
var infoWindow;
var markers = null;
var highlight_marker = null;

var highlightInfoWindow;

var prevPosition = null;
var prevZoom = null;

var articleSelectedMarker = null;
var articleSelectedStoryGroup = null;
var defaultIconColour = 'FF6347';
var articleSelectedIconColour = 'FFD700';

markerImages = {};

/*const http = new XMLHttpRequest();
const api_url = 'https://mdepp/github.io/posts/data.json';
http.open('GET', api_url);
http.send();
http.onreadystatechange=(e)=>{
    if (http.readyState != 4 || http.status != 200) return;
    console.log('Fetched data.');
    let response = JSON.parse(http.responseText);
    stories = response.stories;
    story_groups = response.story_groups;
    refreshMarkersAndInfo();
}*/

function refreshMarkersAndInfo() {
    // Delete existing markers
    if (markers != null) {
        for (let marker of markers) {
            marker.setMap(null);
        }
    }
    // Add markers for each story group
    markers = story_groups.map(function(story_group, i) {
        return new google.maps.Marker({
            position: {lat: story_group.lat, lng: story_group.lon},
            map: map,
            icon: getMarkerImage(defaultIconColour, story_group.urls.length)
        });
    });
    // Add event listeners to open info windows
    for (let i=0; i < story_groups.length; i++) {
        markers[i].addListener('click', function() {
            showInfoWindow(i);
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
        tags_str += `<div class="pos-link">${obj.name}</div>`;
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

function storyBtnPressed(marker_index, story_url) {
    let story = stories[story_url];
    let marker = markers[marker_index];
    let story_group = story_groups[marker_index];
    showStory(marker, story);
    updateArticleSelectedMarker(marker, story_group);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {marker.setAnimation(null);}, 100);
    hideInfoWindow();
}

function showInfoWindow(index) {
    infoWindowOpen = true;
    content = `<div id="info-window-content">`;
    for (let url of story_groups[index].urls) {
        let story = stories[url];
        content += 
        `<div class="card" onclick="storyBtnPressed(${index}, '${url}')">
            <div class="card-title"><h4>${story.location_string} — ${story.headline}</h4></div>
            <div class="card-text"><p>${story.blurb}</p></div>
        </div>`;
    }
    content += `</div>`;
    infoWindow.setContent(content);
    infoWindow.open(map, markers[index]);
}

function hideInfoWindow() {
    infoWindowOpen = false;
    infoWindow.close();
}

function highlightCoordinates(lat, lon, label) {
    //highlight_marker.setPosition({lat: lat, lng: lon});
    //highlight_marker.setMap(map);
    //highlightInfoWindow.setContent(label);
    //highlightInfoWindow.open(map, highlight_marker);
    movePosition(lat, lon, 3);
}

function removeHighlight() {
    //highlight_marker.setMap(null);
    //highlightInfoWindow.close();
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

function updateArticleSelectedMarker(new_marker, story_group)
{
    if (articleSelectedMarker !== null)
    {
        articleSelectedMarker.setIcon(getMarkerImage(defaultIconColour, articleSelectedStoryGroup.urls.length));
    }
    articleSelectedMarker = new_marker;
    articleSelectedStoryGroup = story_group;
    articleSelectedMarker.setIcon(getMarkerImage(articleSelectedIconColour, articleSelectedStoryGroup.urls.length));
}

function getMarkerImage(colour, count) {
    let character = '•';
    if (count !== 1) {
        character = count.toString();
    }
    url = `http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=${character}|${colour}`;
    if (!(url in markerImages)) {
        markerImages[url] = new google.maps.MarkerImage(url,
            new google.maps.Size(21, 34),
            new google.maps.Point(0,0),
            new google.maps.Point(10, 34));
    }
    return markerImages[url];
}


var count = 0;
function initMap() {
    //if (++count < 2) return;

    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 31.7917, lng: 7.0926},
        zoom: 2
    });
    infoWindow = new google.maps.InfoWindow({});
    highlightInfoWindow = new google.maps.InfoWindow({});

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