-- ZeBook demo seed: 30 public-domain books from Project Gutenberg.
-- Safe to run more than once. The 200-book importer in Phase 2 will replace this.
INSERT INTO books (title, author, genre, description, year, cover_url, file_url)
SELECT t, a, g, d, y,
       'https://www.gutenberg.org/cache/epub/' || p || '/pg' || p || '.cover.medium.jpg',
       'https://www.gutenberg.org/ebooks/' || p
FROM (VALUES
 ('Pride and Prejudice','Jane Austen','Classics','Elizabeth Bennet and Mr Darcy navigate pride, class and first impressions in Regency England.',1813,1342),
 ('Jane Eyre','Charlotte Brontë','Classics','An orphaned governess finds love and independence at the mysterious Thornfield Hall.',1847,1260),
 ('Wuthering Heights','Emily Brontë','Classics','A stormy tale of obsessive love between Heathcliff and Catherine on the Yorkshire moors.',1847,768),
 ('Great Expectations','Charles Dickens','Classics','Pip, a young orphan, rises in society thanks to a secret benefactor.',1861,1400),
 ('A Tale of Two Cities','Charles Dickens','Classics','Love and sacrifice in London and Paris during the French Revolution.',1859,98),
 ('Little Women','Louisa May Alcott','Classics','The four March sisters grow up in New England during the Civil War.',1868,514),
 ('Anne of Green Gables','L. M. Montgomery','Classics','An imaginative orphan girl wins over a family on Prince Edward Island.',1908,45),
 ('Don Quixote','Miguel de Cervantes','Classics','A man who reads too many chivalry novels sets out as a knight-errant.',1605,996),
 ('Crime and Punishment','Fyodor Dostoevsky','Classics','A poor student commits a murder and wrestles with guilt in St Petersburg.',1866,2554),
 ('The Metamorphosis','Franz Kafka','Classics','Gregor Samsa wakes one morning transformed into a giant insect.',1915,5200),
 ('Moby Dick','Herman Melville','Adventure','Captain Ahab''s obsessive hunt for the white whale.',1851,2701),
 ('Treasure Island','Robert Louis Stevenson','Adventure','Young Jim Hawkins joins a voyage in search of buried pirate treasure.',1883,120),
 ('The Adventures of Tom Sawyer','Mark Twain','Adventure','Mischief and mystery along the Mississippi River.',1876,74),
 ('Adventures of Huckleberry Finn','Mark Twain','Adventure','Huck and Jim drift down the Mississippi on a raft.',1884,76),
 ('The Call of the Wild','Jack London','Adventure','A domestic dog fights to survive in the Yukon gold rush.',1903,215),
 ('The Time Machine','H. G. Wells','Science Fiction','A Victorian inventor travels to the year 802,701.',1895,35),
 ('The War of the Worlds','H. G. Wells','Science Fiction','Martians invade Victorian England.',1898,36),
 ('Frankenstein','Mary Shelley','Horror & Gothic','A scientist creates life and then abandons his creation.',1818,84),
 ('Dracula','Bram Stoker','Horror & Gothic','Count Dracula travels from Transylvania to England, pursued by Van Helsing.',1897,345),
 ('The Picture of Dorian Gray','Oscar Wilde','Horror & Gothic','A young man''s portrait ages while he stays young and corrupt.',1890,174),
 ('Strange Case of Dr Jekyll and Mr Hyde','Robert Louis Stevenson','Horror & Gothic','A respectable doctor and his violent alter ego.',1886,43),
 ('The Adventures of Sherlock Holmes','Arthur Conan Doyle','Mystery','Twelve short cases for the world''s most famous detective.',1892,1661),
 ('The Hound of the Baskervilles','Arthur Conan Doyle','Mystery','Holmes investigates a legendary spectral hound on Dartmoor.',1902,2852),
 ('The Republic','Plato','Philosophy','Socrates explores justice, the ideal state and the philosopher king.',NULL,1497),
 ('The Art of War','Sun Tzu','Philosophy','Ancient Chinese treatise on strategy and leadership.',NULL,132),
 ('Walden','Henry David Thoreau','Philosophy','Reflections on simple living in a cabin by Walden Pond.',1854,205),
 ('Meditations','Marcus Aurelius','Philosophy','Private notes of a Roman emperor on Stoic practice.',NULL,2680),
 ('Peter Pan','J. M. Barrie','Fantasy & Children''s','The boy who would not grow up and his adventures in Neverland.',1911,16),
 ('The Wonderful Wizard of Oz','L. Frank Baum','Fantasy & Children''s','Dorothy is swept by a cyclone to the magical Land of Oz.',1900,55),
 ('Alice''s Adventures in Wonderland','Lewis Carroll','Fantasy & Children''s','Alice follows a white rabbit down a rabbit hole.',1865,11)
) AS v(t, a, g, d, y, p)
ON CONFLICT (title, author) DO NOTHING;
