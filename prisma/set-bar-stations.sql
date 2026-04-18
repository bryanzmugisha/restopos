-- Run this in Supabase SQL Editor to set drink categories to BAR station
-- Go to: Supabase Dashboard → SQL Editor → New Query → paste this → Run

-- Auto-detect common drinks/beverages category names and set to BAR
UPDATE "MenuCategory"
SET station = 'BAR'
WHERE LOWER(name) IN (
  'drinks', 'drink', 'beverages', 'beverage',
  'alcohol', 'alcoholic', 'alcoholic drinks',
  'bar', 'bar drinks', 'cocktails', 'cocktail',
  'wines', 'wine', 'beers', 'beer', 'spirits',
  'sodas', 'soda', 'juices', 'juice', 'fresh juice',
  'water', 'soft drinks', 'non-alcoholic',
  'whiskey', 'whisky', 'vodka', 'gin', 'rum',
  'cold drinks', 'hot drinks', 'milkshakes',
  'energy drinks', 'mocktails'
);

-- Show result
SELECT id, name, station FROM "MenuCategory" ORDER BY station, name;
