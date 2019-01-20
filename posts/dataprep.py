import json

with open('../crawler/content_by_url.json') as stories, open('../crawler/story_groups.json') as story_groups:
    json.dump({'stories': json.load(stories), 'story_groups': json.load(story_groups)}, open('data.json', 'w'), indent='\t')
