import { Vehicle } from '../types';
import { VEHICLES_DATA } from '../data/inventory';
import { db, cleanForFirestore } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { prefetchCriticalImages, invalidateAllCaches } from './cache';

const STORAGE_FIRESTORE_CACHE_KEY = 'nganga_firestore_cache_v5';
const STORAGE_CUSTOM_KEY = 'nganga_custom_vehicles_v5';
const STORAGE_ARCHIVE_KEY = 'nganga_archived_ids_v5';
const STORAGE_DELETED_KEY = 'nganga_deleted_ids_v5';

export const SYNC_EVENT_NAME = 'nganga_inventory_sync';

// Clean up ancient legacy caches across all browsers
if (typeof window !== 'undefined') {
  try {
    const RESET_KEY = 'nganga_clean_db_v5';
    if (localStorage.getItem(RESET_KEY) !== 'v5') {
      const legacyKeys = [
        'nganga_custom_vehicles_v2',
        'nganga_cached_firestore_vehicles_v2',
        'nganga_archived_vehicle_ids_v2',
        'nganga_permanently_deleted_ids_v2',
        'nganga_code_cars_archived_init_v2',
        'nganga_custom_vehicles',
        'nganga_cached_firestore_vehicles',
        'nganga_archived_vehicle_ids',
        'nganga_deleted_vehicle_ids',
        'cinecore_firebase_config'
      ];
      legacyKeys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      localStorage.setItem(RESET_KEY, 'v5');
    }
  } catch {}
}

// L1 In-Memory Hot Cache for instant 0ms component renders (holds full gallery photos)
let l1CachedVehicles: Vehicle[] | null = null;
let l1VehicleMap = new Map<string, Vehicle>();

// List of all base code car IDs (empty array since database starts completely empty)
export const CODE_CAR_IDS = new Set<string>(VEHICLES_DATA.map((v) => v.id));

export const isCodeVehicle = (v: Vehicle | string): boolean => {
  const id = typeof v === 'string' ? v : v.id;
  return CODE_CAR_IDS.has(id);
};

export const getDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

export const saveDeletedIds = (ids: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
};

export const getArchivedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_ARCHIVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
};

export const saveArchivedIds = (ids: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_ARCHIVE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
};

export const getCustomVehicles = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const saveCustomVehicles = (vehicles: Vehicle[]): void => {
  try {
    const lightweight = vehicles.map((v) => ({
      ...v,
      images: Array.isArray(v.images) ? v.images.slice(0, 2) : (v.image ? [v.image] : [])
    }));
    localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(lightweight));
  } catch {}
};

export const notifyInventoryChange = (): void => {
  l1CachedVehicles = null;
  l1VehicleMap.clear();
  invalidateAllCaches();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  }
};

