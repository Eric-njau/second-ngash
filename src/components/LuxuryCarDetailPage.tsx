import React, { useState, useEffect } from 'react';
import { F1Car } from '../data/f1rstMotorsData';
import { DEALER_INFO } from '../data/inventory';
import { NgangaExclusivesLogo } from './NgangaExclusivesLogo';
import { ShareModal } from './ShareModal';
import { updateSEO, injectJsonLd, removeJsonLd } from '../utils/seo';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  Share2, 
  ArrowLeftRight, 
  ArrowUpRight, 
  Check, 
  CheckCircle2, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Gauge, 
  Zap, 
  Calendar,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export type Currency = 'KSH' | 'USD' | 'AED' | 'EUR';

interface LuxuryCarDetailPageProps {
  car: F1Car;
  allLuxuryCars?: F1Car[];
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  formatPrice: (c: F1Car) => string;
  onBack: () => void;
  onCompare: (c: F1Car) => void;
  onSelectOtherCar: (c: F1Car) => void;
  onReturnToMain: () => void;
  onNavigate?: (section: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const LuxuryCarDetailPage: React.FC<LuxuryCarDetailPageProps> = ({
  car,
  allLuxuryCars = [],
  currency,
  onCurrencyChange,
  formatPrice,
  onBack,
  onCompare,
  onSelectOtherCar,
  onReturnToMain,
  onNavigate,
  isDarkMode,
  setIsDarkMode,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  // Reset active photo and update dynamic SEO for luxury vehicle
  useEffect(() => {
    setActivePhotoIdx(0);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }

    if (!car) return;

    try {
      const luxuryDesc = `${car.year || ''} ${car.brand || ''} ${car.title || ''} available at Ng'ang'a Premium Luxury Nairobi. ${car.engine || ''} ${car.power || ''}. Price: ${formatPrice(car)}. Exclusive luxury inspection, VIP bespoke delivery in East Africa.`;

      updateSEO({
        title: `${car.brand || ''} ${car.title || ''} (${car.year || ''}) | NG'ANG'A PREMIUM LUXURY`,
        description: luxuryDesc,
        keywords: `${car.brand || ''}, ${car.title || ''}, luxury cars Kenya, exotic cars Nairobi, ${car.brand || ''} for sale Kenya, Ng'ang'a Premium Luxury`,
        canonicalPath: `?luxuryVehicle=${car.id || ''}`,
        image: car.images && car.images[0] ? car.images[0] : null,
        type: 'product',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: `${car.brand || ''} ${car.title || ''} (${car.year || ''})`,
          description: car.description || luxuryDesc,
          image: car.images,
          brand: {
            '@type': 'Brand',
            name: car.brand || 'Luxury',
          },
          model: car.title || 'Luxury Model',
          modelDate: car.year ? car.year.toString() : '',
          offers: {
            '@type': 'Offer',
            price: Number(car.priceKsh) || 0,
            priceCurrency: 'KES',
            availability: 'https://schema.org/InStock',
            seller: {
              '@type': 'AutoDealer',
              name: "Ng'ang'a Premium Luxury",
              telephone: '+254740596907',
            },
          },
        },
        jsonLdId: 'luxury-car-detail-jsonld',
      });
    } catch (e) {
      console.warn('Luxury SEO notice:', e);
    }

    return () => {
      try {
        removeJsonLd('luxury-car-detail-jsonld');
        updateSEO({});
      } catch {}
    };
  }, [car, formatPrice]);

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [car.images.length]);

  const handlePrevPhoto = () => {
    setActivePhotoIdx((prev) => (prev - 1 + car.images.length) % car.images.length);
  };

