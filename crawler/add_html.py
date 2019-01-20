import json
from tqdm import tqdm
import re


if __name__ == '__main__':
    with open('content_by_url.json') as file:
        data = json.load(file)

    for url, item in tqdm(data.items()):
        # paragraphs = item['content'].split('\n')
        # html = ''
        # for p in paragraphs:
        #     html += '<p>' + p + '</p>'
        for place in item['referenced_places']:
            item['html'] = re.sub(f'\\b{place["name"]}\\b', lambda x: f'<span class="pos-link">{x.group(0)}</span>', item['html'], flags=re.IGNORECASE)


    with open('content_by_url.json', 'w') as file:
        json.dump(data, file)
