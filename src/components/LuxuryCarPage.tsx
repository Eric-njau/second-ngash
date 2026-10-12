import React, { useState, useMemo } from 'react';
import { 
  F1_BRANDS, 
  F1_NAVIGATION_CARDS, 
  F1Car 
} from '../data/f1rstMotorsData';
import { DEALER_INFO } from '../data/inventory';
import businessLogo from '../assets/images/business_logo.png';
import { NgangaExclusivesLogo } from './NgangaExclusivesLogo';
import { LuxuryCarDetailPage } from './LuxuryCarDetailPage';
import { 
  Menu as MenuIcon, 
  Search, 
  Sun, 
  Moon, 
  User, 
  X, 
  ArrowRight, 
  ArrowLeftRight, 
  ChevronLeft,
  ChevronRight, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  Youtube, 
  Linkedin, 
  Send, 
  ShieldCheck, 
  Gauge, 
  Zap, 
  CheckCircle2,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';

import { Vehicle } from '../types';

interface LuxuryCarPageProps {
  onReturnToMain: () => void;
  onNavigate?: (section: string) => void;
  customLuxuryVehicles?: Vehicle[];
}

export type Currency = 'KSH' | 'USD' | 'AED' | 'EUR';

/**
 * Converts a dynamic Vehicle instance marked with isLuxury into F1Car format
 * for seamless luxury atelier presentation.
 */
export function vehicleToF1Car(v: Vehicle): F1Car {
  const images = (v.images && v.images.length > 0) ? v.images : (v.image ? [v.image] : []);
  const ksh = v.priceKsh || 0;
  return {
    id: v.id,
    brand: (v.brand || v.make || 'EXCLUSIVE').toUpperCase(),
    brandLogo: '',
    title: v.title,
    year: v.year || new Date().getFullYear(),
    model: v.model || v.title,
    mileageKm: v.mileageKm || 0,
    priceKsh: ksh,
    priceAed: Math.round(ksh / 35.5),
    priceUsd: Math.round(ksh / 130),
    isPriceOnRequest: ksh === 0,
    engine: v.engineCC ? `${v.engineCC.toLocaleString()}cc ${v.fuelType || ''}`.trim() : (v.fuelType || 'High Performance Engine'),
    power: 'Executive Grade',
    acceleration: 'Sublime Performance',
    topSpeed: '250+ km/h',
    transmission: v.transmission || 'Automatic',
    exteriorColor: v.color || 'Prestige Finish',
    interiorColor: 'Exclusive Nappa Leather',
    status: v.status === 'sold' ? 'Sold' : 'Available',
    images: images.length > 0 ? images : ['/src/assets/images/car_prado_white_suv_front_three_quarter_showroom.png'],
    description: v.description || `${v.year} ${v.title}. Exclusive luxury edition directly verified from NG'ANG'A PREMIUM LUXURY Fleet.`,
    specs: [
      { label: 'Year', value: v.year ? v.year.toString() : '' },
      ...(v.engineCC ? [{ label: 'Engine Capacity', value: `${v.engineCC.toLocaleString()} CC` }] : []),
      ...(v.fuelType ? [{ label: 'Fuel Type', value: v.fuelType }] : []),
      ...(v.transmission ? [{ label: 'Transmission', value: v.transmission }] : []),
      ...(v.drive ? [{ label: 'Drivetrain', value: v.drive }] : []),
      ...(v.mileageKm ? [{ label: 'Mileage', value: `${v.mileageKm.toLocaleString()} KM` }] : []),
      ...(v.color ? [{ label: 'Exterior Color', value: v.color }] : []),
      ...(v.location ? [{ label: 'Showroom Location', value: v.location }] : []),
      ...(v.features && v.features.length > 0 ? [{ label: 'Key Features', value: v.features.join(', ') }] : [])
    ].filter(s => Boolean(s.value))
  };
}

export const LuxuryCarPage: React.FC<LuxuryCarPageProps> = ({ 
  onReturnToMain, 
  onNavigate,
  customLuxuryVehicles = []
}) => {
  // Navigation & UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState<F1Car | null>(null);
  const [activeCarPhotoIndex, setActiveCarPhotoIndex] = useState(0);
  const [currency, setCurrency] = useState<Currency>('KSH');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  // Premium luxury vehicles exclusively added from dealership inventory
  const allLuxuryCars: F1Car[] = useMemo(() => {
    return customLuxuryVehicles.map(vehicleToF1Car);
  }, [customLuxuryVehicles]);

  const flagshipCar: F1Car | null = allLuxuryCars[0] || null;

  const handlePrevCardImg = (e: React.MouseEvent, carId: string, total: number) => {
    e.stopPropagation();
    setCardImageIndices(prev => ({
      ...prev,
      [carId]: ((prev[carId] || 0) - 1 + total) % total
    }));
  };

  const handleNextCardImg = (e: React.MouseEvent, carId: string, total: number) => {
    e.stopPropagation();
    setCardImageIndices(prev => ({
      ...prev,
      [carId]: ((prev[carId] || 0) + 1) % total
    }));
  };

  // Compare Feature
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareCar1, setCompareCar1] = useState<F1Car | null>(() => allLuxuryCars[0] || null);
  const [compareCar2, setCompareCar2] = useState<F1Car | null>(() => allLuxuryCars[1] || allLuxuryCars[0] || null);

  // Keep compare cars in sync if vehicles change
  React.useEffect(() => {
    if (allLuxuryCars.length > 0) {
      setCompareCar1(prev => (prev && allLuxuryCars.find(c => c.id === prev.id)) || allLuxuryCars[0]);
      setCompareCar2(prev => (prev && allLuxuryCars.find(c => c.id === prev.id)) || allLuxuryCars[1] || allLuxuryCars[0]);
    } else {
      setCompareCar1(null);
      setCompareCar2(null);
    }
  }, [allLuxuryCars]);

  // Sell My Car Modal
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellSubmitted, setSellSubmitted] = useState(false);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  const handleNavToLegal = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new Event('popstate'));
      } catch {
        window.location.href = `/?page=${page}`;
      }
    }
  };

  // Currency exchange rates relative to KSH
  const rates: Record<Currency, { rate: number; prefix: string }> = {
    KSH: { rate: 1, prefix: 'KSh ' },
    USD: { rate: 130, prefix: '$' },
    AED: { rate: 35.5, prefix: 'AED ' },
    EUR: { rate: 142, prefix: '€' }
  };

  const formatPrice = (car: F1Car) => {
    if (car.isPriceOnRequest) {
      return 'Price on Request';
    }
    if (currency === 'KSH') {
      return `KSh ${car.priceKsh.toLocaleString('en-KE')}`;
    }
    if (currency === 'AED') {
      return `AED ${car.priceAed.toLocaleString('en-US')}`;
    }
    if (currency === 'USD') {
      return `$${car.priceUsd.toLocaleString('en-US')}`;
    }
    const val = Math.round(car.priceKsh / rates[currency].rate);
    return `${rates[currency].prefix}${val.toLocaleString('en-US')}`;
  };

  // Filtered cars for search modal
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allLuxuryCars;
    const q = searchQuery.toLowerCase();
    return allLuxuryCars.filter(c => 
      c.title.toLowerCase().includes(q) ||
      c.brand.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.year.toString().includes(q)
    );
  }, [searchQuery, allLuxuryCars]);

  const handleOpenWhatsApp = (car?: F1Car) => {
    const text = car
      ? `Hello Ng'ang'a Premium Luxury, I am inquiring about the ${car.brand} ${car.title} (${car.year}) listed on your showroom.`
      : `Hello Ng'ang'a Premium Luxury, I would like to speak to a VIP sales executive regarding your exclusive vehicle inventory.`;
    window.open(`https://wa.me/${DEALER_INFO.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  };

  React.useEffect(() => {
    document.title = "NG'ANG'A PREMIUM LUXURY | Executive & Luxury Cars Showroom Nairobi";
  }, []);

  if (selectedCar) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-[#0f1115] text-slate-100' : 'bg-white text-slate-900'} font-sans selection:bg-[#e50914] selection:text-white transition-colors duration-300`}>
        <LuxuryCarDetailPage
          car={selectedCar}
          allLuxuryCars={allLuxuryCars}
          currency={currency}
          onCurrencyChange={setCurrency}
          formatPrice={formatPrice}
          onBack={() => {
            setSelectedCar(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onCompare={(c) => {
            setCompareCar1(c);
            setIsCompareOpen(true);
          }}
          onSelectOtherCar={(c) => {
            setSelectedCar(c);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onReturnToMain={onReturnToMain}
          onNavigate={onNavigate}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />

        {/* MODAL 3: Compare Cars Modal */}
        {isCompareOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className={`${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} border border-slate-300 dark:border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl p-6 space-y-6 my-8`}>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                    TELEMETRY COMPARISON
                  </span>
                  <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white font-heading">
                    COMPARE EXCLUSIVE CARS
                  </h3>
                </div>
                <button
                  onClick={() => setIsCompareOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-[#e50914] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selectors & Comparison */}
              {compareCar1 && compareCar2 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">VEHICLE A</label>
                      <select
                        value={compareCar1.id}
                        onChange={e => {
                          const found = allLuxuryCars.find(c => c.id === e.target.value);
                          if (found) setCompareCar1(found);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {allLuxuryCars.map(c => (
                          <option key={c.id} value={c.id}>{c.brand} {c.title} ({c.year})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">VEHICLE B</label>
                      <select
                        value={compareCar2.id}
                        onChange={e => {
                          const found = allLuxuryCars.find(c => c.id === e.target.value);
                          if (found) setCompareCar2(found);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {allLuxuryCars.map(c => (
                          <option key={c.id} value={c.id}>{c.brand} {c.title} ({c.year})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Comparison Matrix */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                    <div className="grid grid-cols-3 p-3 bg-slate-50 dark:bg-slate-900 font-bold">
                      <span>METRIC</span>
                      <span className="text-[#e50914]">{compareCar1.title}</span>
                      <span className="text-blue-500">{compareCar2.title}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">Price</span>
                      <span className="font-bold">{formatPrice(compareCar1)}</span>
                      <span className="font-bold">{formatPrice(compareCar2)}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">Horsepower</span>
                      <span className="font-bold">{compareCar1.power}</span>
                      <span className="font-bold">{compareCar2.power}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">0-100 km/h</span>
                      <span className="font-bold">{compareCar1.acceleration}</span>
                      <span className="font-bold">{compareCar2.acceleration}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">Top Speed</span>
                      <span className="font-bold">{compareCar1.topSpeed}</span>
                      <span className="font-bold">{compareCar2.topSpeed}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">Engine</span>
                      <span className="font-bold">{compareCar1.engine}</span>
                      <span className="font-bold">{compareCar2.engine}</span>
                    </div>
                    <div className="grid grid-cols-3 p-3">
                      <span className="text-slate-500">Mileage</span>
                      <span className="font-bold">{compareCar1.mileageKm ? `${compareCar1.mileageKm.toLocaleString()} KM` : 'Unspecified'}</span>
                      <span className="font-bold">{compareCar2.mileageKm ? `${compareCar2.mileageKm.toLocaleString()} KM` : 'Unspecified'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <ArrowLeftRight className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-900 dark:text-white font-heading">Need At Least 2 Vehicles To Compare</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Mark luxury vehicles in the inventory management dashboard to compare executive specifications side-by-side.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0f1115] text-slate-100' : 'bg-white text-slate-900'} font-sans selection:bg-[#e50914] selection:text-white transition-colors duration-300`}>
      {/* Top Red Accent Border matching Screenshot 1 */}
      <div className="w-full h-1 bg-[#e50914]" />

      {/* 1. Header matching Screenshot 1 */}
      <header className={`sticky top-0 z-40 ${isDarkMode ? 'bg-[#12141a]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Left: MENU Button with hamburger icon */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase hover:text-[#e50914] transition cursor-pointer group"
              title="Open Navigation Menu"
            >
              <div className="space-y-1 w-5">
                <span className="block h-0.5 w-5 bg-current transition-transform group-hover:scale-x-110" />
                <span className="block h-0.5 w-4 bg-current transition-transform group-hover:w-5" />
                <span className="block h-0.5 w-5 bg-current transition-transform group-hover:scale-x-110" />
              </div>
              <span className="tracking-widest ml-1 font-semibold text-xs">MENU</span>
            </button>
          </div>

          {/* Center: Logo matching Screenshot (480) with red wedge apostrophes: NG'ANG'A PREMIUM LUXURY */}
          <div className="flex items-center justify-center cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex items-center gap-2 sm:gap-3 select-none">
              <img
                src={businessLogo}
                alt="NG'ANG'A PREMIUM LUXURY"
                className="h-7 sm:h-9 w-auto object-contain rounded-md shadow-xs hidden sm:block group-hover:scale-105 transition-transform"
              />
              <NgangaExclusivesLogo size="sm" isDark={isDarkMode} align="center" />
            </div>
          </div>

          {/* Right: Search, Theme Toggle, User, Currency */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Currency Selector */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold">
              {(['KSH', 'USD', 'AED', 'EUR'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                    currency === c 
                      ? 'bg-[#e50914] text-white font-bold shadow-xs' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#e50914]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-[#e50914] transition cursor-pointer"
              title="Search inventory"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </button>

            {/* Sun / Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-[#e50914] transition cursor-pointer"
              title="Toggle theme"
            >
              {isDarkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />}
            </button>

            {/* User Profile */}
            <button
              onClick={() => setIsSellModalOpen(true)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-[#e50914] transition cursor-pointer"
              title="VIP Client Desk"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </button>

            {/* Return to Main Dealership Link */}
            <button
              onClick={onReturnToMain}
              className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#e50914] transition cursor-pointer border-l border-slate-200 dark:border-slate-800 pl-3"
              title="Return to standard inventory"
            >
              <span>Main Showroom</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Executive Flagship Showcase) */}
      <section className="relative w-full h-[85vh] sm:h-[90vh] bg-black overflow-hidden flex items-end">
        {/* Flagship background image */}
        <img
          src={flagshipCar ? (flagshipCar.images[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=85') : 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=85'}
          alt={flagshipCar ? `${flagshipCar.brand} ${flagshipCar.title}` : "NG'ANG'A Premium Luxury Fleet"}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Bottom-Left Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 w-full">
          <div className="max-w-xl text-white">
            <span className="block text-xs sm:text-sm font-bold tracking-[0.25em] uppercase text-white/90 font-mono mb-2">
              {flagshipCar ? flagshipCar.brand : "NG'ANG'A EXCLUSIVES"}
            </span>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white font-heading leading-none">
              {flagshipCar ? flagshipCar.title : "PREMIUM LUXURY FLEET"}
            </h1>

            <span className="block text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mt-1 font-heading">
              {flagshipCar ? flagshipCar.year : "BYPASS KIAMBU ROAD"}
            </span>

            <div className="mt-6 sm:mt-8">
              {flagshipCar ? (
                <button
                  onClick={() => setSelectedCar(flagshipCar)}
                  className="bg-white hover:bg-slate-100 text-black font-extrabold text-xs uppercase tracking-wider px-7 py-3.5 rounded-full transition-all duration-200 shadow-xl cursor-pointer inline-flex items-center gap-2 group active:scale-95"
                >
                  <span>VIEW MORE</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    const el = document.getElementById('featured-luxury-stock');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-slate-100 text-black font-extrabold text-xs uppercase tracking-wider px-7 py-3.5 rounded-full transition-all duration-200 shadow-xl cursor-pointer inline-flex items-center gap-2 group active:scale-95"
                >
                  <span>EXPLORE FLEET</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Showroom Destination Story Section */}
      <section className="bg-[#0b0c10] text-white py-16 sm:py-24 border-t border-slate-900 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Red line + Destination label */}
              <div className="flex items-center gap-3">
                <span className="w-8 h-0.5 bg-[#e50914]" />
                <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.2em] text-slate-300 uppercase">
                  EAST AFRICA'S PREMIER LUXURY CAR DESTINATION
                </span>
              </div>

              {/* Bold Title matching Screenshot (480) */}
              <div className="py-2">
                <NgangaExclusivesLogo size="lg" isDark={true} align="left" />
              </div>

              {/* Paragraphs with red brand links */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
                Ng'ang'a Premium Luxury in Nairobi is recognized as the premier luxury car showroom in East Africa, offering an unrivaled collection of executive sedans, bespoke luxury SUVs, and prestigious automobiles. Our showroom features exclusive brands including{' '}
                <button onClick={() => { setSearchQuery('Mercedes-Benz'); setIsSearchOpen(true); }} className="text-[#e50914] font-semibold hover:underline cursor-pointer">Mercedes-Benz</button>,{' '}
                <button onClick={() => { setSearchQuery('Porsche'); setIsSearchOpen(true); }} className="text-[#e50914] font-semibold hover:underline cursor-pointer">Porsche</button>,{' '}
                <button onClick={() => { setSearchQuery('BMW'); setIsSearchOpen(true); }} className="text-[#e50914] font-semibold hover:underline cursor-pointer">BMW</button>,{' '}
                <button onClick={() => { setSearchQuery('Range Rover'); setIsSearchOpen(true); }} className="text-[#e50914] font-semibold hover:underline cursor-pointer">Range Rover</button>, and{' '}
                <button onClick={() => { setSearchQuery('Lexus'); setIsSearchOpen(true); }} className="text-[#e50914] font-semibold hover:underline cursor-pointer">Lexus</button>.
              </p>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-light">
                Renowned for discretion and excellence, Ng'ang'a Premium Luxury curates only the finest executive flagships and bespoke luxury vehicles, establishing Bypass Kiambu Road as the ultimate destination for discerning executives, VIPs, and collectors in search of the world's most distinguished automobiles.
              </p>

              {/* Three Metric Counters */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    No<span className="text-[#e50914]">.1</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-slate-400 uppercase mt-1">
                    SHOWROOM IN EAST AFRICA
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    500+
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-slate-400 uppercase mt-1">
                    VEHICLES DELIVERED
                  </div>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    Est. <span className="text-[#e50914]">2018</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-slate-400 uppercase mt-1">
                    BYPASS KIAMBU ROAD
                  </div>
                </div>
              </div>
            </div>

            {/* Right Luxury Flagship Column (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div 
                onClick={() => {
                  if (flagshipCar) setSelectedCar(flagshipCar);
                  else handleOpenWhatsApp();
                }}
                className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 group cursor-pointer"
              >
                <img
                  src={flagshipCar ? (flagshipCar.images[0] || 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80') : 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80'}
                  alt={flagshipCar ? `${flagshipCar.brand} Flagship` : 'Executive Luxury Flagship'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-bold tracking-widest uppercase">
                    {flagshipCar ? `${flagshipCar.brand} ${flagshipCar.title}` : "EXECUTIVE ATELIER"}
                  </span>
                  <span className="text-[#e50914] font-bold">
                    {flagshipCar ? (flagshipCar.model || 'BESPOKE LUXURY') : 'VERIFIED FLEET'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The World's Finest Brands Strip matching Screenshot 3 */}
      <section className={`${isDarkMode ? 'bg-[#0f1115] border-slate-800' : 'bg-white border-slate-100'} py-14 border-b transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered red line header matching Screenshot 3 */}
          <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold tracking-[0.25em] text-slate-400 uppercase mb-10">
            <span className="w-10 sm:w-16 h-0.5 bg-[#e50914]" />
            <span>THE WORLD'S FINEST BRANDS</span>
            <span className="w-10 sm:w-16 h-0.5 bg-[#e50914]" />
          </div>

          {/* Monochrome Logos Strip matching Screenshot 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 sm:gap-8 items-center justify-center text-center">
            {F1_BRANDS.slice(0, 8).map((b, idx) => (
              <div
                key={idx}
                className="p-3 grayscale hover:grayscale-0 hover:text-[#e50914] transition-all cursor-pointer group"
                onClick={() => {
                  setSearchQuery(b.name);
                  setIsSearchOpen(true);
                }}
              >
                <span className="text-xs sm:text-sm font-black tracking-widest uppercase font-mono block text-slate-500 group-hover:text-[#e50914] transition-colors">
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured Stock */}
      <section id="featured-luxury-stock" className={`${isDarkMode ? 'bg-[#14161d]' : 'bg-[#fafafa]'} py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
              FEATURED STOCK
            </h2>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                {allLuxuryCars.length} Exclusive Vehicle{allLuxuryCars.length === 1 ? '' : 's'} Available
              </span>
            </div>
          </div>

          {allLuxuryCars.length === 0 ? (
            <div className="text-center py-16 sm:py-24 px-6 bg-white dark:bg-[#1a1d26] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 text-[#e50914] flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
                Exclusive Luxury Fleet Updating
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                Our bespoke luxury fleet is currently being updated with verified executive acquisitions. Contact our showroom concierge for discreet private viewings or list your vehicle.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenWhatsApp()}
                  className="px-6 py-3 rounded-full bg-[#e50914] hover:bg-[#c20811] text-white text-xs font-bold font-mono uppercase tracking-wider transition shadow-md cursor-pointer inline-flex items-center gap-2 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contact Concierge</span>
                </button>
                <button
                  onClick={onReturnToMain}
                  className="px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer active:scale-95"
                >
                  <span>Browse Main Showroom</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {allLuxuryCars.map(car => {
                const currentImgIdx = cardImageIndices[car.id] || 0;
                const currentImg = car.images[currentImgIdx] || car.images[0];

                return (
                  <div
                    key={car.id}
                    className={`${
                      isDarkMode ? 'bg-[#1a1d26] border-slate-800' : 'bg-white border-slate-200/90'
                    } rounded-xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group select-none`}
                  >
                    {/* Image & Carousel Dots with Left/Right Scroll Buttons */}
                    <div 
                      className="relative aspect-[16/11] bg-slate-100 dark:bg-black overflow-hidden cursor-pointer"
                      onClick={() => {
                        setSelectedCar(car);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <img
                        src={currentImg}
                        alt={`${car.brand} ${car.title}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Left Image Scroll Button */}
                      {car.images.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handlePrevCardImg(e, car.id, car.images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#e50914] text-white flex items-center justify-center transition shadow-lg opacity-85 sm:opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Previous photo"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}

                      {/* Right Image Scroll Button */}
                      {car.images.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleNextCardImg(e, car.id, car.images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/75 hover:bg-[#e50914] text-white flex items-center justify-center transition shadow-lg opacity-85 sm:opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Next photo"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Photo Index Counter Badge */}
                      {car.images.length > 1 && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono text-white/95 backdrop-blur-xs z-10 pointer-events-none hidden sm:block">
                          {currentImgIdx + 1}/{car.images.length}
                        </div>
                      )}

                      {/* Carousel indicator dots */}
                      {car.images.length > 1 && (
                        <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
                          {car.images.slice(0, 5).map((_, dotIdx) => (
                            <span 
                              key={dotIdx}
                              className={`w-1.5 h-1.5 rounded-full transition-all shadow-xs ${
                                currentImgIdx === dotIdx ? 'bg-[#e50914] w-3' : 'bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Brand Name */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                          <span>{car.brand}</span>
                        </div>

                        {/* Title + Year */}
                        <h3 
                          onClick={() => setSelectedCar(car)}
                          className="text-lg font-black text-slate-900 dark:text-white font-heading hover:text-[#e50914] transition cursor-pointer mt-1"
                        >
                          {car.title} {car.year}
                        </h3>

                        {/* Mileage */}
                        <p className="text-xs text-slate-500 font-mono mt-2">
                          {car.mileageKm ? `${car.mileageKm.toLocaleString()} kilometers` : 'Mileage Unspecified'}
                        </p>
                      </div>

                      {/* Price & Compare Icon Bar */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white block">
                            {formatPrice(car)}
                          </span>
                        </div>

                        {/* Swap / Compare Two-Way Arrows */}
                        <button
                          onClick={() => {
                            setCompareCar1(car);
                            setIsCompareOpen(true);
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#e50914] transition cursor-pointer"
                          title="Compare with another car"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-[#e50914]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 6. Navigation / Category Tiles matching Screenshot 5 (6 Tall Cards) */}
      <section className={`${isDarkMode ? 'bg-[#0f1115]' : 'bg-white'} py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {F1_NAVIGATION_CARDS.map(tile => (
              <div
                key={tile.id}
                onClick={() => {
                  if (tile.id === 'compare-cars') setIsCompareOpen(true);
                  else if (tile.id === 'sell-my-car') setIsSellModalOpen(true);
                  else if (tile.id === 'available-cars') {
                    window.scrollTo({ top: 900, behavior: 'smooth' });
                  } else {
                    if (flagshipCar) setSelectedCar(flagshipCar);
                    else window.scrollTo({ top: 900, behavior: 'smooth' });
                  }
                }}
                className="relative aspect-[3/5] rounded-xl overflow-hidden shadow-md group cursor-pointer border border-slate-200 dark:border-slate-800"
              >
                {/* Background Image */}
                <img
                  src={tile.image}
                  alt={tile.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Card Title with Red Underline Bar matching Screenshot 5 */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col justify-end">
                  <h3 className="text-lg sm:text-xl font-black text-white font-heading uppercase leading-tight">
                    {tile.title}
                  </h3>

                  {/* Red bar underline */}
                  <span className="block w-8 h-1 bg-[#e50914] mt-2 mb-4" />

                  {/* Circle Button with arrow matching Screenshot 5 */}
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center self-end group-hover:bg-[#e50914] transition-colors">
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Feature Banner - "FRAME YOUR DRIVE IN STYLE" matching Screenshot 6 */}
      <section className={`${isDarkMode ? 'bg-[#0f1115]' : 'bg-[#fafafa]'} py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black text-white rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] items-center">
              {/* Left Content Column matching Screenshot 6 */}
              <div className="lg:col-span-6 p-8 sm:p-12 lg:p-16 space-y-5 z-10">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-0.5 bg-[#e50914]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                    THE FRAME COLLECTION
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white font-heading leading-tight">
                  FRAME YOUR DRIVE IN STYLE
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light max-w-md">
                  From rare finishes to custom designs, our frames are made for the elite who demand nothing but the best for their cars.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => handleOpenWhatsApp()}
                    className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest uppercase text-white hover:text-[#e50914] transition border-b-2 border-[#e50914] pb-1 cursor-pointer"
                  >
                    <span>SHOP FRAMES</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Artwork Gallery Column matching Screenshot 6 */}
              <div className="lg:col-span-6 relative h-64 lg:h-full overflow-hidden bg-slate-950 flex items-center justify-center p-6">
                <img
                  src={flagshipCar ? (flagshipCar.images[1] || flagshipCar.images[0]) : "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80"}
                  alt="Luxury Car Frame Artwork"
                  className="w-full h-full object-cover object-center rounded-xl filter contrast-125 brightness-90 shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Newsletter Section - "STAY AHEAD OF THE CURVE" matching Screenshot 7 */}
      <section className={`${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} py-20 border-b border-slate-200 dark:border-slate-800`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Newsletter Form Column matching Screenshot 7 */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-6 h-0.5 bg-[#e50914]" />
                <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
                  THE NEWSLETTER
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
                STAY AHEAD OF THE CURVE
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light max-w-xl">
                Stay up to date with the latest trends in luxury automobiles, exclusive brand features, and insider news from the world of high-end vehicles.
              </p>

              {newsletterSubmitted ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Thank you. You have been added to the private NG'ANG'A PREMIUM LUXURY dispatch.</span>
                </div>
              ) : (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newsletterEmail) return;
                    setNewsletterSubmitted(true);
                  }}
                  className="space-y-3 max-w-md"
                >
                  <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 pb-2 focus-within:border-black dark:focus-within:border-white transition">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={newsletterEmail}
                      onChange={e => setNewsletterEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none pr-10"
                    />
                    <button
                      type="submit"
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-[#e50914] hover:text-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase block">
                    CURATED STORIES ONLY — NO SPAM
                  </span>
                </form>
              )}
            </div>

            {/* Right Luxury Car Illustration */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                <img
                  src={flagshipCar ? (flagshipCar.images[2] || flagshipCar.images[0]) : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"}
                  alt="Executive Luxury Car"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer matching Screenshot 8 */}
      <footer className={`${isDarkMode ? 'bg-[#090b0e] text-slate-400' : 'bg-[#f4f5f7] text-slate-600'} pt-16 pb-12 border-t border-slate-200 dark:border-slate-800 transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200 dark:border-slate-800">
            {/* Col 1: Brand & Contact matching Screenshot 8 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3 tracking-tight">
                <img
                  src={businessLogo}
                  alt="NG'ANG'A PREMIUM LUXURY"
                  className="h-9 sm:h-10 w-auto object-contain rounded-md shadow-xs"
                />
                <NgangaExclusivesLogo size="md" isDark={isDarkMode} align="left" />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-light max-w-sm">
                Established in 2018. Over 500 vehicles sold. Curated inventory of automotive excellence on Bypass Kiambu Road, Nairobi.
              </p>

              {/* Visit Details */}
              <div className="space-y-1.5 pt-2 text-xs font-mono">
                <span className="text-[10px] font-bold text-[#e50914] tracking-widest uppercase block">
                  VISIT
                </span>
                <p className="text-slate-800 dark:text-slate-200">Bypass Kiambu Road &bull; Nairobi</p>
                <a
                  href={`tel:${DEALER_INFO.phone}`}
                  className="text-slate-800 dark:text-slate-200 font-bold hover:text-[#e50914] transition block cursor-pointer"
                >
                  📞 Call {DEALER_INFO.phone}
                </a>
                <a
                  href={`mailto:${DEALER_INFO.email}`}
                  className="text-slate-500 hover:text-[#e50914] hover:underline transition block cursor-pointer"
                  title={`Email ${DEALER_INFO.email}`}
                >
                  ✉️ {DEALER_INFO.email}
                </a>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-3 pt-2 text-slate-700 dark:text-slate-300">
                <a
                  href={DEALER_INFO.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Instagram: @${DEALER_INFO.instagram}`}
                  className="p-1.5 hover:text-[#e50914] transition cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={DEALER_INFO.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Facebook: @${DEALER_INFO.facebook}`}
                  className="p-1.5 hover:text-[#e50914] transition cursor-pointer"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={DEALER_INFO.tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`TikTok: @${DEALER_INFO.tiktok}`}
                  className="p-1.5 hover:text-[#e50914] transition cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
                <a
                  href={`https://wa.me/${DEALER_INFO.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                  className="p-1.5 hover:text-[#25D366] transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Col 2: CARS matching Screenshot 8 */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                CARS
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <li><button onClick={() => window.scrollTo({ top: 900, behavior: 'smooth' })} className="hover:text-[#e50914] transition cursor-pointer">Available Cars</button></li>
                <li><button onClick={() => { const sold = allLuxuryCars.find(c => c.status === 'Sold'); if (sold) setSelectedCar(sold); else window.scrollTo({ top: 900, behavior: 'smooth' }); }} className="hover:text-[#e50914] transition cursor-pointer">Sold Cars</button></li>
                <li><button onClick={() => { if (flagshipCar) setSelectedCar(flagshipCar); }} className="hover:text-[#e50914] transition cursor-pointer">Specs</button></li>
                <li><button onClick={() => setIsCompareOpen(true)} className="hover:text-[#e50914] transition cursor-pointer">Compare</button></li>
                <li><button onClick={() => setIsSellModalOpen(true)} className="hover:text-[#e50914] transition cursor-pointer">Sell My Car</button></li>
              </ul>
            </div>

            {/* Col 3: DISCOVER matching Screenshot 8 */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                DISCOVER
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-[#e50914] transition cursor-pointer">Shop</button></li>
                <li><button onClick={() => { if (flagshipCar) setSelectedCar(flagshipCar); }} className="hover:text-[#e50914] transition cursor-pointer">Image Gallery</button></li>
                <li><button onClick={() => { if (flagshipCar) setSelectedCar(flagshipCar); }} className="hover:text-[#e50914] transition cursor-pointer">Video Gallery</button></li>
                <li><button onClick={() => onReturnToMain()} className="hover:text-[#e50914] transition cursor-pointer">360 Tour</button></li>
                <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-[#e50914] transition cursor-pointer">News</button></li>
                <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-[#e50914] transition cursor-pointer">Blogs</button></li>
              </ul>
            </div>

            {/* Col 4: COMPANY matching Screenshot 8 */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                COMPANY
              </h4>
              <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <li><button onClick={() => onReturnToMain()} className="hover:text-[#e50914] transition cursor-pointer">About Us</button></li>
                <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-[#e50914] transition cursor-pointer">Careers</button></li>
                <li><button onClick={() => handleOpenWhatsApp()} className="hover:text-[#e50914] transition cursor-pointer">Contact</button></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Bar matching Screenshot 8 */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
            <span>
              &copy; {new Date().getFullYear()} NG'ANG'A PREMIUM LUXURY L.L.C &bull; ALL RIGHTS RESERVED
            </span>

            {/* Center: site created by vano-techies (Plain text only, not a link) */}
            <div className="text-center font-mono text-xs text-slate-400">
              site created by vano-techies
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <button
                onClick={() => handleNavToLegal('privacy')}
                className="hover:text-[#e50914] transition cursor-pointer"
              >
                PRIVACY POLICY
              </button>
              <button
                onClick={() => handleNavToLegal('terms')}
                className="hover:text-[#e50914] transition cursor-pointer"
              >
                TERMS
              </button>
              <button
                onClick={onReturnToMain}
                className="text-[#e50914] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Return to Standard Showroom</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Side MENU Drawer (matches clicking MENU in Screenshot 1 & 2) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
          />

          {/* Drawer Pane */}
          <div className={`relative w-full max-w-md ${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between z-10 overflow-y-auto`}>
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5 tracking-tight">
                  <img
                    src={businessLogo}
                    alt="NG'ANG'A PREMIUM LUXURY"
                    className="h-8 w-auto object-contain rounded-md shadow-xs"
                  />
                  <NgangaExclusivesLogo size="sm" isDark={isDarkMode} align="left" />
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="py-6 space-y-4 font-heading text-lg font-black uppercase">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 900, behavior: 'smooth' });
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Available Cars
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    const sold = allLuxuryCars.find(c => c.status === 'Sold');
                    if (sold) setSelectedCar(sold);
                    else window.scrollTo({ top: 900, behavior: 'smooth' });
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Sold Cars
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCompareOpen(true);
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Compare Cars
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSellModalOpen(true);
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Sell My Car
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleOpenWhatsApp();
                  }}
                  className="block w-full text-left text-slate-900 dark:text-white hover:text-[#e50914] transition cursor-pointer"
                >
                  Bespoke Sourcing (JKIA Direct)
                </button>
              </nav>

              {/* Currency Selector inside Drawer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-2">
                  CURRENCY
                </span>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs font-bold">
                  {(['KSH', 'USD', 'AED', 'EUR'] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`py-2 rounded-lg border text-center transition cursor-pointer ${
                        currency === c 
                          ? 'bg-[#e50914] text-white border-[#e50914]' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Bottom Info */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-xs font-mono space-y-2">
              <p className="text-slate-500">Bypass Kiambu Road, Nairobi</p>
              <a
                href={`tel:${DEALER_INFO.phone}`}
                className="font-bold text-slate-900 dark:text-white hover:text-[#e50914] transition block cursor-pointer"
              >
                📞 Call {DEALER_INFO.phone}
              </a>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onReturnToMain();
                }}
                className="text-[#e50914] font-bold block pt-2 hover:underline cursor-pointer"
              >
                ← Return to Standard Showroom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Compare Cars Modal */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} border border-slate-300 dark:border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl p-6 space-y-6 my-8`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                  TELEMETRY COMPARISON
                </span>
                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white font-heading">
                  COMPARE EXCLUSIVE CARS
                </h3>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-[#e50914] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selectors & Comparison */}
            {compareCar1 && compareCar2 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">VEHICLE A</label>
                    <select
                      value={compareCar1.id}
                      onChange={e => {
                        const found = allLuxuryCars.find(c => c.id === e.target.value);
                        if (found) setCompareCar1(found);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {allLuxuryCars.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} {c.title} ({c.year})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">VEHICLE B</label>
                    <select
                      value={compareCar2.id}
                      onChange={e => {
                        const found = allLuxuryCars.find(c => c.id === e.target.value);
                        if (found) setCompareCar2(found);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {allLuxuryCars.map(c => (
                        <option key={c.id} value={c.id}>{c.brand} {c.title} ({c.year})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Side-by-side Specs */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  {/* Car 1 Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <img src={compareCar1.images[0]} alt="" className="w-full h-32 object-cover rounded-lg" />
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{compareCar1.brand} {compareCar1.title}</h4>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Power:</span>
                        <strong className="text-[#e50914]">{compareCar1.power}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">0-100 km/h:</span>
                        <strong>{compareCar1.acceleration}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Top Speed:</span>
                        <strong>{compareCar1.topSpeed}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Transmission:</span>
                        <strong className="truncate max-w-[130px]">{compareCar1.transmission}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Price:</span>
                        <strong className="text-slate-900 dark:text-white">{formatPrice(compareCar1)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Car 2 Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <img src={compareCar2.images[0]} alt="" className="w-full h-32 object-cover rounded-lg" />
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{compareCar2.brand} {compareCar2.title}</h4>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Power:</span>
                        <strong className="text-[#e50914]">{compareCar2.power}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">0-100 km/h:</span>
                        <strong>{compareCar2.acceleration}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Top Speed:</span>
                        <strong>{compareCar2.topSpeed}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400">Transmission:</span>
                        <strong className="truncate max-w-[130px]">{compareCar2.transmission}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Price:</span>
                        <strong className="text-slate-900 dark:text-white">{formatPrice(compareCar2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-3">
                <ArrowLeftRight className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white font-heading">Need At Least 2 Vehicles To Compare</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Mark luxury vehicles in the inventory management dashboard to compare executive specifications side-by-side.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Sell My Car / VIP Consignment */}
      {isSellModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} border border-slate-300 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#e50914] tracking-widest uppercase">
                  CONFIDENTIAL CONSIGNMENT
                </span>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white font-heading">
                  Sell Your Luxury Car
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsSellModalOpen(false);
                  setSellSubmitted(false);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-[#e50914] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sellSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white font-heading">Valuation Request Received</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Our Managing Director will review your vehicle details and contact you privately within 2 hours.
                </p>
                <button
                  onClick={() => {
                    setIsSellModalOpen(false);
                    setSellSubmitted(false);
                  }}
                  className="bg-black dark:bg-white text-white dark:text-black font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setSellSubmitted(true);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-500 block mb-1">MAKE & MODEL</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ferrari 488 Pista / Porsche 911 GT3"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 block mb-1">YEAR</label>
                    <input
                      type="number"
                      required
                      placeholder="2022"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold text-slate-500 block mb-1">MILEAGE (KM)</label>
                    <input
                      type="number"
                      required
                      placeholder="5000"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-500 block mb-1">CONFIDENTIAL CONTACT PHONE *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+254 7XX XXX XXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#e50914] hover:bg-[#c40812] text-white font-bold py-3 rounded-lg uppercase tracking-wider font-mono text-xs transition cursor-pointer mt-2"
                >
                  Submit For Valuation →
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: Live Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className={`${isDarkMode ? 'bg-[#12141a]' : 'bg-white'} border border-slate-300 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search Lexus, Range Rover, Porsche, Ferrari..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 hover:text-[#e50914] text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No luxury vehicles found matching "{searchQuery}".</p>
              ) : (
                searchResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCar(c);
                      setIsSearchOpen(false);
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img src={c.images[0]} alt="" className="w-12 h-9 object-cover rounded" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{c.brand} {c.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.year} &bull; {c.engine}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#e50914]">{formatPrice(c)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
