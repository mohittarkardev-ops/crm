import json
import os

# Comprehensive dictionary of vehicles for India (2W, 4W, CW)
# Each entry: (category, make, model, bodyType, isPopular)

CATALOG_DATA = [
    # =========================================================================
    # FOUR-WHEELERS (4W)
    # =========================================================================
    # Maruti Suzuki
    ("4W", "Maruti Suzuki", "Swift", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Baleno", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Dzire", "Sedan", True),
    ("4W", "Maruti Suzuki", "Swift Dzire", "Sedan", True),
    ("4W", "Maruti Suzuki", "Brezza", "Compact SUV", True),
    ("4W", "Maruti Suzuki", "Vitara Brezza", "Compact SUV", True),
    ("4W", "Maruti Suzuki", "Ertiga", "MPV", True),
    ("4W", "Maruti Suzuki", "Wagon R", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Alto K10", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Alto 800", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Alto", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Fronx", "Crossover SUV", True),
    ("4W", "Maruti Suzuki", "Grand Vitara", "Midsize SUV", True),
    ("4W", "Maruti Suzuki", "Eeco", "Van", True),
    ("4W", "Maruti Suzuki", "XL6", "Premium MPV", True),
    ("4W", "Maruti Suzuki", "Jimny", "Off-Road SUV", True),
    ("4W", "Maruti Suzuki", "Celerio", "Hatchback", True),
    ("4W", "Maruti Suzuki", "Celerio X", "Crossover", False),
    ("4W", "Maruti Suzuki", "Ignis", "Compact Hatchback", True),
    ("4W", "Maruti Suzuki", "Ciaz", "Sedan", True),
    ("4W", "Maruti Suzuki", "S-Presso", "Mini SUV", True),
    ("4W", "Maruti Suzuki", "Invicto", "Premium MPV", False),
    ("4W", "Maruti Suzuki", "S-Cross", "Crossover SUV", True),
    ("4W", "Maruti Suzuki", "Ritz", "Hatchback", True),
    ("4W", "Maruti Suzuki", "A-Star", "Hatchback", False),
    ("4W", "Maruti Suzuki", "Zen", "Hatchback", False),
    ("4W", "Maruti Suzuki", "Zen Estilo", "Hatchback", False),
    ("4W", "Maruti Suzuki", "Estilo", "Hatchback", False),
    ("4W", "Maruti Suzuki", "SX4", "Sedan", False),
    ("4W", "Maruti Suzuki", "Omni", "Van", True),
    ("4W", "Maruti Suzuki", "Gypsy", "Off-Road SUV", False),
    ("4W", "Maruti Suzuki", "Maruti 800", "Hatchback", False),
    ("4W", "Maruti Suzuki", "Esteem", "Sedan", False),
    ("4W", "Maruti Suzuki", "Versa", "Van", False),
    ("4W", "Maruti Suzuki", "Kizashi", "Executive Sedan", False),

    # Hyundai
    ("4W", "Hyundai", "Creta", "Midsize SUV", True),
    ("4W", "Hyundai", "Creta N Line", "Sport Midsize SUV", False),
    ("4W", "Hyundai", "Venue", "Compact SUV", True),
    ("4W", "Hyundai", "Venue N Line", "Compact SUV", False),
    ("4W", "Hyundai", "i20", "Premium Hatchback", True),
    ("4W", "Hyundai", "i20 N Line", "Sport Hatchback", False),
    ("4W", "Hyundai", "Elite i20", "Premium Hatchback", True),
    ("4W", "Hyundai", "i20 Active", "Crossover", False),
    ("4W", "Hyundai", "Grand i10 Nios", "Hatchback", True),
    ("4W", "Hyundai", "Grand i10", "Hatchback", True),
    ("4W", "Hyundai", "i10", "Hatchback", True),
    ("4W", "Hyundai", "Exter", "Micro SUV", True),
    ("4W", "Hyundai", "Verna", "Sedan", True),
    ("4W", "Hyundai", "Verna Fluidic", "Sedan", True),
    ("4W", "Hyundai", "Aura", "Compact Sedan", True),
    ("4W", "Hyundai", "Xcent", "Compact Sedan", True),
    ("4W", "Hyundai", "Alcazar", "3-Row SUV", True),
    ("4W", "Hyundai", "Tucson", "Premium SUV", False),
    ("4W", "Hyundai", "Santa Fe", "Fullsize SUV", False),
    ("4W", "Hyundai", "Santro", "Hatchback", True),
    ("4W", "Hyundai", "Santro Xing", "Hatchback", True),
    ("4W", "Hyundai", "Eon", "Hatchback", True),
    ("4W", "Hyundai", "Getz", "Hatchback", False),
    ("4W", "Hyundai", "Getz Prime", "Hatchback", False),
    ("4W", "Hyundai", "Accent", "Sedan", False),
    ("4W", "Hyundai", "Elantra", "Executive Sedan", False),
    ("4W", "Hyundai", "Sonata", "Luxury Sedan", False),
    ("4W", "Hyundai", "Ioniq 5", "Electric SUV", False),
    ("4W", "Hyundai", "Kona Electric", "Electric SUV", False),

    # Tata Motors
    ("4W", "Tata Motors", "Nexon", "Compact SUV", True),
    ("4W", "Tata Motors", "Nexon EV", "Electric SUV", True),
    ("4W", "Tata Motors", "Punch", "Micro SUV", True),
    ("4W", "Tata Motors", "Punch EV", "Electric Micro SUV", True),
    ("4W", "Tata Motors", "Harrier", "Midsize SUV", True),
    ("4W", "Tata Motors", "Safari", "3-Row SUV", True),
    ("4W", "Tata Motors", "Safari Storme", "SUV", True),
    ("4W", "Tata Motors", "Safari Dicor", "SUV", False),
    ("4W", "Tata Motors", "Curvv", "SUV Coupe", True),
    ("4W", "Tata Motors", "Curvv EV", "Electric SUV Coupe", True),
    ("4W", "Tata Motors", "Altroz", "Premium Hatchback", True),
    ("4W", "Tata Motors", "Altroz Racer", "Sport Hatchback", False),
    ("4W", "Tata Motors", "Tiago", "Hatchback", True),
    ("4W", "Tata Motors", "Tiago EV", "Electric Hatchback", True),
    ("4W", "Tata Motors", "Tiago NRG", "Crossover Hatchback", False),
    ("4W", "Tata Motors", "Tigor", "Compact Sedan", True),
    ("4W", "Tata Motors", "Tigor EV", "Electric Compact Sedan", False),
    ("4W", "Tata Motors", "Indica", "Hatchback", True),
    ("4W", "Tata Motors", "Indica Vista", "Hatchback", True),
    ("4W", "Tata Motors", "Indica eV2", "Hatchback", False),
    ("4W", "Tata Motors", "Indigo", "Sedan", True),
    ("4W", "Tata Motors", "Indigo eCS", "Compact Sedan", True),
    ("4W", "Tata Motors", "Indigo CS", "Compact Sedan", False),
    ("4W", "Tata Motors", "Manza", "Sedan", False),
    ("4W", "Tata Motors", "Zest", "Compact Sedan", True),
    ("4W", "Tata Motors", "Bolt", "Hatchback", False),
    ("4W", "Tata Motors", "Hexa", "Crossover MPV", True),
    ("4W", "Tata Motors", "Aria", "Crossover MPV", False),
    ("4W", "Tata Motors", "Sumo", "Utility Vehicle", True),
    ("4W", "Tata Motors", "Sumo Gold", "Utility Vehicle", True),
    ("4W", "Tata Motors", "Sumo Grande", "Utility Vehicle", False),
    ("4W", "Tata Motors", "Nano", "Compact Hatchback", True),
    ("4W", "Tata Motors", "Nano GenX", "Compact Hatchback", False),
    ("4W", "Tata Motors", "Sierra", "SUV", False),

    # Mahindra
    ("4W", "Mahindra", "Scorpio-N", "SUV", True),
    ("4W", "Mahindra", "Scorpio Classic", "SUV", True),
    ("4W", "Mahindra", "Scorpio", "SUV", True),
    ("4W", "Mahindra", "XUV700", "Midsize SUV", True),
    ("4W", "Mahindra", "XUV500", "Midsize SUV", True),
    ("4W", "Mahindra", "Thar", "Off-Road SUV", True),
    ("4W", "Mahindra", "Thar Roxx", "5-Door Off-Road SUV", True),
    ("4W", "Mahindra", "Thar CRDe", "Off-Road SUV", False),
    ("4W", "Mahindra", "Bolero", "Utility Vehicle", True),
    ("4W", "Mahindra", "Bolero Neo", "Compact SUV", True),
    ("4W", "Mahindra", "Bolero Neo Plus", "9-Seater SUV", False),
    ("4W", "Mahindra", "Bolero Power+", "Utility Vehicle", True),
    ("4W", "Mahindra", "XUV 3XO", "Compact SUV", True),
    ("4W", "Mahindra", "XUV300", "Compact SUV", True),
    ("4W", "Mahindra", "XUV400 EV", "Electric SUV", True),
    ("4W", "Mahindra", "Xylo", "MUV / MPV", True),
    ("4W", "Mahindra", "KUV100", "Micro SUV", True),
    ("4W", "Mahindra", "KUV100 NXT", "Micro SUV", False),
    ("4W", "Mahindra", "TUV300", "Compact SUV", True),
    ("4W", "Mahindra", "TUV300 Plus", "SUV", False),
    ("4W", "Mahindra", "Marazzo", "MPV", False),
    ("4W", "Mahindra", "Quanto", "Compact MUV", False),
    ("4W", "Mahindra", "NuvoSport", "Compact SUV", False),
    ("4W", "Mahindra", "Verito", "Sedan", False),
    ("4W", "Mahindra", "Verito Vibe", "Hatchback", False),
    ("4W", "Mahindra", "Logan", "Sedan", False),
    ("4W", "Mahindra", "Alturas G4", "Fullsize SUV", False),
    ("4W", "Mahindra", "e2o Plus", "Electric Hatchback", False),

    # Kia
    ("4W", "Kia", "Seltos", "Midsize SUV", True),
    ("4W", "Kia", "Sonet", "Compact SUV", True),
    ("4W", "Kia", "Carens", "MPV", True),
    ("4W", "Kia", "Carnival", "Luxury MPV", True),
    ("4W", "Kia", "EV6", "Electric Crossover", False),
    ("4W", "Kia", "EV9", "Electric Luxury SUV", False),

    # Toyota
    ("4W", "Toyota", "Innova Crysta", "MPV", True),
    ("4W", "Toyota", "Innova Hycross", "Hybrid MPV", True),
    ("4W", "Toyota", "Innova", "MPV", True),
    ("4W", "Toyota", "Fortuner", "Fullsize SUV", True),
    ("4W", "Toyota", "Fortuner Legender", "Fullsize SUV", True),
    ("4W", "Toyota", "Urban Cruiser Hyryder", "Midsize SUV", True),
    ("4W", "Toyota", "Glanza", "Hatchback", True),
    ("4W", "Toyota", "Urban Cruiser Taisor", "Crossover SUV", True),
    ("4W", "Toyota", "Urban Cruiser", "Compact SUV", True),
    ("4W", "Toyota", "Hilux", "Pickup Truck", False),
    ("4W", "Toyota", "Etios", "Sedan", True),
    ("4W", "Toyota", "Etios Liva", "Hatchback", True),
    ("4W", "Toyota", "Etios Cross", "Crossover", False),
    ("4W", "Toyota", "Corolla Altis", "Executive Sedan", True),
    ("4W", "Toyota", "Corolla", "Sedan", False),
    ("4W", "Toyota", "Yaris", "Sedan", False),
    ("4W", "Toyota", "Camry", "Luxury Hybrid Sedan", False),
    ("4W", "Toyota", "Vellfire", "Luxury MPV", False),
    ("4W", "Toyota", "Land Cruiser", "Luxury Fullsize SUV", False),
    ("4W", "Toyota", "Land Cruiser Prado", "Luxury SUV", False),
    ("4W", "Toyota", "Qualis", "MUV", True),

    # Honda
    ("4W", "Honda", "City", "Sedan", True),
    ("4W", "Honda", "City 4th Gen", "Sedan", True),
    ("4W", "Honda", "City 5th Gen", "Sedan", True),
    ("4W", "Honda", "City e:HEV", "Hybrid Sedan", False),
    ("4W", "Honda", "Elevate", "Midsize SUV", True),
    ("4W", "Honda", "Amaze", "Compact Sedan", True),
    ("4W", "Honda", "Jazz", "Premium Hatchback", True),
    ("4W", "Honda", "WR-V", "Crossover SUV", True),
    ("4W", "Honda", "BR-V", "Compact MPV", False),
    ("4W", "Honda", "Brio", "Hatchback", True),
    ("4W", "Honda", "Mobilio", "MPV", False),
    ("4W", "Honda", "Civic", "Executive Sedan", True),
    ("4W", "Honda", "CR-V", "Premium SUV", False),
    ("4W", "Honda", "Accord", "Luxury Sedan", False),

    # Volkswagen
    ("4W", "Volkswagen", "Polo", "Hatchback", True),
    ("4W", "Volkswagen", "Polo GT", "Sport Hatchback", True),
    ("4W", "Volkswagen", "Vento", "Sedan", True),
    ("4W", "Volkswagen", "Virtus", "Sedan", True),
    ("4W", "Volkswagen", "Virtus GT", "Sport Sedan", True),
    ("4W", "Volkswagen", "Taigun", "Midsize SUV", True),
    ("4W", "Volkswagen", "Taigun GT", "Sport SUV", True),
    ("4W", "Volkswagen", "Ameo", "Compact Sedan", True),
    ("4W", "Volkswagen", "Tiguan", "Premium SUV", False),
    ("4W", "Volkswagen", "Tiguan Allspace", "7-Seater SUV", False),
    ("4W", "Volkswagen", "T-Roc", "Compact SUV", False),
    ("4W", "Volkswagen", "Jetta", "Executive Sedan", False),
    ("4W", "Volkswagen", "Passat", "Luxury Sedan", False),
    ("4W", "Volkswagen", "Cross Polo", "Crossover", False),

    # Skoda
    ("4W", "Skoda", "Kushaq", "Midsize SUV", True),
    ("4W", "Skoda", "Slavia", "Sedan", True),
    ("4W", "Skoda", "Rapid", "Sedan", True),
    ("4W", "Skoda", "Octavia", "Executive Sedan", True),
    ("4W", "Skoda", "Octavia vRS", "Sport Sedan", False),
    ("4W", "Skoda", "Laura", "Executive Sedan", False),
    ("4W", "Skoda", "Fabia", "Hatchback", True),
    ("4W", "Skoda", "Kodiaq", "Luxury 7-Seater SUV", False),
    ("4W", "Skoda", "Superb", "Luxury Sedan", False),
    ("4W", "Skoda", "Yeti", "Compact SUV", False),
    ("4W", "Skoda", "Kylaq", "Compact SUV", True),

    # MG (Morris Garages)
    ("4W", "MG", "Hector", "Midsize SUV", True),
    ("4W", "MG", "Hector Plus", "3-Row SUV", True),
    ("4W", "MG", "Astor", "Compact SUV", True),
    ("4W", "MG", "ZS EV", "Electric SUV", True),
    ("4W", "MG", "Comet EV", "Electric Micro Hatchback", True),
    ("4W", "MG", "Windsor EV", "Electric Crossover", True),
    ("4W", "MG", "Gloster", "Fullsize SUV", False),

    # Renault
    ("4W", "Renault", "Kwid", "Hatchback", True),
    ("4W", "Renault", "Triber", "Compact MPV", True),
    ("4W", "Renault", "Kiger", "Compact SUV", True),
    ("4W", "Renault", "Duster", "Midsize SUV", True),
    ("4W", "Renault", "Duster AWD", "4x4 SUV", False),
    ("4W", "Renault", "Lodgy", "MPV", False),
    ("4W", "Renault", "Captur", "Crossover SUV", False),
    ("4W", "Renault", "Pulse", "Hatchback", False),
    ("4W", "Renault", "Scala", "Sedan", False),
    ("4W", "Renault", "Fluence", "Executive Sedan", False),

    # Ford (Massive insured volume in India)
    ("4W", "Ford", "EcoSport", "Compact SUV", True),
    ("4W", "Ford", "Figo", "Hatchback", True),
    ("4W", "Ford", "Aspire", "Compact Sedan", True),
    ("4W", "Ford", "Figo Aspire", "Compact Sedan", True),
    ("4W", "Ford", "Freestyle", "Crossover", True),
    ("4W", "Ford", "Endeavour", "Fullsize 4x4 SUV", True),
    ("4W", "Ford", "Fiesta", "Sedan", True),
    ("4W", "Ford", "Fiesta Classic", "Sedan", False),
    ("4W", "Ford", "Ikon", "Sedan", False),
    ("4W", "Ford", "Fusion", "Crossover", False),

    # Chevrolet (Massive legacy insured volume in India)
    ("4W", "Chevrolet", "Beat", "Hatchback", True),
    ("4W", "Chevrolet", "Spark", "Hatchback", True),
    ("4W", "Chevrolet", "Cruze", "Executive Sedan", True),
    ("4W", "Chevrolet", "Tavera", "MUV", True),
    ("4W", "Chevrolet", "Sail", "Sedan", False),
    ("4W", "Chevrolet", "Sail U-VA", "Hatchback", False),
    ("4W", "Chevrolet", "Enjoy", "MPV", False),
    ("4W", "Chevrolet", "Optra", "Sedan", False),
    ("4W", "Chevrolet", "Optra Magnum", "Sedan", False),
    ("4W", "Chevrolet", "Aveo", "Sedan", False),
    ("4W", "Chevrolet", "Aveo U-VA", "Hatchback", False),
    ("4W", "Chevrolet", "Captiva", "SUV", False),

    # Nissan & Datsun
    ("4W", "Nissan", "Magnite", "Compact SUV", True),
    ("4W", "Nissan", "Micra", "Hatchback", True),
    ("4W", "Nissan", "Micra Active", "Hatchback", False),
    ("4W", "Nissan", "Sunny", "Sedan", True),
    ("4W", "Nissan", "Kicks", "Compact SUV", False),
    ("4W", "Nissan", "Terrano", "Midsize SUV", True),
    ("4W", "Nissan", "X-Trail", "Premium SUV", False),
    ("4W", "Nissan", "Evalia", "MPV", False),
    ("4W", "Datsun", "GO", "Hatchback", True),
    ("4W", "Datsun", "GO+", "Compact MPV", True),
    ("4W", "Datsun", "redi-GO", "Hatchback", True),

    # Jeep & Fiat
    ("4W", "Jeep", "Compass", "Premium Midsize SUV", True),
    ("4W", "Jeep", "Meridian", "3-Row SUV", True),
    ("4W", "Jeep", "Wrangler", "Off-Road 4x4", False),
    ("4W", "Jeep", "Grand Cherokee", "Luxury SUV", False),
    ("4W", "Fiat", "Punto", "Hatchback", True),
    ("4W", "Fiat", "Punto Evo", "Hatchback", True),
    ("4W", "Fiat", "Grande Punto", "Hatchback", False),
    ("4W", "Fiat", "Linea", "Sedan", True),
    ("4W", "Fiat", "Palio", "Hatchback", True),
    ("4W", "Fiat", "Palio Stile", "Hatchback", False),
    ("4W", "Fiat", "Avventura", "Crossover", False),
    ("4W", "Fiat", "Urban Cross", "Crossover", False),

    # Citroën
    ("4W", "Citroën", "C3", "Hatchback", True),
    ("4W", "Citroën", "C3 Aircross", "Midsize SUV", True),
    ("4W", "Citroën", "Basalt", "SUV Coupe", True),
    ("4W", "Citroën", "ë-C3", "Electric Hatchback", True),
    ("4W", "Citroën", "C5 Aircross", "Premium SUV", False),

    # BYD
    ("4W", "BYD", "Atto 3", "Electric SUV", True),
    ("4W", "BYD", "Seal", "Electric Performance Sedan", True),
    ("4W", "BYD", "e6", "Electric MPV", True),
    ("4W", "BYD", "Sealion 6", "Plug-in Hybrid SUV", False),

    # Luxury & Premium 4W Makes
    ("4W", "BMW", "3 Series", "Executive Sedan", True),
    ("4W", "BMW", "3 Series Gran Limousine", "Executive Sedan", True),
    ("4W", "BMW", "2 Series Gran Coupe", "Coupe Sedan", False),
    ("4W", "BMW", "5 Series", "Luxury Sedan", True),
    ("4W", "BMW", "6 Series GT", "Luxury Tourer", False),
    ("4W", "BMW", "7 Series", "Super Luxury Sedan", False),
    ("4W", "BMW", "X1", "Compact Luxury SUV", True),
    ("4W", "BMW", "X3", "Midsize Luxury SUV", True),
    ("4W", "BMW", "X5", "Fullsize Luxury SUV", True),
    ("4W", "BMW", "X7", "3-Row Luxury SUV", False),
    ("4W", "BMW", "Z4", "Roadster Convertible", False),
    ("4W", "BMW", "iX1", "Electric SUV", False),
    ("4W", "BMW", "i4", "Electric Sedan", False),
    ("4W", "BMW", "iX", "Electric Luxury SUV", False),

    ("4W", "Mercedes-Benz", "C-Class", "Executive Sedan", True),
    ("4W", "Mercedes-Benz", "E-Class", "Luxury Sedan", True),
    ("4W", "Mercedes-Benz", "S-Class", "Super Luxury Sedan", True),
    ("4W", "Mercedes-Benz", "A-Class Limousine", "Entry Luxury Sedan", True),
    ("4W", "Mercedes-Benz", "GLA", "Compact Luxury SUV", True),
    ("4W", "Mercedes-Benz", "GLB", "7-Seater Luxury SUV", False),
    ("4W", "Mercedes-Benz", "GLC", "Midsize Luxury SUV", True),
    ("4W", "Mercedes-Benz", "GLE", "Fullsize Luxury SUV", True),
    ("4W", "Mercedes-Benz", "GLS", "3-Row Luxury SUV", False),
    ("4W", "Mercedes-Benz", "G-Class", "Iconic Off-Roader", False),
    ("4W", "Mercedes-Benz", "EQB", "Electric SUV", False),
    ("4W", "Mercedes-Benz", "EQE", "Electric Luxury SUV", False),
    ("4W", "Mercedes-Benz", "EQS", "Electric Luxury Sedan", False),

    ("4W", "Audi", "A4", "Executive Sedan", True),
    ("4W", "Audi", "A6", "Luxury Sedan", True),
    ("4W", "Audi", "A8L", "Super Luxury Sedan", False),
    ("4W", "Audi", "Q3", "Compact Luxury SUV", True),
    ("4W", "Audi", "Q3 Sportback", "Coupe SUV", False),
    ("4W", "Audi", "Q5", "Midsize Luxury SUV", True),
    ("4W", "Audi", "Q7", "3-Row Luxury SUV", True),
    ("4W", "Audi", "Q8", "Luxury Coupe SUV", False),
    ("4W", "Audi", "e-tron", "Electric Luxury SUV", False),

    ("4W", "Jaguar", "XE", "Sedan", False),
    ("4W", "Jaguar", "XF", "Luxury Sedan", False),
    ("4W", "Jaguar", "F-Pace", "Luxury SUV", True),
    ("4W", "Jaguar", "F-Type", "Sports Coupe", False),
    ("4W", "Land Rover", "Range Rover", "Flagship Luxury SUV", True),
    ("4W", "Land Rover", "Range Rover Sport", "Performance Luxury SUV", True),
    ("4W", "Land Rover", "Range Rover Velar", "Midsize Luxury SUV", True),
    ("4W", "Land Rover", "Range Rover Evoque", "Compact Luxury SUV", True),
    ("4W", "Land Rover", "Defender", "Iconic 4x4 Off-Roader", True),
    ("4W", "Land Rover", "Discovery", "Fullsize SUV", False),
    ("4W", "Land Rover", "Discovery Sport", "Compact Luxury SUV", True),
    ("4W", "Land Rover", "Freelander 2", "Compact Luxury SUV", False),

    ("4W", "Volvo", "XC40", "Compact Luxury SUV", True),
    ("4W", "Volvo", "XC40 Recharge", "Electric SUV", True),
    ("4W", "Volvo", "XC60", "Midsize Luxury SUV", True),
    ("4W", "Volvo", "XC90", "Flagship 7-Seater SUV", True),
    ("4W", "Volvo", "S60", "Sedan", False),
    ("4W", "Volvo", "S90", "Executive Luxury Sedan", False),
    ("4W", "Volvo", "C40 Recharge", "Electric Coupe SUV", False),

    ("4W", "Mini", "Cooper", "Hatchback", True),
    ("4W", "Mini", "Countryman", "Crossover SUV", True),
    ("4W", "Porsche", "Macan", "Performance SUV", True),
    ("4W", "Porsche", "Cayenne", "Luxury SUV", True),
    ("4W", "Porsche", "Panamera", "Sports Sedan", False),
    ("4W", "Porsche", "911", "Sports Car", False),

    ("4W", "Lexus", "ES 300h", "Luxury Hybrid Sedan", True),
    ("4W", "Lexus", "NX 350h", "Luxury Hybrid SUV", True),
    ("4W", "Lexus", "RX 350h", "Luxury Hybrid SUV", False),
    ("4W", "Lexus", "LX 500d", "Flagship Luxury SUV", False),

    ("4W", "Force Motors", "Gurkha", "4x4 Off-Road SUV", True),
    ("4W", "Force Motors", "Gurkha 5-Door", "4x4 Off-Road SUV", True),
    ("4W", "Force Motors", "Trax Cruiser", "Multi-Utility Vehicle", True),
    ("4W", "Isuzu", "D-Max V-Cross", "Lifestyle Pickup", True),
    ("4W", "Isuzu", "MU-X", "Fullsize SUV", False),
    ("4W", "Isuzu", "Hi-Lander", "Pickup Truck", False),

    # =========================================================================
    # TWO-WHEELERS (2W)
    # =========================================================================
    # Hero MotoCorp
    ("2W", "Hero MotoCorp", "Splendor Plus", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "Splendor Plus XTEC", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "Splendor Pro", "Commuter Motorcycle", False),
    ("2W", "Hero MotoCorp", "Splendor iSmart", "Commuter Motorcycle", False),
    ("2W", "Hero MotoCorp", "Super Splendor", "125cc Commuter", True),
    ("2W", "Hero MotoCorp", "Super Splendor XTEC", "125cc Commuter", True),
    ("2W", "Hero MotoCorp", "HF Deluxe", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "HF 100", "Entry Commuter", True),
    ("2W", "Hero MotoCorp", "HF Dawn", "Commuter Motorcycle", False),
    ("2W", "Hero MotoCorp", "Passion Plus", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "Passion Pro", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "Passion XTEC", "Commuter Motorcycle", True),
    ("2W", "Hero MotoCorp", "Glamour", "125cc Motorcycle", True),
    ("2W", "Hero MotoCorp", "Glamour XTEC", "125cc Motorcycle", True),
    ("2W", "Hero MotoCorp", "Glamour Canvas", "125cc Motorcycle", False),
    ("2W", "Hero MotoCorp", "Xtreme 125R", "Sport Commuter", True),
    ("2W", "Hero MotoCorp", "Xtreme 160R", "Naked Sport", True),
    ("2W", "Hero MotoCorp", "Xtreme 160R 4V", "Naked Sport", True),
    ("2W", "Hero MotoCorp", "Xtreme 200S", "Sports Bike", False),
    ("2W", "Hero MotoCorp", "XPulse 200 4V", "Adventure Motorcycle", True),
    ("2W", "Hero MotoCorp", "XPulse 200T 4V", "Touring Motorcycle", False),
    ("2W", "Hero MotoCorp", "Karizma XMR", "Sports Motorcycle", True),
    ("2W", "Hero MotoCorp", "Karizma R", "Sports Motorcycle", False),
    ("2W", "Hero MotoCorp", "Karizma ZMR", "Sports Motorcycle", False),
    ("2W", "Hero MotoCorp", "Mavrick 440", "Roadster", True),
    ("2W", "Hero MotoCorp", "CBZ Xtreme", "Motorcycle", False),
    ("2W", "Hero MotoCorp", "Hunk", "Motorcycle", False),
    ("2W", "Hero MotoCorp", "Achiever", "Motorcycle", False),
    ("2W", "Hero MotoCorp", "Pleasure Plus", "Scooter", True),
    ("2W", "Hero MotoCorp", "Pleasure Plus XTEC", "Scooter", True),
    ("2W", "Hero MotoCorp", "Destini 125", "Scooter", True),
    ("2W", "Hero MotoCorp", "Destini Prime", "Scooter", False),
    ("2W", "Hero MotoCorp", "Maestro Edge 110", "Scooter", True),
    ("2W", "Hero MotoCorp", "Maestro Edge 125", "Scooter", True),
    ("2W", "Hero MotoCorp", "Xoom 110", "Sporty Scooter", True),
    ("2W", "Hero MotoCorp", "Vida V1 Pro", "Electric Scooter", True),
    ("2W", "Hero MotoCorp", "Vida V1 Plus", "Electric Scooter", False),

    # Honda 2Wheelers
    ("2W", "Honda 2Wheelers", "Activa 6G", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Activa 5G", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Activa 4G", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Activa 3G", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Activa 125", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Activa H-Smart", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Dio", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Dio 125", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Grazia 125", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Aviator", "Scooter", True),
    ("2W", "Honda 2Wheelers", "Navi", "Moto-Scooter", False),
    ("2W", "Honda 2Wheelers", "Cliq", "Utility Scooter", False),
    ("2W", "Honda 2Wheelers", "Shine 100", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "Shine 125", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "CB Shine", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "SP 125", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "SP 160", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "Unicorn 150", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "Unicorn 160", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "CB Unicorn", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "Hornet 2.0", "Naked Sport", True),
    ("2W", "Honda 2Wheelers", "CB Hornet 160R", "Naked Sport", True),
    ("2W", "Honda 2Wheelers", "CB200X", "Adventure Crossover", True),
    ("2W", "Honda 2Wheelers", "H'ness CB350", "Classic Cruiser", True),
    ("2W", "Honda 2Wheelers", "CB350RS", "Scrambler", True),
    ("2W", "Honda 2Wheelers", "CB350", "Classic Motorcycle", True),
    ("2W", "Honda 2Wheelers", "CB300R", "Neo Sports Cafe", False),
    ("2W", "Honda 2Wheelers", "CB300F", "Streetfighter", False),
    ("2W", "Honda 2Wheelers", "CBR 150R", "Sports Bike", False),
    ("2W", "Honda 2Wheelers", "CBR 250R", "Sports Bike", False),
    ("2W", "Honda 2Wheelers", "Livo", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "CD 110 Dream", "Commuter Motorcycle", True),
    ("2W", "Honda 2Wheelers", "Dream Yuga", "Commuter Motorcycle", False),
    ("2W", "Honda 2Wheelers", "CB Trigger", "Motorcycle", False),
    ("2W", "Honda 2Wheelers", "CB Twister", "Motorcycle", False),
    ("2W", "Honda 2Wheelers", "NX500", "Adventure Motorcycle", False),

    # TVS Motor
    ("2W", "TVS", "Jupiter", "Scooter", True),
    ("2W", "TVS", "Jupiter 110", "Scooter", True),
    ("2W", "TVS", "Jupiter 125", "Scooter", True),
    ("2W", "TVS", "Jupiter Classic", "Scooter", True),
    ("2W", "TVS", "Jupiter ZX", "Scooter", True),
    ("2W", "TVS", "Ntorq 125", "Sporty Scooter", True),
    ("2W", "TVS", "Ntorq 125 Race XP", "Sporty Scooter", True),
    ("2W", "TVS", "Ntorq 125 Super Squad", "Sporty Scooter", False),
    ("2W", "TVS", "iQube Electric", "Electric Scooter", True),
    ("2W", "TVS", "iQube S", "Electric Scooter", True),
    ("2W", "TVS", "iQube ST", "Electric Scooter", False),
    ("2W", "TVS", "TVS X Electric", "Performance Electric Scooter", False),
    ("2W", "TVS", "Scooty Pep Plus", "Scooter", True),
    ("2W", "TVS", "Scooty Zest 110", "Scooter", True),
    ("2W", "TVS", "Scooty Streak", "Scooter", False),
    ("2W", "TVS", "Wego", "Scooter", False),
    ("2W", "TVS", "XL100 Heavy Duty", "Moped / Utility", True),
    ("2W", "TVS", "XL100 Comfort", "Moped / Utility", True),
    ("2W", "TVS", "Apache RTR 160", "Sports Motorcycle", True),
    ("2W", "TVS", "Apache RTR 160 4V", "Sports Motorcycle", True),
    ("2W", "TVS", "Apache RTR 180", "Sports Motorcycle", True),
    ("2W", "TVS", "Apache RTR 200 4V", "Sports Motorcycle", True),
    ("2W", "TVS", "Apache RTR 310", "Naked Streetfighter", True),
    ("2W", "TVS", "Apache RR 310", "Super Sport", True),
    ("2W", "TVS", "Raider 125", "Sporty Commuter", True),
    ("2W", "TVS", "Ronin", "Modern Retro", True),
    ("2W", "TVS", "Radeon", "Commuter Motorcycle", True),
    ("2W", "TVS", "Sport", "Commuter Motorcycle", True),
    ("2W", "TVS", "Star City Plus", "Commuter Motorcycle", True),
    ("2W", "TVS", "Star City", "Commuter Motorcycle", False),
    ("2W", "TVS", "Victor", "Commuter Motorcycle", False),
    ("2W", "TVS", "Phoenix 125", "Commuter Motorcycle", False),

    # Bajaj Auto
    ("2W", "Bajaj", "Pulsar 125", "Sports Commuter", True),
    ("2W", "Bajaj", "Pulsar 150", "Sports Commuter", True),
    ("2W", "Bajaj", "Pulsar 180", "Sports Motorcycle", False),
    ("2W", "Bajaj", "Pulsar 220F", "Semi-Faired Sport", True),
    ("2W", "Bajaj", "Pulsar NS125", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar NS160", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar NS200", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar NS400Z", "Performance Streetfighter", True),
    ("2W", "Bajaj", "Pulsar N150", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar N160", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar N250", "Naked Sport", True),
    ("2W", "Bajaj", "Pulsar F250", "Semi-Faired Sport", False),
    ("2W", "Bajaj", "Pulsar RS200", "Faired Sports Bike", True),
    ("2W", "Bajaj", "Platina 100", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "Platina 110", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "Platina 110 ABS", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "CT 100", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "CT 110", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "CT 110X", "Rugged Commuter", True),
    ("2W", "Bajaj", "CT 125X", "Rugged Commuter", False),
    ("2W", "Bajaj", "Discover 100", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "Discover 125", "Commuter Motorcycle", True),
    ("2W", "Bajaj", "Discover 150", "Commuter Motorcycle", False),
    ("2W", "Bajaj", "Avenger Street 160", "Cruiser", True),
    ("2W", "Bajaj", "Avenger Cruise 220", "Cruiser", True),
    ("2W", "Bajaj", "Avenger Street 220", "Cruiser", False),
    ("2W", "Bajaj", "Dominar 250", "Tourer", True),
    ("2W", "Bajaj", "Dominar 400", "Power Cruiser / Tourer", True),
    ("2W", "Bajaj", "Freedom 125 CNG", "CNG Motorcycle", True),
    ("2W", "Bajaj", "Chetak Electric", "Electric Scooter", True),
    ("2W", "Bajaj", "Chetak 2901", "Electric Scooter", True),
    ("2W", "Bajaj", "Chetak Premium", "Electric Scooter", True),
    ("2W", "Bajaj", "Chetak Urbane", "Electric Scooter", False),
    ("2W", "Bajaj", "V15", "Commuter Motorcycle", False),
    ("2W", "Bajaj", "V12", "Commuter Motorcycle", False),
    ("2W", "Bajaj", "Boxer", "Rugged Commuter", False),
    ("2W", "Bajaj", "Caliber", "Commuter Motorcycle", False),

    # Royal Enfield
    ("2W", "Royal Enfield", "Classic 350", "Cruiser", True),
    ("2W", "Royal Enfield", "Classic 500", "Cruiser", False),
    ("2W", "Royal Enfield", "Bullet 350", "Classic Cruiser", True),
    ("2W", "Royal Enfield", "Bullet 500", "Cruiser", False),
    ("2W", "Royal Enfield", "Bullet Electra", "Cruiser", True),
    ("2W", "Royal Enfield", "Hunter 350", "Roadster", True),
    ("2W", "Royal Enfield", "Meteor 350", "Cruiser Tourer", True),
    ("2W", "Royal Enfield", "Thunderbird 350", "Cruiser", True),
    ("2W", "Royal Enfield", "Thunderbird 350X", "Cruiser", False),
    ("2W", "Royal Enfield", "Thunderbird 500", "Cruiser", False),
    ("2W", "Royal Enfield", "Himalayan 450", "Adventure Motorcycle", True),
    ("2W", "Royal Enfield", "Himalayan 411", "Adventure Motorcycle", True),
    ("2W", "Royal Enfield", "Scram 411", "Scrambler", False),
    ("2W", "Royal Enfield", "Guerrilla 450", "Roadster", True),
    ("2W", "Royal Enfield", "Interceptor 650", "Twin Cylinder Roadster", True),
    ("2W", "Royal Enfield", "Continental GT 650", "Cafe Racer", True),
    ("2W", "Royal Enfield", "Super Meteor 650", "Twin Cruiser", True),
    ("2W", "Royal Enfield", "Shotgun 650", "Custom Bobber", False),
    ("2W", "Royal Enfield", "Bear 650", "Scrambler 650", False),
    ("2W", "Royal Enfield", "Classic 650", "Cruiser 650", False),

    # Yamaha
    ("2W", "Yamaha", "YZF R15 V4", "Super Sport", True),
    ("2W", "Yamaha", "YZF R15 V3", "Super Sport", True),
    ("2W", "Yamaha", "YZF R15M", "Super Sport", True),
    ("2W", "Yamaha", "YZF R15S", "Super Sport", False),
    ("2W", "Yamaha", "MT-15 V2", "Naked Sport", True),
    ("2W", "Yamaha", "MT-15", "Naked Sport", True),
    ("2W", "Yamaha", "YZF R3", "Twin Super Sport", False),
    ("2W", "Yamaha", "MT-03", "Twin Naked Sport", False),
    ("2W", "Yamaha", "FZ-Fi V3", "Street Sport", True),
    ("2W", "Yamaha", "FZ-S Fi V4", "Street Sport", True),
    ("2W", "Yamaha", "FZ-S Fi V3", "Street Sport", True),
    ("2W", "Yamaha", "FZ-Fi V2", "Street Sport", False),
    ("2W", "Yamaha", "FZ 25", "Naked Sport", False),
    ("2W", "Yamaha", "FZS 25", "Naked Sport", False),
    ("2W", "Yamaha", "FZ-X", "Neo Retro Commuter", True),
    ("2W", "Yamaha", "RayZR 125 Fi", "Sporty Scooter", True),
    ("2W", "Yamaha", "RayZR Street Rally", "Sporty Scooter", False),
    ("2W", "Yamaha", "Fascino 125 Fi", "Classic Scooter", True),
    ("2W", "Yamaha", "Aerox 155", "Maxi Scooter", True),
    ("2W", "Yamaha", "Saluto 125", "Commuter Motorcycle", False),
    ("2W", "Yamaha", "Saluto RX", "Commuter Motorcycle", False),
    ("2W", "Yamaha", "SZ-RR", "Commuter Motorcycle", False),
    ("2W", "Yamaha", "RX 100", "Classic 2-Stroke Motorcycle", True),
    ("2W", "Yamaha", "RX 135", "Classic 2-Stroke Motorcycle", False),
    ("2W", "Yamaha", "Alpha", "Scooter", False),
    ("2W", "Yamaha", "Ray Z", "Scooter", False),

    # Suzuki 2Wheelers
    ("2W", "Suzuki 2Wheelers", "Access 125", "Scooter", True),
    ("2W", "Suzuki 2Wheelers", "Access 125 Special Edition", "Scooter", True),
    ("2W", "Suzuki 2Wheelers", "Burgman Street 125", "Maxi Scooter", True),
    ("2W", "Suzuki 2Wheelers", "Burgman Street EX", "Maxi Scooter", True),
    ("2W", "Suzuki 2Wheelers", "Avenis 125", "Sporty Scooter", True),
    ("2W", "Suzuki 2Wheelers", "Gixxer 150", "Street Sport", True),
    ("2W", "Suzuki 2Wheelers", "Gixxer SF 150", "Faired Sport", True),
    ("2W", "Suzuki 2Wheelers", "Gixxer 250", "Street Sport", False),
    ("2W", "Suzuki 2Wheelers", "Gixxer SF 250", "Faired Sport", False),
    ("2W", "Suzuki 2Wheelers", "V-Strom SX 250", "Adventure Tourer", True),
    ("2W", "Suzuki 2Wheelers", "Intruder 150", "Cruiser", False),
    ("2W", "Suzuki 2Wheelers", "Hayate", "Commuter Motorcycle", False),
    ("2W", "Suzuki 2Wheelers", "Slingshot", "Commuter Motorcycle", False),
    ("2W", "Suzuki 2Wheelers", "Swish 125", "Scooter", False),
    ("2W", "Suzuki 2Wheelers", "Lets", "Scooter", False),
    ("2W", "Suzuki 2Wheelers", "Hayabusa", "Superbike", False),

    # KTM
    ("2W", "KTM", "200 Duke", "Naked Sport", True),
    ("2W", "KTM", "250 Duke", "Naked Sport", True),
    ("2W", "KTM", "390 Duke", "Naked Sport", True),
    ("2W", "KTM", "125 Duke", "Naked Sport", True),
    ("2W", "KTM", "RC 200", "Super Sport", True),
    ("2W", "KTM", "RC 390", "Super Sport", True),
    ("2W", "KTM", "RC 125", "Super Sport", False),
    ("2W", "KTM", "250 Adventure", "Adventure Motorcycle", True),
    ("2W", "KTM", "390 Adventure", "Adventure Motorcycle", True),
    ("2W", "KTM", "390 Adventure X", "Adventure Motorcycle", True),

    # Jawa & Yezdi
    ("2W", "Jawa", "Jawa 350", "Classic Cruiser", True),
    ("2W", "Jawa", "Jawa 42", "Modern Classic", True),
    ("2W", "Jawa", "42 Bobber", "Bobber Cruiser", True),
    ("2W", "Jawa", "Perak", "Bobber", True),
    ("2W", "Yezdi", "Roadster", "Roadster", True),
    ("2W", "Yezdi", "Scrambler", "Scrambler", True),
    ("2W", "Yezdi", "Adventure", "Adventure Tourer", True),

    # Triumph (Bajaj-Triumph)
    ("2W", "Triumph", "Speed 400", "Modern Classic Roadster", True),
    ("2W", "Triumph", "Scrambler 400 X", "Scrambler", True),
    ("2W", "Triumph", "Speed T4", "Modern Classic", True),
    ("2W", "Triumph", "Trident 660", "Naked Roadster", False),
    ("2W", "Triumph", "Tiger Sport 660", "Adventure Sport", False),
    ("2W", "Triumph", "Bonneville T100", "Modern Classic", False),
    ("2W", "Triumph", "Bonneville T120", "Modern Classic", False),
    ("2W", "Triumph", "Street Triple 765", "Super Naked", False),

    # Harley-Davidson (Hero-HD)
    ("2W", "Harley-Davidson", "X440", "Modern Roadster", True),
    ("2W", "Harley-Davidson", "Nightster", "Cruiser", False),
    ("2W", "Harley-Davidson", "Sportster S", "Power Cruiser", False),
    ("2W", "Harley-Davidson", "Fat Boy", "Cruiser", False),
    ("2W", "Harley-Davidson", "Street 750", "Cruiser", False),
    ("2W", "Harley-Davidson", "Iron 883", "Cruiser", False),

    # Ather Energy
    ("2W", "Ather Energy", "450X", "Electric Scooter", True),
    ("2W", "Ather Energy", "450S", "Electric Scooter", True),
    ("2W", "Ather Energy", "Rizta", "Family Electric Scooter", True),
    ("2W", "Ather Energy", "450 Plus", "Electric Scooter", False),
    ("2W", "Ather Energy", "450 Apex", "Performance Electric Scooter", False),

    # Ola Electric
    ("2W", "Ola Electric", "S1 Pro Gen 2", "Electric Scooter", True),
    ("2W", "Ola Electric", "S1 Pro Gen 1", "Electric Scooter", True),
    ("2W", "Ola Electric", "S1 Air", "Electric Scooter", True),
    ("2W", "Ola Electric", "S1 X", "Electric Scooter", True),
    ("2W", "Ola Electric", "S1 X+", "Electric Scooter", True),
    ("2W", "Ola Electric", "S1", "Electric Scooter", True),
    ("2W", "Ola Electric", "Roadster", "Electric Motorcycle", False),

    # EV Two-Wheeler Brands
    ("2W", "Revolt", "RV400", "Electric Motorcycle", True),
    ("2W", "Revolt", "RV400 BRZ", "Electric Motorcycle", False),
    ("2W", "Revolt", "RV1", "Electric Motorcycle", True),
    ("2W", "Revolt", "RV1+", "Electric Motorcycle", True),
    ("2W", "Ampere", "Magnus EX", "Electric Scooter", True),
    ("2W", "Ampere", "Nexus", "Electric Scooter", True),
    ("2W", "Ampere", "Reo Plus", "Electric Scooter", False),
    ("2W", "Ampere", "Primus", "Electric Scooter", False),
    ("2W", "Okinawa", "Praise Pro", "Electric Scooter", True),
    ("2W", "Okinawa", "Ridge Plus", "Electric Scooter", False),
    ("2W", "Okinawa", "Okhi-90", "Electric Scooter", False),
    ("2W", "Okinawa", "Dual", "Electric Commercial Scooter", False),
    ("2W", "Hero Electric", "Optima CX", "Electric Scooter", True),
    ("2W", "Hero Electric", "Flash", "Electric Scooter", False),
    ("2W", "Hero Electric", "Photon", "Electric Scooter", False),
    ("2W", "Hero Electric", "NYX", "Electric Commercial Scooter", False),
    ("2W", "Pure EV", "ePluto 7G", "Electric Scooter", True),
    ("2W", "Pure EV", "ecoDryft", "Electric Motorcycle", True),
    ("2W", "Simple Energy", "Simple One", "Electric Scooter", True),
    ("2W", "Simple Energy", "Simple Dot One", "Electric Scooter", False),
    ("2W", "River", "Indie", "SUV of Electric Scooters", True),
    ("2W", "Ultraviolette", "F77 Mach 2", "Electric Performance Motorcycle", True),
    ("2W", "Tork Motors", "Kratos R", "Electric Motorcycle", False),
    ("2W", "BGauss", "C12i", "Electric Scooter", True),
    ("2W", "BGauss", "RUV350", "Electric Scooter", False),
    ("2W", "Kinetic Green", "E-Luna", "Electric Moped", True),

    # Aprilia & Vespa
    ("2W", "Aprilia", "SR 125", "Sport Scooter", True),
    ("2W", "Aprilia", "SR 160", "Sport Scooter", True),
    ("2W", "Aprilia", "Storm 125", "Sport Scooter", False),
    ("2W", "Aprilia", "SXR 125", "Maxi Scooter", False),
    ("2W", "Aprilia", "SXR 160", "Maxi Scooter", True),
    ("2W", "Aprilia", "RS 457", "Super Sport Bike", True),
    ("2W", "Vespa", "VXL 125", "Classic Scooter", True),
    ("2W", "Vespa", "VXL 150", "Classic Scooter", True),
    ("2W", "Vespa", "SXL 125", "Classic Scooter", True),
    ("2W", "Vespa", "SXL 150", "Classic Scooter", True),
    ("2W", "Vespa", "ZX 125", "Classic Scooter", False),
    ("2W", "Vespa", "Elegante 150", "Luxury Scooter", False),

    # Kawasaki & BMW Motorrad & Benelli
    ("2W", "Kawasaki", "Ninja 300", "Sports Bike", True),
    ("2W", "Kawasaki", "Ninja 400", "Sports Bike", False),
    ("2W", "Kawasaki", "Ninja 500", "Sports Bike", False),
    ("2W", "Kawasaki", "Ninja 650", "Sports Tourer", False),
    ("2W", "Kawasaki", "Ninja ZX-4R", "Inline-4 Sports Bike", False),
    ("2W", "Kawasaki", "Ninja ZX-6R", "Super Sport", False),
    ("2W", "Kawasaki", "Ninja ZX-10R", "Superbike", False),
    ("2W", "Kawasaki", "Z650", "Naked Sport", False),
    ("2W", "Kawasaki", "Z900", "Super Naked", True),
    ("2W", "Kawasaki", "Versys 650", "Adventure Tourer", False),
    ("2W", "Kawasaki", "W175", "Retro Classic", False),

    ("2W", "BMW Motorrad", "G 310 R", "Naked Roadster", True),
    ("2W", "BMW Motorrad", "G 310 GS", "Adventure Tourer", True),
    ("2W", "BMW Motorrad", "G 310 RR", "Super Sport", True),
    ("2W", "BMW Motorrad", "F 900 XR", "Adventure Sport", False),
    ("2W", "BMW Motorrad", "R 1250 GS", "Flagship Adventure", False),
    ("2W", "BMW Motorrad", "R 1300 GS", "Flagship Adventure", False),
    ("2W", "BMW Motorrad", "S 1000 RR", "Superbike", False),

    ("2W", "Benelli", "Imperiale 400", "Classic Cruiser", True),
    ("2W", "Benelli", "TRK 502", "Adventure Tourer", True),
    ("2W", "Benelli", "TRK 502X", "Adventure Tourer", False),
    ("2W", "Benelli", "Leoncino 500", "Scrambler", False),
    ("2W", "Benelli", "502C", "Urban Cruiser", False),

    # =========================================================================
    # COMMERCIAL VEHICLES (CW)
    # =========================================================================
    # Tata Motors Commercial
    ("CW", "Tata Motors Commercial", "Ace Gold Petrol", "Small Commercial Vehicle", True),
    ("CW", "Tata Motors Commercial", "Ace Gold Diesel", "Small Commercial Vehicle", True),
    ("CW", "Tata Motors Commercial", "Ace Gold CNG", "Small Commercial Vehicle", True),
    ("CW", "Tata Motors Commercial", "Ace EV", "Electric Mini Truck", True),
    ("CW", "Tata Motors Commercial", "Ace HT", "Mini Truck", True),
    ("CW", "Tata Motors Commercial", "Ace Mega", "Mini Truck", True),
    ("CW", "Tata Motors Commercial", "Ace Zip", "Micro Truck", False),
    ("CW", "Tata Motors Commercial", "Super Ace", "Pickup Truck", False),
    ("CW", "Tata Motors Commercial", "Intra V10", "Pickup Truck", True),
    ("CW", "Tata Motors Commercial", "Intra V20", "Pickup Truck", False),
    ("CW", "Tata Motors Commercial", "Intra V30", "Pickup Truck", True),
    ("CW", "Tata Motors Commercial", "Intra V50", "Heavy Pickup Truck", True),
    ("CW", "Tata Motors Commercial", "Intra V70", "Heavy Pickup Truck", True),
    ("CW", "Tata Motors Commercial", "Yodha Pickup", "Heavy Duty Pickup", True),
    ("CW", "Tata Motors Commercial", "Yodha 2.0", "Heavy Duty Pickup", True),
    ("CW", "Tata Motors Commercial", "207 DI", "Pickup Truck", True),
    ("CW", "Tata Motors Commercial", "Xenon", "Pickup Truck", False),
    ("CW", "Tata Motors Commercial", "Magic", "Passenger Van", True),
    ("CW", "Tata Motors Commercial", "Magic Express", "Passenger Van", True),
    ("CW", "Tata Motors Commercial", "Magic Mantra", "Passenger Van", False),
    ("CW", "Tata Motors Commercial", "Winger", "Maxi Cab / Ambulance", True),
    ("CW", "Tata Motors Commercial", "Winger Cargo", "Cargo Delivery Van", True),
    ("CW", "Tata Motors Commercial", "Winger Ambulance", "Patient Transport", True),
    ("CW", "Tata Motors Commercial", "407 Gold SFC", "Light Commercial Truck", True),
    ("CW", "Tata Motors Commercial", "510 SFC", "Light Truck", False),
    ("CW", "Tata Motors Commercial", "610 SFC", "Light Commercial Truck", True),
    ("CW", "Tata Motors Commercial", "709g LPT", "Medium Commercial Truck", True),
    ("CW", "Tata Motors Commercial", "710 LPT", "Medium Truck", False),
    ("CW", "Tata Motors Commercial", "912 LPT", "Medium Commercial Truck", True),
    ("CW", "Tata Motors Commercial", "1109g LPT", "Intermediate Truck", True),
    ("CW", "Tata Motors Commercial", "1212 LPT", "Intermediate Truck", True),
    ("CW", "Tata Motors Commercial", "1412 LPT", "Intermediate Truck", True),
    ("CW", "Tata Motors Commercial", "1512 LPT", "Intermediate Truck", True),
    ("CW", "Tata Motors Commercial", "Ultra T.7", "ICV Truck", True),
    ("CW", "Tata Motors Commercial", "Ultra T.9", "ICV Truck", False),
    ("CW", "Tata Motors Commercial", "Ultra T.12", "Medium Truck", True),
    ("CW", "Tata Motors Commercial", "Ultra T.16", "Heavy Truck", False),
    ("CW", "Tata Motors Commercial", "Ultra T.19", "Multi-Axle Truck", True),
    ("CW", "Tata Motors Commercial", "Signa 1923.K", "Heavy Tipper Truck", True),
    ("CW", "Tata Motors Commercial", "Signa 2823.K", "Heavy Tipper Truck", True),
    ("CW", "Tata Motors Commercial", "Signa 2825.K", "Mining Tipper", True),
    ("CW", "Tata Motors Commercial", "Signa 3523.TK", "Heavy Tipper", True),
    ("CW", "Tata Motors Commercial", "Signa 3525.K", "Multi-Axle Tipper", True),
    ("CW", "Tata Motors Commercial", "Signa 4018.S", "Tractor Trailer", False),
    ("CW", "Tata Motors Commercial", "Signa 4225.T", "Multi-Axle Haulage", True),
    ("CW", "Tata Motors Commercial", "Signa 4825.TK", "Heavy Haulage Truck", True),
    ("CW", "Tata Motors Commercial", "Signa 5530.S", "Heavy Tractor Trailer", True),
    ("CW", "Tata Motors Commercial", "Prima 2830.K", "Premium Tipper", False),
    ("CW", "Tata Motors Commercial", "Prima 3530.K", "Heavy Mining Tipper", True),
    ("CW", "Tata Motors Commercial", "Prima 5530.S", "Heavy Puller", False),
    ("CW", "Tata Motors Commercial", "LPT 1613", "Medium Haulage Truck", True),
    ("CW", "Tata Motors Commercial", "LPT 2518", "Multi-Axle Truck", True),
    ("CW", "Tata Motors Commercial", "LPT 3118", "Heavy Multi-Axle", True),
    ("CW", "Tata Motors Commercial", "Starbus", "School / Staff Bus", True),
    ("CW", "Tata Motors Commercial", "Starbus Ultra", "Commercial Passenger Bus", True),
    ("CW", "Tata Motors Commercial", "CityRide", "City Bus", False),
    ("CW", "Tata Motors Commercial", "Magna", "Intercity Luxury Coach", False),

    # Ashok Leyland
    ("CW", "Ashok Leyland", "Bada Dost i1", "Pickup Truck", True),
    ("CW", "Ashok Leyland", "Bada Dost i2", "Pickup Truck", True),
    ("CW", "Ashok Leyland", "Bada Dost i3", "Pickup Truck", True),
    ("CW", "Ashok Leyland", "Bada Dost i4", "Heavy Pickup Truck", True),
    ("CW", "Ashok Leyland", "Bada Dost i5", "Heavy Pickup Truck", True),
    ("CW", "Ashok Leyland", "Dost Strong", "Light Commercial Vehicle", True),
    ("CW", "Ashok Leyland", "Dost+", "Light Commercial Vehicle", True),
    ("CW", "Ashok Leyland", "Dost Lite", "Light Commercial Vehicle", True),
    ("CW", "Ashok Leyland", "Saathi", "Entry SCV Mini Truck", True),
    ("CW", "Ashok Leyland", "Partner 4 Tyre", "Light Commercial Truck", True),
    ("CW", "Ashok Leyland", "Partner 6 Tyre", "Intermediate Truck", True),
    ("CW", "Ashok Leyland", "Guru", "Intermediate Commercial Truck", False),
    ("CW", "Ashok Leyland", "Boss 1115", "ICV Truck", True),
    ("CW", "Ashok Leyland", "Boss 1215", "ICV Truck", True),
    ("CW", "Ashok Leyland", "Boss 1315", "ICV Truck", False),
    ("CW", "Ashok Leyland", "Boss 1415", "ICV Truck", True),
    ("CW", "Ashok Leyland", "Boss 1920", "Haulage Truck", True),
    ("CW", "Ashok Leyland", "Ecomet 1015", "Intermediate Truck", False),
    ("CW", "Ashok Leyland", "Ecomet 1115", "Medium Commercial Truck", True),
    ("CW", "Ashok Leyland", "Ecomet 1215", "Medium Truck", True),
    ("CW", "Ashok Leyland", "Ecomet 1415", "Medium Truck", True),
    ("CW", "Ashok Leyland", "Ecomet 1615", "Medium Haulage", True),
    ("CW", "Ashok Leyland", "Ecomet Star", "Medium Commercial Truck", True),
    ("CW", "Ashok Leyland", "AVTR 1920", "Multi-Axle Truck", True),
    ("CW", "Ashok Leyland", "AVTR 2620", "Multi-Axle Haulage", False),
    ("CW", "Ashok Leyland", "AVTR 2820", "Heavy Haulage Truck", True),
    ("CW", "Ashok Leyland", "AVTR 3120", "Heavy Haulage Truck", True),
    ("CW", "Ashok Leyland", "AVTR 3520", "Heavy Multi-Axle", True),
    ("CW", "Ashok Leyland", "AVTR 4220", "Multi-Axle Haulage", True),
    ("CW", "Ashok Leyland", "AVTR 4825", "Heavy Haulage Truck", True),
    ("CW", "Ashok Leyland", "AVTR 5525", "Tractor Trailer", True),
    ("CW", "Ashok Leyland", "2820 Tipper", "Construction Tipper", True),
    ("CW", "Ashok Leyland", "2825 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Ashok Leyland", "3525 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Ashok Leyland", "3528 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Ashok Leyland", "4228 Tipper", "Multi-Axle Tipper", True),
    ("CW", "Ashok Leyland", "5525 Tractor", "Prime Mover", False),
    ("CW", "Ashok Leyland", "MiTR Bus", "School / Staff Bus", True),
    ("CW", "Ashok Leyland", "Viking Bus", "Passenger Route Bus", True),
    ("CW", "Ashok Leyland", "Cheetah Bus", "Intercity Bus", False),
    ("CW", "Ashok Leyland", "Oyster Bus", "Luxury Staff Bus", True),
    ("CW", "Ashok Leyland", "Sunshine Bus", "School Bus", False),
    ("CW", "Ashok Leyland", "Lynx Smart Bus", "Passenger Carrier", False),

    # Mahindra Commercial
    ("CW", "Mahindra Commercial", "Bolero Pik-Up ExtraLong", "Pickup Truck", True),
    ("CW", "Mahindra Commercial", "Bolero Pik-Up ExtraStrong", "Heavy Duty Pickup", True),
    ("CW", "Mahindra Commercial", "Bolero Maxi Truck Plus", "Pickup Truck", True),
    ("CW", "Mahindra Commercial", "Bolero Camper", "Double Cab Pickup", True),
    ("CW", "Mahindra Commercial", "Bolero Maxx Pik-Up HD", "Heavy Duty Pickup", True),
    ("CW", "Mahindra Commercial", "Bolero Maxx Pik-Up City", "City Pickup", True),
    ("CW", "Mahindra Commercial", "Bolero Maxx City 3000", "City Pickup", False),
    ("CW", "Mahindra Commercial", "Bolero Maxx HD 2.0L", "Heavy Duty Pickup", True),
    ("CW", "Mahindra Commercial", "Bolero Maxx HD 1.7L", "Pickup Truck", True),
    ("CW", "Mahindra Commercial", "Bolero Maxx HD 1.3L", "Pickup Truck", False),
    ("CW", "Mahindra Commercial", "Supro Profit Truck Mini", "Mini Truck", True),
    ("CW", "Mahindra Commercial", "Supro Profit Truck Maxi", "Small Truck", True),
    ("CW", "Mahindra Commercial", "Supro Van", "Passenger Carrier", True),
    ("CW", "Mahindra Commercial", "Supro Maxi Cab", "Maxi Cab", False),
    ("CW", "Mahindra Commercial", "Jeeto", "Micro Truck", True),
    ("CW", "Mahindra Commercial", "Jeeto Plus", "Mini Truck", True),
    ("CW", "Mahindra Commercial", "Jeeto Strong", "Mini Truck", True),
    ("CW", "Mahindra Commercial", "Gio", "Micro Truck", False),
    ("CW", "Mahindra Commercial", "Genio", "Pickup Truck", False),
    ("CW", "Mahindra Commercial", "Imperio", "Premium Pickup", False),
    ("CW", "Mahindra Commercial", "Furio 7", "Light Commercial Truck", True),
    ("CW", "Mahindra Commercial", "Furio 11", "Medium Commercial Truck", True),
    ("CW", "Mahindra Commercial", "Furio 12", "Medium Truck", False),
    ("CW", "Mahindra Commercial", "Furio 14", "Intermediate Truck", True),
    ("CW", "Mahindra Commercial", "Furio 16", "Intermediate Truck", False),
    ("CW", "Mahindra Commercial", "Furio 17", "Intermediate Truck", False),
    ("CW", "Mahindra Commercial", "Blazo X 28", "Heavy Tipper", True),
    ("CW", "Mahindra Commercial", "Blazo X 35", "Heavy Tipper", True),
    ("CW", "Mahindra Commercial", "Blazo X 42", "Heavy Haulage Truck", True),
    ("CW", "Mahindra Commercial", "Blazo X 49", "Multi-Axle Truck", False),
    ("CW", "Mahindra Commercial", "Blazo X 55", "Tractor Trailer", True),
    ("CW", "Mahindra Commercial", "Tourister Bus", "School / Staff Bus", False),
    ("CW", "Mahindra Commercial", "Cruzio Bus", "Commercial Passenger Bus", True),
    ("CW", "Mahindra Commercial", "Alfa Auto", "3-Wheeler Passenger", True),
    ("CW", "Mahindra Commercial", "Alfa Load", "3-Wheeler Cargo", True),
    ("CW", "Mahindra Commercial", "Alfa DX", "3-Wheeler Passenger Auto", True),
    ("CW", "Mahindra Commercial", "Alfa Plus", "3-Wheeler Cargo", False),
    ("CW", "Mahindra Commercial", "Treo", "Electric Auto Rickshaw", True),
    ("CW", "Mahindra Commercial", "Treo Zor", "Electric Cargo 3-Wheeler", True),
    ("CW", "Mahindra Commercial", "Zor Grand", "Electric Cargo 3-Wheeler", True),

    # Maruti Suzuki Commercial
    ("CW", "Maruti Suzuki Commercial", "Super Carry", "Mini Truck (Petrol / CNG)", True),
    ("CW", "Maruti Suzuki Commercial", "Eeco Cargo", "Delivery Van", True),
    ("CW", "Maruti Suzuki Commercial", "Tour S", "Commercial Sedan (Dzire Tour)", True),
    ("CW", "Maruti Suzuki Commercial", "Tour M", "Commercial MPV (Ertiga Tour)", True),
    ("CW", "Maruti Suzuki Commercial", "Tour H1", "Commercial Hatchback (Alto Tour)", True),
    ("CW", "Maruti Suzuki Commercial", "Tour H3", "Commercial Hatchback (Wagon R Tour)", True),
    ("CW", "Maruti Suzuki Commercial", "Tour V", "Commercial Van (Eeco Tour)", True),

    # Eicher Motors (VECV)
    ("CW", "Eicher Motors", "Pro 2049", "Light Commercial Truck", True),
    ("CW", "Eicher Motors", "Pro 2055", "Light Truck", False),
    ("CW", "Eicher Motors", "Pro 2059", "Light Truck", True),
    ("CW", "Eicher Motors", "Pro 2075", "Light Commercial Truck", False),
    ("CW", "Eicher Motors", "Pro 2080", "Light Truck", True),
    ("CW", "Eicher Motors", "Pro 2095", "Medium Commercial Truck", True),
    ("CW", "Eicher Motors", "Pro 2110", "Intermediate Truck", True),
    ("CW", "Eicher Motors", "Pro 2114", "Intermediate Truck", False),
    ("CW", "Eicher Motors", "Pro 3015", "Medium Haulage Truck", True),
    ("CW", "Eicher Motors", "Pro 3019", "Heavy Commercial Truck", True),
    ("CW", "Eicher Motors", "Pro 6019", "Multi-Axle Truck", True),
    ("CW", "Eicher Motors", "Pro 6028", "Heavy Tipper", True),
    ("CW", "Eicher Motors", "Pro 6035", "Heavy Tipper", True),
    ("CW", "Eicher Motors", "Pro 6042", "Heavy Haulage Truck", True),
    ("CW", "Eicher Motors", "Pro 6048", "Multi-Axle Haulage", True),
    ("CW", "Eicher Motors", "Pro 6055", "Heavy Tractor Trailer", True),
    ("CW", "Eicher Motors", "Pro 8028 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Eicher Motors", "Pro 8035 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Eicher Motors", "Skyline Pro Bus", "Passenger Commercial Bus", True),
    ("CW", "Eicher Motors", "Starline Bus", "School / Route Bus", False),

    # BharatBenz
    ("CW", "BharatBenz", "1015R", "Light Truck", False),
    ("CW", "BharatBenz", "1215R", "Medium Commercial Truck", True),
    ("CW", "BharatBenz", "1217C Tipper", "Construction Tipper", True),
    ("CW", "BharatBenz", "1415R", "Medium Commercial Truck", False),
    ("CW", "BharatBenz", "1617R", "Medium Haulage Truck", True),
    ("CW", "BharatBenz", "1917R", "Heavy Haulage Truck", True),
    ("CW", "BharatBenz", "2623R", "Multi-Axle Truck", False),
    ("CW", "BharatBenz", "2823R", "Multi-Axle Haulage", True),
    ("CW", "BharatBenz", "2828CH Tipper", "Heavy Construction Tipper", True),
    ("CW", "BharatBenz", "3523R", "Multi-Axle Truck", False),
    ("CW", "BharatBenz", "3528R", "Heavy Haulage", True),
    ("CW", "BharatBenz", "3528C Tipper", "Heavy Mining Tipper", True),
    ("CW", "BharatBenz", "4023T", "Tractor Trailer", False),
    ("CW", "BharatBenz", "4228R", "Heavy Multi-Axle Haulage", True),
    ("CW", "BharatBenz", "5528T", "Heavy Tractor Trailer", True),
    ("CW", "BharatBenz", "1017 Bus", "Commercial Bus", False),
    ("CW", "BharatBenz", "1624 Bus", "Intercity Passenger Bus", True),

    # Force Motors Commercial
    ("CW", "Force Motors", "Traveller 2930", "Commercial Van", False),
    ("CW", "Force Motors", "Traveller 3050", "Commercial Passenger Van / Ambulance", True),
    ("CW", "Force Motors", "Traveller 3350", "Mini Bus", True),
    ("CW", "Force Motors", "Traveller 3700", "Passenger Bus", True),
    ("CW", "Force Motors", "Traveller 4020", "Large Passenger Bus", True),
    ("CW", "Force Motors", "Traveller Monobus", "Luxury Tourist Bus", False),
    ("CW", "Force Motors", "Traveller Delivery Van", "Cargo Van", True),
    ("CW", "Force Motors", "Traveller Ambulance", "Emergency Healthcare Vehicle", True),
    ("CW", "Force Motors", "Trax Cruiser", "Maxi Cab / Taxi", True),
    ("CW", "Force Motors", "Trax Toofan", "Rural Passenger Carrier", True),
    ("CW", "Force Motors", "Trax Kargo King", "Pickup Truck", True),
    ("CW", "Force Motors", "Urbania Short", "Luxury Passenger Van", True),
    ("CW", "Force Motors", "Urbania Medium", "Luxury Passenger Van", True),
    ("CW", "Force Motors", "Urbania Long", "Luxury Passenger Van", True),

    # Piaggio (3-Wheelers & SCV)
    ("CW", "Piaggio", "Ape Auto DX", "Auto Rickshaw (Passenger)", True),
    ("CW", "Piaggio", "Ape City", "Auto Rickshaw", True),
    ("CW", "Piaggio", "Ape City Plus", "Passenger Auto Rickshaw", True),
    ("CW", "Piaggio", "Ape Auto Plus", "Auto Rickshaw", False),
    ("CW", "Piaggio", "Ape Xtra LDX", "Cargo 3-Wheeler", True),
    ("CW", "Piaggio", "Ape Xtra LDX Plus", "Cargo 3-Wheeler", True),
    ("CW", "Piaggio", "Ape Xtra", "Cargo 3-Wheeler", True),
    ("CW", "Piaggio", "Ape E-City", "Electric Auto Rickshaw", True),
    ("CW", "Piaggio", "Ape E-City FX", "Electric Passenger Auto", False),
    ("CW", "Piaggio", "Ape E-Xtra", "Electric Cargo 3-Wheeler", True),
    ("CW", "Piaggio", "Ape E-Xtra FX", "Electric Cargo 3-Wheeler", False),
    ("CW", "Piaggio", "Porter 600", "Small Commercial Mini Truck", False),
    ("CW", "Piaggio", "Porter 1000", "Small Commercial Truck", False),

    # Bajaj Commercial (3-Wheelers & Quadricycle)
    ("CW", "Bajaj Commercial", "Compact RE", "Auto Rickshaw (Passenger)", True),
    ("CW", "Bajaj Commercial", "RE Optima", "Auto Rickshaw", True),
    ("CW", "Bajaj Commercial", "Maxima Z", "Passenger 3-Wheeler", True),
    ("CW", "Bajaj Commercial", "Maxima Passenger", "Passenger Auto", False),
    ("CW", "Bajaj Commercial", "Maxima C", "Cargo 3-Wheeler", True),
    ("CW", "Bajaj Commercial", "Maxima Cargo", "Heavy Cargo 3-Wheeler", True),
    ("CW", "Bajaj Commercial", "Maxima XL Cargo", "Heavy Cargo 3-Wheeler", False),
    ("CW", "Bajaj Commercial", "Qute", "Commercial Quadricycle", True),

    # Atul Auto
    ("CW", "Atul Auto", "Gem Paxx", "Passenger 3-Wheeler", True),
    ("CW", "Atul Auto", "Gem Cargo", "Cargo 3-Wheeler", True),
    ("CW", "Atul Auto", "Elite", "Electric Auto Rickshaw", False),
    ("CW", "Atul Auto", "Rik", "Auto Rickshaw", True),
    ("CW", "Atul Auto", "Shakti", "Cargo 3-Wheeler", False),

    # SML Isuzu
    ("CW", "SML Isuzu", "Sartaj 5252", "Light Truck", True),
    ("CW", "SML Isuzu", "Sartaj GS", "Light Commercial Truck", True),
    ("CW", "SML Isuzu", "Prestige", "Medium Commercial Truck", True),
    ("CW", "SML Isuzu", "Samrat GS", "Medium Commercial Truck", True),
    ("CW", "SML Isuzu", "Super", "Medium Truck", False),
    ("CW", "SML Isuzu", "Supreme", "Medium Truck", False),
    ("CW", "SML Isuzu", "SML Executive Bus", "Staff / Tourist Bus", True),
    ("CW", "SML Isuzu", "SML Hiroi Bus", "Passenger Bus", False),

    # Euler Motors, Altigreen, OSM
    ("CW", "Euler Motors", "HiLoad EV", "Electric Cargo 3-Wheeler", True),
    ("CW", "Euler Motors", "Storm EV", "Electric 4-Wheeler SCV", True),
    ("CW", "Altigreen", "neEV Cargo", "Electric Cargo 3-Wheeler", True),
    ("CW", "Altigreen", "neEV Low Deck", "Electric Cargo 3-Wheeler", False),
    ("CW", "Altigreen", "neEV High Deck", "Electric Cargo 3-Wheeler", False),
    ("CW", "Altigreen", "neEV Tez", "Fast Charging Electric 3-Wheeler", False),
    ("CW", "Omega Seiki Mobility", "Rage+", "Electric Cargo 3-Wheeler", True),
    ("CW", "Omega Seiki Mobility", "Stream", "Electric Passenger Auto", False),
    ("CW", "Omega Seiki Mobility", "M1KA", "Electric Small Commercial Truck", False),

    # Volvo Trucks & Scania
    ("CW", "Volvo Trucks", "FMX 460 Tipper", "Heavy Mining Tipper", True),
    ("CW", "Volvo Trucks", "FMX 500", "Heavy Mining Tipper", True),
    ("CW", "Volvo Trucks", "FM 420", "Heavy Haulage Tractor", True),
    ("CW", "Scania", "G410", "Heavy Mining Tipper", True),
    ("CW", "Scania", "R500", "Heavy Tractor Trailer", False),
]

def generate_typescript():
    total_entries = len(CATALOG_DATA)
    # Deduplicate entries by (category, make, model)
    seen = set()
    deduped = []
    for cat, make, model, btype, is_pop in CATALOG_DATA:
        key = (cat, make.lower().strip(), model.lower().strip())
        if key not in seen:
            seen.add(key)
            deduped.append((cat, make.strip(), model.strip(), btype.strip(), is_pop))

    print(f"Total raw: {total_entries}, Unique deduped: {len(deduped)}")

    # Group by category
    cats = {"4W": [], "2W": [], "CW": []}
    for item in deduped:
        cats[item[0]].append(item)

    print(f"4W Count: {len(cats['4W'])}, 2W Count: {len(cats['2W'])}, CW Count: {len(cats['CW'])}")

    ts_content = '''/**
 * Comprehensive Indian Vehicle Catalog (2W, 4W, CW)
 * Enforces standardized Make and Model dropdown selection across the CRM
 * to prevent manual typos and ensure uniform data for filtering and reporting.
 * Covers {total_count}+ vehicles across all Indian RTO / ARAI registered brands.
 */

export type VehicleCategory = "2W" | "4W" | "CW";

export type VehicleCatalogEntry = {{
  category: VehicleCategory;
  make: string;
  model: string;
  bodyType?: string;
  isPopular?: boolean;
}};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {{
  "2W": "Two-Wheeler (2W)",
  "4W": "Four-Wheeler (4W)",
  "CW": "Commercial Vehicle (CW)",
}};

/** Normalize various strings (e.g. "Two-Wheeler", "2W", "Car", "CV") to standard "2W" | "4W" | "CW" */
export function normalizeVehicleCategory(raw?: string | null): VehicleCategory | null {{
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  if (s === "2W" || s.includes("TWO") || s.includes("BIKE") || s.includes("SCOOTER") || s.includes("MOTORCYCLE")) {{
    return "2W";
  }}
  if (s === "4W" || s.includes("FOUR") || s.includes("CAR") || s.includes("PRIVATE")) {{
    return "4W";
  }}
  if (s === "CW" || s === "CV" || s.includes("COMMERCIAL") || s.includes("TRUCK") || s.includes("BUS")) {{
    return "CW";
  }}
  return null;
}}

/**
 * Standard Indian vehicle models catalog ({total_count}+ comprehensive models).
 * Sourced from ARAI, FADA, and Indian RTO market registrations.
 */
export const EMBEDDED_VEHICLE_CATALOG: VehicleCatalogEntry[] = [
'''.format(total_count=len(deduped))

    for cat_name, cat_label in [("4W", "FOUR-WHEELERS (4W)"), ("2W", "TWO-WHEELERS (2W)"), ("CW", "COMMERCIAL VEHICLES (CW)")]:
        ts_content += f"  // {'=' * 73}\n"
        ts_content += f"  // {cat_label}\n"
        ts_content += f"  // {'=' * 73}\n"

        # Group by make within category
        makes_dict = {}
        for c, make, model, btype, is_pop in cats[cat_name]:
            makes_dict.setdefault(make, []).append((model, btype, is_pop))

        for make, models in sorted(makes_dict.items(), key=lambda x: x[0]):
            ts_content += f"  // {make}\n"
            for model, btype, is_pop in models:
                pop_str = ", isPopular: true" if is_pop else ""
                btype_str = f', bodyType: "{btype}"' if btype else ""
                # Escape model and make if needed
                m_esc = model.replace('"', '\\"')
                mk_esc = make.replace('"', '\\"')
                ts_content += f'  {{ category: "{cat_name}", make: "{mk_esc}", model: "{m_esc}"{btype_str}{pop_str} }},\n'
            ts_content += "\n"

    ts_content += '''];

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
'''

    return ts_content, deduped

def generate_sql(deduped):
    sql = '''-- =====================================================================
-- Migration 0024: Comprehensive Vehicle Catalog for India (2W, 4W, CW)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('2W', '4W', 'CW')),
  make text NOT NULL,
  model text NOT NULL,
  body_type text,
  is_popular boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_catalog_cat_make_model UNIQUE (category, make, model)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_catalog_cat_make ON public.vehicle_catalog (category, make);
CREATE INDEX IF NOT EXISTS idx_vehicle_catalog_model ON public.vehicle_catalog (model);

-- Seed comprehensive vehicle catalog entries
INSERT INTO public.vehicle_catalog (category, make, model, body_type, is_popular, display_order)
VALUES
'''
    rows = []
    for i, (cat, make, model, btype, is_pop) in enumerate(deduped):
        mk = make.replace("'", "''")
        md = model.replace("'", "''")
        bt = btype.replace("'", "''")
        pop = "true" if is_pop else "false"
        order = 10 if is_pop else 100
        rows.append(f"  ('{cat}', '{mk}', '{md}', '{bt}', {pop}, {order})")

    sql += ",\n".join(rows)
    sql += "\nON CONFLICT (category, make, model) DO UPDATE SET\n"
    sql += "  body_type = EXCLUDED.body_type,\n"
    sql += "  is_popular = EXCLUDED.is_popular,\n"
    sql += "  display_order = EXCLUDED.display_order,\n"
    sql += "  is_active = true;\n"

    return sql

if __name__ == "__main__":
    ts, deduped = generate_typescript()

    base_dir = r"C:\Users\Mohit\Desktop\securedrive\crm"
    ts_path = os.path.join(base_dir, "lib", "vehicle-catalog.ts")
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"Written updated vehicle-catalog.ts to {ts_path}")

    sql = generate_sql(deduped)
    sql_path = os.path.join(base_dir, "supabase", "migrations", "0024_vehicle_catalog.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"Written updated migration SQL to {sql_path}")

    # Also sync to parent securedrive if needed
    parent_sql = r"C:\Users\Mohit\Desktop\securedrive\supabase\migrations\0024_vehicle_catalog.sql"
    if os.path.exists(os.path.dirname(parent_sql)):
        with open(parent_sql, "w", encoding="utf-8") as f:
            f.write(sql)
        print(f"Written updated migration SQL to {parent_sql}")
