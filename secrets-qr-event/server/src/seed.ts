import bcrypt from "bcrypt";
import { prisma } from "./lib/prisma.js";

async function main() {
  const slug = "bangalore";
  const event = await prisma.event.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: "Secrets of Rudraksha with Sukritya Khatiwada – Bangalore",
      venue: "ITC Windsor, Bangalore",
      startTime: new Date("2026-02-03T09:00:00.000Z"),
      endTime: new Date("2026-02-03T18:00:00.000Z"),
      heroText: "Largest Rudraksha display • Rare Shaligram • Free 1:1 consultation",
    },
  });

  const adminEmail = "admin@neparudraksha.com";
  const adminPassword = "Admin@12345";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Event Admin",
      email: adminEmail,
      password: adminHash,
      role: "ADMIN",
    },
  });

  // Seed Expert user
  const expertEmail = "expert@neparudraksha.com";
  const expertPassword = "Expert@12345";
  const expertHash = await bcrypt.hash(expertPassword, 10);
  await prisma.user.upsert({
    where: { email: expertEmail },
    update: {},
    create: {
      name: "Expert User",
      email: expertEmail,
      password: expertHash,
      role: "EXPERT",
    },
  });

  // Seed Sales user
  const salesEmail = "sales@neparudraksha.com";
  const salesPassword = "Sales@12345";
  const salesHash = await bcrypt.hash(salesPassword, 10);
  await prisma.user.upsert({
    where: { email: salesEmail },
    update: {},
    create: {
      name: "Sales Agent",
      email: salesEmail,
      password: salesHash,
      role: "SALES",
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        eventId: event.id,
        title: "Talk Reminder",
        message: "Book launch + Sukritya Khatiwada talk at 3:00 PM.",
        priority: 2,
      },
      {
        eventId: event.id,
        title: "Rare Darshan",
        message: "Museum-grade 1 Mukhi darshan 12:30 PM - 1:15 PM.",
        priority: 1,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.itineraryItem.createMany({
    data: [
      {
        eventId: event.id,
        timeLabel: "10:00 AM",
        title: "Opening Blessings",
        description: "Welcome ritual and orientation.",
      },
      {
        eventId: event.id,
        timeLabel: "12:30 PM",
        title: "Rare Darshan Window",
        description: "Museum-grade Rudraksha display.",
      },
      {
        eventId: event.id,
        timeLabel: "3:00 PM",
        title: "Book Launch + Talk",
        description: "Sukritya Khatiwada keynote.",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.exhibitItem.createMany({
    data: [
      {
        eventId: event.id,
        type: "rudraksha",
        name: "1 Mukhi Rudraksha",
        rarity: "Museum Grade",
        deity: "Shiva",
        planet: "Sun",
        benefits: ["Leadership", "Clarity", "Spiritual focus"],
        beejMantra: "Om Hreem Namah",
        tags: ["Museum Grade", "1 Mukhi"],
      },
      {
        eventId: event.id,
        type: "rudraksha",
        name: "21 Mukhi Rudraksha",
        rarity: "Rare",
        deity: "Kubera",
        planet: "Jupiter",
        benefits: ["Prosperity", "Protection", "Abundance"],
        tags: ["21 Mukhi"],
      },
      {
        eventId: event.id,
        type: "shaligram",
        name: "Narasimha Shaligram",
        rarity: "Rare",
        deity: "Narasimha",
        benefits: ["Protection", "Courage"],
        tags: ["Rare"],
      },
    ],
    skipDuplicates: true,
  });

  await prisma.opsInventoryChecklist.createMany({
    data: [
      {
        eventId: event.id,
        category: "Rare Rudraksha",
        itemName: "1 Mukhi (Museum Grade)",
        requiredQty: 1,
      },
      {
        eventId: event.id,
        category: "Shaligram",
        itemName: "Narasimha Shaligram",
        requiredQty: 1,
      },
      {
        eventId: event.id,
        category: "Books",
        itemName: "Book launch stock",
        requiredQty: 50,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete:", event.id, "Admin:", adminEmail, adminPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