  const handleNextPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % car.images.length);
  };

  const handleScrollThumbnails = (direction: 'left' | 'right') => {
    const el = document.getElementById('luxury-thumbnails-scroll');
    if (el) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleWhatsApp = () => {
    const message = `Hello Ng'ang'a Premium Luxury, I am inquiring about the ${car.brand} ${car.title} (${car.year}) listed for ${formatPrice(car)}. Please provide further acquisition and viewing details.`;
    window.open(`https://wa.me/${DEALER_INFO.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

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

  // Other related luxury vehicles from active fleet (excluding current car)
  const relatedCars = (allLuxuryCars || []).filter(c => c.id !== car.id).slice(0, 4);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0b0c10] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-[#e50914] selection:text-white transition-colors duration-300 flex flex-col justify-between`}>
      {/* Top Red Accent Line */}
      <div className="w-full h-1 bg-[#e50914]" />

      {/* 1. Dedicated Vehicle Page Sticky Header */}
      <header className={`sticky top-0 z-40 ${isDarkMode ? 'bg-[#12141a]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Back to Premium Luxury Showroom Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 hover:bg-[#e50914] hover:text-white text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 group"
              title="Return to Premium Luxury Showroom"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Premium Luxury Showroom</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>

          {/* Center Brand Logo */}
          <div 
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer group"
            title="Return to NG'ANG'A PREMIUM LUXURY"
          >
            <NgangaExclusivesLogo size="sm" isDark={isDarkMode} />
          </div>

          {/* Right Controls: Currency Switcher (Default KSH), Dark Mode Toggle, Main Showroom */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Switcher */}
            <div className="flex items-center gap-1 text-[11px] font-mono border border-slate-200 dark:border-slate-800 rounded-full px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900">
              {(['KSH', 'USD', 'AED', 'EUR'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => onCurrencyChange(c)}
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

            {/* Sun / Moon Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-slate-700 dark:text-slate-200 hover:text-[#e50914] transition cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {isDarkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />}
            </button>

            {/* Return to Main Dealership */}
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

      {/* 2. Breadcrumbs & Quick Bar */}
      <div className={`${isDarkMode ? 'bg-[#0e1015] border-slate-800/80 text-slate-400' : 'bg-white border-slate-200 text-slate-500'} border-b py-3 px-4 sm:px-6 lg:px-8 text-xs font-mono`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={onReturnToMain} className="hover:text-[#e50914] transition cursor-pointer">
              NG'ANG'A CAR SALES
            </button>
            <span>/</span>
            <button onClick={onBack} className="hover:text-[#e50914] transition cursor-pointer text-[#e50914] font-semibold">
              PREMIUM LUXURY
            </button>
            <span>/</span>
            <span className="uppercase font-bold text-slate-900 dark:text-white">
              {car.brand} {car.title} ({car.year})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium hover:text-[#e50914] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Share this vehicle"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Vehicle Page Showcase */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Top Hero Layout: Big Gallery (7 cols) + Pricing & Concierge (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Photo Showcase with prominent scroll buttons */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Big Photo Frame with Left and Right Scroll Arrows */}
            <div className="relative aspect-[16/10] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-200 dark:border-slate-800 group select-none">
              <img
                src={car.images[activePhotoIdx] || car.images[0]}
                alt={`${car.brand} ${car.title}`}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />

              {/* Subtle gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* PREVIOUS IMAGE SCROLL BUTTON (Left Arrow) */}
              {car.images.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/75 hover:bg-[#e50914] text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-2xl z-30 cursor-pointer active:scale-90 group/btn"
                  title="Previous Photo (Press Left Arrow key)"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6 group-hover/btn:-translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* NEXT IMAGE SCROLL BUTTON (Right Arrow) */}
              {car.images.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/75 hover:bg-[#e50914] text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-2xl z-30 cursor-pointer active:scale-90 group/btn"
                  title="Next Photo (Press Right Arrow key)"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              )}

              {/* Top Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-20 pointer-events-none">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-md">
                  {car.brand}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#e50914] text-white shadow-md">
                  {car.year}
                </span>
              </div>

              {/* Bottom Info & Photo Counter Badge - hidden on phone view so photo UI is clean */}
              <div className="absolute bottom-4 inset-x-4 hidden sm:flex items-center justify-between z-20 pointer-events-none">
                <div className="text-white text-xs font-mono font-semibold drop-shadow-md">
                  <span>{car.exteriorColor}</span>
                </div>

                <div className="px-3 py-1 rounded-full bg-black/80 text-white text-xs font-mono font-bold backdrop-blur-md border border-white/20 shadow-lg">
                  Photo {activePhotoIdx + 1} of {car.images.length}
                </div>
              </div>
            </div>

            {/* Thumbnail Carousel with dedicated Left and Right scroll buttons */}
            {car.images.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Click or scroll to preview images ({car.images.length} total)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleScrollThumbnails('left')}
                      className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-[#e50914] hover:text-white transition cursor-pointer text-slate-700 dark:text-slate-300"
                      title="Scroll thumbnails left"
                      aria-label="Scroll thumbnails left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScrollThumbnails('right')}
                      className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-[#e50914] hover:text-white transition cursor-pointer text-slate-700 dark:text-slate-300"
                      title="Scroll thumbnails right"
                      aria-label="Scroll thumbnails right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div 
                  id="luxury-thumbnails-scroll"
                  className="flex gap-2.5 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
                >
                  {car.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative shrink-0 w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group shadow-xs ${
                        activePhotoIdx === idx 
                          ? 'border-[#e50914] scale-102 ring-2 ring-[#e50914]/30' 
                          : 'border-transparent opacity-65 hover:opacity-100'
                      }`}
                      title={`Photo ${idx + 1}`}
                    >
                      <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {activePhotoIdx === idx && (
                        <div className="absolute inset-0 bg-[#e50914]/15" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Title, Pricing in KSH, Quick Specs, Concierge Buttons */}
          <div className="lg:col-span-5 space-y-6">
            {/* Title & Brand */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-[#e50914] uppercase mb-1">
                <span>{car.brand}</span>
                <span>&bull;</span>
                <span>{car.year} EDITION</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading leading-tight">
                {car.title}
              </h1>

              <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1">
                {car.model}
              </p>
            </div>

            {/* Price Box with prominent KSH display */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-lg space-y-4`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  OFFER PRICE ({currency})
                </span>

                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(['KSH', 'USD', 'AED', 'EUR'] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => onCurrencyChange(c)}
                      className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                        currency === c 
                          ? 'bg-[#e50914] text-white font-bold' 
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                {formatPrice(car)}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-xs font-mono text-slate-500">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Mileage</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{car.mileageKm ? `${car.mileageKm.toLocaleString()} KM` : 'Unspecified'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Availability</span>
                  <span className="font-bold text-emerald-500">{car.status}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full bg-[#e50914] hover:bg-[#c40812] text-white font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl transition-all shadow-xl shadow-red-600/25 cursor-pointer flex items-center justify-center gap-2 group active:scale-98"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Inquire Privately on WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${DEALER_INFO.phone}`}
                    className="bg-slate-900 hover:bg-black text-white font-bold text-xs py-3 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-center"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#e50914]" />
                    <span>Call Showroom</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onCompare(car)}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs py-3 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-center"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#e50914]" />
                    <span>Compare</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Highlights Guarantee */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#12141a] border-slate-800/80' : 'bg-white border-slate-200'} space-y-1`}>
                <ShieldCheck className="w-5 h-5 mx-auto text-[#e50914]" />
                <span className="font-bold text-slate-900 dark:text-white block text-[11px]">100% Certified</span>
                <span className="text-[10px] text-slate-400 block">Inspected</span>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#12141a] border-slate-800/80' : 'bg-white border-slate-200'} space-y-1`}>
                <Gauge className="w-5 h-5 mx-auto text-[#e50914]" />
                <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Verified</span>
                <span className="text-[10px] text-slate-400 block">True Odometer</span>
              </div>

              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#12141a] border-slate-800/80' : 'bg-white border-slate-200'} space-y-1`}>
                <Zap className="w-5 h-5 mx-auto text-[#e50914]" />
                <span className="font-bold text-slate-900 dark:text-white block text-[11px]">VIP Viewing</span>
                <span className="text-[10px] text-slate-400 block">Bypass Kiambu</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Performance Telemetry Matrix */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-0.5 bg-[#e50914]" />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
              PERFORMANCE TELEMETRY
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">ENGINE CONFIGURATION</span>
              <span className="text-lg font-black text-slate-900 dark:text-white block leading-snug">{car.engine}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">HORSEPOWER OUTPUT</span>
              <span className="text-lg font-black text-[#e50914] block leading-snug">{car.power}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">0 - 100 KM/H ACCELERATION</span>
              <span className="text-lg font-black text-slate-900 dark:text-white block leading-snug">{car.acceleration}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">TOP SPEED</span>
              <span className="text-lg font-black text-[#e50914] block leading-snug">{car.topSpeed}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">TRANSMISSION</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-snug">{car.transmission}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">EXTERIOR FINISH</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-snug">{car.exteriorColor}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">INTERIOR COCKPIT</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-snug">{car.interiorColor}</span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1">VERIFIED ODOMETER</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white block leading-snug">{car.mileageKm ? `${car.mileageKm.toLocaleString()} KM` : 'Unspecified'}</span>
            </div>
          </div>
        </section>

        {/* 5. Biography & Technical Specifications */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Biography Narrative */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-0.5 bg-[#e50914]" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
                VEHICLE BIOGRAPHY & HERITAGE
              </h2>
            </div>

            <div className={`p-6 sm:p-8 rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-light">
                {car.description}
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Hand-selected for NG'ANG'A PREMIUM LUXURY</span>
                <span className="text-[#e50914] font-bold">Nairobi Executive Stock</span>
              </div>
            </div>
          </div>

          {/* Technical Specifications Table */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-0.5 bg-[#e50914]" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
                FACTORY SPECIFICATIONS
              </h2>
            </div>

            <div className={`rounded-2xl border ${isDarkMode ? 'bg-[#14161d] border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'} divide-y overflow-hidden shadow-sm text-xs font-mono`}>
              {car.specs.map((s, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <span className="text-slate-500 uppercase tracking-wider">{s.label}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right ml-4">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. VIP Inspection & Viewing Banner */}
        <div className="bg-black text-white rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800 p-8 sm:p-12">
          <div className="max-w-3xl space-y-4 z-10 relative">
            <div className="flex items-center gap-3">
              <span className="w-6 h-0.5 bg-[#e50914]" />
              <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                PRIVATE VIEWING APPOINTMENT
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white font-heading">
              EXPERIENCE THIS {car.brand} {car.title} IN PERSON
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light max-w-xl">
              Arrange an exclusive private walkthrough at our showroom on Bypass Kiambu Road, Nairobi. Our VIP sales directors are available for confidential consultations and test sessions.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="bg-[#e50914] hover:bg-[#c40812] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                <span>Book Private Viewing on WhatsApp</span>
                <MessageSquare className="w-3.5 h-3.5" />
              </button>

              <a
                href={`tel:${DEALER_INFO.phone}`}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all cursor-pointer flex items-center gap-2 border border-white/20"
              >
                <span>Call {DEALER_INFO.phone}</span>
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* 7. More Exclusive Vehicles (Related Cars with image scroll buttons) */}
        {relatedCars.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-0.5 bg-[#e50914]" />
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-heading">
                  MORE EXCLUSIVE VEHICLES
                </h2>
              </div>

              <button
                onClick={onBack}
                className="text-xs font-mono font-bold text-[#e50914] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Inventory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedCars.map(relCar => {
                const currentImgIdx = cardImageIndices[relCar.id] || 0;
                const currentImg = relCar.images[currentImgIdx] || relCar.images[0];

                return (
                  <div
                    key={relCar.id}
                    className={`${
                      isDarkMode ? 'bg-[#14161d] border-slate-800' : 'bg-white border-slate-200'
                    } rounded-xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group`}
                  >
                    {/* Card Photo with Scroll Buttons */}
                    <div 
                      className="relative aspect-[16/11] bg-slate-100 dark:bg-black overflow-hidden cursor-pointer select-none"
                      onClick={() => onSelectOtherCar(relCar)}
                    >
                      <img
                        src={currentImg}
                        alt={`${relCar.brand} ${relCar.title}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Card Left Scroll Button */}
                      {relCar.images.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handlePrevCardImg(e, relCar.id, relCar.images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 hover:bg-[#e50914] text-white flex items-center justify-center transition shadow-lg opacity-85 sm:opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Previous photo"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}

                      {/* Card Right Scroll Button */}
                      {relCar.images.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleNextCardImg(e, relCar.id, relCar.images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/70 hover:bg-[#e50914] text-white flex items-center justify-center transition shadow-lg opacity-85 sm:opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Next photo"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}

                      {/* Photo Index Badge - hidden on phone view */}
                      {relCar.images.length > 1 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono text-white backdrop-blur-xs z-10 pointer-events-none hidden sm:block">
                          {currentImgIdx + 1}/{relCar.images.length}
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#e50914] uppercase block">
                          {relCar.brand}
                        </span>
                        <h4 
                          onClick={() => onSelectOtherCar(relCar)}
                          className="text-base font-black text-slate-900 dark:text-white font-heading hover:text-[#e50914] transition cursor-pointer mt-0.5 line-clamp-1"
                        >
                          {relCar.title} {relCar.year}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          {relCar.mileageKm ? `${relCar.mileageKm.toLocaleString()} KM` : 'Unspecified'} &bull; {relCar.engine}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          {formatPrice(relCar)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectOtherCar(relCar)}
                          className="text-xs font-mono font-bold text-[#e50914] hover:underline"
                        >
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* 8. Luxury Footer matching NG'ANG'A PREMIUM LUXURY */}
      <footer className={`${isDarkMode ? 'bg-[#0a0c10] border-slate-800' : 'bg-white border-slate-200'} border-t py-12 transition-colors mt-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <NgangaExclusivesLogo size="sm" isDark={isDarkMode} />
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <button
                onClick={onBack}
                className="text-[#e50914] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>&larr; Back to Premium Luxury Showroom</span>
              </button>
              <span className="text-slate-400">&bull;</span>
              <button
                onClick={onReturnToMain}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
              >
                Main Showroom
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
            <span>&copy; {new Date().getFullYear()} NG'ANG'A PREMIUM LUXURY L.L.C &bull; All Rights Reserved</span>
            <div className="text-center font-mono text-xs text-slate-400">
              site created by vano-techies
            </div>
          </div>
        </div>
      </footer>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${car.year} ${car.brand} ${car.title}`}
        subtitle={`NG'ANG'A PREMIUM LUXURY • ${car.mileageKm?.toLocaleString()} KM • ${car.transmission}`}
        price={formatPrice(car)}
        imageUrl={car.images[0]}
      />
    </div>
  );
};
