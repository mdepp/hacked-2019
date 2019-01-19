import json
from crawler import get_lat_lon, get_location, LocationFormatException
from tqdm import tqdm

with open('content_by_url.json') as file:
    data = json.load(file)

for url, item in tqdm(data.items()):
    try:
        location = get_location(item['content'])
        item['lat'], item['lon'] = get_lat_lon(location)
    except LocationFormatException:
        pass

with open('content_by_url.json', 'w') as file:
    json.dump(data, file)
