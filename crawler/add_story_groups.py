import json
from tqdm import tqdm
from math import pi, sin, cos


with open('content_by_url.json') as file:
    data = json.load(file)


def is_close(la1, lo1, la2, lo2):
    return ((la1 - la2)**2 + (lo1 - lo2)**2) < 0.01

groups = []

for url, item in tqdm(data.items()):
    if 'lat' not in item:
        continue
    found = False
    for group in groups:
        if is_close(item['lat'], item['lon'], group['lat'], group['lon']):
            group['urls'].append(url)
            found = True
            break
    if not found:
        groups.append({
            'urls': [url],
            'lat': item['lat'],
            'lon': item['lon']
        })


with open('story_groups.json', 'w') as file:
    json.dump(groups, file)
