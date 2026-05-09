import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.createMany({
    data: [
      { key: "votingOpen", value: "false" },
      { key: "eventName", value: "Film Festival" },
      { key: "adminPasswordHash", value: "" },
    ],
  });
  console.log("Seeded default settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
