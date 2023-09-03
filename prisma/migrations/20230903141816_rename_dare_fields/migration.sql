/*
  Warnings:

  - The primary key for the `Dare` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Dare` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Dare` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dareText]` on the table `Dare` will be added. If there are existing duplicate values, this will fail.
  - The required column `dareId` was added to the `Dare` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `dareText` to the `Dare` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Dare" DROP CONSTRAINT "Dare_parentId_fkey";

-- DropForeignKey
ALTER TABLE "_DareToTag" DROP CONSTRAINT "_DareToTag_A_fkey";

-- DropIndex
DROP INDEX "Dare_text_key";

-- AlterTable
ALTER TABLE "Dare" DROP CONSTRAINT "Dare_pkey",
DROP COLUMN "id",
DROP COLUMN "text",
ADD COLUMN     "dareId" TEXT NOT NULL,
ADD COLUMN     "dareText" TEXT NOT NULL,
ADD CONSTRAINT "Dare_pkey" PRIMARY KEY ("dareId");

-- CreateIndex
CREATE UNIQUE INDEX "Dare_dareText_key" ON "Dare"("dareText");

-- AddForeignKey
ALTER TABLE "Dare" ADD CONSTRAINT "Dare_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Dare"("dareId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DareToTag" ADD CONSTRAINT "_DareToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Dare"("dareId") ON DELETE CASCADE ON UPDATE CASCADE;
