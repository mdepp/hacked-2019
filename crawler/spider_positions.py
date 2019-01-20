import json
from tqdm import tqdm
from math import pi, sin, cos


with open('content_by_url.json') as file:
    data = json.load(file)


def is_close(la1, lo1, la2, lo2):
    return ((la1 - la2)**2 + (lo1 - lo2)**2) < 0.01

groups = []
ungrouped = []

for url, item in tqdm(data.items()):
    if 'lat' not in item:
        ungrouped.append(url)
        continue
    found = False
    for group_urls, (group_lat, group_lon) in groups:
        if is_close(item['lat'], item['lon'], group_lat, group_lon):
            group_urls.append(url)
            found = True
            break
    if not found:
        groups.append(([url], (item['lat'], item['lon'])))


for urls, (center_lat, center_lon) in groups:
    if len(urls) == 1:
        item = data[urls[0]]
        item['spidered_lat'], item['spidered_lon'] = item['lat'], item['lon']
        continue

    delta = 2*pi / len(urls)
    theta = 0
    r = 1

    for url in urls:
        lat = center_lat + r*sin(theta)
        lon = center_lon + r*cos(theta)
        data[url]['spidered_lat'], data[url]['spidered_lon'] = lat, lon
        theta += delta

with open('content_by_url.json', 'w') as file:
    json.dump(data, file)
