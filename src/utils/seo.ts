/**
 * SEO & Structured Data Management Utility
 * Keeps document title, meta tags, OpenGraph cards, Twitter cards,
 * canonical URLs, and Schema.org JSON-LD structured data updated dynamically
 * for optimal Google indexing and social sharing.
 */

export interface PageSEOOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  jsonLdId?: string;
}

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://nganga-car-sales.com';
};

const DEFAULT_TITLE = "Ng'ang'a Car Sales – DEALER IN USED AND NEW CARS";
const DEFAULT_DESCRIPTION = "DEALER IN USED AND NEW CARS. Quality foreign used and new vehicles in Nairobi, Kenya with certified inspections, transparent pricing, and financing options.";

export const getDefaultImage = (): string => `${getBaseUrl()}/business_logo.png`;

function setMetaTag(selector: string, attributeName: string, attributeValue: string, content: string) {
  try {
    if (typeof document === 'undefined') return;
    let element = document.querySelector(selector) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      if (document.head) {
        document.head.appendChild(element);
      }
    }
    if (element) {
      element.setAttribute('content', content || '');
    }
  } catch (e) {
    // Graceful fallback for restricted environments
  }
}

function setCanonical(href: string) {
  try {
    if (typeof document === 'undefined') return;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      if (document.head) {
        document.head.appendChild(link);
      }
    }
    if (link) {
      link.setAttribute('href', href);
    }
  } catch (e) {
    // Graceful fallback
  }
}

export function updateSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonicalPath = '',
  image,
  type = 'website',
  jsonLd,
  jsonLdId = 'dynamic-page-jsonld',
}: PageSEOOptions) {
  try {
    if (typeof document === 'undefined') return;

    const baseUrl = getBaseUrl();
    const fullTitle = title ? String(title) : DEFAULT_TITLE;
    const cleanCanonical = canonicalPath ? String(canonicalPath) : '';
    const canonicalUrl = `${baseUrl}${cleanCanonical.startsWith('/') ? cleanCanonical : `/${cleanCanonical}`}`;

    const rawImage = (image && typeof image === 'string' && image.trim().length > 0)
      ? image.trim()
      : getDefaultImage();
    const fullImageUrl = rawImage.startsWith('http')
      ? rawImage
      : `${baseUrl}${rawImage.startsWith('/') ? rawImage : `/${rawImage}`}`;

    // 1. Page Title
    document.title = fullTitle;

    // 2. Standard Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', description || DEFAULT_DESCRIPTION);
    if (keywords) {
      setMetaTag('meta[name="keywords"]', 'name', 'keywords', String(keywords));
    }
    setMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // 3. Canonical URL
    setCanonical(canonicalUrl);

    // 4. OpenGraph Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description || DEFAULT_DESCRIPTION);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', type || 'website');
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', fullImageUrl);
    setMetaTag('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', fullImageUrl);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', "Ng'ang'a Car Sales");
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'en_KE');

    // 5. Twitter Card Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description || DEFAULT_DESCRIPTION);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', fullImageUrl);
    setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl);

    // 6. JSON-LD Structured Data
    if (jsonLd) {
      injectJsonLd(jsonLdId, jsonLd);
    } else {
      removeJsonLd(jsonLdId);
    }
  } catch (err) {
    console.warn('updateSEO error caught safely:', err);
  }
}

export function injectJsonLd(id: string, data: Record<string, unknown> | Array<Record<string, unknown>>) {
  try {
    if (typeof document === 'undefined') return;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      if (document.head) {
        document.head.appendChild(script);
      }
    }
    if (script) {
      script.textContent = JSON.stringify(data, null, 2);
    }
  } catch (e) {
    // Graceful fallback
  }
}

export function removeJsonLd(id: string) {
  try {
    if (typeof document === 'undefined') return;
    const script = document.getElementById(id);
    if (script) {
      script.remove();
    }
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Builds a Schema.org Car schema for a vehicle with complete safety fallbacks
 */
export function buildVehicleJsonLd(vehicle: {
  id?: string;
  title?: string;
  make?: string;
  model?: string;
  year?: number | string;
  priceKsh?: number;
  condition?: string;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  image?: string | null;
  images?: string[];
  description?: string;
}): Record<string, unknown> {
  try {
    const baseUrl = getBaseUrl();
    const safeYear = vehicle.year ? String(vehicle.year) : new Date().getFullYear().toString();
    const safeTitle = vehicle.title ? String(vehicle.title) : 'Vehicle';
    const safeMake = vehicle.make ? String(vehicle.make) : 'Ng\'ang\'a Car Sales';
    const safeModel = vehicle.model ? String(vehicle.model) : safeTitle;
    const safePrice = Number(vehicle.priceKsh) || 0;
    const safeMileage = Number(vehicle.mileageKm) || 0;
    const safeId = vehicle.id ? String(vehicle.id) : '';

    const imageList: string[] = [];
    if (vehicle.image && typeof vehicle.image === 'string' && vehicle.image.trim()) {
      imageList.push(vehicle.image.trim());
    }
    if (Array.isArray(vehicle.images)) {
      for (const img of vehicle.images) {
        if (typeof img === 'string' && img.trim() && !imageList.includes(img.trim())) {
          imageList.push(img.trim());
        }
      }
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Car',
      name: `${safeYear} ${safeTitle}`,
      description: vehicle.description || `${safeYear} ${safeTitle} (${vehicle.condition || 'Verified Used'}) for sale in Nairobi Kenya. Kiambu Road showroom.`,
      image: imageList.length > 0 ? imageList : [`${baseUrl}/business_logo.png`],
      brand: {
        '@type': 'Brand',
        name: safeMake,
      },
      model: safeModel,
      modelDate: safeYear,
      vehicleModelDate: safeYear,
      vehicleTransmission: vehicle.transmission || 'Automatic',
      fuelType: vehicle.fuelType || 'Petrol',
      bodyType: vehicle.bodyType,
      color: vehicle.color,
      itemCondition: vehicle.condition === 'BRAND NEW' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      mileageFromOdometer: {
        '@type': 'QuantitativeValue',
        value: safeMileage,
        unitCode: 'KMT',
      },
      offers: {
        '@type': 'Offer',
        price: safePrice,
        priceCurrency: 'KES',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/?vehicle=${safeId}`,
        seller: {
          '@type': 'AutoDealer',
          name: "Ng'ang'a Car Sales",
          telephone: '+254740596907',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Northern Bypass, Kiambu Road Interchange',
            addressLocality: 'Nairobi',
            addressCountry: 'KE',
          },
        },
      },
    };
  } catch (err) {
    console.warn('buildVehicleJsonLd fallback:', err);
    return {
      '@context': 'https://schema.org',
      '@type': 'Car',
      name: vehicle.title || 'Vehicle',
    };
  }
}
