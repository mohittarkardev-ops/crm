/**
 * Comprehensive Indian Vehicle Catalog (2W, 4W, CW)
 * Enforces standardized Make and Model dropdown selection across the CRM
 * to prevent manual typos and ensure uniform data for filtering and reporting.
 * Covers 888+ vehicles across all Indian RTO / ARAI registered brands.
 */

export type VehicleCategory = "2W" | "4W" | "CW";

export type VehicleCatalogEntry = {
  category: VehicleCategory;
  make: string;
  model: string;
  bodyType?: string;
  isPopular?: boolean;
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  "2W": "Two-Wheeler (2W)",
  "4W": "Four-Wheeler (4W)",
  "CW": "Commercial Vehicle (CW)",
};

/** Normalize various strings (e.g. "Two-Wheeler", "2W", "Car", "CV") to standard "2W" | "4W" | "CW" */
export function normalizeVehicleCategory(raw?: string | null): VehicleCategory | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  if (s === "2W" || s.includes("TWO") || s.includes("BIKE") || s.includes("SCOOTER") || s.includes("MOTORCYCLE")) {
    return "2W";
  }
  if (s === "4W" || s.includes("FOUR") || s.includes("CAR") || s.includes("PRIVATE")) {
    return "4W";
  }
  if (s === "CW" || s === "CV" || s.includes("COMMERCIAL") || s.includes("TRUCK") || s.includes("BUS")) {
    return "CW";
  }
  return null;
}

/**
 * Standard Indian vehicle models catalog (888+ comprehensive models).
 * Sourced from ARAI, FADA, and Indian RTO market registrations.
 */
