import { Vehicle } from '../types';
import { VEHICLES_DATA } from '../data/inventory';
import { db, auth, cleanForFirestore } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const STORAGE_INVENTORY_KEY = 'nganga_custom_vehicles_v2';
const STORAGE_FIRESTORE_CACHE_KEY = 'nganga_cached_firestore_vehicles_v2';
const STORAGE_ARCHIVE_KEY = 'nganga_archived_vehicle_ids_v2';
const STORAGE_DELETED_KEY = 'nganga_permanently_deleted_ids_v2';
const STORAGE_INIT_KEY = 'nganga_code_cars_archived_init_v2';

export const SYNC_EVENT_NAME = 'nganga_inventory_sync';

// List of all base code car IDs from inventory.ts
export const CODE_CAR_IDS = new Set<string>(VEHICLES_DATA.map((v) => v.id));

/**
 * Checks if a vehicle was originally added through code
 */
export const isCodeVehicle = (v: Vehicle | string): boolean => {
  const id = typeof v === 'string' ? v : v.id;
  return CODE_CAR_IDS.has(id);
};

/**
 * Retrieves the set of permanently deleted vehicle IDs from localStorage
 */
export const getDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted vehicle IDs:', e);
  }
  return new Set();
};

/**
 * Persists the set of permanently deleted vehicle IDs to localStorage
 */
export const saveDeletedIds = (ids: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Error saving deleted vehicle IDs:', e);
  }
};

/**
 * Retrieves the set of archived vehicle IDs from localStorage
 */
export const getArchivedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_ARCHIVE_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading archived vehicle IDs:', e);
  }

  // Default: by user request, all code-added cars start in the archived state
  // so they are hidden from the front end until the admin restores them!
  const defaultArchived = new Set<string>(VEHICLES_DATA.map((v) => v.id));
  saveArchivedIds(defaultArchived);
  return defaultArchived;
};

/**
 * Persists the set of archived vehicle IDs to localStorage
 */
export const saveArchivedIds = (ids: Set<string>): void => {
  try {
    localStorage.setItem(STORAGE_ARCHIVE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('Error saving archived vehicle IDs:', e);
  }
};

/**
 * Retrieves custom/admin vehicles stored in localStorage
 */
export const getCustomVehicles = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(STORAGE_INVENTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading custom vehicles from storage:', e);
  }
  return [];
};

/**
 * Persists custom/admin vehicles to localStorage
 */
export const saveCustomVehicles = (vehicles: Vehicle[]): void => {
  try {
    localStorage.setItem(STORAGE_INVENTORY_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.warn('Error saving custom vehicles to storage:', e);
  }
};

/**
 * Dispatches an event across the window to notify all listening components
 * (App.tsx, AdminDashboard.tsx, etc.) that the inventory state has changed.
 */
export const notifyInventoryChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  }
};

/**
 * Retrieves cached Firestore vehicles from localStorage
 */
export const getCachedFirestoreVehicles = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(STORAGE_FIRESTORE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading cached Firestore vehicles:', e);
  }
  return [];
};

/**
 * Persists Firestore vehicles to localStorage cache for instant loading
 */
