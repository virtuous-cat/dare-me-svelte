import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prodDares = [
  prisma.dare.upsert({
    where: { text: "Kiss the darer on the lips." },
    update: {},
    create: {
      text: "Kiss the darer on the lips",
      partnered: true,
      category: "foreplay",
      minInteraction: "unmasked",
      status: "public",
      tags: {
        create: {
          name: "kissing",
        },
      },
    },
  }),
  prisma.dare.upsert({
    where: {
      text: "Let the darer play with your bare nipples for 2 minutes.",
    },
    update: {},
    create: {
      text: "Let the darer play with your bare nipples for 2 minutes.",
      partnered: true,
      category: "foreplay",
      minInteraction: "physical",
      status: "public",
      timer: 120000,
      tags: {
        create: {
          name: "nipples",
        },
      },
    },
  }),
  prisma.dare.upsert({
    where: { text: "Perform a striptease for the group." },
    update: {},
    create: {
      text: "Perform a striptease for the group.",
      partnered: false,
      status: "public",
      category: "flirty",
      minInteraction: "video",
      tags: {
        create: [
          {
            name: "stripping",
          },
          {
            name: "clothes",
          },
          {
            name: "dance",
          },
        ],
      },
    },
  }),
  prisma.dare.upsert({
    where: { text: "Describe your most bizarre sex dream." },
    update: {},
    create: {
      text: "Describe your most bizarre sex dream.",
      partnered: false,
      status: "public",
      category: "truth",
      minInteraction: "chat",
      tags: {
        create: {
          name: "dreams",
        },
      },
    },
  }),
];

async function prodSeed() {
  const dares = await prisma.$transaction(prodDares);

  console.log("seeded prod db, count:", dares.length);
}

prodSeed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
