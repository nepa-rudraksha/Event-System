import { useEffect, useRef, useState } from "react";

type LocationResult = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
};

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string, location?: { lat: number; lng: number; timezone: string }) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  disabled,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; timezone: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get timezone from coordinates
  const getTimezoneFromCoordinates = (lat: number, lng: number): string => {
    // India/Nepal region
    if (lng >= 68 && lng <= 97 && lat >= 6 && lat <= 37) {
      if (lng >= 80 && lng <= 88 && lat >= 26 && lat <= 31) {
        return "Asia/Kathmandu";
      }
      return "Asia/Kolkata";
    }
    if (lng >= 68 && lng <= 97) {
      return "Asia/Kolkata";
    }
    // United States regions
    if (lng >= -125 && lng <= -66 && lat >= 24 && lat <= 50) {
      if (lng >= -85 && lng <= -66) return "America/New_York";
      if (lng >= -102 && lng <= -85) return "America/Chicago";
      if (lng >= -115 && lng <= -102) return "America/Denver";
      if (lng >= -125 && lng <= -115) return "America/Los_Angeles";
      return "America/New_York";
    }
    return "Asia/Kolkata";
  };

  const searchLocations = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "NepaRudraksha-EventSystem/1.0 (contact@neparudraksha.com)",
          },
        }
      );

      if (response.ok) {
        const results: LocationResult[] = await response.json();
        setSuggestions(results);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Location search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSelectedLocation(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSelectLocation = (location: LocationResult) => {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lon);
    const timezone = getTimezoneFromCoordinates(lat, lng);

    setSelectedLocation({ lat, lng, timezone });
    onChange(location.display_name, { lat, lng, timezone });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark placeholder:text-textLight outline-none transition-all focus:border-gold focus:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: '56px' }}
      />
      {searching && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-textLight">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-creamDark rounded-xl shadow-medium max-h-60 overflow-y-auto">
          {suggestions.map((location) => (
            <button
              key={location.place_id}
              type="button"
              onClick={() => handleSelectLocation(location)}
              className="w-full text-left px-4 py-3 hover:bg-cream border-b border-creamDark last:border-b-0 transition-colors"
            >
              <div className="text-base font-medium text-textDark">{location.display_name}</div>
              <div className="text-xs text-textLight mt-1">
                📍 {parseFloat(location.lat).toFixed(4)}, {parseFloat(location.lon).toFixed(4)}
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedLocation && (
        <div className="mt-2 text-xs text-textMedium">
          ✓ Location locked: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} ({selectedLocation.timezone})
        </div>
      )}
    </div>
  );
}