export const EMBEDDED_VEHICLE_CATALOG: VehicleCatalogEntry[] = [
  // =========================================================================
  // FOUR-WHEELERS (4W)
  // =========================================================================
  // Audi
  { category: "4W", make: "Audi", model: "A4", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Audi", model: "A6", bodyType: "Luxury Sedan", isPopular: true },
  { category: "4W", make: "Audi", model: "A8L", bodyType: "Super Luxury Sedan" },
  { category: "4W", make: "Audi", model: "Q3", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "Audi", model: "Q3 Sportback", bodyType: "Coupe SUV" },
  { category: "4W", make: "Audi", model: "Q5", bodyType: "Midsize Luxury SUV", isPopular: true },
  { category: "4W", make: "Audi", model: "Q7", bodyType: "3-Row Luxury SUV", isPopular: true },
  { category: "4W", make: "Audi", model: "Q8", bodyType: "Luxury Coupe SUV" },
  { category: "4W", make: "Audi", model: "e-tron", bodyType: "Electric Luxury SUV" },

  // BMW
  { category: "4W", make: "BMW", model: "3 Series", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "BMW", model: "3 Series Gran Limousine", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "BMW", model: "2 Series Gran Coupe", bodyType: "Coupe Sedan" },
  { category: "4W", make: "BMW", model: "5 Series", bodyType: "Luxury Sedan", isPopular: true },
  { category: "4W", make: "BMW", model: "6 Series GT", bodyType: "Luxury Tourer" },
  { category: "4W", make: "BMW", model: "7 Series", bodyType: "Super Luxury Sedan" },
  { category: "4W", make: "BMW", model: "X1", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "BMW", model: "X3", bodyType: "Midsize Luxury SUV", isPopular: true },
  { category: "4W", make: "BMW", model: "X5", bodyType: "Fullsize Luxury SUV", isPopular: true },
  { category: "4W", make: "BMW", model: "X7", bodyType: "3-Row Luxury SUV" },
  { category: "4W", make: "BMW", model: "Z4", bodyType: "Roadster Convertible" },
  { category: "4W", make: "BMW", model: "iX1", bodyType: "Electric SUV" },
  { category: "4W", make: "BMW", model: "i4", bodyType: "Electric Sedan" },
  { category: "4W", make: "BMW", model: "iX", bodyType: "Electric Luxury SUV" },

  // BYD
  { category: "4W", make: "BYD", model: "Atto 3", bodyType: "Electric SUV", isPopular: true },
  { category: "4W", make: "BYD", model: "Seal", bodyType: "Electric Performance Sedan", isPopular: true },
  { category: "4W", make: "BYD", model: "e6", bodyType: "Electric MPV", isPopular: true },
  { category: "4W", make: "BYD", model: "Sealion 6", bodyType: "Plug-in Hybrid SUV" },

  // Chevrolet
  { category: "4W", make: "Chevrolet", model: "Beat", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Chevrolet", model: "Spark", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Chevrolet", model: "Cruze", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Chevrolet", model: "Tavera", bodyType: "MUV", isPopular: true },
  { category: "4W", make: "Chevrolet", model: "Sail", bodyType: "Sedan" },
  { category: "4W", make: "Chevrolet", model: "Sail U-VA", bodyType: "Hatchback" },
  { category: "4W", make: "Chevrolet", model: "Enjoy", bodyType: "MPV" },
  { category: "4W", make: "Chevrolet", model: "Optra", bodyType: "Sedan" },
  { category: "4W", make: "Chevrolet", model: "Optra Magnum", bodyType: "Sedan" },
  { category: "4W", make: "Chevrolet", model: "Aveo", bodyType: "Sedan" },
  { category: "4W", make: "Chevrolet", model: "Aveo U-VA", bodyType: "Hatchback" },
  { category: "4W", make: "Chevrolet", model: "Captiva", bodyType: "SUV" },

  // Citroën
  { category: "4W", make: "Citroën", model: "C3", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Citroën", model: "C3 Aircross", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Citroën", model: "Basalt", bodyType: "SUV Coupe", isPopular: true },
  { category: "4W", make: "Citroën", model: "ë-C3", bodyType: "Electric Hatchback", isPopular: true },
  { category: "4W", make: "Citroën", model: "C5 Aircross", bodyType: "Premium SUV" },

  // Datsun
  { category: "4W", make: "Datsun", model: "GO", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Datsun", model: "GO+", bodyType: "Compact MPV", isPopular: true },
  { category: "4W", make: "Datsun", model: "redi-GO", bodyType: "Hatchback", isPopular: true },

  // Fiat
  { category: "4W", make: "Fiat", model: "Punto", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Fiat", model: "Punto Evo", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Fiat", model: "Grande Punto", bodyType: "Hatchback" },
  { category: "4W", make: "Fiat", model: "Linea", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Fiat", model: "Palio", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Fiat", model: "Palio Stile", bodyType: "Hatchback" },
  { category: "4W", make: "Fiat", model: "Avventura", bodyType: "Crossover" },
  { category: "4W", make: "Fiat", model: "Urban Cross", bodyType: "Crossover" },

  // Force Motors
  { category: "4W", make: "Force Motors", model: "Gurkha", bodyType: "4x4 Off-Road SUV", isPopular: true },
  { category: "4W", make: "Force Motors", model: "Gurkha 5-Door", bodyType: "4x4 Off-Road SUV", isPopular: true },
  { category: "4W", make: "Force Motors", model: "Trax Cruiser", bodyType: "Multi-Utility Vehicle", isPopular: true },

  // Ford
  { category: "4W", make: "Ford", model: "EcoSport", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Ford", model: "Figo", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Ford", model: "Aspire", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Ford", model: "Figo Aspire", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Ford", model: "Freestyle", bodyType: "Crossover", isPopular: true },
  { category: "4W", make: "Ford", model: "Endeavour", bodyType: "Fullsize 4x4 SUV", isPopular: true },
  { category: "4W", make: "Ford", model: "Fiesta", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Ford", model: "Fiesta Classic", bodyType: "Sedan" },
  { category: "4W", make: "Ford", model: "Ikon", bodyType: "Sedan" },
  { category: "4W", make: "Ford", model: "Fusion", bodyType: "Crossover" },

  // Honda
  { category: "4W", make: "Honda", model: "City", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Honda", model: "City 4th Gen", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Honda", model: "City 5th Gen", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Honda", model: "City e:HEV", bodyType: "Hybrid Sedan" },
  { category: "4W", make: "Honda", model: "Elevate", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Honda", model: "Amaze", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Honda", model: "Jazz", bodyType: "Premium Hatchback", isPopular: true },
  { category: "4W", make: "Honda", model: "WR-V", bodyType: "Crossover SUV", isPopular: true },
  { category: "4W", make: "Honda", model: "BR-V", bodyType: "Compact MPV" },
  { category: "4W", make: "Honda", model: "Brio", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Honda", model: "Mobilio", bodyType: "MPV" },
  { category: "4W", make: "Honda", model: "Civic", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Honda", model: "CR-V", bodyType: "Premium SUV" },
  { category: "4W", make: "Honda", model: "Accord", bodyType: "Luxury Sedan" },

  // Hyundai
  { category: "4W", make: "Hyundai", model: "Creta", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Creta N Line", bodyType: "Sport Midsize SUV" },
  { category: "4W", make: "Hyundai", model: "Venue", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Venue N Line", bodyType: "Compact SUV" },
  { category: "4W", make: "Hyundai", model: "i20", bodyType: "Premium Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "i20 N Line", bodyType: "Sport Hatchback" },
  { category: "4W", make: "Hyundai", model: "Elite i20", bodyType: "Premium Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "i20 Active", bodyType: "Crossover" },
  { category: "4W", make: "Hyundai", model: "Grand i10 Nios", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Grand i10", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "i10", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Exter", bodyType: "Micro SUV", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Verna", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Verna Fluidic", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Aura", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Xcent", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Alcazar", bodyType: "3-Row SUV", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Tucson", bodyType: "Premium SUV" },
  { category: "4W", make: "Hyundai", model: "Santa Fe", bodyType: "Fullsize SUV" },
  { category: "4W", make: "Hyundai", model: "Santro", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Santro Xing", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Eon", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Hyundai", model: "Getz", bodyType: "Hatchback" },
  { category: "4W", make: "Hyundai", model: "Getz Prime", bodyType: "Hatchback" },
  { category: "4W", make: "Hyundai", model: "Accent", bodyType: "Sedan" },
  { category: "4W", make: "Hyundai", model: "Elantra", bodyType: "Executive Sedan" },
  { category: "4W", make: "Hyundai", model: "Sonata", bodyType: "Luxury Sedan" },
  { category: "4W", make: "Hyundai", model: "Ioniq 5", bodyType: "Electric SUV" },
  { category: "4W", make: "Hyundai", model: "Kona Electric", bodyType: "Electric SUV" },

  // Isuzu
  { category: "4W", make: "Isuzu", model: "D-Max V-Cross", bodyType: "Lifestyle Pickup", isPopular: true },
  { category: "4W", make: "Isuzu", model: "MU-X", bodyType: "Fullsize SUV" },
  { category: "4W", make: "Isuzu", model: "Hi-Lander", bodyType: "Pickup Truck" },

  // Jaguar
  { category: "4W", make: "Jaguar", model: "XE", bodyType: "Sedan" },
  { category: "4W", make: "Jaguar", model: "XF", bodyType: "Luxury Sedan" },
  { category: "4W", make: "Jaguar", model: "F-Pace", bodyType: "Luxury SUV", isPopular: true },
  { category: "4W", make: "Jaguar", model: "F-Type", bodyType: "Sports Coupe" },

  // Jeep
  { category: "4W", make: "Jeep", model: "Compass", bodyType: "Premium Midsize SUV", isPopular: true },
  { category: "4W", make: "Jeep", model: "Meridian", bodyType: "3-Row SUV", isPopular: true },
  { category: "4W", make: "Jeep", model: "Wrangler", bodyType: "Off-Road 4x4" },
  { category: "4W", make: "Jeep", model: "Grand Cherokee", bodyType: "Luxury SUV" },

  // Kia
  { category: "4W", make: "Kia", model: "Seltos", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Kia", model: "Sonet", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Kia", model: "Carens", bodyType: "MPV", isPopular: true },
  { category: "4W", make: "Kia", model: "Carnival", bodyType: "Luxury MPV", isPopular: true },
  { category: "4W", make: "Kia", model: "EV6", bodyType: "Electric Crossover" },
  { category: "4W", make: "Kia", model: "EV9", bodyType: "Electric Luxury SUV" },

  // Land Rover
  { category: "4W", make: "Land Rover", model: "Range Rover", bodyType: "Flagship Luxury SUV", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Range Rover Sport", bodyType: "Performance Luxury SUV", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Range Rover Velar", bodyType: "Midsize Luxury SUV", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Range Rover Evoque", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Defender", bodyType: "Iconic 4x4 Off-Roader", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Discovery", bodyType: "Fullsize SUV" },
  { category: "4W", make: "Land Rover", model: "Discovery Sport", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "Land Rover", model: "Freelander 2", bodyType: "Compact Luxury SUV" },

  // Lexus
  { category: "4W", make: "Lexus", model: "ES 300h", bodyType: "Luxury Hybrid Sedan", isPopular: true },
  { category: "4W", make: "Lexus", model: "NX 350h", bodyType: "Luxury Hybrid SUV", isPopular: true },
  { category: "4W", make: "Lexus", model: "RX 350h", bodyType: "Luxury Hybrid SUV" },
  { category: "4W", make: "Lexus", model: "LX 500d", bodyType: "Flagship Luxury SUV" },

  // MG
  { category: "4W", make: "MG", model: "Hector", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "MG", model: "Hector Plus", bodyType: "3-Row SUV", isPopular: true },
  { category: "4W", make: "MG", model: "Astor", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "MG", model: "ZS EV", bodyType: "Electric SUV", isPopular: true },
  { category: "4W", make: "MG", model: "Comet EV", bodyType: "Electric Micro Hatchback", isPopular: true },
  { category: "4W", make: "MG", model: "Windsor EV", bodyType: "Electric Crossover", isPopular: true },
  { category: "4W", make: "MG", model: "Gloster", bodyType: "Fullsize SUV" },

  // Mahindra
  { category: "4W", make: "Mahindra", model: "Scorpio-N", bodyType: "SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Scorpio Classic", bodyType: "SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Scorpio", bodyType: "SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "XUV700", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "XUV500", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Thar", bodyType: "Off-Road SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Thar Roxx", bodyType: "5-Door Off-Road SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Thar CRDe", bodyType: "Off-Road SUV" },
  { category: "4W", make: "Mahindra", model: "Bolero", bodyType: "Utility Vehicle", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Bolero Neo", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Bolero Neo Plus", bodyType: "9-Seater SUV" },
  { category: "4W", make: "Mahindra", model: "Bolero Power+", bodyType: "Utility Vehicle", isPopular: true },
  { category: "4W", make: "Mahindra", model: "XUV 3XO", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "XUV300", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "XUV400 EV", bodyType: "Electric SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "Xylo", bodyType: "MUV / MPV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "KUV100", bodyType: "Micro SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "KUV100 NXT", bodyType: "Micro SUV" },
  { category: "4W", make: "Mahindra", model: "TUV300", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Mahindra", model: "TUV300 Plus", bodyType: "SUV" },
  { category: "4W", make: "Mahindra", model: "Marazzo", bodyType: "MPV" },
  { category: "4W", make: "Mahindra", model: "Quanto", bodyType: "Compact MUV" },
  { category: "4W", make: "Mahindra", model: "NuvoSport", bodyType: "Compact SUV" },
  { category: "4W", make: "Mahindra", model: "Verito", bodyType: "Sedan" },
  { category: "4W", make: "Mahindra", model: "Verito Vibe", bodyType: "Hatchback" },
  { category: "4W", make: "Mahindra", model: "Logan", bodyType: "Sedan" },
  { category: "4W", make: "Mahindra", model: "Alturas G4", bodyType: "Fullsize SUV" },
  { category: "4W", make: "Mahindra", model: "e2o Plus", bodyType: "Electric Hatchback" },

  // Maruti Suzuki
  { category: "4W", make: "Maruti Suzuki", model: "Swift", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Baleno", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Dzire", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Swift Dzire", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Brezza", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Vitara Brezza", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Ertiga", bodyType: "MPV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Wagon R", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Alto K10", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Alto 800", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Alto", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Fronx", bodyType: "Crossover SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Grand Vitara", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Eeco", bodyType: "Van", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "XL6", bodyType: "Premium MPV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Jimny", bodyType: "Off-Road SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Celerio", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Celerio X", bodyType: "Crossover" },
  { category: "4W", make: "Maruti Suzuki", model: "Ignis", bodyType: "Compact Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Ciaz", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "S-Presso", bodyType: "Mini SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Invicto", bodyType: "Premium MPV" },
  { category: "4W", make: "Maruti Suzuki", model: "S-Cross", bodyType: "Crossover SUV", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Ritz", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "A-Star", bodyType: "Hatchback" },
  { category: "4W", make: "Maruti Suzuki", model: "Zen", bodyType: "Hatchback" },
  { category: "4W", make: "Maruti Suzuki", model: "Zen Estilo", bodyType: "Hatchback" },
  { category: "4W", make: "Maruti Suzuki", model: "Estilo", bodyType: "Hatchback" },
  { category: "4W", make: "Maruti Suzuki", model: "SX4", bodyType: "Sedan" },
  { category: "4W", make: "Maruti Suzuki", model: "Omni", bodyType: "Van", isPopular: true },
  { category: "4W", make: "Maruti Suzuki", model: "Gypsy", bodyType: "Off-Road SUV" },
  { category: "4W", make: "Maruti Suzuki", model: "Maruti 800", bodyType: "Hatchback" },
  { category: "4W", make: "Maruti Suzuki", model: "Esteem", bodyType: "Sedan" },
  { category: "4W", make: "Maruti Suzuki", model: "Versa", bodyType: "Van" },
  { category: "4W", make: "Maruti Suzuki", model: "Kizashi", bodyType: "Executive Sedan" },

  // Mercedes-Benz
  { category: "4W", make: "Mercedes-Benz", model: "C-Class", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "E-Class", bodyType: "Luxury Sedan", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "S-Class", bodyType: "Super Luxury Sedan", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "A-Class Limousine", bodyType: "Entry Luxury Sedan", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "GLA", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "GLB", bodyType: "7-Seater Luxury SUV" },
  { category: "4W", make: "Mercedes-Benz", model: "GLC", bodyType: "Midsize Luxury SUV", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "GLE", bodyType: "Fullsize Luxury SUV", isPopular: true },
  { category: "4W", make: "Mercedes-Benz", model: "GLS", bodyType: "3-Row Luxury SUV" },
  { category: "4W", make: "Mercedes-Benz", model: "G-Class", bodyType: "Iconic Off-Roader" },
  { category: "4W", make: "Mercedes-Benz", model: "EQB", bodyType: "Electric SUV" },
  { category: "4W", make: "Mercedes-Benz", model: "EQE", bodyType: "Electric Luxury SUV" },
  { category: "4W", make: "Mercedes-Benz", model: "EQS", bodyType: "Electric Luxury Sedan" },

  // Mini
  { category: "4W", make: "Mini", model: "Cooper", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Mini", model: "Countryman", bodyType: "Crossover SUV", isPopular: true },

  // Nissan
  { category: "4W", make: "Nissan", model: "Magnite", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Nissan", model: "Micra", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Nissan", model: "Micra Active", bodyType: "Hatchback" },
  { category: "4W", make: "Nissan", model: "Sunny", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Nissan", model: "Kicks", bodyType: "Compact SUV" },
  { category: "4W", make: "Nissan", model: "Terrano", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Nissan", model: "X-Trail", bodyType: "Premium SUV" },
  { category: "4W", make: "Nissan", model: "Evalia", bodyType: "MPV" },

  // Porsche
  { category: "4W", make: "Porsche", model: "Macan", bodyType: "Performance SUV", isPopular: true },
  { category: "4W", make: "Porsche", model: "Cayenne", bodyType: "Luxury SUV", isPopular: true },
  { category: "4W", make: "Porsche", model: "Panamera", bodyType: "Sports Sedan" },
  { category: "4W", make: "Porsche", model: "911", bodyType: "Sports Car" },

  // Renault
  { category: "4W", make: "Renault", model: "Kwid", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Renault", model: "Triber", bodyType: "Compact MPV", isPopular: true },
  { category: "4W", make: "Renault", model: "Kiger", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Renault", model: "Duster", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Renault", model: "Duster AWD", bodyType: "4x4 SUV" },
  { category: "4W", make: "Renault", model: "Lodgy", bodyType: "MPV" },
  { category: "4W", make: "Renault", model: "Captur", bodyType: "Crossover SUV" },
  { category: "4W", make: "Renault", model: "Pulse", bodyType: "Hatchback" },
  { category: "4W", make: "Renault", model: "Scala", bodyType: "Sedan" },
  { category: "4W", make: "Renault", model: "Fluence", bodyType: "Executive Sedan" },

  // Skoda
  { category: "4W", make: "Skoda", model: "Kushaq", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Skoda", model: "Slavia", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Skoda", model: "Rapid", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Skoda", model: "Octavia", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Skoda", model: "Octavia vRS", bodyType: "Sport Sedan" },
  { category: "4W", make: "Skoda", model: "Laura", bodyType: "Executive Sedan" },
  { category: "4W", make: "Skoda", model: "Fabia", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Skoda", model: "Kodiaq", bodyType: "Luxury 7-Seater SUV" },
  { category: "4W", make: "Skoda", model: "Superb", bodyType: "Luxury Sedan" },
  { category: "4W", make: "Skoda", model: "Yeti", bodyType: "Compact SUV" },
  { category: "4W", make: "Skoda", model: "Kylaq", bodyType: "Compact SUV", isPopular: true },

  // Tata Motors
  { category: "4W", make: "Tata Motors", model: "Nexon", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Nexon EV", bodyType: "Electric SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Punch", bodyType: "Micro SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Punch EV", bodyType: "Electric Micro SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Harrier", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Safari", bodyType: "3-Row SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Safari Storme", bodyType: "SUV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Safari Dicor", bodyType: "SUV" },
  { category: "4W", make: "Tata Motors", model: "Curvv", bodyType: "SUV Coupe", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Curvv EV", bodyType: "Electric SUV Coupe", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Altroz", bodyType: "Premium Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Altroz Racer", bodyType: "Sport Hatchback" },
  { category: "4W", make: "Tata Motors", model: "Tiago", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Tiago EV", bodyType: "Electric Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Tiago NRG", bodyType: "Crossover Hatchback" },
  { category: "4W", make: "Tata Motors", model: "Tigor", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Tigor EV", bodyType: "Electric Compact Sedan" },
  { category: "4W", make: "Tata Motors", model: "Indica", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Indica Vista", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Indica eV2", bodyType: "Hatchback" },
  { category: "4W", make: "Tata Motors", model: "Indigo", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Indigo eCS", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Indigo CS", bodyType: "Compact Sedan" },
  { category: "4W", make: "Tata Motors", model: "Manza", bodyType: "Sedan" },
  { category: "4W", make: "Tata Motors", model: "Zest", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Bolt", bodyType: "Hatchback" },
  { category: "4W", make: "Tata Motors", model: "Hexa", bodyType: "Crossover MPV", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Aria", bodyType: "Crossover MPV" },
  { category: "4W", make: "Tata Motors", model: "Sumo", bodyType: "Utility Vehicle", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Sumo Gold", bodyType: "Utility Vehicle", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Sumo Grande", bodyType: "Utility Vehicle" },
  { category: "4W", make: "Tata Motors", model: "Nano", bodyType: "Compact Hatchback", isPopular: true },
  { category: "4W", make: "Tata Motors", model: "Nano GenX", bodyType: "Compact Hatchback" },
  { category: "4W", make: "Tata Motors", model: "Sierra", bodyType: "SUV" },

  // Toyota
  { category: "4W", make: "Toyota", model: "Innova Crysta", bodyType: "MPV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Innova Hycross", bodyType: "Hybrid MPV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Innova", bodyType: "MPV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Fortuner", bodyType: "Fullsize SUV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Fortuner Legender", bodyType: "Fullsize SUV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Urban Cruiser Hyryder", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Glanza", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Toyota", model: "Urban Cruiser Taisor", bodyType: "Crossover SUV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Urban Cruiser", bodyType: "Compact SUV", isPopular: true },
  { category: "4W", make: "Toyota", model: "Hilux", bodyType: "Pickup Truck" },
  { category: "4W", make: "Toyota", model: "Etios", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Toyota", model: "Etios Liva", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Toyota", model: "Etios Cross", bodyType: "Crossover" },
  { category: "4W", make: "Toyota", model: "Corolla Altis", bodyType: "Executive Sedan", isPopular: true },
  { category: "4W", make: "Toyota", model: "Corolla", bodyType: "Sedan" },
  { category: "4W", make: "Toyota", model: "Yaris", bodyType: "Sedan" },
  { category: "4W", make: "Toyota", model: "Camry", bodyType: "Luxury Hybrid Sedan" },
  { category: "4W", make: "Toyota", model: "Vellfire", bodyType: "Luxury MPV" },
  { category: "4W", make: "Toyota", model: "Land Cruiser", bodyType: "Luxury Fullsize SUV" },
  { category: "4W", make: "Toyota", model: "Land Cruiser Prado", bodyType: "Luxury SUV" },
  { category: "4W", make: "Toyota", model: "Qualis", bodyType: "MUV", isPopular: true },

  // Volkswagen
  { category: "4W", make: "Volkswagen", model: "Polo", bodyType: "Hatchback", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Polo GT", bodyType: "Sport Hatchback", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Vento", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Virtus", bodyType: "Sedan", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Virtus GT", bodyType: "Sport Sedan", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Taigun", bodyType: "Midsize SUV", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Taigun GT", bodyType: "Sport SUV", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Ameo", bodyType: "Compact Sedan", isPopular: true },
  { category: "4W", make: "Volkswagen", model: "Tiguan", bodyType: "Premium SUV" },
  { category: "4W", make: "Volkswagen", model: "Tiguan Allspace", bodyType: "7-Seater SUV" },
  { category: "4W", make: "Volkswagen", model: "T-Roc", bodyType: "Compact SUV" },
  { category: "4W", make: "Volkswagen", model: "Jetta", bodyType: "Executive Sedan" },
  { category: "4W", make: "Volkswagen", model: "Passat", bodyType: "Luxury Sedan" },
  { category: "4W", make: "Volkswagen", model: "Cross Polo", bodyType: "Crossover" },

  // Volvo
  { category: "4W", make: "Volvo", model: "XC40", bodyType: "Compact Luxury SUV", isPopular: true },
  { category: "4W", make: "Volvo", model: "XC40 Recharge", bodyType: "Electric SUV", isPopular: true },
  { category: "4W", make: "Volvo", model: "XC60", bodyType: "Midsize Luxury SUV", isPopular: true },
  { category: "4W", make: "Volvo", model: "XC90", bodyType: "Flagship 7-Seater SUV", isPopular: true },
  { category: "4W", make: "Volvo", model: "S60", bodyType: "Sedan" },
  { category: "4W", make: "Volvo", model: "S90", bodyType: "Executive Luxury Sedan" },
  { category: "4W", make: "Volvo", model: "C40 Recharge", bodyType: "Electric Coupe SUV" },

  // =========================================================================
  // TWO-WHEELERS (2W)
  // =========================================================================
  // Ampere
  { category: "2W", make: "Ampere", model: "Magnus EX", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ampere", model: "Nexus", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ampere", model: "Reo Plus", bodyType: "Electric Scooter" },
  { category: "2W", make: "Ampere", model: "Primus", bodyType: "Electric Scooter" },

  // Aprilia
  { category: "2W", make: "Aprilia", model: "SR 125", bodyType: "Sport Scooter", isPopular: true },
  { category: "2W", make: "Aprilia", model: "SR 160", bodyType: "Sport Scooter", isPopular: true },
  { category: "2W", make: "Aprilia", model: "Storm 125", bodyType: "Sport Scooter" },
  { category: "2W", make: "Aprilia", model: "SXR 125", bodyType: "Maxi Scooter" },
  { category: "2W", make: "Aprilia", model: "SXR 160", bodyType: "Maxi Scooter", isPopular: true },
  { category: "2W", make: "Aprilia", model: "RS 457", bodyType: "Super Sport Bike", isPopular: true },

  // Ather Energy
  { category: "2W", make: "Ather Energy", model: "450X", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ather Energy", model: "450S", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ather Energy", model: "Rizta", bodyType: "Family Electric Scooter", isPopular: true },
  { category: "2W", make: "Ather Energy", model: "450 Plus", bodyType: "Electric Scooter" },
  { category: "2W", make: "Ather Energy", model: "450 Apex", bodyType: "Performance Electric Scooter" },

  // BGauss
  { category: "2W", make: "BGauss", model: "C12i", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "BGauss", model: "RUV350", bodyType: "Electric Scooter" },

  // BMW Motorrad
  { category: "2W", make: "BMW Motorrad", model: "G 310 R", bodyType: "Naked Roadster", isPopular: true },
  { category: "2W", make: "BMW Motorrad", model: "G 310 GS", bodyType: "Adventure Tourer", isPopular: true },
  { category: "2W", make: "BMW Motorrad", model: "G 310 RR", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "BMW Motorrad", model: "F 900 XR", bodyType: "Adventure Sport" },
  { category: "2W", make: "BMW Motorrad", model: "R 1250 GS", bodyType: "Flagship Adventure" },
  { category: "2W", make: "BMW Motorrad", model: "R 1300 GS", bodyType: "Flagship Adventure" },
  { category: "2W", make: "BMW Motorrad", model: "S 1000 RR", bodyType: "Superbike" },

  // Bajaj
  { category: "2W", make: "Bajaj", model: "Pulsar 125", bodyType: "Sports Commuter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar 150", bodyType: "Sports Commuter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar 180", bodyType: "Sports Motorcycle" },
  { category: "2W", make: "Bajaj", model: "Pulsar 220F", bodyType: "Semi-Faired Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar NS125", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar NS160", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar NS200", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar NS400Z", bodyType: "Performance Streetfighter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar N150", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar N160", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar N250", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Pulsar F250", bodyType: "Semi-Faired Sport" },
  { category: "2W", make: "Bajaj", model: "Pulsar RS200", bodyType: "Faired Sports Bike", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Platina 100", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Platina 110", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Platina 110 ABS", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "CT 100", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "CT 110", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "CT 110X", bodyType: "Rugged Commuter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "CT 125X", bodyType: "Rugged Commuter" },
  { category: "2W", make: "Bajaj", model: "Discover 100", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Discover 125", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Discover 150", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Bajaj", model: "Avenger Street 160", bodyType: "Cruiser", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Avenger Cruise 220", bodyType: "Cruiser", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Avenger Street 220", bodyType: "Cruiser" },
  { category: "2W", make: "Bajaj", model: "Dominar 250", bodyType: "Tourer", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Dominar 400", bodyType: "Power Cruiser / Tourer", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Freedom 125 CNG", bodyType: "CNG Motorcycle", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Chetak Electric", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Chetak 2901", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Chetak Premium", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Bajaj", model: "Chetak Urbane", bodyType: "Electric Scooter" },
  { category: "2W", make: "Bajaj", model: "V15", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Bajaj", model: "V12", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Bajaj", model: "Boxer", bodyType: "Rugged Commuter" },
  { category: "2W", make: "Bajaj", model: "Caliber", bodyType: "Commuter Motorcycle" },

  // Benelli
  { category: "2W", make: "Benelli", model: "Imperiale 400", bodyType: "Classic Cruiser", isPopular: true },
  { category: "2W", make: "Benelli", model: "TRK 502", bodyType: "Adventure Tourer", isPopular: true },
  { category: "2W", make: "Benelli", model: "TRK 502X", bodyType: "Adventure Tourer" },
  { category: "2W", make: "Benelli", model: "Leoncino 500", bodyType: "Scrambler" },
  { category: "2W", make: "Benelli", model: "502C", bodyType: "Urban Cruiser" },

  // Harley-Davidson
  { category: "2W", make: "Harley-Davidson", model: "X440", bodyType: "Modern Roadster", isPopular: true },
  { category: "2W", make: "Harley-Davidson", model: "Nightster", bodyType: "Cruiser" },
  { category: "2W", make: "Harley-Davidson", model: "Sportster S", bodyType: "Power Cruiser" },
  { category: "2W", make: "Harley-Davidson", model: "Fat Boy", bodyType: "Cruiser" },
  { category: "2W", make: "Harley-Davidson", model: "Street 750", bodyType: "Cruiser" },
  { category: "2W", make: "Harley-Davidson", model: "Iron 883", bodyType: "Cruiser" },

  // Hero Electric
  { category: "2W", make: "Hero Electric", model: "Optima CX", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Hero Electric", model: "Flash", bodyType: "Electric Scooter" },
  { category: "2W", make: "Hero Electric", model: "Photon", bodyType: "Electric Scooter" },
  { category: "2W", make: "Hero Electric", model: "NYX", bodyType: "Electric Commercial Scooter" },

  // Hero MotoCorp
  { category: "2W", make: "Hero MotoCorp", model: "Splendor Plus", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Splendor Plus XTEC", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Splendor Pro", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Splendor iSmart", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Super Splendor", bodyType: "125cc Commuter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Super Splendor XTEC", bodyType: "125cc Commuter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "HF Deluxe", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "HF 100", bodyType: "Entry Commuter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "HF Dawn", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Passion Plus", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Passion Pro", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Passion XTEC", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Glamour", bodyType: "125cc Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Glamour XTEC", bodyType: "125cc Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Glamour Canvas", bodyType: "125cc Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Xtreme 125R", bodyType: "Sport Commuter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Xtreme 160R", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Xtreme 160R 4V", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Xtreme 200S", bodyType: "Sports Bike" },
  { category: "2W", make: "Hero MotoCorp", model: "XPulse 200 4V", bodyType: "Adventure Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "XPulse 200T 4V", bodyType: "Touring Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Karizma XMR", bodyType: "Sports Motorcycle", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Karizma R", bodyType: "Sports Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Karizma ZMR", bodyType: "Sports Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Mavrick 440", bodyType: "Roadster", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "CBZ Xtreme", bodyType: "Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Hunk", bodyType: "Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Achiever", bodyType: "Motorcycle" },
  { category: "2W", make: "Hero MotoCorp", model: "Pleasure Plus", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Pleasure Plus XTEC", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Destini 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Destini Prime", bodyType: "Scooter" },
  { category: "2W", make: "Hero MotoCorp", model: "Maestro Edge 110", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Maestro Edge 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Xoom 110", bodyType: "Sporty Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Vida V1 Pro", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Hero MotoCorp", model: "Vida V1 Plus", bodyType: "Electric Scooter" },

  // Honda 2Wheelers
  { category: "2W", make: "Honda 2Wheelers", model: "Activa 6G", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Activa 5G", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Activa 4G", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Activa 3G", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Activa 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Activa H-Smart", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Dio", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Dio 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Grazia 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Aviator", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Navi", bodyType: "Moto-Scooter" },
  { category: "2W", make: "Honda 2Wheelers", model: "Cliq", bodyType: "Utility Scooter" },
  { category: "2W", make: "Honda 2Wheelers", model: "Shine 100", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Shine 125", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB Shine", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "SP 125", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "SP 160", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Unicorn 150", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Unicorn 160", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB Unicorn", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Hornet 2.0", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB Hornet 160R", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB200X", bodyType: "Adventure Crossover", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "H'ness CB350", bodyType: "Classic Cruiser", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB350RS", bodyType: "Scrambler", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB350", bodyType: "Classic Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CB300R", bodyType: "Neo Sports Cafe" },
  { category: "2W", make: "Honda 2Wheelers", model: "CB300F", bodyType: "Streetfighter" },
  { category: "2W", make: "Honda 2Wheelers", model: "CBR 150R", bodyType: "Sports Bike" },
  { category: "2W", make: "Honda 2Wheelers", model: "CBR 250R", bodyType: "Sports Bike" },
  { category: "2W", make: "Honda 2Wheelers", model: "Livo", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "CD 110 Dream", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "Honda 2Wheelers", model: "Dream Yuga", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Honda 2Wheelers", model: "CB Trigger", bodyType: "Motorcycle" },
  { category: "2W", make: "Honda 2Wheelers", model: "CB Twister", bodyType: "Motorcycle" },
  { category: "2W", make: "Honda 2Wheelers", model: "NX500", bodyType: "Adventure Motorcycle" },

  // Jawa
  { category: "2W", make: "Jawa", model: "Jawa 350", bodyType: "Classic Cruiser", isPopular: true },
  { category: "2W", make: "Jawa", model: "Jawa 42", bodyType: "Modern Classic", isPopular: true },
  { category: "2W", make: "Jawa", model: "42 Bobber", bodyType: "Bobber Cruiser", isPopular: true },
  { category: "2W", make: "Jawa", model: "Perak", bodyType: "Bobber", isPopular: true },

  // KTM
  { category: "2W", make: "KTM", model: "200 Duke", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "250 Duke", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "390 Duke", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "125 Duke", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "RC 200", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "RC 390", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "KTM", model: "RC 125", bodyType: "Super Sport" },
  { category: "2W", make: "KTM", model: "250 Adventure", bodyType: "Adventure Motorcycle", isPopular: true },
  { category: "2W", make: "KTM", model: "390 Adventure", bodyType: "Adventure Motorcycle", isPopular: true },
  { category: "2W", make: "KTM", model: "390 Adventure X", bodyType: "Adventure Motorcycle", isPopular: true },

  // Kawasaki
  { category: "2W", make: "Kawasaki", model: "Ninja 300", bodyType: "Sports Bike", isPopular: true },
  { category: "2W", make: "Kawasaki", model: "Ninja 400", bodyType: "Sports Bike" },
  { category: "2W", make: "Kawasaki", model: "Ninja 500", bodyType: "Sports Bike" },
  { category: "2W", make: "Kawasaki", model: "Ninja 650", bodyType: "Sports Tourer" },
  { category: "2W", make: "Kawasaki", model: "Ninja ZX-4R", bodyType: "Inline-4 Sports Bike" },
  { category: "2W", make: "Kawasaki", model: "Ninja ZX-6R", bodyType: "Super Sport" },
  { category: "2W", make: "Kawasaki", model: "Ninja ZX-10R", bodyType: "Superbike" },
  { category: "2W", make: "Kawasaki", model: "Z650", bodyType: "Naked Sport" },
  { category: "2W", make: "Kawasaki", model: "Z900", bodyType: "Super Naked", isPopular: true },
  { category: "2W", make: "Kawasaki", model: "Versys 650", bodyType: "Adventure Tourer" },
  { category: "2W", make: "Kawasaki", model: "W175", bodyType: "Retro Classic" },

  // Kinetic Green
  { category: "2W", make: "Kinetic Green", model: "E-Luna", bodyType: "Electric Moped", isPopular: true },

  // Okinawa
  { category: "2W", make: "Okinawa", model: "Praise Pro", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Okinawa", model: "Ridge Plus", bodyType: "Electric Scooter" },
  { category: "2W", make: "Okinawa", model: "Okhi-90", bodyType: "Electric Scooter" },
  { category: "2W", make: "Okinawa", model: "Dual", bodyType: "Electric Commercial Scooter" },

  // Ola Electric
  { category: "2W", make: "Ola Electric", model: "S1 Pro Gen 2", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "S1 Pro Gen 1", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "S1 Air", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "S1 X", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "S1 X+", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "S1", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Ola Electric", model: "Roadster", bodyType: "Electric Motorcycle" },

  // Pure EV
  { category: "2W", make: "Pure EV", model: "ePluto 7G", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Pure EV", model: "ecoDryft", bodyType: "Electric Motorcycle", isPopular: true },

  // Revolt
  { category: "2W", make: "Revolt", model: "RV400", bodyType: "Electric Motorcycle", isPopular: true },
  { category: "2W", make: "Revolt", model: "RV400 BRZ", bodyType: "Electric Motorcycle" },
  { category: "2W", make: "Revolt", model: "RV1", bodyType: "Electric Motorcycle", isPopular: true },
  { category: "2W", make: "Revolt", model: "RV1+", bodyType: "Electric Motorcycle", isPopular: true },

  // River
  { category: "2W", make: "River", model: "Indie", bodyType: "SUV of Electric Scooters", isPopular: true },

  // Royal Enfield
  { category: "2W", make: "Royal Enfield", model: "Classic 350", bodyType: "Cruiser", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Classic 500", bodyType: "Cruiser" },
  { category: "2W", make: "Royal Enfield", model: "Bullet 350", bodyType: "Classic Cruiser", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Bullet 500", bodyType: "Cruiser" },
  { category: "2W", make: "Royal Enfield", model: "Bullet Electra", bodyType: "Cruiser", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Hunter 350", bodyType: "Roadster", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Meteor 350", bodyType: "Cruiser Tourer", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Thunderbird 350", bodyType: "Cruiser", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Thunderbird 350X", bodyType: "Cruiser" },
  { category: "2W", make: "Royal Enfield", model: "Thunderbird 500", bodyType: "Cruiser" },
  { category: "2W", make: "Royal Enfield", model: "Himalayan 450", bodyType: "Adventure Motorcycle", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Himalayan 411", bodyType: "Adventure Motorcycle", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Scram 411", bodyType: "Scrambler" },
  { category: "2W", make: "Royal Enfield", model: "Guerrilla 450", bodyType: "Roadster", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Interceptor 650", bodyType: "Twin Cylinder Roadster", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Continental GT 650", bodyType: "Cafe Racer", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Super Meteor 650", bodyType: "Twin Cruiser", isPopular: true },
  { category: "2W", make: "Royal Enfield", model: "Shotgun 650", bodyType: "Custom Bobber" },
  { category: "2W", make: "Royal Enfield", model: "Bear 650", bodyType: "Scrambler 650" },
  { category: "2W", make: "Royal Enfield", model: "Classic 650", bodyType: "Cruiser 650" },

  // Simple Energy
  { category: "2W", make: "Simple Energy", model: "Simple One", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "Simple Energy", model: "Simple Dot One", bodyType: "Electric Scooter" },

  // Suzuki 2Wheelers
  { category: "2W", make: "Suzuki 2Wheelers", model: "Access 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Access 125 Special Edition", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Burgman Street 125", bodyType: "Maxi Scooter", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Burgman Street EX", bodyType: "Maxi Scooter", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Avenis 125", bodyType: "Sporty Scooter", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Gixxer 150", bodyType: "Street Sport", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Gixxer SF 150", bodyType: "Faired Sport", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Gixxer 250", bodyType: "Street Sport" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Gixxer SF 250", bodyType: "Faired Sport" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "V-Strom SX 250", bodyType: "Adventure Tourer", isPopular: true },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Intruder 150", bodyType: "Cruiser" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Hayate", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Slingshot", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Swish 125", bodyType: "Scooter" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Lets", bodyType: "Scooter" },
  { category: "2W", make: "Suzuki 2Wheelers", model: "Hayabusa", bodyType: "Superbike" },

  // TVS
  { category: "2W", make: "TVS", model: "Jupiter", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Jupiter 110", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Jupiter 125", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Jupiter Classic", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Jupiter ZX", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Ntorq 125", bodyType: "Sporty Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Ntorq 125 Race XP", bodyType: "Sporty Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Ntorq 125 Super Squad", bodyType: "Sporty Scooter" },
  { category: "2W", make: "TVS", model: "iQube Electric", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "iQube S", bodyType: "Electric Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "iQube ST", bodyType: "Electric Scooter" },
  { category: "2W", make: "TVS", model: "TVS X Electric", bodyType: "Performance Electric Scooter" },
  { category: "2W", make: "TVS", model: "Scooty Pep Plus", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Scooty Zest 110", bodyType: "Scooter", isPopular: true },
  { category: "2W", make: "TVS", model: "Scooty Streak", bodyType: "Scooter" },
  { category: "2W", make: "TVS", model: "Wego", bodyType: "Scooter" },
  { category: "2W", make: "TVS", model: "XL100 Heavy Duty", bodyType: "Moped / Utility", isPopular: true },
  { category: "2W", make: "TVS", model: "XL100 Comfort", bodyType: "Moped / Utility", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RTR 160", bodyType: "Sports Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RTR 160 4V", bodyType: "Sports Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RTR 180", bodyType: "Sports Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RTR 200 4V", bodyType: "Sports Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RTR 310", bodyType: "Naked Streetfighter", isPopular: true },
  { category: "2W", make: "TVS", model: "Apache RR 310", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "TVS", model: "Raider 125", bodyType: "Sporty Commuter", isPopular: true },
  { category: "2W", make: "TVS", model: "Ronin", bodyType: "Modern Retro", isPopular: true },
  { category: "2W", make: "TVS", model: "Radeon", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Sport", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Star City Plus", bodyType: "Commuter Motorcycle", isPopular: true },
  { category: "2W", make: "TVS", model: "Star City", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "TVS", model: "Victor", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "TVS", model: "Phoenix 125", bodyType: "Commuter Motorcycle" },

  // Tork Motors
  { category: "2W", make: "Tork Motors", model: "Kratos R", bodyType: "Electric Motorcycle" },

  // Triumph
  { category: "2W", make: "Triumph", model: "Speed 400", bodyType: "Modern Classic Roadster", isPopular: true },
  { category: "2W", make: "Triumph", model: "Scrambler 400 X", bodyType: "Scrambler", isPopular: true },
  { category: "2W", make: "Triumph", model: "Speed T4", bodyType: "Modern Classic", isPopular: true },
  { category: "2W", make: "Triumph", model: "Trident 660", bodyType: "Naked Roadster" },
  { category: "2W", make: "Triumph", model: "Tiger Sport 660", bodyType: "Adventure Sport" },
  { category: "2W", make: "Triumph", model: "Bonneville T100", bodyType: "Modern Classic" },
  { category: "2W", make: "Triumph", model: "Bonneville T120", bodyType: "Modern Classic" },
  { category: "2W", make: "Triumph", model: "Street Triple 765", bodyType: "Super Naked" },

  // Ultraviolette
  { category: "2W", make: "Ultraviolette", model: "F77 Mach 2", bodyType: "Electric Performance Motorcycle", isPopular: true },

  // Vespa
  { category: "2W", make: "Vespa", model: "VXL 125", bodyType: "Classic Scooter", isPopular: true },
  { category: "2W", make: "Vespa", model: "VXL 150", bodyType: "Classic Scooter", isPopular: true },
  { category: "2W", make: "Vespa", model: "SXL 125", bodyType: "Classic Scooter", isPopular: true },
  { category: "2W", make: "Vespa", model: "SXL 150", bodyType: "Classic Scooter", isPopular: true },
  { category: "2W", make: "Vespa", model: "ZX 125", bodyType: "Classic Scooter" },
  { category: "2W", make: "Vespa", model: "Elegante 150", bodyType: "Luxury Scooter" },

  // Yamaha
  { category: "2W", make: "Yamaha", model: "YZF R15 V4", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "YZF R15 V3", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "YZF R15M", bodyType: "Super Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "YZF R15S", bodyType: "Super Sport" },
  { category: "2W", make: "Yamaha", model: "MT-15 V2", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "MT-15", bodyType: "Naked Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "YZF R3", bodyType: "Twin Super Sport" },
  { category: "2W", make: "Yamaha", model: "MT-03", bodyType: "Twin Naked Sport" },
  { category: "2W", make: "Yamaha", model: "FZ-Fi V3", bodyType: "Street Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "FZ-S Fi V4", bodyType: "Street Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "FZ-S Fi V3", bodyType: "Street Sport", isPopular: true },
  { category: "2W", make: "Yamaha", model: "FZ-Fi V2", bodyType: "Street Sport" },
  { category: "2W", make: "Yamaha", model: "FZ 25", bodyType: "Naked Sport" },
  { category: "2W", make: "Yamaha", model: "FZS 25", bodyType: "Naked Sport" },
  { category: "2W", make: "Yamaha", model: "FZ-X", bodyType: "Neo Retro Commuter", isPopular: true },
  { category: "2W", make: "Yamaha", model: "RayZR 125 Fi", bodyType: "Sporty Scooter", isPopular: true },
  { category: "2W", make: "Yamaha", model: "RayZR Street Rally", bodyType: "Sporty Scooter" },
  { category: "2W", make: "Yamaha", model: "Fascino 125 Fi", bodyType: "Classic Scooter", isPopular: true },
  { category: "2W", make: "Yamaha", model: "Aerox 155", bodyType: "Maxi Scooter", isPopular: true },
  { category: "2W", make: "Yamaha", model: "Saluto 125", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Yamaha", model: "Saluto RX", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Yamaha", model: "SZ-RR", bodyType: "Commuter Motorcycle" },
  { category: "2W", make: "Yamaha", model: "RX 100", bodyType: "Classic 2-Stroke Motorcycle", isPopular: true },
  { category: "2W", make: "Yamaha", model: "RX 135", bodyType: "Classic 2-Stroke Motorcycle" },
  { category: "2W", make: "Yamaha", model: "Alpha", bodyType: "Scooter" },
  { category: "2W", make: "Yamaha", model: "Ray Z", bodyType: "Scooter" },

  // Yezdi
  { category: "2W", make: "Yezdi", model: "Roadster", bodyType: "Roadster", isPopular: true },
  { category: "2W", make: "Yezdi", model: "Scrambler", bodyType: "Scrambler", isPopular: true },
  { category: "2W", make: "Yezdi", model: "Adventure", bodyType: "Adventure Tourer", isPopular: true },

  // =========================================================================
  // COMMERCIAL VEHICLES (CW)
  // =========================================================================
  // Altigreen
  { category: "CW", make: "Altigreen", model: "neEV Cargo", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Altigreen", model: "neEV Low Deck", bodyType: "Electric Cargo 3-Wheeler" },
  { category: "CW", make: "Altigreen", model: "neEV High Deck", bodyType: "Electric Cargo 3-Wheeler" },
  { category: "CW", make: "Altigreen", model: "neEV Tez", bodyType: "Fast Charging Electric 3-Wheeler" },

  // Ashok Leyland
  { category: "CW", make: "Ashok Leyland", model: "Bada Dost i1", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Bada Dost i2", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Bada Dost i3", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Bada Dost i4", bodyType: "Heavy Pickup Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Bada Dost i5", bodyType: "Heavy Pickup Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Dost Strong", bodyType: "Light Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Dost+", bodyType: "Light Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Dost Lite", bodyType: "Light Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Saathi", bodyType: "Entry SCV Mini Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Partner 4 Tyre", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Partner 6 Tyre", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Guru", bodyType: "Intermediate Commercial Truck" },
  { category: "CW", make: "Ashok Leyland", model: "Boss 1115", bodyType: "ICV Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Boss 1215", bodyType: "ICV Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Boss 1315", bodyType: "ICV Truck" },
  { category: "CW", make: "Ashok Leyland", model: "Boss 1415", bodyType: "ICV Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Boss 1920", bodyType: "Haulage Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet 1015", bodyType: "Intermediate Truck" },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet 1115", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet 1215", bodyType: "Medium Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet 1415", bodyType: "Medium Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet 1615", bodyType: "Medium Haulage", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Ecomet Star", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 1920", bodyType: "Multi-Axle Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 2620", bodyType: "Multi-Axle Haulage" },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 2820", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 3120", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 3520", bodyType: "Heavy Multi-Axle", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 4220", bodyType: "Multi-Axle Haulage", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 4825", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "AVTR 5525", bodyType: "Tractor Trailer", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "2820 Tipper", bodyType: "Construction Tipper", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "2825 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "3525 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "3528 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "4228 Tipper", bodyType: "Multi-Axle Tipper", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "5525 Tractor", bodyType: "Prime Mover" },
  { category: "CW", make: "Ashok Leyland", model: "MiTR Bus", bodyType: "School / Staff Bus", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Viking Bus", bodyType: "Passenger Route Bus", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Cheetah Bus", bodyType: "Intercity Bus" },
  { category: "CW", make: "Ashok Leyland", model: "Oyster Bus", bodyType: "Luxury Staff Bus", isPopular: true },
  { category: "CW", make: "Ashok Leyland", model: "Sunshine Bus", bodyType: "School Bus" },
  { category: "CW", make: "Ashok Leyland", model: "Lynx Smart Bus", bodyType: "Passenger Carrier" },

  // Atul Auto
  { category: "CW", make: "Atul Auto", model: "Gem Paxx", bodyType: "Passenger 3-Wheeler", isPopular: true },
  { category: "CW", make: "Atul Auto", model: "Gem Cargo", bodyType: "Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Atul Auto", model: "Elite", bodyType: "Electric Auto Rickshaw" },
  { category: "CW", make: "Atul Auto", model: "Rik", bodyType: "Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Atul Auto", model: "Shakti", bodyType: "Cargo 3-Wheeler" },

  // Bajaj Commercial
  { category: "CW", make: "Bajaj Commercial", model: "Compact RE", bodyType: "Auto Rickshaw (Passenger)", isPopular: true },
  { category: "CW", make: "Bajaj Commercial", model: "RE Optima", bodyType: "Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Bajaj Commercial", model: "Maxima Z", bodyType: "Passenger 3-Wheeler", isPopular: true },
  { category: "CW", make: "Bajaj Commercial", model: "Maxima Passenger", bodyType: "Passenger Auto" },
  { category: "CW", make: "Bajaj Commercial", model: "Maxima C", bodyType: "Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Bajaj Commercial", model: "Maxima Cargo", bodyType: "Heavy Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Bajaj Commercial", model: "Maxima XL Cargo", bodyType: "Heavy Cargo 3-Wheeler" },
  { category: "CW", make: "Bajaj Commercial", model: "Qute", bodyType: "Commercial Quadricycle", isPopular: true },

  // BharatBenz
  { category: "CW", make: "BharatBenz", model: "1015R", bodyType: "Light Truck" },
  { category: "CW", make: "BharatBenz", model: "1215R", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "1217C Tipper", bodyType: "Construction Tipper", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "1415R", bodyType: "Medium Commercial Truck" },
  { category: "CW", make: "BharatBenz", model: "1617R", bodyType: "Medium Haulage Truck", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "1917R", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "2623R", bodyType: "Multi-Axle Truck" },
  { category: "CW", make: "BharatBenz", model: "2823R", bodyType: "Multi-Axle Haulage", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "2828CH Tipper", bodyType: "Heavy Construction Tipper", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "3523R", bodyType: "Multi-Axle Truck" },
  { category: "CW", make: "BharatBenz", model: "3528R", bodyType: "Heavy Haulage", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "3528C Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "4023T", bodyType: "Tractor Trailer" },
  { category: "CW", make: "BharatBenz", model: "4228R", bodyType: "Heavy Multi-Axle Haulage", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "5528T", bodyType: "Heavy Tractor Trailer", isPopular: true },
  { category: "CW", make: "BharatBenz", model: "1017 Bus", bodyType: "Commercial Bus" },
  { category: "CW", make: "BharatBenz", model: "1624 Bus", bodyType: "Intercity Passenger Bus", isPopular: true },

  // Eicher Motors
  { category: "CW", make: "Eicher Motors", model: "Pro 2049", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 2055", bodyType: "Light Truck" },
  { category: "CW", make: "Eicher Motors", model: "Pro 2059", bodyType: "Light Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 2075", bodyType: "Light Commercial Truck" },
  { category: "CW", make: "Eicher Motors", model: "Pro 2080", bodyType: "Light Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 2095", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 2110", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 2114", bodyType: "Intermediate Truck" },
  { category: "CW", make: "Eicher Motors", model: "Pro 3015", bodyType: "Medium Haulage Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 3019", bodyType: "Heavy Commercial Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6019", bodyType: "Multi-Axle Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6028", bodyType: "Heavy Tipper", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6035", bodyType: "Heavy Tipper", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6042", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6048", bodyType: "Multi-Axle Haulage", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 6055", bodyType: "Heavy Tractor Trailer", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 8028 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Pro 8035 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Skyline Pro Bus", bodyType: "Passenger Commercial Bus", isPopular: true },
  { category: "CW", make: "Eicher Motors", model: "Starline Bus", bodyType: "School / Route Bus" },

  // Euler Motors
  { category: "CW", make: "Euler Motors", model: "HiLoad EV", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Euler Motors", model: "Storm EV", bodyType: "Electric 4-Wheeler SCV", isPopular: true },

  // Force Motors
  { category: "CW", make: "Force Motors", model: "Traveller 2930", bodyType: "Commercial Van" },
  { category: "CW", make: "Force Motors", model: "Traveller 3050", bodyType: "Commercial Passenger Van / Ambulance", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Traveller 3350", bodyType: "Mini Bus", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Traveller 3700", bodyType: "Passenger Bus", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Traveller 4020", bodyType: "Large Passenger Bus", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Traveller Monobus", bodyType: "Luxury Tourist Bus" },
  { category: "CW", make: "Force Motors", model: "Traveller Delivery Van", bodyType: "Cargo Van", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Traveller Ambulance", bodyType: "Emergency Healthcare Vehicle", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Trax Cruiser", bodyType: "Maxi Cab / Taxi", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Trax Toofan", bodyType: "Rural Passenger Carrier", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Trax Kargo King", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Urbania Short", bodyType: "Luxury Passenger Van", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Urbania Medium", bodyType: "Luxury Passenger Van", isPopular: true },
  { category: "CW", make: "Force Motors", model: "Urbania Long", bodyType: "Luxury Passenger Van", isPopular: true },

  // Mahindra Commercial
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Pik-Up ExtraLong", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Pik-Up ExtraStrong", bodyType: "Heavy Duty Pickup", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxi Truck Plus", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Camper", bodyType: "Double Cab Pickup", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx Pik-Up HD", bodyType: "Heavy Duty Pickup", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx Pik-Up City", bodyType: "City Pickup", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx City 3000", bodyType: "City Pickup" },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx HD 2.0L", bodyType: "Heavy Duty Pickup", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx HD 1.7L", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Bolero Maxx HD 1.3L", bodyType: "Pickup Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Supro Profit Truck Mini", bodyType: "Mini Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Supro Profit Truck Maxi", bodyType: "Small Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Supro Van", bodyType: "Passenger Carrier", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Supro Maxi Cab", bodyType: "Maxi Cab" },
  { category: "CW", make: "Mahindra Commercial", model: "Jeeto", bodyType: "Micro Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Jeeto Plus", bodyType: "Mini Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Jeeto Strong", bodyType: "Mini Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Gio", bodyType: "Micro Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Genio", bodyType: "Pickup Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Imperio", bodyType: "Premium Pickup" },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 7", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 11", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 12", bodyType: "Medium Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 14", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 16", bodyType: "Intermediate Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Furio 17", bodyType: "Intermediate Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Blazo X 28", bodyType: "Heavy Tipper", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Blazo X 35", bodyType: "Heavy Tipper", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Blazo X 42", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Blazo X 49", bodyType: "Multi-Axle Truck" },
  { category: "CW", make: "Mahindra Commercial", model: "Blazo X 55", bodyType: "Tractor Trailer", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Tourister Bus", bodyType: "School / Staff Bus" },
  { category: "CW", make: "Mahindra Commercial", model: "Cruzio Bus", bodyType: "Commercial Passenger Bus", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Alfa Auto", bodyType: "3-Wheeler Passenger", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Alfa Load", bodyType: "3-Wheeler Cargo", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Alfa DX", bodyType: "3-Wheeler Passenger Auto", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Alfa Plus", bodyType: "3-Wheeler Cargo" },
  { category: "CW", make: "Mahindra Commercial", model: "Treo", bodyType: "Electric Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Treo Zor", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Mahindra Commercial", model: "Zor Grand", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },

  // Maruti Suzuki Commercial
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Super Carry", bodyType: "Mini Truck (Petrol / CNG)", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Eeco Cargo", bodyType: "Delivery Van", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Tour S", bodyType: "Commercial Sedan (Dzire Tour)", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Tour M", bodyType: "Commercial MPV (Ertiga Tour)", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Tour H1", bodyType: "Commercial Hatchback (Alto Tour)", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Tour H3", bodyType: "Commercial Hatchback (Wagon R Tour)", isPopular: true },
  { category: "CW", make: "Maruti Suzuki Commercial", model: "Tour V", bodyType: "Commercial Van (Eeco Tour)", isPopular: true },

  // Omega Seiki Mobility
  { category: "CW", make: "Omega Seiki Mobility", model: "Rage+", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Omega Seiki Mobility", model: "Stream", bodyType: "Electric Passenger Auto" },
  { category: "CW", make: "Omega Seiki Mobility", model: "M1KA", bodyType: "Electric Small Commercial Truck" },

  // Piaggio
  { category: "CW", make: "Piaggio", model: "Ape Auto DX", bodyType: "Auto Rickshaw (Passenger)", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape City", bodyType: "Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape City Plus", bodyType: "Passenger Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape Auto Plus", bodyType: "Auto Rickshaw" },
  { category: "CW", make: "Piaggio", model: "Ape Xtra LDX", bodyType: "Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape Xtra LDX Plus", bodyType: "Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape Xtra", bodyType: "Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape E-City", bodyType: "Electric Auto Rickshaw", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape E-City FX", bodyType: "Electric Passenger Auto" },
  { category: "CW", make: "Piaggio", model: "Ape E-Xtra", bodyType: "Electric Cargo 3-Wheeler", isPopular: true },
  { category: "CW", make: "Piaggio", model: "Ape E-Xtra FX", bodyType: "Electric Cargo 3-Wheeler" },
  { category: "CW", make: "Piaggio", model: "Porter 600", bodyType: "Small Commercial Mini Truck" },
  { category: "CW", make: "Piaggio", model: "Porter 1000", bodyType: "Small Commercial Truck" },

  // SML Isuzu
  { category: "CW", make: "SML Isuzu", model: "Sartaj 5252", bodyType: "Light Truck", isPopular: true },
  { category: "CW", make: "SML Isuzu", model: "Sartaj GS", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "SML Isuzu", model: "Prestige", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "SML Isuzu", model: "Samrat GS", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "SML Isuzu", model: "Super", bodyType: "Medium Truck" },
  { category: "CW", make: "SML Isuzu", model: "Supreme", bodyType: "Medium Truck" },
  { category: "CW", make: "SML Isuzu", model: "SML Executive Bus", bodyType: "Staff / Tourist Bus", isPopular: true },
  { category: "CW", make: "SML Isuzu", model: "SML Hiroi Bus", bodyType: "Passenger Bus" },

  // Scania
  { category: "CW", make: "Scania", model: "G410", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Scania", model: "R500", bodyType: "Heavy Tractor Trailer" },

  // Tata Motors Commercial
  { category: "CW", make: "Tata Motors Commercial", model: "Ace Gold Petrol", bodyType: "Small Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace Gold Diesel", bodyType: "Small Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace Gold CNG", bodyType: "Small Commercial Vehicle", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace EV", bodyType: "Electric Mini Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace HT", bodyType: "Mini Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace Mega", bodyType: "Mini Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ace Zip", bodyType: "Micro Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Super Ace", bodyType: "Pickup Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Intra V10", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Intra V20", bodyType: "Pickup Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Intra V30", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Intra V50", bodyType: "Heavy Pickup Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Intra V70", bodyType: "Heavy Pickup Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Yodha Pickup", bodyType: "Heavy Duty Pickup", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Yodha 2.0", bodyType: "Heavy Duty Pickup", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "207 DI", bodyType: "Pickup Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Xenon", bodyType: "Pickup Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Magic", bodyType: "Passenger Van", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Magic Express", bodyType: "Passenger Van", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Magic Mantra", bodyType: "Passenger Van" },
  { category: "CW", make: "Tata Motors Commercial", model: "Winger", bodyType: "Maxi Cab / Ambulance", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Winger Cargo", bodyType: "Cargo Delivery Van", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Winger Ambulance", bodyType: "Patient Transport", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "407 Gold SFC", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "510 SFC", bodyType: "Light Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "610 SFC", bodyType: "Light Commercial Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "709g LPT", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "710 LPT", bodyType: "Medium Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "912 LPT", bodyType: "Medium Commercial Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "1109g LPT", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "1212 LPT", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "1412 LPT", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "1512 LPT", bodyType: "Intermediate Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ultra T.7", bodyType: "ICV Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ultra T.9", bodyType: "ICV Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Ultra T.12", bodyType: "Medium Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Ultra T.16", bodyType: "Heavy Truck" },
  { category: "CW", make: "Tata Motors Commercial", model: "Ultra T.19", bodyType: "Multi-Axle Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 1923.K", bodyType: "Heavy Tipper Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 2823.K", bodyType: "Heavy Tipper Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 2825.K", bodyType: "Mining Tipper", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 3523.TK", bodyType: "Heavy Tipper", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 3525.K", bodyType: "Multi-Axle Tipper", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 4018.S", bodyType: "Tractor Trailer" },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 4225.T", bodyType: "Multi-Axle Haulage", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 4825.TK", bodyType: "Heavy Haulage Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Signa 5530.S", bodyType: "Heavy Tractor Trailer", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Prima 2830.K", bodyType: "Premium Tipper" },
  { category: "CW", make: "Tata Motors Commercial", model: "Prima 3530.K", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Prima 5530.S", bodyType: "Heavy Puller" },
  { category: "CW", make: "Tata Motors Commercial", model: "LPT 1613", bodyType: "Medium Haulage Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "LPT 2518", bodyType: "Multi-Axle Truck", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "LPT 3118", bodyType: "Heavy Multi-Axle", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Starbus", bodyType: "School / Staff Bus", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "Starbus Ultra", bodyType: "Commercial Passenger Bus", isPopular: true },
  { category: "CW", make: "Tata Motors Commercial", model: "CityRide", bodyType: "City Bus" },
  { category: "CW", make: "Tata Motors Commercial", model: "Magna", bodyType: "Intercity Luxury Coach" },

  // Volvo Trucks
  { category: "CW", make: "Volvo Trucks", model: "FMX 460 Tipper", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Volvo Trucks", model: "FMX 500", bodyType: "Heavy Mining Tipper", isPopular: true },
  { category: "CW", make: "Volvo Trucks", model: "FM 420", bodyType: "Heavy Haulage Tractor", isPopular: true },

];

/**
 * Filter unique Makes for a selected vehicle category ("2W" | "4W" | "CW" or all).
 */
export function getMakesForCategory(
  category?: string | null,
  catalog: VehicleCatalogEntry[] = EMBEDDED_VEHICLE_CATALOG,
): string[] {
  const normCat = category ? category.toUpperCase().trim() : null;
  const filtered = normCat
    ? catalog.filter((item) => item.category === normCat)
    : catalog;

  const makesSet = new Set<string>();
  for (const item of filtered) {
    makesSet.add(item.make);
  }
  return Array.from(makesSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Filter Models for a selected Make and optional vehicle category.
 */
export function getModelsForMake(
  make: string,
  category?: string | null,
  catalog: VehicleCatalogEntry[] = EMBEDDED_VEHICLE_CATALOG,
): string[] {
  if (!make) return [];
  const normMake = make.trim().toLowerCase();
  const normCat = category ? category.toUpperCase().trim() : null;

  const filtered = catalog.filter((item) => {
    if (normCat && item.category !== normCat) return false;
    return item.make.toLowerCase() === normMake;
  });

  const modelsSet = new Set<string>();
  for (const item of filtered) {
    modelsSet.add(item.model);
  }
  return Array.from(modelsSet).sort((a, b) => a.localeCompare(b));
}
