export type Transmission = 'Automatic' | 'Manual' | 'CVT' | 'Semi-Automatic' | 'Dual-Clutch' | 'Tiptronic';

export type FuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'Plug-in Hybrid' | 'CNG';

export type Condition = 'LOCALLY USED' | 'BRAND NEW' | 'FOREIGN USED';

export type BodyType = 'Pickup' | 'SUV' | 'Hatchback' | 'Sedan' | 'Minivan' | 'Station Wagon' | 'Coupe';

export interface Vehicle {
  id: string;
  title: string;
  make: string;
  brand?: string;
  model: string;
  year: number;
  engineCC?: number;
  bodyType?: BodyType;
  fuelType?: FuelType;
  transmission?: Transmission;
  condition?: Condition;
  priceKsh: number;
  featured?: boolean;
  mileageKm?: number;
  color?: string;
  drive?: '4WD' | 'AWD' | '2WD' | 'FWD' | 'RWD' | string;
  dutyPaid?: boolean;
  location?: string;
  image: string;
  images?: string[];
  additionalImages?: string[];
  features?: string[];
  description?: string;
  registrationNumber?: string;
  chassisNumber?: string;
  status?: 'available' | 'under_offer' | 'sold';
  isLuxury?: boolean;
  isArchived?: boolean;
  isCodeCar?: boolean;
  archivedAt?: string;
  updatedAt?: string;
  savedAt?: number;
}

export interface FilterState {
  searchQuery: string;
  brands: string[];
  transmissions: string[];
  fuelTypes: string[];
  condition: string;
  bodyTypes: string[];
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  sortBy: 'default' | 'price-asc' | 'price-desc' | 'year-desc' | 'year-asc';
}

export interface SparePart {
  id: string;
  name: string;
  category: string;
  priceKsh: number;
  compatibleModels: string;
  image: string;
  inStock: boolean;
}
