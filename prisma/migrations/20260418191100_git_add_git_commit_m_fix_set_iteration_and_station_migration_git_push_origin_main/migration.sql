/*
  Warnings:

  - Made the column `station` on table `MenuCategory` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Kot" ALTER COLUMN "station" SET DEFAULT 'KITCHEN';

-- AlterTable
ALTER TABLE "MenuCategory" ALTER COLUMN "station" SET NOT NULL;
