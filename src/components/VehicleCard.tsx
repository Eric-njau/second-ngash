import React from 'react';
import { Clock, AlertTriangle, Car as CarIcon, Fuel, Eye, Heart } from 'lucide-react';
import { Vehicle } from '../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelectVehicle: (vehicle: Vehicle) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onSelectVehicle,
  isWishlisted,
  onToggleWishlist
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0
    })
      .format(price)
      .replace('KES', 'Ksh');
  };

  const formatCC = (cc?: number) => {
    if (!cc || cc <= 0) return '';
    return new Intl.NumberFormat('en-US').format(cc) + ' CC';
  };

  return (
    <div
      onClick={() => onSelectVehicle(vehicle)}
      className="bg-white dark:bg-[#111622] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
    >
      {/* Image with Condition Badge & Wishlist */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={vehicle.image || (vehicle.images && vehicle.images[0]) || '/business_logo.png'}
          alt={vehicle.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (target && !target.dataset.fallbackApplied) {
              target.dataset.fallbackApplied = 'true';
              target.src = '/business_logo.png';
            }
          }}
        />

        {/* Condition Badge top-left matching screenshot */}
        <div className="absolute top-3 left-3 bg-[#d71921] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[3px] shadow-sm">
          {vehicle.condition}
        </div>

        {/* Wishlist toggle top-right */}
        {onToggleWishlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(vehicle);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center transition-all cursor-pointer"
            title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart
              className={`w-4 h-4 ${
                isWishlisted
                  ? 'fill-[#d71921] text-[#d71921]'
                  : 'text-white group-hover:text-red-300'
              }`}
            />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Vehicle Title */}
          <h3 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#d71921] dark:group-hover:text-red-400 transition-colors line-clamp-1 mb-3.5 font-heading">
            {vehicle.title}
          </h3>

          {/* 2x2 Specs Grid with red icons */}
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            {/* Year */}
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#d71921] shrink-0" />
              <span className="font-mono-num font-medium text-slate-700 dark:text-slate-300">{vehicle.year}</span>
            </div>

            {/* Engine CC or Transmission */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#d71921] shrink-0" />
              <span className="font-mono-num font-medium text-slate-700 dark:text-slate-300">
                {vehicle.engineCC && vehicle.engineCC > 0
                  ? formatCC(vehicle.engineCC)
                  : (vehicle.transmission || vehicle.drive || 'Inspected')}
              </span>
            </div>

            {/* Body Type */}
            <div className="flex items-center gap-2">
              <CarIcon className="w-3.5 h-3.5 text-[#d71921] shrink-0" />
              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                {vehicle.bodyType || vehicle.condition || 'Verified'}
              </span>
            </div>

            {/* Fuel Type */}
            <div className="flex items-center gap-2">
              <Fuel className="w-3.5 h-3.5 text-[#d71921] shrink-0" />
              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                {vehicle.fuelType || (vehicle.mileageKm ? `${vehicle.mileageKm.toLocaleString()} KM` : 'Inspection OK')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Price & Details button */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[#d71921] dark:text-red-400 font-extrabold text-base sm:text-lg font-mono-num tracking-tight">
            {formatPrice(vehicle.priceKsh)}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectVehicle(vehicle);
            }}
            className="border border-[#d71921] dark:border-red-500 text-[#d71921] dark:text-red-400 text-xs sm:text-sm font-semibold rounded-md px-3.5 py-1.5 flex items-center gap-1.5 hover:bg-[#d71921] hover:text-white dark:hover:bg-[#d71921] dark:hover:text-white transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};