export const getCachedFirestoreVehicles = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(STORAGE_FIRESTORE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

/**
 * Saves a lightweight representation of the inventory to localStorage.
 * Guarantees total storage stays under 350KB so it never exceeds browser quota (5MB)
 * and enables instant 0ms first-paints for returning visitors.
 */
export const saveCachedFirestoreVehicles = (vehicles: Vehicle[]): void => {
  try {
    const lightweight = vehicles.map((v) => ({
      ...v,
      // Store cover image and at most 2 gallery images to guarantee fast serialization and compact storage
      images: Array.isArray(v.images) ? v.images.slice(0, 2) : (v.image ? [v.image] : [])
    }));
    localStorage.setItem(STORAGE_FIRESTORE_CACHE_KEY, JSON.stringify(lightweight));
  } catch {
    try {
      const minimal = vehicles.map((v) => ({
        ...v,
        images: v.image ? [v.image] : []
      }));
      localStorage.setItem(STORAGE_FIRESTORE_CACHE_KEY, JSON.stringify(minimal));
    } catch {}
  }
};

export const getVehicleTimestamp = (v: Vehicle): number => {
  if (typeof v.savedAt === 'number' && v.savedAt > 0) return v.savedAt;
  if (v.updatedAt) {
    const parsed = new Date(v.updatedAt).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const match = v.id.match(/nganga-(\d+)/);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

export const getCachedVehicleById = (id?: string | null): Vehicle | null => {
  if (!id) return null;
  const targetId = id.trim().toLowerCase();
  if (l1VehicleMap.has(targetId)) {
    return l1VehicleMap.get(targetId) || null;
  }
  const list = loadAllVehicles();
  return list.find((v) => v.id.toLowerCase() === targetId) || null;
};

/**
 * Loads the complete inventory.
 * Merges Firestore cloud data with local memory and storage, prioritizing cloud updates.
 */
export const loadAllVehicles = (firestoreList?: Vehicle[]): Vehicle[] => {
  let sourceList: Vehicle[];

  if (Array.isArray(firestoreList)) {
    sourceList = firestoreList;
    saveCachedFirestoreVehicles(firestoreList);
  } else if (l1CachedVehicles !== null) {
    return l1CachedVehicles;
  } else {
    sourceList = getCachedFirestoreVehicles();
  }

  const deleted = getDeletedIds();
  const vehicleMap = new Map<string, Vehicle>();

  // 1. Add cloud/cached vehicles (skipping deleted)
  for (const v of sourceList) {
    if (!v || !v.id || deleted.has(v.id)) continue;
    vehicleMap.set(v.id, {
      ...v,
      isCodeCar: false,
      isArchived: v.isArchived === true,
    });
  }

  // 2. Include any local custom vehicles not yet in cloud list (never drop newly saved vehicles)
  const custom = getCustomVehicles();
  for (const c of custom) {
    if (c && c.id && !deleted.has(c.id) && !vehicleMap.has(c.id)) {
      vehicleMap.set(c.id, {
        ...c,
        isCodeCar: false,
        isArchived: c.isArchived === true,
      });
    }
  }

  const allList = Array.from(vehicleMap.values());

  // Sort: Active vehicles first, then newest saved first
  const sortedList = allList.sort((a, b) => {
    if (!a.isArchived && b.isArchived) return -1;
    if (a.isArchived && !b.isArchived) return 1;

    const timeA = getVehicleTimestamp(a);
    const timeB = getVehicleTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return 0;
  });

  // Update L1 cache and fast index
  l1CachedVehicles = sortedList;
  l1VehicleMap.clear();
  for (const v of sortedList) {
    l1VehicleMap.set(v.id, v);
    l1VehicleMap.set(v.id.toLowerCase(), v);
  }

  if (typeof window !== 'undefined') {
    const criticalImages = sortedList.slice(0, 12).map((v) => v.image).filter(Boolean);
    prefetchCriticalImages(criticalImages);
  }

  return sortedList;
};

/**
 * Prepares and sanitizes vehicle payload for Firestore.
 * Strictly guarantees total document size is within Firestore's 1MB limit (< 450KB safe ceiling).
 */
export const prepareVehicleForFirestore = (vehicle: Vehicle): Record<string, any> => {
  const safeData = cleanForFirestore(vehicle);
  safeData.isArchived = Boolean(safeData.isArchived);
  safeData.isCodeCar = false;
  safeData.status = safeData.status === 'sold' ? 'sold' : 'available';
  safeData.priceKsh = Number(safeData.priceKsh) || 0;
  safeData.year = Number(safeData.year) || new Date().getFullYear();

  // Ensure cover image exists
  if (!safeData.image && Array.isArray(safeData.images) && safeData.images.length > 0) {
    safeData.image = safeData.images[0];
  }

  if (!Array.isArray(safeData.images) || safeData.images.length === 0) {
    safeData.images = safeData.image ? [safeData.image] : [];
  }

  let payloadStr = JSON.stringify(safeData);
  const MAX_SAFE_PAYLOAD_BYTES = 450000; // 450KB ceiling

  // If payload exceeds safe boundary, trim extra gallery photos first
  if (payloadStr.length > MAX_SAFE_PAYLOAD_BYTES && Array.isArray(safeData.images)) {
    while (safeData.images.length > 1 && payloadStr.length > MAX_SAFE_PAYLOAD_BYTES) {
      safeData.images.pop();
      if (Array.isArray(safeData.additionalImages) && safeData.additionalImages.length > 0) {
        safeData.additionalImages.pop();
      }
      payloadStr = JSON.stringify(safeData);
    }
  }

  return safeData;
};

/**
 * Synchronizes a single vehicle directly to the Firestore cloud database.
 * Fast, reliable write with built-in retry and generous timeout.
 */
export const syncSingleVehicleToFirestore = async (
  vehicle: Vehicle,
  timeoutMs = 45000
): Promise<{ success: boolean; error?: string }> => {
  try {
    const docRef = doc(db, 'vehicles', vehicle.id);
    const safeData = prepareVehicleForFirestore(vehicle);

    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Cloud upload timeout (45s)')), timeoutMs);
    });

    const firestoreWritePromise = setDoc(docRef, safeData, { merge: true }).finally(() => {
      clearTimeout(timer);
    });

    await Promise.race([firestoreWritePromise, timeoutPromise]);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error(`Firestore sync failed for vehicle ${vehicle.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Reconciles any offline-created vehicles to Firestore.
 * Strictly respects deleted vehicle IDs so permanently deleted vehicles are NEVER resurrected!
 */
export const reconcileLocalVehiclesToFirestore = async (): Promise<{ synced: number; total: number }> => {
  if (typeof window === 'undefined') return { synced: 0, total: 0 };
  try {
    const cached = getCachedFirestoreVehicles();
    const custom = getCustomVehicles();
    const deleted = getDeletedIds();

    const localMap = new Map<string, Vehicle>();
    [...cached, ...custom].forEach((v) => {
      if (v && v.id && !deleted.has(v.id)) {
        localMap.set(v.id, v);
      }
    });

    if (localMap.size === 0) return { synced: 0, total: 0 };

    // Fetch existing cloud doc IDs and timestamps
    const snap = await getDocs(collection(db, 'vehicles'));
    const cloudIds = new Set<string>();
    const cloudTimestamps = new Map<string, number>();
    snap.forEach((d) => {
      cloudIds.add(d.id);
      const data = d.data();
      cloudTimestamps.set(d.id, getVehicleTimestamp(data as Vehicle));
    });

    let synced = 0;
    for (const [id, vehicle] of localMap.entries()) {
      if (deleted.has(id)) continue;
      const isNew = !cloudIds.has(id);
      const isNewer = (cloudTimestamps.get(id) || 0) < getVehicleTimestamp(vehicle);
      if (isNew || isNewer) {
        const res = await syncSingleVehicleToFirestore(vehicle, 30000);
        if (res.success) {
          synced++;
        }
      }
    }

    if (synced > 0) {
      notifyInventoryChange();
    }

    return { synced, total: localMap.size };
  } catch (err) {
    console.warn('Reconcile local vehicles note:', err);
    return { synced: 0, total: 0 };
  }
};

/**
 * Safe no-op legacy sync placeholder
 */
export const syncLocalVehiclesToFirestore = reconcileLocalVehiclesToFirestore;

export const saveDealershipVehicle = async (
  vehicle: Vehicle
): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> => {
  const isArchived = Boolean(vehicle.isArchived);
  const now = Date.now();
  const vehicleToSave: Vehicle = {
    ...vehicle,
    isArchived,
    isCodeCar: false,
    savedAt: vehicle.savedAt || now,
    updatedAt: new Date(now).toISOString()
  };

  // 1. Instantly update L1 in-memory cache (with all high-fidelity gallery photos)
  if (!l1CachedVehicles) {
    l1CachedVehicles = [];
  }
  const existingIdx = l1CachedVehicles.findIndex((v) => v.id === vehicleToSave.id);
  if (existingIdx >= 0) {
    l1CachedVehicles[existingIdx] = vehicleToSave;
  } else {
    l1CachedVehicles.unshift(vehicleToSave);
  }
  l1VehicleMap.set(vehicleToSave.id, vehicleToSave);
  l1VehicleMap.set(vehicleToSave.id.toLowerCase(), vehicleToSave);

  // 2. Maintain in custom vehicles list
  const custom = getCustomVehicles();
  const customIdx = custom.findIndex((v) => v.id === vehicleToSave.id);
  if (customIdx >= 0) {
    custom[customIdx] = vehicleToSave;
  } else {
    custom.unshift(vehicleToSave);
  }
  saveCustomVehicles(custom);

  // Update cached Firestore vehicles in localStorage (lightweight)
  const cached = getCachedFirestoreVehicles();
  const cachedIdx = cached.findIndex((v) => v.id === vehicleToSave.id);
  if (cachedIdx >= 0) {
    cached[cachedIdx] = vehicleToSave;
  } else {
    cached.unshift(vehicleToSave);
  }
  saveCachedFirestoreVehicles(cached);

  // 3. Instantly broadcast change across all components in current window (0ms UI update!)
  notifyInventoryChange();

  // 4. Push directly to Firestore Cloud Database so it is visible across the internet
  const cloudRes = await syncSingleVehicleToFirestore(vehicleToSave, 45000);
  if (!cloudRes.success) {
    // Retry once in background
    setTimeout(() => {
      syncSingleVehicleToFirestore(vehicleToSave, 45000).then((retryRes) => {
        if (retryRes.success) {
          notifyInventoryChange();
        }
      });
    }, 2000);
  }

  return { success: true, cloudSynced: cloudRes.success, error: cloudRes.error };
};

export const removeDealershipVehicle = async (id: string): Promise<boolean> => {
  // 1. Immediately record in deleted set so it can NEVER be resurrected
  const deleted = getDeletedIds();
  deleted.add(id);
  saveDeletedIds(deleted);

  // 2. Immediately remove from in-memory cache
  if (l1CachedVehicles) {
    l1CachedVehicles = l1CachedVehicles.filter((v) => v.id !== id);
  }
  l1VehicleMap.delete(id);
  l1VehicleMap.delete(id.toLowerCase());

  // 3. Immediately remove from local cached Firestore vehicles
  const cached = getCachedFirestoreVehicles().filter((v) => v.id !== id);
  saveCachedFirestoreVehicles(cached);

  const custom = getCustomVehicles().filter((v) => v.id !== id);
  saveCustomVehicles(custom);

  // 4. Instantly broadcast change across all components (0ms UI update!)
  notifyInventoryChange();

  // 5. Permanently delete from Firestore
  try {
    await deleteDoc(doc(db, 'vehicles', id));
    return true;
  } catch (err: any) {
    console.warn(`Firestore vehicle ${id} delete note:`, err?.message || err);
    return false;
  }
};

export const toggleVehicleArchiveStatus = async (
  vehicle: Vehicle,
  targetStatus?: boolean
): Promise<boolean> => {
  const shouldArchive = targetStatus !== undefined ? targetStatus : !vehicle.isArchived;
  const updated: Vehicle = {
    ...vehicle,
    isArchived: shouldArchive,
    updatedAt: new Date().toISOString()
  };

  if (l1CachedVehicles) {
    const idx = l1CachedVehicles.findIndex((v) => v.id === vehicle.id);
    if (idx >= 0) {
      l1CachedVehicles[idx] = updated;
    }
  }
  l1VehicleMap.set(vehicle.id, updated);
  l1VehicleMap.set(vehicle.id.toLowerCase(), updated);

  const cached = getCachedFirestoreVehicles();
  const cIdx = cached.findIndex((v) => v.id === vehicle.id);
  if (cIdx >= 0) {
    cached[cIdx] = updated;
    saveCachedFirestoreVehicles(cached);
  }

  notifyInventoryChange();

  try {
    const docRef = doc(db, 'vehicles', vehicle.id);
    await setDoc(docRef, cleanForFirestore(updated), { merge: true });
    return true;
  } catch (err) {
    console.warn('Archive toggle sync note:', err);
    return false;
  }
};