export const saveCachedFirestoreVehicles = (vehicles: Vehicle[]): void => {
  try {
    localStorage.setItem(STORAGE_FIRESTORE_CACHE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.warn('Error caching Firestore vehicles:', e);
  }
};

/**
 * Computes numeric timestamp for sorting vehicles by newest saved/updated first.
 */
export const getVehicleTimestamp = (v: Vehicle): number => {
  if (typeof v.savedAt === 'number' && v.savedAt > 0) {
    return v.savedAt;
  }
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

/**
 * Loads the complete inventory:
 * - Admin/Custom added vehicles (active by default, positioned at top)
 * - Code-seeded vehicles (archived by default per user specification)
 */
export const loadAllVehicles = (firestoreList?: Vehicle[]): Vehicle[] => {
  const archivedIds = getArchivedIds();
  const deletedIds = getDeletedIds();
  const customLocal = getCustomVehicles();

  // If a live Firestore list was provided, cache it
  if (firestoreList && firestoreList.length > 0) {
    saveCachedFirestoreVehicles(firestoreList);
  }

  // Use provided list or fall back to cached Firestore vehicles
  const activeFirestoreList = (firestoreList && firestoreList.length > 0)
    ? firestoreList
    : getCachedFirestoreVehicles();

  // Map to hold vehicles by id to ensure uniqueness
  const vehicleMap = new Map<string, Vehicle>();

  // 1. First add all code-added cars (unless permanently deleted)
  for (const codeVehicle of VEHICLES_DATA) {
    if (deletedIds.has(codeVehicle.id)) continue;
    const isArchived = archivedIds.has(codeVehicle.id);
    vehicleMap.set(codeVehicle.id, {
      ...codeVehicle,
      isCodeCar: true,
      isArchived,
      archivedAt: isArchived ? 'Code Default Archive' : undefined,
    });
  }

  // 2. Overlay or append any Firestore vehicles (unless permanently deleted)
  if (activeFirestoreList && activeFirestoreList.length > 0) {
    for (const fv of activeFirestoreList) {
      if (deletedIds.has(fv.id)) continue;
      const isCode = isCodeVehicle(fv.id);
      // Custom uploaded cars are active by default unless explicitly archived
      const isArchived = fv.isArchived === true;

      vehicleMap.set(fv.id, {
        ...fv,
        isCodeCar: isCode,
        isArchived,
      });
    }
  }

  // 3. Overlay any local custom vehicles added by admin (unless permanently deleted)
  for (const cv of customLocal) {
    if (deletedIds.has(cv.id)) continue;
    const isCode = isCodeVehicle(cv.id);
    const isArchived = cv.isArchived === true;

    vehicleMap.set(cv.id, {
      ...cv,
      isCodeCar: isCode,
      isArchived,
    });
  }

  const allList = Array.from(vehicleMap.values());

  // Sort: Active vehicles first, then LAST SAVED FIRST (highest timestamp at top), then custom before unedited code catalog
  return allList.sort((a, b) => {
    // 1. Active vehicles before archived
    if (!a.isArchived && b.isArchived) return -1;
    if (a.isArchived && !b.isArchived) return 1;

    // 2. Last saved first! Sort by newest saved/updated timestamp descending
    const timeA = getVehicleTimestamp(a);
    const timeB = getVehicleTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    // 3. Custom/Admin vehicles first before base code vehicles
    if (!a.isCodeCar && b.isCodeCar) return -1;
    if (a.isCodeCar && !b.isCodeCar) return 1;

    return 0;
  });
};

/**
 * Saves a vehicle (Add or Edit) from Admin Dashboard
 * Saves to localStorage immediately, triggers instant frontend re-render,
 * and syncs to Firestore in the background for snappy responsiveness.
 */
export const saveDealershipVehicle = async (vehicle: Vehicle): Promise<void> => {
  const isArchived = vehicle.isArchived ?? false;
  const now = Date.now();
  const vehicleToSave: Vehicle = {
    ...vehicle,
    isArchived,
    isCodeCar: isCodeVehicle(vehicle.id),
    savedAt: now,
    updatedAt: vehicle.updatedAt || new Date(now).toISOString()
  };

  // Remove from deleted set if newly saving/re-creating
  const deletedIds = getDeletedIds();
  if (deletedIds.has(vehicle.id)) {
    deletedIds.delete(vehicle.id);
    saveDeletedIds(deletedIds);
  }

  const archivedIds = getArchivedIds();
  if (isArchived) {
    archivedIds.add(vehicle.id);
  } else {
    archivedIds.delete(vehicle.id);
  }
  saveArchivedIds(archivedIds);

  const custom = getCustomVehicles();
  const existingIdx = custom.findIndex((v) => v.id === vehicle.id);

  if (existingIdx >= 0) {
    custom.splice(existingIdx, 1);
  }
  // Put at the very beginning (last saved first!)
  custom.unshift(vehicleToSave);
  saveCustomVehicles(custom);

  // Also update cached Firestore vehicles list so it appears everywhere immediately
  const cached = getCachedFirestoreVehicles();
  const cachedIdx = cached.findIndex((v) => v.id === vehicle.id);
  if (cachedIdx >= 0) {
    cached.splice(cachedIdx, 1);
  }
  // Put at the very beginning (last saved first!)
  cached.unshift(vehicleToSave);
  saveCachedFirestoreVehicles(cached);

  // Instantly broadcast change across all components
  notifyInventoryChange();

  // Snappy background Firestore sync:
  // Runs asynchronously without blocking the return, making vehicle saves instant and snappy!
  (async () => {
    try {
      const docRef = doc(db, 'vehicles', vehicle.id);
      const safeData = cleanForFirestore(vehicleToSave);
      await setDoc(docRef, safeData, { merge: true });
    } catch (err: any) {
      console.warn('Initial Firestore vehicle sync notice:', err?.message || err);

      // If permission or auth issue and an admin is signed in, force refresh token and retry
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
          const docRef = doc(db, 'vehicles', vehicle.id);
          const safeData = cleanForFirestore(vehicleToSave);
          await setDoc(docRef, safeData, { merge: true });
        } catch (retryErr: any) {
          console.warn('Firestore vehicle sync retry notice:', retryErr?.message || retryErr);
        }
      }
    }
  })();
};

