import React, { useState } from 'react';
import { Heart, Phone, ChevronDown, Menu, X } from 'lucide-react';
import businessLogo from '../assets/images/business_logo.png';
import { DEALER_INFO } from '../data/inventory';

interface SialkotNavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenMakeCall: () => void;
  onOpenWishlist: () => void;
  wishlistCount: number;
}

export const SialkotNavbar: React.FC<SialkotNavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenMakeCall,
  onOpenWishlist,
  wishlistCount
}) => {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0f141f]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/90 shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-15">
          {/* Logo matching the business logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <img
              src={businessLogo}
              alt="NG'ANG'A CAR SALES"
              className="h-9 sm:h-11 w-auto object-contain rounded-md group-hover:scale-105 transition-transform shrink-0 shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#d71921] font-heading leading-tight">
                NG'ANG'A
              </span>
              <span className="text-[9px] font-black tracking-[0.18em] text-slate-800 dark:text-slate-200 uppercase leading-none">
                CAR SALES
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1 ${
                activeSection === 'home' ? 'text-[#d71921] dark:text-red-400 font-bold' : ''
              }`}
            >
              Home
            </button>

            {/* Explore cars Dropdown */}
            <div className="relative group">
              <button
                onClick={() => onNavigate('inventory')}
                className="flex items-center gap-1 hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1"
                onMouseEnter={() => setExploreOpen(true)}
                onMouseLeave={() => setExploreOpen(false)}
              >
                <span>Explore cars</span>
                <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
              </button>

              {exploreOpen && (
                <div
                  onMouseEnter={() => setExploreOpen(true)}
                  onMouseLeave={() => setExploreOpen(false)}
                  className="absolute top-full left-0 w-48 bg-white dark:bg-[#151c28] rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-50 text-xs font-medium space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <button
                    onClick={() => onNavigate('inventory')}
                    className="block w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#d71921] dark:hover:text-red-400 text-slate-700 dark:text-slate-200"
                  >
                    All Vehicles in Stock
                  </button>
                  <button
                    onClick={() => onNavigate('suvs')}
                    className="block w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#d71921] dark:hover:text-red-400 text-slate-700 dark:text-slate-200"
                  >
                    Luxury SUVs & 4WD
                  </button>
                  <button
                    onClick={() => onNavigate('pickups')}
                    className="block w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#d71921] dark:hover:text-red-400 text-slate-700 dark:text-slate-200"
                  >
                    Pickups & Utility
                  </button>
                  <button
                    onClick={() => onNavigate('sedans')}
                    className="block w-full text-left px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#d71921] dark:hover:text-red-400 text-slate-700 dark:text-slate-200"
                  >
                    Executive Sedans
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('finance')}
              className={`hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1 ${
                activeSection === 'finance' ? 'text-[#d71921] dark:text-red-400 font-bold' : ''
              }`}
            >
              Car finance
            </button>

            <button
              onClick={() => onNavigate('news')}
              className={`hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1 ${
                activeSection === 'news' ? 'text-[#d71921] dark:text-red-400 font-bold' : ''
              }`}
            >
              News & events
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1 ${
                activeSection === 'contact' ? 'text-[#d71921] dark:text-red-400 font-bold' : ''
              }`}
            >
              Contact
            </button>

            <a
              href="/?page=luxury"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer py-1 whitespace-nowrap font-bold flex items-center"
            >
              <span>NG</span><span className="text-[#d71921] font-black mx-[1px]">’</span><span>ANG</span><span className="text-[#d71921] font-black mx-[1px]">’</span><span>A PREMIUM LUXURY</span>
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Heart Wishlist Icon */}
            <button
              onClick={onOpenWishlist}
              className="relative p-1.5 text-slate-800 dark:text-slate-200 hover:text-[#d71921] dark:hover:text-red-400 transition-colors cursor-pointer"
              title="Saved Shortlist"
            >
              <Heart className="w-4 h-4 fill-slate-900 dark:fill-slate-100 stroke-slate-900 dark:stroke-slate-100" />
              <span className="absolute -top-1 -right-1 bg-[#d71921] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {wishlistCount}
              </span>
            </button>

            {/* "Make a call" Red Button */}
            <a
              href="tel:0740596907"
              onClick={(e) => {
                if (window.innerWidth >= 768) {
                  e.preventDefault();
                  onOpenMakeCall();
                }
              }}
              className="bg-[#d71921] hover:bg-[#bc141b] text-white text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="Call 0740596907"
            >
              <span>Call 0740596907</span>
              <Phone className="w-3.5 h-3.5" />
            </a>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-700 dark:text-slate-200 hover:text-[#d71921]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-[#151c28] border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-2 shadow-lg">
          <button
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1 text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('inventory');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1 text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Explore Cars
          </button>
          <button
            onClick={() => {
              onNavigate('finance');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1 text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Car Finance
          </button>
          <button
            onClick={() => {
              onNavigate('luxury');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1 text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Premium Luxury Fleet
          </button>
          <button
            onClick={() => {
              onNavigate('news');
              setMobileMenuOpen(false);
            }}
            className={`block w-full text-left py-1 text-sm font-semibold ${
              activeSection === 'news' ? 'text-[#d71921] font-bold' : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            News & events
          </button>
          <button
            onClick={() => {
              onNavigate('contact');
              setMobileMenuOpen(false);
            }}
            className={`block w-full text-left py-1 text-sm font-semibold ${
              activeSection === 'contact' ? 'text-[#d71921] font-bold' : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            Contact & Showroom
          </button>
          <a
            href="/?page=luxury"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center w-full text-left py-1 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-[#d71921]"
          >
            <span>NG</span><span className="text-[#d71921] font-black mx-[1px]">’</span><span>ANG</span><span className="text-[#d71921] font-black mx-[1px]">’</span><span>A PREMIUM LUXURY</span>
          </a>
          <div className="pt-2">
            <a
              href="tel:0740596907"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#d71921] hover:bg-[#bc141b] text-white font-bold text-sm rounded-lg shadow-sm transition active:scale-98"
            >
              <Phone className="w-4 h-4" />
              <span>Call 0740596907</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
