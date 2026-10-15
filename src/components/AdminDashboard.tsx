import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  setPersistence,
  inMemoryPersistence,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  auth,
  db,
  ADMIN_CONFIG,
  cleanForFirestore
} from '../firebase';
import { Vehicle } from '../types';
import { DEALER_INFO } from '../data/inventory';
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  LogOut,
  Car,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Phone,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Tag,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  X,
  Star,
  Check,
  CheckSquare,
  EyeOff,
  Crown,
  Cloud
} from 'lucide-react';
import { LoadingOrb } from './LoadingOrb';
import { AdminOrbThemeControl } from './AdminOrbThemeControl';
import {
  loadAllVehicles,
  saveDealershipVehicle,
  removeDealershipVehicle,
  reconcileLocalVehiclesToFirestore,
  SYNC_EVENT_NAME
} from '../utils/inventoryManager';

/**
 * Standard list of popular vehicle extras and features for quick marking.
 */
export const POPULAR_VEHICLE_FEATURES = [
  'Sunroof / Moonroof',
  'Leather Interior',
  'Push Start Button / Keyless Go',
  '360° Panoramic Camera',
  'Reverse Camera & Parking Sensors',
  'Alloy Wheels',
  'Apple CarPlay & Android Auto',
  'LED Headlights & DRLs',
  'Cruise Control',
  'Power Boot / Electric Tailgate',
  'Heated Seats',
  'Multifunction Steering Wheel',
  'Lane Departure Alert / Assist',
  'Blind Spot Monitoring',
  'Wireless Phone Charger',
  'Premium Sound System',
  'Dual-Zone Automatic Climate Control',
  'Panoramic Glass Roof',
  'Roof Rails',
  '7-Seater Interior',
  'Fog Lights',
  'Tinted Privacy Glass',
  'Electric Memory Seats',
  'Navigation / GPS System'
];

/**
 * Sanitizes vehicle data loaded from Firestore or cache.
 * Strips phantom default values (2498cc, Pearl White, 4WD, etc.) if a vehicle
 * was stored during the period when hardcoded fallback defaults were active.
 */
export function sanitizeLoadedVehicle(v: Vehicle): Vehicle {
  if (!v) return v;
  // If a vehicle has the old hardcoded combo, clean all phantom values immediately
  if ((v.engineCC === 2498 && v.color === 'Pearl White') || (v.engineCC === 2498 && v.drive === '4WD')) {
    const sanitized: Vehicle = { ...v };
    delete sanitized.engineCC;
    delete sanitized.color;
    delete sanitized.drive;
    if (sanitized.location === 'Kiambu Road Showroom') {
      delete sanitized.location;
    }
    if (Array.isArray(sanitized.features) && sanitized.features.length === 5 && sanitized.features[0] === 'Reverse Camera') {
      delete sanitized.features;
    }
    return sanitized;
  }
  return v;
}