/**
 * Deletes a vehicle completely:
 * - Removes from active catalog and inventory immediately
 * - Marks in permanent deletion set so it never reappears
 * - Deletes from Firestore document database
 */
export const removeDealershipVehicle = async (id: string): Promise<void> => {
  // 1. Mark in permanent deletion set
  const deletedIds = getDeletedIds();
  deletedIds.add(id);
  saveDeletedIds(deletedIds);

  // 2. Remove from archived IDs
  const archivedIds = getArchivedIds();
  archivedIds.delete(id);
  saveArchivedIds(archivedIds);

  // 3. Remove from cached Firestore vehicles list
  const cached = getCachedFirestoreVehicles().filter((v) => v.id !== id);
  saveCachedFirestoreVehicles(cached);

  // 4. Remove from custom local vehicles storage
  const custom = getCustomVehicles().filter((v) => v.id !== id);
  saveCustomVehicles(custom);

  // 5. Delete document from Firestore
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (err) {
    console.warn('Firestore vehicle delete notice:', err);
  }

  notifyInventoryChange();
};

/**
 * Toggles a vehicle's archived status:
 * - If archived -> Restores to front-end showroom (isArchived = false)
 * - If active -> Archives and hides from front-end showroom (isArchived = true)
 */
export const toggleVehicleArchiveStatus = async (
  vehicle: Vehicle,
  targetStatus?: boolean
): Promise<boolean> => {
  const archivedIds = getArchivedIds();
  const shouldArchive =
    targetStatus !== undefined ? targetStatus : !vehicle.isArchived;

  if (shouldArchive) {
    archivedIds.add(vehicle.id);
  } else {
    archivedIds.delete(vehicle.id);
  }
  saveArchivedIds(archivedIds);

  // If this is a custom vehicle, update its isArchived in custom storage as well
  if (!isCodeVehicle(vehicle.id)) {
    const custom = getCustomVehicles();
    const idx = custom.findIndex((v) => v.id === vehicle.id);
    if (idx >= 0) {
      custom[idx].isArchived = shouldArchive;
      saveCustomVehicles(custom);
    }
  }

  notifyInventoryChange();

  // Sync to Firestore
  try {
    const docRef = doc(db, 'vehicles', vehicle.id);
    await setDoc(
      docRef,
      cleanForFirestore({
        ...vehicle,
        isArchived: shouldArchive,
        archivedAt: shouldArchive ? new Date().toISOString() : null,
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore archive status sync notice:', err);
  }

  return shouldArchive;
};

/**
 * Restores ALL code-added cars back into the active showroom
 */
export const restoreAllCodeCars = async (): Promise<void> => {
  const archivedIds = getArchivedIds();
  const deletedIds = getDeletedIds();
  for (const id of CODE_CAR_IDS) {
    archivedIds.delete(id);
    deletedIds.delete(id);
  }
  saveArchivedIds(archivedIds);
  saveDeletedIds(deletedIds);
  notifyInventoryChange();
};

/**
 * Archives ALL code-added cars, removing them from the active showroom
 */
export const archiveAllCodeCars = async (): Promise<void> => {
  const archivedIds = getArchivedIds();
  for (const id of CODE_CAR_IDS) {
    archivedIds.add(id);
  }
  saveArchivedIds(archivedIds);
  notifyInventoryChange();
};
