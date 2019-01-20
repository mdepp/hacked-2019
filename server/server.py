import json
from flask_restful import Resource, Api, reqparse
from flask import Flask
from flask_cors import CORS

class AllStoriesResource(Resource):
    def get(self):
        with open('../crawler/content_by_url.json') as stories, open('../crawler/story_groups.json') as story_groups:
            return {
                'stories': json.load(stories),
                'story_groups': json.load(story_groups),
            }, 200


def main():
    app = Flask(__name__)
    CORS(app)
    api = Api(app)

    api.add_resource(AllStoriesResource, '/all/')
    app.run(host='localhost', debug=True)


if __name__ == '__main__':
    main()
