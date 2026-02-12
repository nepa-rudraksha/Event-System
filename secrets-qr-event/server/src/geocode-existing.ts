import { prisma } from "./lib/prisma.js";
import { geocodePlace } from "./lib/geocode.js";

async function main() {
  console.log("Finding records with missing geocoding data...");
  
  const records = await prisma.visitorBirthDetails.findMany({
    where: {
      OR: [
        { lat: null },
        { lng: null },
        { timezone: null },
      ],
      pob: { not: null },
    },
  });

  console.log(`Found ${records.length} records to geocode`);

  for (const record of records) {
    if (!record.pob) continue;
    
    console.log(`\nGeocoding: "${record.pob}" (visitorId: ${record.visitorId})`);
    
    try {
      const geocoded = await geocodePlace(record.pob);
      
      if (geocoded) {
        await prisma.visitorBirthDetails.update({
          where: { visitorId: record.visitorId },
          data: {
            lat: geocoded.lat,
            lng: geocoded.lng,
            timezone: geocoded.timezone,
          },
        });
        console.log(`✓ Successfully geocoded "${record.pob}"`);
      } else {
        console.log(`✗ Failed to geocode "${record.pob}"`);
      }
      
      // Be nice to the Nominatim API - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error geocoding "${record.pob}":`, error);
    }
  }

  console.log("\nGeocoding complete!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
