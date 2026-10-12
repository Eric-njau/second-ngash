import React, { useState } from 'react';
import { X, CheckCircle2, Car, Upload, Plus } from 'lucide-react';
import { LoadingOrb } from './LoadingOrb';
import { BRANDS_LIST, TRANSMISSIONS_LIST, FUEL_TYPES_LIST } from '../data/inventory';
import { Vehicle } from '../types';
import { saveDealershipVehicle } from '../utils/inventoryManager';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: Vehicle) => void;
}

export const AddListingModal: React.FC<AddListingModalProps> = ({
  isOpen,
  onClose,
  onAddVehicle
}) => {
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineCC, setEngineCC] = useState('');
  const [transmission, setTransmission] = useState('Automatic');
  const [fuelType, setFuelType] = useState('Petrol');
  const [condition, setCondition] = useState<'LOCALLY USED' | 'BRAND NEW'>('LOCALLY USED');
  const [priceKsh, setPriceKsh] = useState('');
  const [mileageKm, setMileageKm] = useState('');
  const [bodyType, setBodyType] = useState<'SUV' | 'Pickup' | 'Sedan' | 'Hatchback' | 'Minivan'>('SUV');
  const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !priceKsh) return;

    setIsProcessing(true);

    try {
      const newVehicle: Vehicle = {
        id: `custom-${Date.now()}`,
        title: `${make} ${model}`,
        make,
        model,
        year: Number(year) || 2020,
        bodyType,
        fuelType: fuelType as any,
        transmission: transmission as any,
        condition,
        priceKsh: Number(priceKsh) || 3500000,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
        description: description || `Clean ${year} ${make} ${model} ready for viewing.`,
        isArchived: false,
        savedAt: Date.now(),
        updatedAt: new Date().toISOString()
      };

      if (engineCC.trim() && !isNaN(Number(engineCC)) && Number(engineCC) > 0) {
        newVehicle.engineCC = Number(engineCC);
      }

      if (mileageKm.trim() && !isNaN(Number(mileageKm))) {
        newVehicle.mileageKm = Number(mileageKm);
      }

      await saveDealershipVehicle(newVehicle);
      onAddVehicle(newVehicle);
      setSubmitted(true);
    } catch (err) {
      console.warn('Listing submission notice:', err);
      alert('Unable to submit listing to database. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#343a40] text-white">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold font-heading">
              List Your Vehicle With Ng'ang'a Car Sales
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {isProcessing ? (
            <div className="text-center py-16 space-y-4 flex flex-col items-center justify-center">
              <LoadingOrb
                state="solving"
                size={64}
                color="#8a141e"
                label="Valuating & Indexing Vehicle..."
                sublabel="Publishing to Kiambu Road live showroom database"
              />
            </div>
          ) : submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
              <h4 className="text-xl font-bold text-slate-900 font-heading">
                Listing Added Successfully!
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your vehicle has been added to our live searchable inventory. Our appraisal team will reach out at <strong>{sellerPhone}</strong> for physical showroom valuation.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="bg-[#8a141e] hover:bg-[#701018] text-white font-bold py-2.5 px-6 rounded-lg text-sm transition cursor-pointer"
              >
                View Inventory
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Make / Brand</label>
                  <select
                    value={make}
                    onChange={e => setMake(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  >
                    {BRANDS_LIST.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prado TX or Hilux"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Year of Manufacture</label>
                  <input
                    type="number"
                    min="2005"
                    max="2026"
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Engine Capacity (CC)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={engineCC}
                    onChange={e => setEngineCC(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Transmission</label>
                  <select
                    value={transmission}
                    onChange={e => setTransmission(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  >
                    {TRANSMISSIONS_LIST.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={e => setFuelType(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  >
                    {FUEL_TYPES_LIST.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as any)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  >
                    <option value="LOCALLY USED">Locally Used (Kenya Registered)</option>
                    <option value="BRAND NEW">Brand New (Zero Mileage)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Body Type</label>
                  <select
                    value={bodyType}
                    onChange={e => setBodyType(e.target.value as any)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                  >
                    <option value="SUV">SUV</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Minivan">Minivan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Asking Price (Ksh)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500000"
                    value={priceKsh}
                    onChange={e => setPriceKsh(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e] font-mono-num"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">Mileage (KM)</label>
                    <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 45000 (Optional)"
                    value={mileageKm}
                    onChange={e => setMileageKm(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e] font-mono-num"
                  />
                </div>
              </div>

              {/* Seller details */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Seller / Consigner Contact
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. David Ng'ang'a"
                      value={sellerName}
                      onChange={e => setSellerName(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+254 7XX XXX XXX"
                      value={sellerPhone}
                      onChange={e => setSellerPhone(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vehicle Details & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key features, service history, special accessories..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#8a141e]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#8a141e] hover:bg-[#701018] text-white font-bold py-3 rounded-lg text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Vehicle For Sale</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
