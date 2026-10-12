export interface F1Car {
  id: string;
  brand: string;
  brandLogo: string;
  title: string;
  year: number;
  model: string;
  mileageKm: number;
  priceAed: number;
  priceKsh: number;
  priceUsd: number;
  isPriceOnRequest?: boolean;
  engine: string;
  power: string;
  acceleration: string;
  topSpeed: string;
  transmission: string;
  exteriorColor: string;
  interiorColor: string;
  status: 'Available' | 'Sold' | 'Reserved';
  images: string[];
  description: string;
  specs: {
    label: string;
    value: string;
  }[];
}

export const F1_BRANDS = [
  { name: 'MERCEDES-BENZ', logoText: 'MERCEDES-BENZ', country: 'Germany' },
  { name: 'PORSCHE', logoText: 'PORSCHE', country: 'Germany' },
  { name: 'BMW', logoText: 'BMW', country: 'Germany' },
  { name: 'RANGE ROVER', logoText: 'RANGE ROVER', country: 'UK' },
  { name: 'LEXUS', logoText: 'LEXUS', country: 'Japan' },
  { name: 'AUDI', logoText: 'AUDI', country: 'Germany' },
  { name: 'BENTLEY', logoText: 'BENTLEY', country: 'UK' },
  { name: 'ROLLS-ROYCE', logoText: 'ROLLS-ROYCE', country: 'UK' }
];

// Code-added cars removed per user request: only dealership-added luxury vehicles are displayed
export const F1_FEATURED_CARS: F1Car[] = [];

export const F1_NAVIGATION_CARDS = [
  {
    id: "available-cars",
    title: "Available Cars",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80",
    linkText: "Explore Exclusive Luxury Flagships"
  },
  {
    id: "sold-cars",
    title: "Sold Cars",
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80",
    linkText: "View Historic Hall of Fame"
  },
  {
    id: "compare-cars",
    title: "Compare Cars",
    image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80",
    linkText: "Side-by-side Telemetry & Specs"
  },
  {
    id: "shop-frames",
    title: "Shop Frames",
    image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80",
    linkText: "Custom Automotive Art & Plates"
  },
  {
    id: "car-specs",
    title: "Car Specs",
    image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
    linkText: "Full Powertrain & Dyno Sheets"
  },
  {
    id: "sell-my-car",
    title: "Sell My Car",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    linkText: "Instant High-Net-Worth Valuation"
  }
];
