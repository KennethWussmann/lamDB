-- Insert medium articles dataset https://www.kaggle.com/datasets/dorianlazar/medium-articles-dataset

INSERT INTO Article(url,title,subtitle,claps,responses,readingTime,publication) VALUES
 ('https://towardsdatascience.com/a-beginners-guide-to-word-embedding-with-gensim-word2vec-model-5970fa56cc92','A Beginner’s Guide to Word Embedding with Gensim Word2Vec Model',NULL,850,'8',8,'Towards Data Science')
,('https://towardsdatascience.com/hands-on-graph-neural-networks-with-pytorch-pytorch-geometric-359487e221a8','Hands-on Graph Neural Networks with PyTorch & PyTorch Geometric',NULL,1100,'11',9,'Towards Data Science')
,('https://medium.com/better-marketing/how-to-write-a-damn-good-blog-post-for-your-business-even-if-youre-not-a-writer-99219359d949','How To Write a Good Business Blog Post','An A-to-Z guide for non-writers',147,'0',9,'Better Marketing');
