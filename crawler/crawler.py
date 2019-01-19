from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from time import time
import requests
import re
import feedparser
from typing import Tuple
import json

options = webdriver.FirefoxOptions()
options.headless = True
profile = webdriver.FirefoxProfile()
profile.set_preference('network.cookie.cookieBehavior', 2)
driver = webdriver.Firefox(options=options, firefox_profile=profile)


class InvalidArticleException(Exception):
    def __init__(self, *args):
        super().__init__(*args)


def get_content_text(url: str) -> str:
    driver.get(url)
    try:
        return driver.find_element_by_name('articleBody').text  # type: str
    except NoSuchElementException:
        raise InvalidArticleException(f'Unable to read article at url={url}: no articleBody element!')


def get_lat_lon(place_name: str) -> Tuple[float, float]:
    response = requests.get(f'https://nominatim.openstreetmap.org/search?q={place_name}&format=json&polygon=0').json()[0]
    return float(response['lat']), float(response['lon'])

class LocationFormatException(Exception):
    def __init__(self, *args):
        super().__init__(*args)

def get_location(body_text: str) -> str:
    match = re.match('([a-zA-Z0-9., ]+)[–—―]', body_text)
    if match is None:
        raise LocationFormatException('Could not find location in text')
    return match.group(1).strip().title()


if __name__ == '__main__':
    start_time = time()

    cache_file = 'content_by_url.json'
    blacklist_file = 'blacklisted_urls.json'

    try:
        text_by_url = json.load(open(cache_file))
    except FileNotFoundError:
        text_by_url = {}

    try:
        blacklist = json.load(open(blacklist_file))
    except FileNotFoundError:
        blacklist = []

    with open('feeds', 'r') as file:
        for feed_url in file.readlines():
            for entry in feedparser.parse(feed_url).entries:
                if entry.link in text_by_url:
                    print(f'Already cached a copy of {entry.link}')
                    continue

                if entry.link in blacklist:
                    print(f'Skipping (previously got parsing error): {entry.link}')
                    continue

                print(f'Reading from {entry.link}')
                try:
                    text_by_url[entry.link] = {'content': get_content_text(entry.link)}
                    json.dump(text_by_url, open(cache_file, 'w'))
                except InvalidArticleException:
                    print('Parsing error: invalid article format')
                    blacklist.append(entry.link)
                    json.dump(blacklist, open(blacklist_file, 'w'))

    print('Took {} seconds'.format(time() - start_time))
