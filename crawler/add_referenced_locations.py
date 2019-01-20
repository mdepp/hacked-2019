import nltk
from pandas import DataFrame
from crawler import get_lat_lon
import json
from tqdm import tqdm

df = DataFrame.from_csv('../GeoLite2-City-CSV_20190115/GeoLite2-City-Locations-en.csv')
countries = df['country_name'].dropna().str.lower().unique()
cities = df['city_name'].dropna().str.lower().unique()


def get_place_names(text, *, use_countries=True, use_cities=True):
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


def get_place_name_usage(text: str, place_name: str):
    usage = ''
    index = text.find(place_name)
    while index >= 0:
        index = text.find(place_name, index + 1)
        usage_start = max(0, text.find(' ', max(index - 10, 0)))
        usage_end = text.find(' ', index + len(place_name) + 10)
        if usage_end < 0:
            usage_end = len(text)
        usage += text[usage_start: usage_end] + '... '

    return usage


if __name__ == '__main__':
    with open('content_by_url.json') as file:
        data = json.load(file)

    for url, item in tqdm(data.items()):
        item['referenced_places'] = []
        for place_name in get_place_names(item['content'], use_cities=False):
            lat, lon = get_lat_lon(place_name)
            item['referenced_places'].append({
                'name': place_name,
                'lat': lat,
                'lon': lon,
                # 'usage': get_place_name_usage(item['content'], place_name)
            })

    with open('content_by_url.json', 'w') as file:
        json.dump(data, file)
