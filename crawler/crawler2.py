import json
import requests
import re
import feedparser
import nltk
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from tqdm import tqdm
from pandas import read_csv
from bs4 import BeautifulSoup

content_cache_file = 'content_cache.json'
blacklist_file = 'blacklisted_urls.json'
lat_lon_cache_file = 'lat_lon_cache.json'

df = read_csv('../GeoLite2-City-CSV_20190115/GeoLite2-City-Locations-en.csv')
countries = df['country_name'].dropna().str.lower().unique()
cities = df['city_name'].dropna().str.lower().unique()

try:
    content_cache = json.load(open(content_cache_file))
except FileNotFoundError:
    content_cache = {}
try:
    blacklist = json.load(open(blacklist_file))
except FileNotFoundError:
    blacklist = []
try:
    lat_lon_cache = json.load(open(lat_lon_cache_file))
except FileNotFoundError:
    lat_lon_cache = {}


options = webdriver.FirefoxOptions()
options.headless = True
profile = webdriver.FirefoxProfile()
profile.set_preference('network.cookie.cookieBehavior', 2)
driver = webdriver.Firefox(options=options, firefox_profile=profile)


class InvalidArticleException(Exception):
    def __init__(self, *args):
        super().__init__(*args)


class BlacklistedArticleException(Exception):
    def __init__(self, *args):
        super().__init__(*args)


class LocationFormatException(Exception):
    def __init__(self, *args):
        super().__init__(*args)


def get_referenced_place_names(text, *, use_countries=True, use_cities=True):
    def extract_entity_names(t):
        entity_names = []

        if hasattr(t, 'label') and t.label:
            if t.label() == 'NE':
                entity_names.append(' '.join([child[0] for child in t]))
            else:
                for child in t:
                    entity_names.extend(extract_entity_names(child))

        return entity_names

    sentances = nltk.sent_tokenize(text)

    tokenized_sentences = [nltk.word_tokenize(sentence) for sentence in sentances]
    tagged_sentences = [nltk.pos_tag(sentence) for sentence in tokenized_sentences]
    chunked_sentences = nltk.ne_chunk_sents(tagged_sentences, binary=True)

    entities = []
    for tree in chunked_sentences:
        entities.extend(extract_entity_names(tree))

    places = set()
    for entity in entities:
        if (use_countries and entity.lower() in countries) or (use_cities and entity.lower() in cities):
            places.add(entity.title())

    return places


def get_content_text_and_html(url: str) -> (str, str):
    if url in blacklist:
        raise BlacklistedArticleException(f'Unwilling to read article at url={url}: blacklisted.')

    if url not in content_cache:
        driver.get(url)
        try:
            body = driver.find_element_by_name('articleBody')
            content_cache[url] = {'content': body.text, 'html': body.get_attribute('innerHTML')}
            json.dump(content_cache, open(content_cache_file, 'w'))
        except NoSuchElementException:
            blacklist.append(url)
            json.dump(blacklist, open(blacklist_file, 'w'))
            raise InvalidArticleException(f'Unable to read article at url={url}: no articleBody element!')
    return content_cache[url]['content'], content_cache[url]['html']


def get_lat_lon(place_name: str) -> (float, float):
    if place_name not in lat_lon_cache:
        response = requests.get(f'https://nominatim.openstreetmap.org/search?q={place_name}&format=json&polygon=0').json()[0]
        lat_lon_cache[place_name] = float(response['lat']), float(response['lon'])
        json.dump(lat_lon_cache, open(lat_lon_cache_file, 'w'))
    return lat_lon_cache[place_name]


def get_location(body_text: str) -> str:
    match = re.match('([a-zA-Z0-9., ]+)[–—―]', body_text)
    if match is None:
        raise LocationFormatException('Could not find location in text')
    return match.group(1).strip().title()


if __name__ == '__main__':
    data = {}

    with open('feeds', 'r') as file:
        for feed_url in tqdm(file.read().splitlines()):
            for entry in tqdm(feedparser.parse(feed_url).entries):
                tqdm.write(f'Reading from {entry.link}')
                try:
                    text, html = get_content_text_and_html(entry.link)
                    data[entry.link] = {
                        'content': text,
                        'html': html,
                        'headline': entry.title,
                        'blurb': entry.description,
                    }
                except (InvalidArticleException, BlacklistedArticleException):
                    pass

    for url, item in tqdm(data.items()):
        try:
            location = get_location(item['content'])
            item['lat'], item['lon'] = get_lat_lon(location)
            item['location_string'] = location
        except LocationFormatException:
            pass

    for url, item in tqdm(data.items()):
        item['referenced_places'] = []
        for place_name in get_referenced_place_names(item['content'], use_cities=False):
            lat, lon = get_lat_lon(place_name)
            item['referenced_places'].append({
                'name': place_name,
                'lat': lat,
                'lon': lon,
            })

    for url, item in tqdm(data.items()):
        soup = BeautifulSoup(item['html'])
        for txt in soup.find_all(string=True):
            for place in item['referenced_places']:
                new_text = re.sub(f'\\b{place["name"]}\\b', lambda x: f'<span class="pos-link">{x.group(0)}</span>', txt, flags=re.IGNORECASE)
                if new_text != str(txt):
                    try:
                        txt.replace_with(BeautifulSoup(new_text))
                    except ValueError:
                        pass

        item['html'] = soup.prettify()

    json.dump(data, open('content_by_url.json', 'w'), indent='\t')

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
