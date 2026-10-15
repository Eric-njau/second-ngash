import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Heart,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Fuel,
  Gauge,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Calculator,
  ShieldCheck,
  FileCheck,
  Award,
  Car as CarIcon,
  Clock,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Vehicle } from '../types';
import { DEALER_INFO } from '../data/inventory';
import { VehicleCard } from './VehicleCard';
import { LoadingOrb } from './LoadingOrb';
import { ShareModal } from './ShareModal';
import { updateSEO, buildVehicleJsonLd, removeJsonLd } from '../utils/seo';

interface VehicleDetailsPageProps {
  vehicle: Vehicle;
  allVehicles: Vehicle[];
  onBack: () => void;
  onSelectVehicle: (v: Vehicle) => void;
  onOpenMakeCall: () => void;
  onAddToCart?: (v: Vehicle) => void;
  isWishlisted?: boolean;
}

export const VehicleDetailsPage: React.FC<VehicleDetailsPageProps> = ({
  vehicle,
  allVehicles,
  onBack,
  onSelectVehicle,
  onOpenMakeCall,
  onAddToCart,
  isWishlisted = false
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  // Financing Calculator state
  const [depositPercent, setDepositPercent] = useState<number>(30);
  const [loanMonths, setLoanMonths] = useState<number>(36);
  const [interestRate, setInterestRate] = useState<number>(13.5);

  // Test drive booking state
  const [testDriveName, setTestDriveName] = useState('');
  const [testDrivePhone, setTestDrivePhone] = useState('');
  const [testDriveDate, setTestDriveDate] = useState('');
  const [testDriveBooked, setTestDriveBooked] = useState(false);

  // Reset active image, scroll to top, and update dynamic SEO for Google and social sharing
  useEffect(() => {
    setActiveImageIndex(0);
    try {
      window.scrollTo(0, 0);
    } catch {}

    if (!vehicle) return;

    try {
      const conditionText = vehicle.condition === 'BRAND NEW' ? 'Brand New' : vehicle.condition === 'FOREIGN USED' ? 'Foreign Used' : 'Verified Used';
      const priceText = Number(vehicle.priceKsh) > 0 ? `KSh ${Number(vehicle.priceKsh).toLocaleString()}` : 'Price on Request';
      const desc = `${vehicle.year || ''} ${vehicle.title || 'Vehicle'} (${conditionText}) for sale in Nairobi Kenya at ${priceText}. Mileage: ${(Number(vehicle.mileageKm) || 0).toLocaleString()} km, ${vehicle.fuelType || 'Petrol'}, ${vehicle.transmission || 'Automatic'}. Certified inspection at Ng'ang'a Car Sales Kiambu Road.`;

      updateSEO({
        title: `${vehicle.year || ''} ${vehicle.title || 'Vehicle'} – ${priceText} | Ng'ang'a Car Sales`,
        description: desc,
        keywords: `${vehicle.make || ''}, ${vehicle.model || ''}, ${vehicle.year || ''} ${vehicle.title || ''}, buy car Kenya, car dealer Kiambu Road`,
        canonicalPath: `?vehicle=${vehicle.id || ''}`,
        image: vehicle.image || (vehicle.images && vehicle.images[0]) || null,
        type: 'product',
        jsonLd: buildVehicleJsonLd(vehicle),
        jsonLdId: 'vehicle-detail-jsonld',
      });
    } catch (err) {
      console.warn('Vehicle detail SEO error:', err);
    }

    return () => {
      try {
        removeJsonLd('vehicle-detail-jsonld');
        updateSEO({});
      } catch {}
    };
  }, [vehicle]);

  // Consolidate images without duplicates
  const allImages = useMemo(() => {
    if (!vehicle) return ['/business_logo.png'];
    const list: string[] = [];
    if (vehicle.image && typeof vehicle.image === 'string' && vehicle.image.trim()) {
      list.push(vehicle.image.trim());
    }
    if (Array.isArray(vehicle.images)) {
      for (const img of vehicle.images) {
        if (typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }
    if (Array.isArray(vehicle.additionalImages)) {
      for (const img of vehicle.additionalImages) {
        if (typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }
    return list.length > 0 ? list : ['/business_logo.png'];
  }, [vehicle]);

  const handlePrevImage = () => {
    if (allImages.length <= 1) return;
    setActiveImageIndex(prev => {
      const newIdx = prev === 0 ? allImages.length - 1 : prev - 1;
      scrollToThumbnail(newIdx);
      return newIdx;
    });
  };

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    setActiveImageIndex(prev => {
      const newIdx = prev === allImages.length - 1 ? 0 : prev + 1;
      scrollToThumbnail(newIdx);
      return newIdx;
    });
  };

  const scrollToThumbnail = (idx: number) => {
    if (thumbnailScrollRef.current) {
      const container = thumbnailScrollRef.current;
      const thumb = container.children[idx] as HTMLElement | undefined;
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handleScrollThumbnails = (direction: 'left' | 'right') => {
    if (thumbnailScrollRef.current) {
      const scrollAmount = 240;
      thumbnailScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Keyboard navigation for scrolling images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (allImages.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allImages.length, isLightboxOpen]);

  const formatPrice = (price?: number | null) => {
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) <= 0) {
      return 'Price on Request';
    }
    try {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 0
      })
        .format(Number(price))
        .replace('KES', 'Ksh');
    } catch {
      return `Ksh ${Number(price).toLocaleString()}`;
    }
  };

  // Financing calculation
  const safePrice = Number(vehicle?.priceKsh) || 0;
  const depositAmount = (safePrice * depositPercent) / 100;
  const loanPrincipal = Math.max(0, safePrice - depositAmount);
  const monthlyInterestRate = interestRate / 100 / 12;
  const monthlyPayment =
    safePrice > 0 && monthlyInterestRate > 0
      ? (loanPrincipal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanMonths)) /
        (Math.pow(1 + monthlyInterestRate, loanMonths) - 1)
      : (loanMonths > 0 ? loanPrincipal / loanMonths : 0);

  const whatsappMessage = encodeURIComponent(
    `Hello Ng'ang'a Car Sales, I am interested in the ${vehicle?.year || ''} ${vehicle?.title || ''} priced at ${formatPrice(vehicle?.priceKsh)}. Is it available for inspection at your showroom?`
  );

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const [isBooking, setIsBooking] = useState(false);

  const handleBookTestDrive = (e: React.FormEvent) => {
    e.preventDefault();
    if (testDriveName && testDrivePhone && !isBooking) {
      setIsBooking(true);
      setTimeout(() => {
        setIsBooking(false);
        setTestDriveBooked(true);
      }, 1000);
    }
  };

  // Find 3-4 related vehicles (same make or similar price/body)
  const similarVehicles = useMemo(() => {
    if (!Array.isArray(allVehicles) || !vehicle) return [];
    return allVehicles
      .filter(v => v && v.id && v.id !== vehicle.id && !v.isArchived)
      .slice(0, 3);
  }, [allVehicles, vehicle?.id]);

  if (!vehicle) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-[#f8f9fa] dark:bg-[#0b0f17]">
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Vehicle not found or no longer available.</p>
        <button
          onClick={onBack}
          className="mt-4 px-5 py-2.5 bg-[#d71921] hover:bg-[#b5141b] text-white rounded-xl font-bold text-sm transition shadow-sm cursor-pointer"
        >
          Return to Showroom
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-200">
      {/* Top Breadcrumb & Return Bar */}
      <div className="bg-white dark:bg-[#111622] border-b border-slate-200 dark:border-slate-800 sticky top-14 sm:top-15 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#d71921] dark:hover:bg-[#d71921] text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white font-semibold text-xs sm:text-sm transition-all duration-150 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Showroom</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Home</span>
              <span>/</span>
              <span>Inventory</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-[220px]">
                {vehicle.year} {vehicle.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#151c28] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#d71921] dark:hover:text-red-400 transition shadow-2xs cursor-pointer"
              title="Share listing"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            {copiedShare && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                Link copied!
              </span>
            )}
            {onAddToCart && (
              <button
                onClick={() => onAddToCart(vehicle)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs cursor-pointer ${
                  isWishlisted
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-[#d71921] dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#151c28] text-slate-700 dark:text-slate-200 hover:text-[#d71921] dark:hover:text-red-400'
                }`}
                title="Save car"
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-[#d71921]' : ''}`} />
                <span className="hidden sm:inline">{isWishlisted ? 'Saved' : 'Save'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicle Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Title & Pricing Banner */}
        <div className="bg-white dark:bg-[#111622] rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {vehicle.condition &&
                  vehicle.condition.toUpperCase() !== 'LOCALLY USED' &&
                  (vehicle.condition.toUpperCase().includes('FOREIGN') || vehicle.condition.toUpperCase().includes('NEW')) && (
                    <span className="bg-[#d71921] text-white text-[11px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
                      {vehicle.condition}
                    </span>
                  )}
                <span className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-black px-2.5 py-1 rounded tracking-wider">
                  {vehicle.year} MODEL
                </span>
                {vehicle.location && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 ml-1">
                    <MapPin className="w-3.5 h-3.5 text-[#d71921]" />
                    {vehicle.location}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 font-heading tracking-tight">
                {vehicle.year} {vehicle.title}
              </h1>

              {(() => {
                const specs = [
                  vehicle.model,
                  vehicle.engineCC && vehicle.engineCC > 0 ? `${vehicle.engineCC.toLocaleString()}cc` : null,
                  vehicle.fuelType,
                  vehicle.transmission,
                  vehicle.drive,
                  vehicle.color
                ].filter(Boolean);

                return specs.length > 0 ? (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium">
                    {specs.join(' • ')}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Price Box */}
            <div className="lg:text-right shrink-0 bg-slate-50 dark:bg-[#151c28] lg:bg-transparent dark:lg:bg-transparent p-4 lg:p-0 rounded-xl border border-slate-200 dark:border-slate-800 lg:border-0">
              <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Asking Price
              </div>
              <div className="text-3xl sm:text-4xl font-black text-[#d71921] dark:text-red-400 font-mono-num tracking-tight mt-0.5">
                {formatPrice(vehicle.priceKsh)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center lg:justify-end gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Cash &bull; Flexible Micro-Finance Asset Financing</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Gallery, Highlights, Specs, Description (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Gallery Showcase Card */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
              {/* Main Photo Viewport */}
              <div
                className="relative aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden shadow-sm group select-none cursor-pointer"
                onClick={() => setIsLightboxOpen(true)}
                onTouchStart={e => setTouchStart(e.touches[0].clientX)}
                onTouchEnd={e => {
                  if (touchStart === null) return;
                  const diff = touchStart - e.changedTouches[0].clientX;
                  if (diff > 40) handleNextImage();
                  else if (diff < -40) handlePrevImage();
                  setTouchStart(null);
                }}
              >
                <img
                  src={allImages[activeImageIndex] || vehicle.image}
                  alt={`${vehicle.title} - View ${activeImageIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />

                {/* Left Sideways Scroll Arrow */}
                {allImages.length > 1 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-[#d71921] text-white p-2.5 sm:p-3 rounded-full backdrop-blur-xs transition-all duration-200 shadow-xl cursor-pointer hover:scale-110 active:scale-95 z-20 flex items-center justify-center border border-white/20"
                    title="Previous photo (Scroll left)"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Right Sideways Scroll Arrow */}
                {allImages.length > 1 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-[#d71921] text-white p-2.5 sm:p-3 rounded-full backdrop-blur-xs transition-all duration-200 shadow-xl cursor-pointer hover:scale-110 active:scale-95 z-20 flex items-center justify-center border border-white/20"
                    title="Next photo (Scroll right)"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  </button>
                )}

                {/* Photo Count Pill */}
                <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
                  <span>Photo {activeImageIndex + 1} of {allImages.length}</span>
                </div>

                {/* Expand / Fullscreen hint */}
                <div className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-xs transition shadow-md">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>

              {/* Horizontal Thumbnail Carousel with Arrow Controls */}
              {allImages.length > 1 && (
                <div className="relative flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleScrollThumbnails('left')}
                    className="shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#d71921] text-slate-700 dark:text-slate-200 hover:text-white transition cursor-pointer shadow-2xs"
                    title="Scroll thumbnails left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div
                    ref={thumbnailScrollRef}
                    className="flex gap-2 overflow-x-auto py-1 scroll-smooth no-scrollbar flex-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(idx);
                          scrollToThumbnail(idx);
                        }}
                        className={`relative shrink-0 w-20 sm:w-24 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? 'border-[#d71921] ring-2 ring-red-500/30 scale-102 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${vehicle.title} thumbnail ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScrollThumbnails('right')}
                    className="shrink-0 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#d71921] text-slate-700 dark:text-slate-200 hover:text-white transition cursor-pointer shadow-2xs"
                    title="Scroll thumbnails right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Key Highlights & Equipment Features */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-heading">
                  Key Features & Equipment
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicle.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-100 dark:border-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle Description */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-heading">
                Detailed Vehicle Overview
              </h2>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base space-y-3">
                <p>{vehicle.description}</p>
                <p>
                  This vehicle has passed our thorough mechanical assessment. Inspection and test drives are warmly welcomed at our showroom along Bypass Kiambu Road, Nairobi. All ownership transfer paperwork and KRA documentation are complete and verified for immediate hand-over.
                </p>
              </div>
            </div>

            {/* Complete Technical Specifications Grid */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-[#d71921]" />
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-heading">
                  Technical Specifications
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Make
                  </div>
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                    {vehicle.make}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Model
                  </div>
                  <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                    {vehicle.model}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Year of Manufacture
                  </div>
                  <div className="font-extrabold text-[#d71921] dark:text-red-400 text-sm sm:text-base mt-0.5">
                    {vehicle.year}
                  </div>
                </div>

                {vehicle.engineCC && vehicle.engineCC > 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Engine Displacement
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.engineCC.toLocaleString()} CC
                    </div>
                  </div>
                ) : null}

                {vehicle.fuelType ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Fuel Type
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.fuelType}
                    </div>
                  </div>
                ) : null}

                {vehicle.transmission ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Transmission
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.transmission}
                    </div>
                  </div>
                ) : null}

                {vehicle.drive ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Drivetrain
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.drive}
                    </div>
                  </div>
                ) : null}

                {vehicle.mileageKm !== undefined && vehicle.mileageKm !== null ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Mileage
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.mileageKm ? `${vehicle.mileageKm.toLocaleString()} KMS` : '0 KMS'}
                    </div>
                  </div>
                ) : null}

                {vehicle.bodyType ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Body Type
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.bodyType}
                    </div>
                  </div>
                ) : null}

                {vehicle.color ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Exterior Color
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.color}
                    </div>
                  </div>
                ) : null}

                {vehicle.condition &&
                vehicle.condition.toUpperCase() !== 'LOCALLY USED' &&
                (vehicle.condition.toUpperCase().includes('FOREIGN') || vehicle.condition.toUpperCase().includes('NEW')) ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Condition
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5">
                      {vehicle.condition}
                    </div>
                  </div>
                ) : null}

                {vehicle.location ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Showroom Location
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {vehicle.location}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Buyer Guarantees & Protection */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-md">
              <h3 className="text-lg font-black font-heading text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                Ng'ang'a Car Sales Assurance Guarantee
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-[#d71921] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Genuine Odometer Guarantee</h4>
                    <p className="text-xs text-slate-300 mt-0.5">All vehicle mileages are authentic and verified prior to listing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-[#d71921] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Direct Physical Inspection</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Test-drive and inspect the car in person on our Kiambu Road showroom grounds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d71921] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">150-Point Technical Check</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Inspected engine compression, gearbox, suspension, and chassis integrity.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calculator className="w-5 h-5 text-[#d71921] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Micro-Finance Asset Financing</h4>
                    <p className="text-xs text-slate-300 mt-0.5">Financing arrangements available through our approved Micro-Finance partner.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Pricing, Actions, Financing, Test Drive Form (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            {/* Primary Action Card */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-md border-2 border-slate-200/90 dark:border-slate-800 space-y-5">
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">
                  Total Asking Price
                </div>
                <div className="text-3xl sm:text-4xl font-black text-[#d71921] dark:text-red-400 font-mono-num tracking-tight mt-0.5">
                  {formatPrice(vehicle.priceKsh)}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Slightly negotiable for serious buyers &bull; Trade-ins accepted
                </p>
              </div>

              {/* Action Buttons: fitted to words, not full-width */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href={`https://wa.me/254740596907?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-2 px-3.5 rounded-lg font-bold text-xs sm:text-[13px] shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.074-1.895-.447-1.583-.655-2.614-2.28-2.695-2.387-.079-.107-.65-8.65-.65-1.646 0-.782.41-1.17.556-1.328.146-.157.32-.196.427-.196.108 0 .216 0 .312.005.101.005.236-.039.369.28.138.334.472 1.15.513 1.233.042.085.07.184.014.296-.056.113-.085.184-.17.283-.085.099-.178.221-.254.297-.085.085-.174.177-.075.347.099.17.439.724.942 1.172.647.577 1.192.756 1.362.84.17.085.27.071.37-.042.099-.114.426-.497.54-.668.113-.17.227-.142.383-.085.156.057.994.469 1.165.554.17.085.284.128.326.199.043.071.043.412-.101.817z" />
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.436 5.176L2 22l4.982-1.398C8.423 21.498 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.25c-1.636 0-3.155-.47-4.444-1.282l-.318-.2-2.964.832.848-2.906-.208-.331A8.204 8.204 0 0 1 3.75 12c0-4.549 3.701-8.25 8.25-8.25s8.25 3.701 8.25 8.25-3.701 8.25-8.25 8.25z" />
                  </svg>
                  <span>Inquire on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={onOpenMakeCall}
                  className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-[#d71921] text-white py-2 px-3.5 rounded-lg font-bold text-xs sm:text-[13px] shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>Call: 0740596907</span>
                </button>
              </div>

              {/* Showroom Visit Location Info */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4 text-[#d71921] shrink-0" />
                <span>Showroom: Bypass Kiambu Road, Nairobi (Open Mon-Sat 8AM-6PM)</span>
              </div>
            </div>

            {/* Bank Asset Financing Calculator Card */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#d71921]" />
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 font-heading">
                  Asset Financing Calculator
                </h3>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Deposit: {depositPercent}%</span>
                    <span className="text-[#d71921] dark:text-red-400 font-mono-num font-extrabold">
                      {formatPrice(depositAmount)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    step="5"
                    value={depositPercent}
                    onChange={e => setDepositPercent(Number(e.target.value))}
                    className="w-full accent-[#d71921] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Repayment Term: {loanMonths} Months</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{loanMonths / 12} Years</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="60"
                    step="6"
                    value={loanMonths}
                    onChange={e => setLoanMonths(Number(e.target.value))}
                    className="w-full accent-[#d71921] cursor-pointer"
                  />
                </div>

                {/* Calculation Output Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#151c28] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Loan Principal:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatPrice(loanPrincipal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Estimated Interest Rate:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{interestRate}% p.a.</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">Est. Monthly:</span>
                    <span className="text-xl font-black text-[#d71921] dark:text-red-400 font-mono-num">
                      {formatPrice(Math.round(monthlyPayment))} /mo
                    </span>
                  </div>
                </div>

                {/* Calculator Disclaimer */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold block">Calculator Disclaimer:</strong>
                    <span>Estimate only. Financing partner is a licensed Micro-Finance institution. Final interest rates, down payments, fees, and monthly terms depend on formal appraisal and credit approval.</span>
                  </div>
                </div>

                <a
                  href={`https://wa.me/254740596907?text=${encodeURIComponent(
                    `Hello Ng'ang'a Car Sales, I want to apply for micro-finance asset financing for the ${vehicle.year} ${vehicle.title} with a ${depositPercent}% deposit (${formatPrice(depositAmount)}). Please assist me with pre-approval.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Apply for Micro-Finance Pre-Approval</span>
                </a>
              </div>
            </div>

            {/* Book Showroom Inspection / Test Drive Form */}
            <div className="bg-white dark:bg-[#111622] rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#d71921]" />
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 font-heading">
                  Schedule Showroom Test Drive
                </h3>
              </div>

              {testDriveBooked ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-2 text-center animate-in fade-in">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <div className="font-bold text-sm">Test Drive Booking Received!</div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Our sales representative will call you at <strong>{testDrivePhone}</strong> to confirm your appointment for the {vehicle.year} {vehicle.title}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTestDriveBooked(false)}
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-300 underline mt-2 cursor-pointer"
                  >
                    Book another time
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookTestDrive} className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Kamau"
                      value={testDriveName}
                      onChange={e => setTestDriveName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151c28] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d71921] text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712 345 678"
                      value={testDrivePhone}
                      onChange={e => setTestDrivePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151c28] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d71921] text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={testDriveDate}
                      onChange={e => setTestDriveDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151c28] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#d71921] text-xs sm:text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isBooking}
                    className="w-full bg-[#d71921] hover:bg-[#b5141b] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-80"
                  >
                    {isBooking ? (
                      <LoadingOrb state="connecting" size={20} color="#ffffff" layout="inline" label="Securing Appointment..." />
                    ) : (
                      <span>Confirm Test Drive Appointment</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Similar Vehicles Carousel / Section */}
        {similarVehicles.length > 0 && (
          <section className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#d71921]">
                  Explore Showroom
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-heading">
                  Other Vehicles You Might Like
                </h3>
              </div>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#d71921] hover:underline cursor-pointer"
              >
                <span>View All Showroom Cars</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarVehicles.map(simCar => (
                <VehicleCard
                  key={simCar.id}
                  vehicle={simCar}
                  onSelectVehicle={v => {
                    onSelectVehicle(v);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onToggleWishlist={onAddToCart}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Topbar */}
          <div className="w-full max-w-6xl flex items-center justify-between text-white z-10">
            <div className="text-sm font-bold">
              {vehicle.year} {vehicle.title} &bull; Photo {activeImageIndex + 1} of {allImages.length}
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition"
              title="Close fullscreen view"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Center Image */}
          <div
            className="relative max-w-6xl max-h-[75vh] w-full flex items-center justify-center my-auto"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={allImages[activeImageIndex]}
              alt={`${vehicle.title} full view`}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#d71921] text-white p-3 rounded-full cursor-pointer transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#d71921] text-white p-3 rounded-full cursor-pointer transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnails */}
          {allImages.length > 1 && (
            <div
              className="w-full max-w-3xl flex gap-2 overflow-x-auto py-2 no-scrollbar justify-center z-10"
              onClick={e => e.stopPropagation()}
            >
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 sm:w-16 aspect-[4/3] rounded overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                    activeImageIndex === idx ? 'border-[#d71921]' : 'border-white/30 opacity-60'
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share Listing Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`${vehicle.year} ${vehicle.title}`}
        subtitle={[vehicle.location, vehicle.condition].filter(Boolean).join(' • ')}
        price={formatPrice(vehicle.priceKsh)}
        imageUrl={vehicle.image}
      />
    </div>
  );
};