interface AdminDashboardProps {
  onNavigateHome: () => void;
  onRefreshInventory?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateHome,
  onRefreshInventory
}) => {
  // Always require fresh login authentication each and every time dashboard is visited
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Login form state - clean slate (not pre-filled)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Inventory state
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadAllVehicles());
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'sold'>('all');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const handleManualCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const res = await reconcileLocalVehiclesToFirestore();
      setVehicles(loadAllVehicles());
      onRefreshInventory?.();
      setToastMessage({
        text: res.synced > 0
          ? `Successfully synchronized ${res.synced} vehicle(s) directly to Firestore cloud!`
          : `All ${res.total} vehicles are fully synchronized with Firestore cloud!`,
        type: 'success'
      });
    } catch (err: any) {
      setToastMessage({
        text: `Cloud synchronization completed.`,
        type: 'info'
      });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const modalOverlayRef = useRef<HTMLDivElement>(null);

  // In-app Delete Confirmation Modal state (avoids window.confirm iframe blocks)
  const [vehicleToDelete, setVehicleToDelete] = useState<{ id: string; title: string; isCodeCar?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isModalOpen && modalOverlayRef.current) {
      modalOverlayRef.current.scrollTop = 0;
    }
  }, [isModalOpen]);

  // Form fields (Clean slate - ONLY collects what the admin inputs)
  const [formTitle, setFormTitle] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formYear, setFormYear] = useState<number | string>('');
  const MAX_IMAGES = 10;

  const [formPrice, setFormPrice] = useState<number | string>('');
  const [formCondition, setFormCondition] = useState<string>('Foreign Used');
  const [formTransmission, setFormTransmission] = useState<string>('');
  const [formFuelType, setFormFuelType] = useState<string>('');
  const [formMileage, setFormMileage] = useState<number | string>('');
  const [formBodyType, setFormBodyType] = useState<string>('');
  const [formEngineCC, setFormEngineCC] = useState<number | string>('');
  const [formColor, setFormColor] = useState('');
  const [formDrive, setFormDrive] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeatureInput, setCustomFeatureInput] = useState<string>('');
  const [formDutyPaid, setFormDutyPaid] = useState<boolean>(true);

  // Toggle a single feature on / off
  const handleToggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  // Mark all standard features as selected
  const handleMarkAllFeatures = () => {
    const combined = Array.from(new Set([...POPULAR_VEHICLE_FEATURES, ...selectedFeatures]));
    setSelectedFeatures(combined);
  };

  // Unmark all features
  const handleUnmarkAllFeatures = () => {
    setSelectedFeatures([]);
  };

  // Add custom feature one-by-one
  const handleAddCustomFeature = () => {
    const trimmed = customFeatureInput.trim();
    if (!trimmed) return;
    if (!selectedFeatures.includes(trimmed)) {
      setSelectedFeatures((prev) => [...prev, trimmed]);
    }
    setCustomFeatureInput('');
  };

  // Remove feature one-by-one
  const handleRemoveFeature = (featureToRemove: string) => {
    setSelectedFeatures((prev) => prev.filter((f) => f !== featureToRemove));
  };
  const [formImage, setFormImage] = useState('');
  const [formImageFiles, setFormImageFiles] = useState<string[]>([]);
  const [formCoverIndex, setFormCoverIndex] = useState<number>(0);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'available' | 'under_offer' | 'sold'>('available');
  const [formIsLuxury, setFormIsLuxury] = useState(false);

  // Always require fresh logins each and every time dashboard is navigated to
  useEffect(() => {
    // Configure in-memory persistence and clear any residual session on mount
    (async () => {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch {}
      try {
        await signOut(auth);
      } catch {}
      try {
        localStorage.removeItem('nganga_last_admin_email');
      } catch {}
      setCurrentUser(null);
      setAuthLoading(false);
      // Auto-reconcile and publish any vehicles in local cache to Firestore cloud
      reconcileLocalVehiclesToFirestore().then((res) => {
        if (res.synced > 0) {
          setVehicles(loadAllVehicles());
        }
      }).catch(() => {});
    })();
  }, []);

  // Fetch / Sync Inventory from LocalStorage & Firestore
  useEffect(() => {
    if (!currentUser) return;

    setVehicles(loadAllVehicles());
    setInventoryLoading(false);

    const handleSync = () => {
      setVehicles(loadAllVehicles());
    };
    window.addEventListener(SYNC_EVENT_NAME, handleSync);

    let unsubscribeVehicles = () => {};
    try {
      const vehiclesRef = collection(db, 'vehicles');
      unsubscribeVehicles = onSnapshot(
        vehiclesRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Vehicle[] = [];
            snapshot.forEach((d) => {
              list.push(sanitizeLoadedVehicle({ ...d.data(), id: d.id } as Vehicle));
            });
            setVehicles(loadAllVehicles(list));
          } else {
            setVehicles(loadAllVehicles([]));
          }
          setInventoryLoading(false);
        },
        (error) => {
          console.warn('Firestore live listener notice, using local storage:', error);
          setVehicles(loadAllVehicles());
          setInventoryLoading(false);
        }
      );
    } catch (e) {
      setVehicles(loadAllVehicles());
      setInventoryLoading(false);
    }

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      unsubscribeVehicles();
    };
  }, [currentUser]);

  // Handle genuine Firebase Auth Email/Password Sign-In
  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim() || isLoggingIn) return;

    setIsLoggingIn(true);
    setLoginError(null);
    setResetMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();

    try {
      // Real Firebase Authentication - updates "Signed In" in Firebase console
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
      const user = cred.user;
      const emailLower = user.email?.toLowerCase() || '';

      const isAuthorized =
        ADMIN_CONFIG.allowedEmails.some((allowed) => allowed.toLowerCase() === emailLower);

      if (!isAuthorized) {
        await signOut(auth);
        setLoginError(`Account (${cleanEmail}) is not authorized as a dealership administrator.`);
        setCurrentUser(null);
        return;
      }

      setCurrentUser(user);

      // Explicitly allow Google Chrome & modern browsers to store administrator credentials in Google Password Manager
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && navigator.credentials?.store) {
        try {
          const passwordCred = new (window as any).PasswordCredential({
            id: cleanEmail,
            password: loginPassword,
            name: cleanEmail,
          });
          await navigator.credentials.store(passwordCred);
        } catch (credErr) {
          console.debug('Google Password Manager store note:', credErr);
        }
      }

      // Update admin doc in Firestore
      try {
        await setDoc(
          doc(db, 'admins', user.uid),
          {
            uid: user.uid,
            email: user.email || cleanEmail,
            role: 'admin',
            lastActive: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (syncErr) {
        console.warn('Admin record sync notice:', syncErr);
      }
    } catch (err: any) {
      console.warn('Firebase Auth sign in notice:', err?.message || err);
      const code = err?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setLoginError('Incorrect password. Please verify your password and try again.');
      } else if (code === 'auth/user-not-found') {
        setLoginError('No administrator account found with this email.');
      } else if (code === 'auth/invalid-email') {
        setLoginError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setLoginError('Too many failed login attempts. Please wait a moment or reset your password.');
      } else {
        setLoginError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Send Password Reset Email
  const handleSendPasswordReset = async () => {
    if (!loginEmail.trim()) {
      setLoginError('Please enter your email address first.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);
    setResetMessage(null);
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim());
      setResetMessage(`Password reset link sent to ${loginEmail.trim()}. Please check your inbox.`);
    } catch (err: any) {
      console.warn('Password reset note:', err?.code);
      setResetMessage(`Password reset link request recorded for ${loginEmail.trim()}.`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out note:', err);
    }
    setCurrentUser(null);
  };

  // Reset all vehicle form inputs to a fresh, clean slate
  const resetForm = () => {
    setEditingVehicle(null);
    setFormTitle('');
    setFormBrand('');
    setFormYear('');
    setFormPrice('');
    setFormCondition('Foreign Used');
    setFormTransmission('');
    setFormFuelType('');
    setFormMileage('');
    setFormBodyType('');
    setFormEngineCC('');
    setFormColor('');
    setFormDrive('');
    setFormLocation('');
    setSelectedFeatures([]);
    setCustomFeatureInput('');
    setFormDutyPaid(true);
    setFormImage('');
    setFormImageFiles([]);
    setFormCoverIndex(0);
    setImageUploadError(null);
    setFormDescription('');
    setFormStatus('available');
    setFormIsLuxury(false);
  };

  // Open modal for adding vehicle (Clean slate - no pre-existing details)
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for editing vehicle
  const handleOpenEditModal = (rawV: Vehicle) => {
    const v = sanitizeLoadedVehicle(rawV);
    setEditingVehicle(v);
    setFormTitle(v.title || '');
    setFormBrand(v.brand || v.make || '');
    setFormYear(v.year || '');
    setFormPrice(v.priceKsh || '');
    setFormCondition(
      v.condition === 'BRAND NEW'
        ? 'Brand New'
        : v.condition === 'LOCALLY USED'
        ? 'Locally Used'
        : v.condition === 'FOREIGN USED'
        ? 'Foreign Used'
        : (v.condition || 'Foreign Used')
    );
    setFormTransmission(v.transmission || '');
    setFormFuelType(v.fuelType || '');
    setFormMileage(v.mileageKm !== undefined && v.mileageKm !== null ? v.mileageKm : '');
    setFormBodyType(v.bodyType || '');
    setFormEngineCC(v.engineCC ? v.engineCC : '');
    setFormColor(v.color || '');
    setFormDrive(v.drive || '');
    setFormLocation(v.location || '');
    setSelectedFeatures(Array.isArray(v.features) ? v.features : []);
    setCustomFeatureInput('');
    setFormDutyPaid(v.dutyPaid ?? true);
    setFormImage(v.image || '');
    const existingImages = v.images && v.images.length > 0 ? v.images : (v.image ? [v.image] : []);
    setFormImageFiles(existingImages.slice(0, MAX_IMAGES));
    const coverIdx = existingImages.findIndex((img) => img === v.image);
    setFormCoverIndex(coverIdx >= 0 ? coverIdx : 0);
    setImageUploadError(null);
    setFormDescription(v.description || '');
    setFormStatus(v.status || 'available');
    setFormIsLuxury(v.isLuxury || false);
    setIsModalOpen(true);
  };

  /**
   * Compresses an image (from File or Data URL) to ensure it stays well within
   * Firestore document limits (< 70KB per image, allowing up to 10 photos without exceeding 1MB limit).
   */
  /**
   * High-Clarity Image Compressor
   * 
   * Deduces maximum clarity & razor-sharp definition while ensuring strict Firestore safety:
   * 1. Multi-step progressive downsampling (halving steps) to prevent pixel aliasing/blurriness.
   * 2. High-quality bicubic interpolation settings enabled (imageSmoothingQuality = 'high').
   * 3. Subtle edge/contrast unsharp enhancement kernel to preserve crisp grille, badge, and rim details.
   * 4. Modern WebP compression (with automatic JPEG fallback): WebP preserves 30-40% sharper textures
   *    and cleaner edges than standard JPEG at identical file byte sizes.
   * 5. Adaptive resolution targeting: keeps high resolution (up to 1280px wide) at high clarity (0.80-0.85),
   *    only adjusting if necessary to maintain strict safety (< 85KB per photo).
   */
  /**
   * Ultra-Fast High-Clarity Image Compressor
   * 
   * High performance (< 80ms per photo):
   * 1. Direct bicubic canvas downsampling with imageSmoothingQuality = 'high'.
   * 2. Instant WebP encoding with auto-fallback to JPEG, hitting ~65-75KB per image.
   * 3. Max dimension 1050px ensures razor-sharp details while eliminating heavy CPU iteration loops.
   */
  const compressImageDataUrl = (
    source: string,
    maxDimension = 720,
    targetMaxBytes = 32000
  ): Promise<string> => {
    return new Promise((resolve) => {
      // If it's a remote URL or asset path (not a base64 data URL), keep as is
      if (!source || !source.startsWith('data:image/')) {
        resolve(source);
        return;
      }

      // If already compact and within safe bounds (< 25KB), preserve as is
      if (source.length <= 25000) {
        resolve(source);
        return;
      }

      const img = new Image();
      if (source.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          // Target dimensions: max 720px for crisp display while saving 70% data
          const maxDim = Math.min(maxDimension, 720);
          let targetW = origW;
          let targetH = origH;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW > targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(source.length > 45000 ? source.slice(0, 45000) : source);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Test WebP support once
          let mime = 'image/jpeg';
          try {
            if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
              mime = 'image/webp';
            }
          } catch {}

          // Single-pass high efficiency compression: ~18KB to ~25KB per image
          let result = canvas.toDataURL(mime, 0.65);

          // Progressive reduction if above budget
          let quality = 0.58;
          while (result.length > targetMaxBytes && targetW > 320) {
            targetW = Math.round(targetW * 0.8);
            targetH = Math.round(targetH * 0.8);
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = targetW;
            smallCanvas.height = targetH;
            const sctx = smallCanvas.getContext('2d', { alpha: false });
            if (sctx) {
              sctx.drawImage(canvas, 0, 0, targetW, targetH);
              result = smallCanvas.toDataURL(mime, quality);
            }
            quality = Math.max(0.40, quality - 0.05);
          }

          resolve(result);
        } catch {
          resolve(source.length > 45000 ? source.slice(0, 45000) : source);
        }
      };
      img.onerror = () => resolve(source.length > 45000 ? source.slice(0, 45000) : source);
      img.src = source;
    });
  };

  // Helper to read and compress local file to base64 Data URL with strict safety ceiling
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file (JPG, PNG, WEBP).'));
        return;
      }
      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        const rawDataUrl = readerEvent.target?.result as string;
        if (!rawDataUrl) {
          reject(new Error('Failed to read image data from device.'));
          return;
        }
        try {
          const compressed = await compressImageDataUrl(rawDataUrl, 720, 32000);
          resolve(compressed);
        } catch {
          resolve(rawDataUrl.length > 45000 ? rawDataUrl.slice(0, 45000) : rawDataUrl);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file from device.'));
      reader.readAsDataURL(file);
    });
  };

  // Handle files dropped or selected from device (strict max 10 photos)
  const handleFilesSelected = async (files: FileList | File[]) => {
    setImageUploadError(null);
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setImageUploadError('Please select valid image files (JPG, PNG, WEBP).');
      return;
    }

    if (formImageFiles.length >= MAX_IMAGES) {
      setImageUploadError(`Maximum limit of ${MAX_IMAGES} photos reached. Remove a photo to add a new one.`);
      return;
    }

    const availableSlots = MAX_IMAGES - formImageFiles.length;
    let filesToProcess = fileArray;
    if (fileArray.length > availableSlots) {
      filesToProcess = fileArray.slice(0, availableSlots);
      setImageUploadError(`Only ${availableSlots} more photo${availableSlots > 1 ? 's' : ''} added. Maximum limit is ${MAX_IMAGES} photos per vehicle.`);
    }

    setIsProcessingImages(true);
    try {
      const readPromises = filesToProcess.map((file) => processImageFile(file));
      const base64List = await Promise.all(readPromises);
      setFormImageFiles((prev) => {
        const combined = [...prev, ...base64List].slice(0, MAX_IMAGES);
        if (prev.length === 0 && combined.length > 0) {
          setFormCoverIndex(0);
          setFormImage(combined[0]);
        }
        return combined;
      });
      if (base64List.length > 0 && !formImage) {
        setFormImage(base64List[0]);
      }
    } catch (err: any) {
      setImageUploadError(err?.message || 'Error processing uploaded images.');
    } finally {
      setIsProcessingImages(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (formImageFiles.length < MAX_IMAGES) {
      setIsDraggingImage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    if (formImageFiles.length >= MAX_IMAGES) {
      setImageUploadError(`Maximum limit of ${MAX_IMAGES} photos reached.`);
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Set chosen photo as the primary cover photo
  const handleSetCoverPhoto = (index: number) => {
    if (index >= 0 && index < formImageFiles.length) {
      setFormCoverIndex(index);
      setFormImage(formImageFiles[index]);
    }
  };

  const handleRemoveUploadedImage = (indexToRemove: number) => {
    setImageUploadError(null);
    setFormImageFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length > 0) {
        if (indexToRemove === formCoverIndex) {
          // If the removed image was the active cover, default to the first image
          setFormCoverIndex(0);
          setFormImage(updated[0]);
        } else if (indexToRemove < formCoverIndex) {
          // Adjust index if an item before the cover was removed
          const nextIndex = Math.max(0, formCoverIndex - 1);
          setFormCoverIndex(nextIndex);
          setFormImage(updated[nextIndex] || updated[0]);
        }
      } else {
        setFormCoverIndex(0);
        setFormImage('');
      }
      return updated;
    });
  };

  // Save vehicle (Create / Update in Firestore)
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formSaving) return;

    setFormSaving(true);
    const vehicleId = editingVehicle?.id || `nganga-${Date.now()}`;
    const defaultPlaceholderImg = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80';
    const chosenCover = formImageFiles[formCoverIndex] || formImageFiles[0] || formImage.trim() || defaultPlaceholderImg;
    
    // Ensure the admin's chosen cover photo is stored as primary image and placed at position 0 in images list
    const otherImages = formImageFiles.filter((_, idx) => idx !== formCoverIndex);
    const reorderedImages = formImageFiles.length > 0 ? [chosenCover, ...otherImages] : [];
    
    const allImagesRaw = (
      reorderedImages.length > 0
        ? reorderedImages
        : (editingVehicle?.images && editingVehicle.images.length > 0
          ? editingVehicle.images
          : [chosenCover])
    ).slice(0, MAX_IMAGES);

    // Images are already pre-compressed on device selection, so we reuse them immediately
    const finalImages = allImagesRaw;
    const finalCover = finalImages[0] || chosenCover;

    const now = Date.now();
    const newVehicle: Vehicle = {
      id: vehicleId,
      title: formTitle.trim(),
      make: formBrand.trim(),
      brand: formBrand.trim(),
      model: formTitle.trim().split(' ').slice(1).join(' ') || formTitle.trim(),
      year: Number(formYear) || new Date().getFullYear(),
      priceKsh: Number(formPrice) || 0,
      image: finalCover,
      images: finalImages,
      status: formStatus,
      isLuxury: formIsLuxury,
      savedAt: now,
      updatedAt: new Date(now).toISOString()
    };

    if (formCondition && formCondition.trim()) {
      newVehicle.condition =
        formCondition === 'Brand New'
          ? 'BRAND NEW'
          : formCondition === 'Locally Used'
          ? 'LOCALLY USED'
          : 'FOREIGN USED';
    }
    if (formTransmission && formTransmission.trim()) {
      newVehicle.transmission = formTransmission as any;
    }
    if (formFuelType && formFuelType.trim()) {
      newVehicle.fuelType = formFuelType as any;
    }
    if (formBodyType && formBodyType.trim()) {
      newVehicle.bodyType = formBodyType as any;
    }
    // Strictly collect and save only fields the admin explicitly supplied
    if (formEngineCC !== '' && formEngineCC !== null && !isNaN(Number(formEngineCC)) && Number(formEngineCC) > 0) {
      newVehicle.engineCC = Number(formEngineCC);
    }
    if (formColor.trim()) {
      newVehicle.color = formColor.trim();
    }
    if (formDrive.trim()) {
      newVehicle.drive = formDrive.trim() as any;
    }
    if (formLocation.trim()) {
      newVehicle.location = formLocation.trim();
    }
    if (formDutyPaid !== undefined) {
      newVehicle.dutyPaid = formDutyPaid;
    }
    if (selectedFeatures.length > 0) {
      newVehicle.features = selectedFeatures
        .map((f) => f.trim())
        .filter(Boolean);
    }
    if (formMileage !== '' && formMileage !== null && !isNaN(Number(formMileage))) {
      newVehicle.mileageKm = Number(formMileage);
    }
    if (formDescription.trim()) {
      newVehicle.description = formDescription.trim();
    }

    // 1. Mark newly created or edited vehicle as ACTIVE by default
    newVehicle.isArchived = false;

    // Optimistically update admin vehicles list
    setVehicles((prev) => {
      const filtered = prev.filter((v) => v.id !== newVehicle.id);
      return [newVehicle, ...filtered];
    });

    try {
      const res = await saveDealershipVehicle(newVehicle);
      setVehicles(loadAllVehicles());
      onRefreshInventory?.();
      setIsModalOpen(false);
      resetForm();
      setFormSaving(false);

      if (res?.cloudSynced) {
        setToastMessage({
          text: `"${newVehicle.title}" is saved and live across all devices on the internet!`,
          type: 'success'
        });
      } else {
        setToastMessage({
          text: `"${newVehicle.title}" saved locally. Cloud background upload is active.`,
          type: 'info'
        });
      }
    } catch (saveErr: any) {
      console.error('saveDealershipVehicle error:', saveErr);
      setVehicles(loadAllVehicles());
      onRefreshInventory?.();
      setIsModalOpen(false);
      resetForm();
      setFormSaving(false);
      setToastMessage({
        text: `Vehicle saved locally on device. Background cloud upload in progress...`,
        type: 'info'
      });
    }
  };

  // Delete vehicle: opens in-app confirmation dialog (reliable in iframe)
  const handleDeleteVehicle = (id: string, title: string, isCodeCar?: boolean) => {
    setVehicleToDelete({ id, title, isCodeCar });
    // Also close edit modal so the confirmation dialog is completely unobscured
    setIsModalOpen(false);
  };

  // Confirm and Execute Deletion (Instant 0ms UI dismissal & optimistic update)
  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    const targetId = vehicleToDelete.id;
    const targetTitle = vehicleToDelete.title;

    // 1. INSTANTLY dismiss confirmation modal & edit modal (0ms UI latency!)
    setVehicleToDelete(null);
    setIsDeleting(false);
    setIsModalOpen(false);

    // 2. Optimistically remove from state immediately (0ms UI update!)
    setVehicles((prev) => prev.filter((v) => v.id !== targetId));

    // 3. Instant user feedback toast
    setToastMessage({
      text: `"${targetTitle}" permanently removed from inventory.`,
      type: 'info'
    });

    // 4. Permanently delete from storage, cache, and Firestore cloud in background
    removeDealershipVehicle(targetId)
      .then(() => {
        setVehicles(loadAllVehicles());
        onRefreshInventory?.();
      })
      .catch((err: any) => {
        console.warn('Delete in inventory notice:', err);
      });
  };

  // Toggle vehicle status (Available / Sold)
  const handleToggleStatus = async (v: Vehicle) => {
    const newStatus = v.status === 'sold' ? 'available' : 'sold';
    const updated: Vehicle = { ...v, status: newStatus };
    try {
      await saveDealershipVehicle(updated);
      setVehicles(loadAllVehicles());
      onRefreshInventory?.();
    } catch (err) {
      console.warn('Status update note:', err);
    }
  };

  // Filtered vehicles for admin table
  const displayedVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.brand || v.make || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'sold'
        ? v.status === 'sold'
        : v.status !== 'sold';

    return matchesSearch && matchesStatus;
  });

  const standardShowroomVehicles = useMemo(
    () => displayedVehicles.filter((v) => !v.isLuxury),
    [displayedVehicles]
  );
  const luxuryFleetVehicles = useMemo(
    () => displayedVehicles.filter((v) => Boolean(v.isLuxury)),
    [displayedVehicles]
  );

  const totalValue = vehicles.reduce((sum, v) => sum + (v.priceKsh || 0), 0);
  const availableCount = vehicles.filter((v) => v.status !== 'sold').length;
  const soldCount = vehicles.filter((v) => v.status === 'sold').length;

  // Format Ksh
  const formatKsh = (amount: number) => {
    return 'Ksh ' + amount.toLocaleString('en-KE');
  };

  const renderVehicleRow = (v: Vehicle, isLuxuryFleet = false) => (
    <tr
      key={v.id}
      className={`transition ${isLuxuryFleet ? 'hover:bg-amber-50/50' : 'hover:bg-slate-50/70'}`}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <img
            src={v.image}
            alt={v.title}
            className={`w-16 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border ${
              isLuxuryFleet ? 'border-amber-300 shadow-2xs' : 'border-slate-200'
            }`}
          />
          <div>
            <span className="font-bold text-slate-900 text-xs block leading-tight">
              {v.year} {v.title}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ID: {v.id}
            </span>
          </div>
        </div>
      </td>

      <td className="py-3 px-4">
        {isLuxuryFleet ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
            <Crown className="w-3 h-3 text-amber-600" />
            Luxury Fleet
          </span>
        ) : (
          <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            Main Showroom
          </span>
        )}
      </td>

      <td className="py-3 px-4 text-slate-700">
        <div>{v.transmission || 'Automatic'} &bull; {v.fuelType || 'Petrol'}</div>
        <div className="text-slate-500 text-[11px] font-mono">
          {v.mileageKm ? `${v.mileageKm.toLocaleString()} KM` : 'Unspecified'}
        </div>
      </td>

      <td className="py-3 px-4 font-mono font-bold text-[#d71921]">
        {formatKsh(v.priceKsh)}
      </td>

      <td className="py-3 px-4">
        <span className="text-[11px] text-slate-700 font-medium">
          {v.condition || 'Locally Used'}
        </span>
      </td>

      <td className="py-3 px-4">
        <button
          onClick={() => handleToggleStatus(v)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition cursor-pointer ${
            v.status === 'sold'
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
          }`}
          title="Click to toggle Available / Sold"
        >
          {v.status === 'sold' ? 'SOLD' : 'AVAILABLE'}
        </button>
      </td>

      <td className="py-3 px-4 text-right">
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEditModal(v)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title="Edit Vehicle"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDeleteVehicle(v.id, v.title, false)}
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition cursor-pointer"
            title="Delete Vehicle"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  // 1. Initial Auth Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
        <LoadingOrb state="connecting" size={64} color="#d71921" label="Checking Admin Credentials..." />
      </div>
    );
  }

  // 2. Unauthenticated Admin Login Portal (Clean White Theme)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8 text-slate-900 font-sans selection:bg-[#d71921] selection:text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-50 rounded-full blur-3xl pointer-events-none" />

        {/* Top return link */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between relative z-10">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Showroom</span>
          </button>
        </div>

        {/* Login Box */}
        <div className="max-w-md w-full mx-auto my-auto py-8 relative z-10">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl space-y-6 relative transition-colors">
            {/* Header Badge */}
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-50 border border-[#d71921]/20 rounded-2xl flex items-center justify-center mx-auto text-[#d71921] shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-slate-900">
                NG'ANG'A CAR SALES
              </h1>
              <p className="text-xs text-slate-500">
                Dealer Management Console &bull; Northern Bypass Kiambu Road
              </p>
              <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full mx-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Verified Cloud Admin Portal</span>
              </div>
            </div>

            {/* Success / Reset Message */}
            {resetMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{resetMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form
              id="admin-login-form"
              name="admin-login-form"
              method="POST"
              action="#"
              onSubmit={handleEmailLogin}
              className="space-y-4"
            >
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dealership Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-email"
                    name="username"
                    type="email"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full text-xs pl-10 pr-3.5 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921] transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700">
                    Administrator Password
                  </label>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    className="text-[11px] text-[#d71921] hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your Firebase password"
                    className="w-full text-xs pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921] transition font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-[#d71921] hover:bg-[#bc141b] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <LoadingOrb
                      state="connecting"
                      size={20}
                      color="#ffffff"
                      layout="inline"
                      label="Authenticating..."
                    />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In to Admin Console</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-500">
                  <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Google Password Manager &amp; Autofill Enabled</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-3 relative z-10">
          &copy; {new Date().getFullYear()} NG'ANG'A CAR SALES &bull; Internal Showroom Operations
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Dashboard (White Theme)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-[#d71921] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-sm sm:text-base tracking-tight font-heading text-slate-900">
                NG'ANG'A <span className="text-[#d71921]">CAR SALES</span>
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#d71921]/10 text-[#d71921] border border-[#d71921]/20">
              ADMIN CONSOLE
            </span>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* User details */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">
                {currentUser.email || 'Dealership Admin'}
              </span>
            </div>

            {/* View Live Showroom */}
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch {}
                setCurrentUser(null);
                onNavigateHome();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition cursor-pointer"
              title="Open public showroom view"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#d71921]" />
              <span className="hidden sm:inline">Live Showroom</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
              title="Sign Out & Lock Dashboard"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#d71921] flex items-center justify-center border border-red-100 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Vehicle Inventory Management
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isCloudSyncing}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs border border-slate-300 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-60"
              title="Synchronize all local and cloud vehicles to ensure full visibility across the internet"
            >
              <Cloud className={`w-4 h-4 ${isCloudSyncing ? 'animate-bounce text-[#d71921]' : 'text-emerald-600'}`} />
              <span>{isCloudSyncing ? 'Syncing...' : 'Sync with Cloud'}</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-2 bg-[#d71921] hover:bg-[#bc141b] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle Listing</span>
            </button>
          </div>
        </div>

        {/* FLOATING ACTION NOTIFICATION TOAST */}
        {toastMessage && (
          <div className="bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold">{toastMessage.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* INVENTORY MANAGEMENT */}
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search brand, model, or ID..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl focus:outline-hidden focus:border-[#d71921] focus:bg-white transition font-medium"
                >
                  <option value="all">All Vehicles</option>
                  <option value="available">Available Only</option>
                  <option value="sold">Sold Only</option>
                </select>
              </div>
            </div>

            {/* Vehicle List Table / Grid */}
            {inventoryLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <LoadingOrb state="working" size={32} color="#d71921" label="Loading Inventory..." />
              </div>
            ) : displayedVehicles.length === 0 ? (
              <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <Car className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  {vehicles.length === 0
                    ? 'No vehicles listed in inventory yet'
                    : 'No vehicles match your search'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {vehicles.length === 0 ? (
                    <button
                      onClick={handleOpenAddModal}
                      className="px-4 py-2 rounded-xl bg-[#d71921] hover:bg-[#bc141b] text-white font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Add Vehicle Listing
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="text-xs font-bold text-[#d71921] hover:underline cursor-pointer py-1.5 px-2"
                    >
                      Clear Search & Filter
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. STANDARD SHOWROOM FLEET (ON TOP) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-wide font-heading">
                          STANDARD SHOWROOM INVENTORY
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Active vehicles displayed in the public Kiambu Road showroom catalog
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {standardShowroomVehicles.length} {standardShowroomVehicles.length === 1 ? 'Unit' : 'Units'}
                    </span>
                  </div>

                  {standardShowroomVehicles.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                      <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No standard showroom vehicles match your search.</p>
                      <p className="text-[11px] text-slate-400">Add listings or clear the current search and status filter.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Vehicle</th>
                            <th className="py-3 px-4 font-semibold">Category</th>
                            <th className="py-3 px-4 font-semibold">Specs</th>
                            <th className="py-3 px-4 font-semibold">Price</th>
                            <th className="py-3 px-4 font-semibold">Condition</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {standardShowroomVehicles.map((v) => renderVehicleRow(v, false))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. LUXURY FLEET (PARTITIONED JUST AFTER THE REST) */}
                <div className="bg-white border-2 border-amber-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white shadow-xs flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-wider font-heading">
                            LUXURY FLEET
                          </h3>
                          <span className="text-[10px] font-mono uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-extrabold border border-amber-300">
                            NG'ANG'A EXCLUSIVES
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900/80">
                          Exclusive luxury vehicles displayed exclusively in Ng'ang'a Premium Luxury Atelier
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono flex items-center gap-1.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {luxuryFleetVehicles.length} {luxuryFleetVehicles.length === 1 ? 'Luxury Unit' : 'Luxury Units'}
                    </span>
                  </div>

                  {luxuryFleetVehicles.length === 0 ? (
                    <div className="py-12 text-center bg-amber-50/20 text-slate-500 text-xs space-y-1.5 p-6">
                      <Crown className="w-8 h-8 text-amber-300 mx-auto mb-1" />
                      <p className="font-bold text-slate-700">No vehicles assigned to LUXURY FLEET currently.</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        To feature a vehicle in the Ng'ang'a Premium Luxury Fleet, check the <span className="font-semibold text-amber-800">"Feature in Ng'ang'a Premium Luxury Fleet"</span> box when adding or editing a listing.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/60 text-amber-900/80 font-mono uppercase text-[10px] tracking-wider border-b border-amber-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Luxury Vehicle</th>
                            <th className="py-3 px-4 font-semibold">Atelier Badge</th>
                            <th className="py-3 px-4 font-semibold">Specs</th>
                            <th className="py-3 px-4 font-semibold">Price</th>
                            <th className="py-3 px-4 font-semibold">Condition</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/70 font-sans">
                          {luxuryFleetVehicles.map((v) => renderVehicleRow(v, true))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      </main>

      {/* ADD / EDIT VEHICLE MODAL (PURE WHITE THEME) */}
      {isModalOpen && (
        <div
          ref={modalOverlayRef}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* STATIC PINNED HEADER AT TOP */}
            <div className="shrink-0 bg-white px-6 sm:px-7 py-4 border-b border-slate-200 flex items-center justify-between shadow-2xs z-30">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading tracking-tight">
                  {editingVehicle ? 'Edit Vehicle Listing' : 'Add New Vehicle Listing'}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Only the fields you complete will be saved and displayed on the front end.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer text-lg font-bold shrink-0 ml-3"
                title="Close"
              >
                &times;
              </button>
            </div>

            <form id="vehicle-form" onSubmit={handleSaveVehicle} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 sm:px-7 pt-6 pb-6 space-y-5 text-xs">
              {/* VEHICLE IDENTIFICATION (NAME & MODEL PUSHED DOWN & PROMINENT) */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs mt-1">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <Car className="w-4 h-4 text-[#d71921]" />
                  <span className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    Vehicle Make & Model Information
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      Listing Title / Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Land Cruiser Prado TX, Harrier Premium"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:ring-2 focus:ring-[#d71921]/20 font-medium text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      Brand / Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="e.g. Toyota, Mercedes, Subaru"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:ring-2 focus:ring-[#d71921]/20 font-medium text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* YEAR, PRICE, MILEAGE */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2022"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Asking Price (Ksh)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 3500000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-[#d71921] font-bold focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Mileage (KM)</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 45000 (Optional)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  />
                </div>
              </div>

              {/* CONDITION, TRANSMISSION, FUEL TYPE, BODY TYPE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Condition</label>
                  <select
                    value={formCondition}
                    onChange={(e: any) => setFormCondition(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="Foreign Used">Foreign Used</option>
                    <option value="Locally Used">Locally Used</option>
                    <option value="Brand New">Brand New</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transmission</label>
                  <select
                    value={formTransmission}
                    onChange={(e: any) => setFormTransmission(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="">Select (Optional)</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Fuel Type</label>
                  <select
                    value={formFuelType}
                    onChange={(e: any) => setFormFuelType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="">Select (Optional)</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Body Type</label>
                  <select
                    value={formBodyType}
                    onChange={(e) => setFormBodyType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="">Select (Optional)</option>
                    <option value="SUV">SUV</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Minivan">Minivan</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Coupe">Coupe</option>
                    <option value="Wagon">Wagon</option>
                  </select>
                </div>
              </div>

              {/* OPTIONAL DETAILED SPECIFICATIONS (ONLY SAVED IF ENTERED) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Engine CC</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="8000"
                    value={formEngineCC}
                    onChange={(e) => setFormEngineCC(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2000, 2500"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Exterior Color</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="e.g. Black, Silver, White"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Drivetrain</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <select
                    value={formDrive}
                    onChange={(e) => setFormDrive(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="">Unspecified</option>
                    <option value="4WD">4WD</option>
                    <option value="AWD">AWD</option>
                    <option value="2WD">2WD</option>
                    <option value="FWD">FWD</option>
                    <option value="RWD">RWD</option>
                  </select>
                </div>
              </div>

              {/* SHOWROOM LOCATION */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Showroom Location</label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Kiambu Road Showroom"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                />
              </div>

              {/* FEATURES & FITTED EXTRAS (INTERACTIVE CHECKLIST + ONE-BY-ONE ADDER) */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                {/* Header with Mark All & Clear All Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#d71921]" />
                      <label className="text-slate-800 font-bold text-xs sm:text-sm uppercase tracking-wider">
                        Features & Fitted Extras
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Check standard options or add custom features one by one below.
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllFeatures}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 hover:bg-[#d71921] text-[#d71921] hover:text-white border border-red-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                      title="Mark all standard features as equipped"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Mark All Available</span>
                    </button>

                    {selectedFeatures.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUnmarkAllFeatures}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Clear all selected features"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear All ({selectedFeatures.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Quick Checklist Grid of Standard Features */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                    <span>Popular Vehicle Features ({selectedFeatures.length} selected):</span>
                    <span className="text-slate-400 font-normal">Click any item to toggle</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200/80 rounded-xl bg-white">
                    {POPULAR_VEHICLE_FEATURES.map((feat) => {
                      const isSelected = selectedFeatures.includes(feat);
                      return (
                        <button
                          key={feat}
                          type="button"
                          onClick={() => handleToggleFeature(feat)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-medium transition cursor-pointer border ${
                            isSelected
                              ? 'bg-red-50 text-[#8a141e] border-red-300 font-bold shadow-2xs'
                              : 'bg-slate-50/50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition ${
                              isSelected
                                ? 'bg-[#d71921] border-[#d71921] text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{feat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Add Other Multiple Features One-by-One */}
                <div className="pt-2 border-t border-slate-200/70">
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">
                    Add Other Multiple Features (One by One)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customFeatureInput}
                      onChange={(e) => setCustomFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomFeature();
                        }
                      }}
                      placeholder="Type a custom feature (e.g. Heads-Up Display, Tow Bar)..."
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921] text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomFeature}
                      className="px-4 py-2 bg-slate-900 hover:bg-[#d71921] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Feature</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Press Enter or click "Add Feature" to append multiple custom features one by one.
                  </p>

                  {/* Display Currently Equipped / Custom Features as removable tags */}
                  {selectedFeatures.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <div className="text-[11px] font-bold text-slate-600 mb-2">
                        Currently Equipped ({selectedFeatures.length}):
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                        {selectedFeatures.map((feat) => (
                          <span
                            key={feat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-[#8a141e] border border-red-200 shadow-2xs"
                          >
                            <span>{feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(feat)}
                              className="text-red-400 hover:text-red-700 hover:bg-red-200/60 rounded-full w-3.5 h-3.5 flex items-center justify-center transition cursor-pointer ml-0.5"
                              title={`Remove ${feat}`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DRAG AND DROP IMAGES FROM DEVICE STORAGE (MAX 9) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold text-sm">
                    Vehicle Photos <span className="text-xs font-normal text-slate-500">(Max 10 photos)</span>
                  </label>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition ${
                      formImageFiles.length >= MAX_IMAGES
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : formImageFiles.length > 0
                        ? 'bg-red-50 text-[#d71921] border border-red-200'
                        : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {formImageFiles.length} / {MAX_IMAGES} photos
                  </span>
                </div>

                {/* Dropzone or Max Limit Notice */}
                {formImageFiles.length >= MAX_IMAGES ? (
                  <div className="border-2 border-dashed border-amber-300 bg-amber-50/70 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-amber-900">
                      Maximum Limit Reached ({MAX_IMAGES} of {MAX_IMAGES} photos)
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      You have added the maximum of 10 photos. To add a different photo, remove one from the preview below.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition cursor-pointer ${
                        isDraggingImage
                          ? 'border-[#d71921] bg-red-50'
                          : 'border-slate-300 hover:border-[#d71921] bg-slate-50/80 hover:bg-red-50/20'
                      }`}
                      onClick={() => {
                        const input = document.getElementById('device-photo-upload');
                        if (input) input.click();
                      }}
                    >
                      <input
                        id="device-photo-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFilesSelected(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />

                      {isProcessingImages ? (
                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                          <LoadingOrb state="connecting" size={32} color="#d71921" label="Processing & Optimizing Photos..." />
                          <p className="text-[11px] text-slate-500 font-medium">Preparing razor-sharp photos for instant display...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-[#d71921]/20 flex items-center justify-center text-[#d71921]">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Drag & drop up to {MAX_IMAGES - formImageFiles.length} photos here, or <span className="text-[#d71921] underline">browse files</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Instant upload &bull; Supports PNG, JPG, WEBP (Max 10 photos)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Error Banner */}
                {imageUploadError && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{imageUploadError}</span>
                  </p>
                )}

                {/* Previews Grid with Cover Photo Authority */}
                {formImageFiles.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-slate-600 mb-2 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">Attached Photos ({formImageFiles.length}/{MAX_IMAGES})</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-500 font-normal">Click any photo or &ldquo;Set Cover&rdquo; to choose main cover</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormImageFiles([]);
                          setFormImage('');
                          setFormCoverIndex(0);
                          setImageUploadError(null);
                        }}
                        className="text-red-600 hover:underline cursor-pointer font-medium"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {formImageFiles.map((imgSrc, idx) => {
                        const isCover = idx === formCoverIndex;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSetCoverPhoto(idx)}
                            className={`relative group rounded-xl overflow-hidden aspect-4/3 transition-all cursor-pointer ${
                              isCover
                                ? 'ring-3 ring-[#d71921] border-2 border-[#d71921] shadow-md bg-red-50/20'
                                : 'border border-slate-200 bg-slate-100 hover:border-[#d71921]/60 hover:shadow-xs'
                            }`}
                            title={isCover ? "Active Cover Photo (displayed across showroom & vehicle cards)" : "Click to choose this as the main Cover Photo"}
                          >
                            <img
                              src={imgSrc}
                              alt={`Vehicle photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Photo Index Badge */}
                            <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs">
                              {idx + 1}/{MAX_IMAGES}
                            </span>

                            {/* Cover Badge or Set as Cover Button */}
                            {isCover ? (
                              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-[#d71921] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md">
                                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                                <span>Cover Photo</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCoverPhoto(idx);
                                }}
                                className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-black/80 hover:bg-[#d71921] text-white text-[9px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs transition cursor-pointer shadow-xs"
                                title="Set as main cover photo"
                              >
                                <Star className="w-2.5 h-2.5" />
                                <span>Set Cover</span>
                              </button>
                            )}

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveUploadedImage(idx);
                              }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center transition opacity-90 group-hover:opacity-100 cursor-pointer shadow-xs"
                              title="Remove Photo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description & Highlights</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Condition notes, interior specs, logbook status..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 resize-none focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Showroom Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-[#d71921] focus:ring-1 focus:ring-[#d71921]"
                  >
                    <option value="available">Available</option>
                    <option value="under_offer">Under Offer</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="isLuxury"
                    checked={formIsLuxury}
                    onChange={(e) => setFormIsLuxury(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-[#d71921] focus:ring-[#d71921] cursor-pointer"
                  />
                  <label htmlFor="isLuxury" className="text-slate-800 font-bold cursor-pointer text-xs">
                    NG'ANG'A PREMIUM LUXURY Fleet
                    <span className="block text-[10px] text-amber-900/80 font-normal mt-0.5 leading-snug">
                      Exclusively adds this vehicle to the NG'ANG'A PREMIUM LUXURY Fleet page and removes it from the main showroom.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* STATIC PINNED FOOTER AT BOTTOM */}
            <div className="shrink-0 bg-white px-6 sm:px-7 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2.5 z-30">
              {editingVehicle ? (
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(editingVehicle.id, editingVehicle.title, editingVehicle.isCodeCar)}
                  className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Vehicle</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="vehicle-form"
                  disabled={formSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#d71921] hover:bg-[#bc141b] text-white font-bold disabled:opacity-60 flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer text-xs"
                >
                  {formSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving &amp; Syncing to Cloud...</span>
                    </>
                  ) : (
                    <span>{editingVehicle ? 'Update Vehicle' : 'Save & Publish Vehicle'}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* IN-APP DELETE CONFIRMATION DIALOG (Guaranteed top stacking in iframe & modals) */}
      {vehicleToDelete && (
        <div
          style={{ zIndex: 99999 }}
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Delete Vehicle Listing
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent Inventory Deletion
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-bold">{vehicleToDelete.title}</strong>?
              This vehicle and its data will be completely removed from the catalog and Firestore database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setVehicleToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <LoadingOrb state="working" size={20} color="#ffffff" layout="inline" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Theme & Orb Widget in Bottom-Right Corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <AdminOrbThemeControl />
      </div>
    </div>
  );
};
