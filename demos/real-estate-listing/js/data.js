/*
 * Harbor & Home Realty — SAMPLE LISTINGS (Portfolio Demo)
 * All agencies, properties, prices and IDs below are fictional.
 * Stored as a plain script (not JSON + fetch) so index.html works when
 * opened directly from disk (file://) on Windows.
 */
window.HH_LISTINGS = [
  {
    id: "HHR-QC-101",
    name: "Eastwood Skyline 1-Bedroom",
    type: "Condo",
    location: "Quezon City",
    area: "Eastwood City, Libis",
    price: 6850000,
    bedrooms: 1,
    bathrooms: 1,
    floorArea: 42,
    image: "assets/img/HHR-QC-101.svg",
    description:
      "A bright corner 1-bedroom on a high floor, steps from offices, cafés and the Eastwood mall strip. Ideal first home or rental investment.",
    features: ["Corner unit with city view", "Pool, gym and 24/7 security", "Walkable to BPO offices", "Turnover: semi-furnished"]
  },
  {
    id: "HHR-QC-102",
    name: "Maginhawa Garden House",
    type: "House",
    location: "Quezon City",
    area: "Teachers Village East",
    price: 18500000,
    bedrooms: 4,
    bathrooms: 3,
    floorArea: 220,
    image: "assets/img/HHR-QC-102.svg",
    description:
      "A two-storey family home on a quiet street near the Maginhawa food strip, with a small garden, covered carport and a ground-floor guest room.",
    features: ["Lot area 180 sqm", "2-car covered garage", "Ground-floor guest bedroom", "Near schools and UP Diliman"]
  },
  {
    id: "HHR-PSG-201",
    name: "Ortigas Center 2-Bedroom Residence",
    type: "Condo",
    location: "Pasig",
    area: "Ortigas Center",
    price: 9400000,
    bedrooms: 2,
    bathrooms: 2,
    floorArea: 68,
    image: "assets/img/HHR-PSG-201.svg",
    description:
      "A move-in-ready 2-bedroom with a balcony overlooking the Ortigas skyline, minutes from malls, offices and the MRT.",
    features: ["Private balcony", "One parking slot included", "Sky lounge and lap pool", "Pet-friendly building"]
  },
  {
    id: "HHR-PSG-202",
    name: "Kapitolyo Corner Townhouse",
    type: "Townhouse",
    location: "Pasig",
    area: "Kapitolyo",
    price: 14800000,
    bedrooms: 3,
    bathrooms: 3,
    floorArea: 150,
    image: "assets/img/HHR-PSG-202.svg",
    description:
      "A three-level end-unit townhouse in Kapitolyo's food-and-café district, with a roof deck and an extra window wall for natural light.",
    features: ["End unit, extra windows", "Roof deck", "1-car garage", "Gated 6-unit compound"]
  },
  {
    id: "HHR-TAG-301",
    name: "BGC High Street 2-Bedroom",
    type: "Condo",
    location: "Taguig",
    area: "Bonifacio Global City",
    price: 21500000,
    bedrooms: 2,
    bathrooms: 2,
    floorArea: 95,
    image: "assets/img/HHR-TAG-301.svg",
    description:
      "A fully fitted 2-bedroom in central BGC with an open kitchen, a study nook and views toward the park. Walk to High Street, schools and hospitals.",
    features: ["Fully furnished", "Study nook", "Two parking slots", "Concierge and function rooms"]
  },
  {
    id: "HHR-TAG-302",
    name: "McKinley Hill Family Home",
    type: "House",
    location: "Taguig",
    area: "McKinley Hill",
    price: 48000000,
    bedrooms: 4,
    bathrooms: 4,
    floorArea: 320,
    image: "assets/img/HHR-TAG-302.svg",
    description:
      "A modern single-detached home in a secure village, with high ceilings, a landscaped garden and a family room that opens to the lanai.",
    features: ["Lot area 300 sqm", "Maid's room with bath", "Garden and lanai", "Village clubhouse access"]
  }
];
