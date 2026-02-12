// Direct API call to Nominatim (OpenStreetMap's geocoding service - free, no API key required)
// Using direct fetch instead of node-geocoder for better control and reliability

export async function geocodePlace(place: string): Promise<{ lat: number; lng: number; timezone: string } | null> {
  if (!place || place.trim().length === 0) {
    console.log("Geocoding: Empty place string");
    return null;
  }

  try {
    console.log(`Geocoding place: "${place}"`);
    
    // Encode the place name for URL
    const encodedPlace = encodeURIComponent(place);
    
    // Call Nominatim API directly
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedPlace}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "NepaRudraksha-EventSystem/1.0 (contact@neparudraksha.com)", // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const results = await response.json();
    
    console.log(`Geocoding results for "${place}":`, results?.length || 0, "results");
    
    if (results && results.length > 0) {
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      console.log(`Geocoded "${place}": lat=${lat}, lng=${lng}`);
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.log(`Geocoding: Invalid lat/lng for "${place}"`);
        return null;
      }

      // Get timezone from coordinates using a timezone lookup
      const timezone = getTimezoneFromCoordinates(lat, lng);
      
      console.log(`Geocoding success for "${place}": lat=${lat}, lng=${lng}, timezone=${timezone}`);
      
      return { lat, lng, timezone };
    } else {
      console.log(`Geocoding: No results found for "${place}"`);
    }
  } catch (error) {
    console.error(`Geocoding error for "${place}":`, error);
  }

  return null;
}

// Simple timezone mapping based on coordinates
// For production, consider using a proper timezone API like timezone-api or similar
function getTimezoneFromCoordinates(lat: number, lng: number): string {
  // India/Nepal region
  if (lng >= 68 && lng <= 97 && lat >= 6 && lat <= 37) {
    // Check if it's Nepal
    if (lng >= 80 && lng <= 88 && lat >= 26 && lat <= 31) {
      return "Asia/Kathmandu";
    }
    return "Asia/Kolkata";
  }
  
  // Default to Asia/Kolkata for Indian subcontinent
  if (lng >= 68 && lng <= 97) {
    return "Asia/Kolkata";
  }
  
  // United States regions
  if (lng >= -125 && lng <= -66 && lat >= 24 && lat <= 50) {
    // US East Coast
    if (lng >= -85 && lng <= -66) {
      return "America/New_York";
    }
    // US Central
    if (lng >= -102 && lng <= -85) {
      return "America/Chicago";
    }
    // US Mountain
    if (lng >= -115 && lng <= -102) {
      return "America/Denver";
    }
    // US West Coast
    if (lng >= -125 && lng <= -115) {
      return "America/Los_Angeles";
    }
    // Default US
    return "America/New_York";
  }
  
  // Default fallback
  return "Asia/Kolkata";
}
