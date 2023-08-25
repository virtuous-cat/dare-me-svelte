-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'public', 'private', 'disabled');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('kink', 'sex', 'foreplay', 'flirty', 'truth', 'unsorted');

-- CreateEnum
CREATE TYPE "Interaction" AS ENUM ('unmasked', 'physical', 'video', 'audio', 'chat', 'unsorted');

-- CreateTable
CREATE TABLE "Dare" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'pending',
    "partnered" BOOLEAN NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'unsorted',
    "minInteraction" "Interaction" NOT NULL DEFAULT 'unsorted',
    "timer" INTEGER,

    CONSTRAINT "Dare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DareToTag" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Dare_text_key" ON "Dare"("text");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_DareToTag_AB_unique" ON "_DareToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_DareToTag_B_index" ON "_DareToTag"("B");

-- AddForeignKey
ALTER TABLE "Dare" ADD CONSTRAINT "Dare_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Dare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DareToTag" ADD CONSTRAINT "_DareToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Dare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DareToTag" ADD CONSTRAINT "_DareToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
