import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { DEALER_INFO } from './data/inventory';
import { Vehicle, FilterState, SparePart } from './types';
import { SialkotNavbar } from './components/SialkotNavbar';
import { SialkotHero } from './components/SialkotHero';
import { SialkotQuickSearch } from './components/SialkotQuickSearch';
import { VehicleCard } from './components/VehicleCard';
import { CarFinanceSection } from './components/CarFinanceSection';
import { SialkotFooter } from './components/SialkotFooter';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';

import { LoadingOrb } from './components/LoadingOrb';
import { prefetchCriticalImages } from './utils/cache';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Code-split heavy routes and modals via React.lazy for instant initial load
const VehicleDetailsPage = React.lazy(() => import('./components/VehicleDetailsPage').then(m => ({ default: m.VehicleDetailsPage })));
const LuxuryCarPage = React.lazy(() => import('./components/LuxuryCarPage').then(m => ({ default: m.LuxuryCarPage })));
const NewsEventsPage = React.lazy(() => import('./components/NewsEventsPage').then(m => ({ default: m.NewsEventsPage })));
const ContactPage = React.lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPolicyPage = React.lazy(() => import('./components/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = React.lazy(() => import('./components/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
import { AdminDashboard, sanitizeLoadedVehicle } from './components/AdminDashboard';
import { loadAllVehicles, getVehicleTimestamp, SYNC_EVENT_NAME } from './utils/inventoryManager';
const MakeCallModal = React.lazy(() => import('./components/MakeCallModal').then(m => ({ default: m.MakeCallModal })));
const AddListingModal = React.lazy(() => import('./components/AddListingModal').then(m => ({ default: m.AddListingModal })));
const CartDrawer = React.lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-slate-50/50">
    <LoadingOrb
      state="working"
      size={64}
      color="#d71921"
      label="Loading Showroom..."
      sublabel="Connecting to Kiambu Road vehicle inventory"
    />
  </div>
);

const ITEMS_PER_PAGE = 6;

const isLuxuryRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('page=luxury') ||
    search.includes('page=exclusive') ||
    hash.includes('luxury') ||
    hash.includes('exclusive') ||
    path.includes('/luxury') ||
    path.includes('/exclusive')
  );
};

const isNewsRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('page=news') ||
    search.includes('page=events') ||
    search.includes('page=news-events') ||
    hash.includes('news') ||
    hash.includes('events') ||
    path.includes('/news') ||
    path.includes('/events')
  );
};

const isContactRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('page=contact') ||
    hash.includes('contact') ||
    path.includes('/contact')
  );
};

const isPrivacyRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('page=privacy') ||
    hash.includes('privacy') ||
    path.includes('/privacy')
  );
};

const isTermsRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('page=terms') ||
    hash.includes('terms') ||
    path.includes('/terms')
  );
};

const isAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');

  // The admin should ONLY be accessed by /ngashkrd2012
  return (
    path === '/ngashkrd2012' ||
    hash === '#ngashkrd2012' ||
    hash === '#/ngashkrd2012'
  );
};

const getVehicleIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const search = window.location.search;
  const path = window.location.pathname;

  const hashMatch = hash.match(/vehicle[=/]([a-zA-Z0-9_-]+)/i);
  if (hashMatch) return hashMatch[1];

  const searchParams = new URLSearchParams(search);
  const vParam = searchParams.get('vehicle');
  if (vParam) return vParam;

  const pathMatch = path.match(/\/vehicle\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch) return pathMatch[1];

  return null;
};

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadAllVehicles());
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(() => {
    const vId = getVehicleIdFromUrl();
    if (vId) {
      return loadAllVehicles().find(v => v.id.toLowerCase() === vId.toLowerCase()) || null;
    }
    return null;
  });

  // Modals & Popups
  const [isMakeCallOpen, setIsMakeCallOpen] = useState(false);
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const [adminNavCount, setAdminNavCount] = useState(0);

  // Page Routing (Main Dealership vs Standalone Luxury Atelier vs News & Events vs Contact vs Privacy vs Terms vs Admin)
  const [currentView, setCurrentView] = useState<'main' | 'luxury' | 'news' | 'contact' | 'privacy' | 'terms' | 'admin'>(() => {
    if (isAdminRoute()) return 'admin';
    if (isLuxuryRoute()) return 'luxury';
    if (isNewsRoute()) return 'news';
    if (isContactRoute()) return 'contact';
    if (isPrivacyRoute()) return 'privacy';
    if (isTermsRoute()) return 'terms';
    return 'main';
  });

  useEffect(() => {
    document.title = "NG'ANG'A CAR SALES";
    const handleUrlChange = () => {
      const vId = getVehicleIdFromUrl();
      if (vId) {
        const found = vehicles.find(v => v.id.toLowerCase() === vId.toLowerCase());
        if (found) {
          setSelectedVehicle(found);
          return;
        }
      } else {
        setSelectedVehicle(null);
      }

      if (isAdminRoute()) {
        setAdminNavCount(c => c + 1);
        setCurrentView('admin');
      } else if (isLuxuryRoute()) {
        setCurrentView('luxury');
      } else if (isNewsRoute()) {
        setCurrentView('news');
      } else if (isContactRoute()) {
        setCurrentView('contact');
      } else if (isPrivacyRoute()) {
        setCurrentView('privacy');
      } else if (isTermsRoute()) {
        setCurrentView('terms');
      } else {
        setCurrentView('main');
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [vehicles]);

  // Background Cache Warming: Prefetch top showroom car photos
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      const topImages = vehicles.slice(0, 10).map(v => v.image);
      prefetchCriticalImages(topImages);
    }
  }, [vehicles]);

  // Live Inventory synchronization (Local Storage events + Firestore immediate getDocs + live snapshot)
  useEffect(() => {
    const handleSync = () => {
      setVehicles(loadAllVehicles());
    };
    window.addEventListener(SYNC_EVENT_NAME, handleSync);

    let isMounted = true;
    let unsubscribe = () => {};

    // 1. Immediate fetch from Firestore for instant production loading
    (async () => {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const snap = await getDocs(vehiclesRef);
        if (isMounted && !snap.empty) {
          const list: Vehicle[] = [];
          snap.forEach((doc) => {
            list.push(sanitizeLoadedVehicle({ ...doc.data(), id: doc.id } as Vehicle));
          });
          setVehicles(loadAllVehicles(list));
        }
      } catch (err) {
        console.warn('Initial Firestore vehicles fetch note:', err);
      }
    })();

    // 2. Continuous realtime listener for updates
    try {
      const vehiclesRef = collection(db, 'vehicles');
      unsubscribe = onSnapshot(
        vehiclesRef,
        (snapshot) => {
          if (!isMounted) return;
          if (!snapshot.empty) {
            const list: Vehicle[] = [];
            snapshot.forEach((doc) => {
              list.push(sanitizeLoadedVehicle({ ...doc.data(), id: doc.id } as Vehicle));
            });
            setVehicles(loadAllVehicles(list));
          } else {
            setVehicles(loadAllVehicles());
          }
        },
        (error) => {
          console.warn('Firestore live vehicle sync note:', error);
          if (isMounted) {
            setVehicles(loadAllVehicles());
          }
        }
      );
    } catch (err) {
      console.warn('Firestore init note:', err);
    }

    return () => {
      isMounted = false;
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      unsubscribe();
    };
  }, []);

  // Shortlist / Wishlist state
  const [wishlistVehicles, setWishlistVehicles] = useState<Vehicle[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filters State
  const initialFilters: FilterState = {
    searchQuery: '',
    brands: [],
    transmissions: [],
    fuelTypes: [],
    condition: 'ALL',
    bodyTypes: [],
    minPrice: 0,
    maxPrice: 100000000,
    minYear: 1990,
    maxYear: 2030,
    sortBy: 'default'
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Filtered vehicles logic
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        // Exclude archived vehicles from front-end showroom!
        if (v.isArchived) {
          return false;
        }

        // Search query
        if (filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase();
          const matchTitle = v.title.toLowerCase().includes(query);
          const matchMake = v.make.toLowerCase().includes(query);
          const matchModel = v.model.toLowerCase().includes(query);
          const matchYear = v.year.toString().includes(query);
          const matchBody = v.bodyType ? v.bodyType.toLowerCase().includes(query) : false;
          if (!matchTitle && !matchMake && !matchModel && !matchYear && !matchBody) {
            return false;
          }
        }

        // Brands
        if (filters.brands.length > 0) {
          const matchBrand = filters.brands.some(b => {
            const bLower = b.toLowerCase();
            return (
              (v.make && v.make.toLowerCase().includes(bLower)) ||
              (v.brand && v.brand.toLowerCase().includes(bLower)) ||
              (v.title && v.title.toLowerCase().includes(bLower))
            );
          });
          if (!matchBrand) return false;
        }

        // Body Types
        if (filters.bodyTypes.length > 0) {
          const matchBody = filters.bodyTypes.some(bt => {
            const btLower = bt.toLowerCase();
            return v.bodyType && v.bodyType.toLowerCase().includes(btLower);
          });
          if (!matchBody) return false;
        }

        // Condition
        if (filters.condition !== 'ALL' && v.condition !== filters.condition) {
          return false;
        }

        // Price range
        if (v.priceKsh > filters.maxPrice) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price-asc') return a.priceKsh - b.priceKsh;
        if (filters.sortBy === 'price-desc') return b.priceKsh - a.priceKsh;
        if (filters.sortBy === 'year-desc') return b.year - a.year;
        if (filters.sortBy === 'year-asc') return a.year - b.year;

        // Default sort: "Last saved first" on top!
        const timeA = getVehicleTimestamp(a);
        const timeB = getVehicleTimestamp(b);
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        if (!a.isCodeCar && b.isCodeCar) return -1;
        if (a.isCodeCar && !b.isCodeCar) return 1;
        return 0;
      });
  }, [vehicles, filters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, currentPage]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleWishlist = (vehicle: Vehicle) => {
    if (wishlistVehicles.some(v => v.id === vehicle.id)) {
      setWishlistVehicles(wishlistVehicles.filter(v => v.id !== vehicle.id));
    } else {
      setWishlistVehicles([...wishlistVehicles, vehicle]);
    }
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    setSelectedVehicle(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('vehicle');
      window.history.pushState({}, '', url.pathname || '/');
    } catch {
      window.location.hash = '';
    }

    if (section === 'ngashkrd2012') {
      setCurrentView('admin');
      try {
        window.history.pushState({}, '', '/ngashkrd2012');
      } catch {
        window.location.hash = 'ngashkrd2012';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (section === 'luxury') {
      setCurrentView('luxury');
      try {
        window.history.pushState({}, '', '/?page=luxury');
      } catch {
        window.location.hash = 'luxury';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'news' || section === 'events' || section === 'news-events') {
      setCurrentView('news');
      try {
        window.history.pushState({}, '', '/?page=news-events');
      } catch {
        window.location.hash = 'news-events';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'contact') {
      setCurrentView('contact');
      try {
        window.history.pushState({}, '', '/?page=contact');
      } catch {
        window.location.hash = 'contact';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'privacy' || section === 'privacy-policy') {
      setCurrentView('privacy');
      try {
        window.history.pushState({}, '', '/?page=privacy');
      } catch {
        window.location.hash = 'privacy';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'terms' || section === 'terms-of-service') {
      setCurrentView('terms');
      try {
        window.history.pushState({}, '', '/?page=terms');
      } catch {
        window.location.hash = 'terms';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'inventory') {
      setFilters({ ...initialFilters });
      setTimeout(() => {
        document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (section === 'suvs') {
      setFilters({ ...initialFilters, bodyTypes: ['SUV'] });
      setTimeout(() => {
        document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (section === 'pickups') {
      setFilters({ ...initialFilters, bodyTypes: ['Pickup'] });
      setTimeout(() => {
        document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (section === 'sedans') {
      setFilters({ ...initialFilters, bodyTypes: ['Sedan'] });
      setTimeout(() => {
        document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (section === 'finance') {
      setTimeout(() => {
        document.getElementById('finance')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else if (section === 'luxury' || section === 'premium-luxury') {
      setCurrentView('luxury');
      try {
        window.history.pushState({}, '', '/?page=luxury');
      } catch {
        window.location.hash = 'luxury';
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } else if (section === 'showroom') {
      setIsMakeCallOpen(true);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('vehicle', vehicle.id);
      url.searchParams.delete('page');
      window.history.pushState({}, '', url.toString());
    } catch {
      window.location.hash = `/vehicle/${vehicle.id}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToShowroom = () => {
    setSelectedVehicle(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('vehicle');
      window.history.pushState({}, '', url.pathname || '/');
    } catch {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVehicleByTitle = (title: string) => {
    const found = vehicles.find(v => v.title.toLowerCase().includes(title.toLowerCase()));
    if (found) {
      handleSelectVehicle(found);
    } else {
      handleNavigate('inventory');
    }
  };

  if (currentView === 'contact') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load Contact page"
        onReset={() => {
          setCurrentView('main');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname || '/');
          } catch {
            window.location.hash = '';
          }
        }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          <ContactPage
            onNavigate={(sec) => {
              if (sec === 'contact') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              if (sec === 'privacy' || sec === 'terms') {
                handleNavigate(sec);
                return;
              }
              if (sec === 'luxury') {
                handleNavigate('luxury');
                return;
              }
              if (sec === 'news' || sec === 'events' || sec === 'news-events') {
                handleNavigate('news');
                return;
              }
              setCurrentView('main');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('page');
                window.history.pushState({}, '', url.pathname || '/');
              } catch {
                window.location.hash = '';
              }
              setTimeout(() => {
                handleNavigate(sec);
              }, 100);
            }}
            onOpenMakeCall={() => setIsMakeCallOpen(true)}
            onOpenWishlist={() => setIsWishlistOpen(true)}
            wishlistCount={wishlistVehicles.length}
          />
          <MakeCallModal
            isOpen={isMakeCallOpen}
            onClose={() => setIsMakeCallOpen(false)}
          />
          <CartDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            vehicles={wishlistVehicles}
            spares={[]}
            onRemoveVehicle={id => setWishlistVehicles(wishlistVehicles.filter(v => v.id !== id))}
            onRemoveSpare={() => {}}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentView === 'news') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load News & Events"
        onReset={() => {
          setCurrentView('main');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname || '/');
          } catch {
            window.location.hash = '';
          }
        }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          <NewsEventsPage
            onNavigate={(sec) => {
              if (sec === 'news' || sec === 'events' || sec === 'news-events') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              if (sec === 'privacy' || sec === 'terms') {
                handleNavigate(sec);
                return;
              }
              if (sec === 'luxury') {
                handleNavigate('luxury');
                return;
              }
              if (sec === 'contact') {
                handleNavigate('contact');
                return;
              }
              setCurrentView('main');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('page');
                window.history.pushState({}, '', url.pathname || '/');
              } catch {
                window.location.hash = '';
              }
              setTimeout(() => {
                handleNavigate(sec);
              }, 100);
            }}
            onOpenMakeCall={() => setIsMakeCallOpen(true)}
            onOpenWishlist={() => setIsWishlistOpen(true)}
            wishlistCount={wishlistVehicles.length}
          />
          <MakeCallModal
            isOpen={isMakeCallOpen}
            onClose={() => setIsMakeCallOpen(false)}
          />
          <CartDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            vehicles={wishlistVehicles}
            spares={[]}
            onRemoveVehicle={id => setWishlistVehicles(wishlistVehicles.filter(v => v.id !== id))}
            onRemoveSpare={() => {}}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentView === 'luxury') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load NG'ANG'A PREMIUM LUXURY"
        onReset={() => {
          setCurrentView('main');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname);
          } catch {
            window.location.href = '/';
          }
        }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          <LuxuryCarPage
            customLuxuryVehicles={vehicles.filter(v => Boolean(v.isLuxury) && !v.isArchived)}
            onReturnToMain={() => {
              setCurrentView('main');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('page');
                const cleanPath = url.pathname + (url.hash && !url.hash.includes('luxury') && !url.hash.includes('exclusive') ? url.hash : '');
                window.history.pushState({}, '', cleanPath || '/');
              } catch {
                window.location.hash = '';
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={handleNavigate}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentView === 'privacy') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load Privacy Policy"
        onReset={() => {
          setCurrentView('main');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname || '/');
          } catch {
            window.location.hash = '';
          }
        }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          <PrivacyPolicyPage
            onNavigate={handleNavigate}
            onOpenMakeCall={() => setIsMakeCallOpen(true)}
            onOpenWishlist={() => setIsWishlistOpen(true)}
            wishlistCount={wishlistVehicles.length}
          />
          <MakeCallModal
            isOpen={isMakeCallOpen}
            onClose={() => setIsMakeCallOpen(false)}
          />
          <CartDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            vehicles={wishlistVehicles}
            spares={[]}
            onRemoveVehicle={id => setWishlistVehicles(wishlistVehicles.filter(v => v.id !== id))}
            onRemoveSpare={() => {}}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentView === 'terms') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load Terms of Service"
        onReset={() => {
          setCurrentView('main');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname || '/');
          } catch {
            window.location.hash = '';
          }
        }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          <TermsOfServicePage
            onNavigate={handleNavigate}
            onOpenMakeCall={() => setIsMakeCallOpen(true)}
            onOpenWishlist={() => setIsWishlistOpen(true)}
            wishlistCount={wishlistVehicles.length}
          />
          <MakeCallModal
            isOpen={isMakeCallOpen}
            onClose={() => setIsMakeCallOpen(false)}
          />
          <CartDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            vehicles={wishlistVehicles}
            spares={[]}
            onRemoveVehicle={id => setWishlistVehicles(wishlistVehicles.filter(v => v.id !== id))}
            onRemoveSpare={() => {}}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (currentView === 'admin') {
    return (
      <ErrorBoundary
        fallbackTitle="Unable to load Admin Dashboard"
        onReset={() => {
          setCurrentView('main');
          try {
            window.history.pushState({}, '', '/');
          } catch {
            window.location.hash = '';
          }
        }}
      >
        <AdminDashboard
          key={adminNavCount}
          onNavigateHome={() => {
            setCurrentView('main');
            setVehicles(loadAllVehicles());
            setAdminNavCount(c => c + 1);
            try {
              window.history.pushState({}, '', '/');
            } catch {
              window.location.hash = '';
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRefreshInventory={() => {
            setVehicles(loadAllVehicles());
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#0b0f17] text-[#1c1d21] dark:text-[#f1f5f9] flex flex-col font-sans selection:bg-[#d71921] selection:text-white transition-colors duration-200">
      {/* 1. White Navbar with Red Logo, Nav Links, Heart, and "Make a call" Button */}
      <SialkotNavbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenMakeCall={() => setIsMakeCallOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        wishlistCount={wishlistVehicles.length}
      />

      {/* Main Content: Dedicated Vehicle Details Page OR Showroom Home */}
      {selectedVehicle ? (
        <Suspense fallback={<PageLoadingFallback />}>
          <VehicleDetailsPage
            vehicle={selectedVehicle}
            allVehicles={vehicles}
            onBack={handleBackToShowroom}
            onSelectVehicle={handleSelectVehicle}
            onOpenMakeCall={() => setIsMakeCallOpen(true)}
            onAddToCart={handleToggleWishlist}
            isWishlisted={wishlistVehicles.some(v => v.id === selectedVehicle.id)}
          />
        </Suspense>
      ) : (
        <>
          {/* 3. Massive Cinematic Hero matching Screenshot (448) */}
          <SialkotHero
            onExploreClick={() => {
              document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onShowroomClick={() => setIsMakeCallOpen(true)}
            onSelectVehicleByTitle={handleSelectVehicleByTitle}
          />

          {/* 4. Quick Search Filter Box (positioned seamlessly below hero) */}
          <SialkotQuickSearch
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            totalFound={filteredVehicles.length}
          />

          {/* 5. Inventory Collection Grid */}
          <section id="inventory-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full scroll-mt-24">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-[3px] bg-[#d71921] rounded-full" />
                  <span className="text-xs font-black tracking-widest text-[#d71921] uppercase">
                    AVAILABLE SHOWROOM COLLECTION
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-heading tracking-tight">
                  Explore Our Verified Vehicles
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Every vehicle undergoes a 120-point mechanical check and genuine mileage verification.
                </p>
              </div>

              {/* Quick Body Type filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['All', 'SUV', 'Pickup', 'Sedan', 'Minivan'].map(type => {
                  const isSelected =
                    type === 'All'
                      ? filters.bodyTypes.length === 0
                      : filters.bodyTypes.includes(type);

                  return (
                    <button
                      key={type}
                      onClick={() => {
                        handleFilterChange({
                          ...filters,
                          bodyTypes: type === 'All' ? [] : [type]
                        });
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-[#d71921] text-white shadow-xs'
                          : 'bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vehicle Cards Grid */}
            {paginatedVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {paginatedVehicles.map(vehicle => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onSelectVehicle={handleSelectVehicle}
                    isWishlisted={wishlistVehicles.some(v => v.id === vehicle.id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111622] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
                <LoadingOrb
                  state="searching"
                  size={64}
                  color="#d71921"
                />
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-2">
                  No vehicles found matching your criteria
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  We frequently receive fresh locally used inventory at our Kiambu Road showroom. Try clearing your filters or contact us directly to source your preferred car.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-[#d71921] hover:bg-[#bc141b] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-10">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-black dark:bg-[#151c28] hover:bg-neutral-800 dark:hover:bg-[#1c2637] border border-transparent dark:border-slate-700 disabled:opacity-30 disabled:hover:bg-black text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = currentPage === pageNum;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                        isActive
                          ? 'bg-[#d71921] text-white shadow-xs'
                          : 'bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-black dark:bg-[#151c28] hover:bg-neutral-800 dark:hover:bg-[#1c2637] border border-transparent dark:border-slate-700 disabled:opacity-30 disabled:hover:bg-black text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* 6. Car Finance Section */}
          <CarFinanceSection />
        </>
      )}

      {/* 7. Sialkot-Style Dark Footer */}
      <SialkotFooter
        onNavigate={handleNavigate}
        onOpenMakeCall={() => setIsMakeCallOpen(true)}
      />

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp />

      {/* Modals */}
      <Suspense fallback={null}>
        <MakeCallModal
          isOpen={isMakeCallOpen}
          onClose={() => setIsMakeCallOpen(false)}
        />

        <AddListingModal
          isOpen={isAddListingOpen}
          onClose={() => setIsAddListingOpen(false)}
          onAddVehicle={newV => setVehicles([newV, ...vehicles])}
        />

        <CartDrawer
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          vehicles={wishlistVehicles}
          spares={[]}
          onRemoveVehicle={id => setWishlistVehicles(wishlistVehicles.filter(v => v.id !== id))}
          onRemoveSpare={() => {}}
        />
      </Suspense>
    </div>
  );
}
