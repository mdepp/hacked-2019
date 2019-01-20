import nltk

datasets = [
    'punkt',
    'averaged_perceptron_tagger',
    'maxent_ne_chunker',
    'words',
]

for dataset in datasets:
    nltk.download(dataset)
