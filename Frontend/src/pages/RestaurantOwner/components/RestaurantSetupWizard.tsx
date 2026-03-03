import React, { useState, useCallback } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    MapPin,
    Check,
    Building2,
    Tag,
    GitBranch,
    Eye,
    Download,
    FileJson,
    Loader2,
    X,
} from 'lucide-react';
import ImageUpload from '../../../components/Common/ImageUpload';
import MapAddressSelector from '../../../components/Location/MapAddressSelector';
import { geoapifyService } from '../../../services/geoapifyService';
import { apiService } from '../../../services/api';
import {
    exportJSON,
    exportPDF,
    buildPDFBlob,
    BranchData,
    RestaurantExportData,
} from '../../../utils/restaurantExportUtils';

const RAG_BASE_URL = (import.meta as any).env?.VITE_RAG_URL ?? 'http://localhost:8000';


/* ─────────────────────────────────────────────────────────────────── */
/*  Types                                                              */
/* ─────────────────────────────────────────────────────────────────── */

interface BasicInfo {
    name: string;
    country: string;
    price_range: 'budget' | 'mid-range' | 'premium';
    founded_year: string;
    logo_url: string;
}

interface Identity {
    categories: string[];
    specialties: string[];
    keywords: string[];
    food_categories: string[];
}

interface RestaurantSetupWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Tag chip input                                                     */
/* ─────────────────────────────────────────────────────────────────── */

interface TagInputProps {
    label: string;
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    color?: string;
}

const TagInput: React.FC<TagInputProps> = ({
    label,
    tags,
    onChange,
    placeholder = 'Type and press Enter or comma',
    color = 'bg-cyan-500/20 text-blue-800',
}) => {
    const [input, setInput] = useState('');

    const addTag = (value: string) => {
        const trimmed = value.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length) {
            onChange(tags.slice(0, -1));
        }
    };

    const handleBlur = () => {
        if (input.trim()) addTag(input);
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">{label}</label>
            <div className="min-h-[52px] flex flex-wrap gap-2 items-center px-3 py-2 border-2 border-white/10 rounded-xl focus-within:border-cyan-500 bg-[#111] border border-white/5 transition-colors cursor-text">
                {tags.map((tag, i) => (
                    <span
                        key={i}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${color}`}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(tags.filter((_, j) => j !== i))}
                            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    className="flex-1 min-w-[140px] outline-none bg-transparent text-sm text-gray-300 placeholder-gray-400"
                    placeholder={tags.length === 0 ? placeholder : ''}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                />
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add a tag</p>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────── */
/*  Branch Card                                                        */
/* ─────────────────────────────────────────────────────────────────── */

interface BranchCardProps {
    branch: BranchData;
    index: number;
    onChange: (idx: number, branch: BranchData) => void;
    onRemove: (idx: number) => void;
    canRemove: boolean;
}

const BranchCard: React.FC<BranchCardProps> = ({ branch, index, onChange, onRemove, canRemove }) => {
    const [isMapOpen, setIsMapOpen] = useState(false);

    const update = (key: keyof BranchData, value: any) =>
        onChange(index, { ...branch, [key]: value });

    const handleMapSelect = async (coords: { lat: number; lng: number }, address?: string) => {
        try {
            const result = await geoapifyService.reverseGeocode(coords.lat, coords.lng);
            const parts = (result || '').split(',');
            const city = parts[parts.length - 1]?.trim() || '';
            const area = parts[parts.length - 2]?.trim() || '';
            onChange(index, {
                ...branch,
                lat: coords.lat,
                lng: coords.lng,
                city: branch.city || city,
                area: branch.area || area,
                address: branch.address || result || address || '',
            });
        } catch {
            onChange(index, {
                ...branch,
                lat: coords.lat,
                lng: coords.lng,
                address: branch.address || address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            });
        }
    };

    return (
        <div className="relative bg-[#111] border border-white/5 border-2 border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-gray-900 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                    </div>
                    <h4 className="font-bold text-white">Branch {index + 1}</h4>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Map selector */}
            <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className={`w-full mb-4 px-4 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm transition-all ${branch.lat && branch.lng
                    ? 'border-green-400 bg-green-500/10 text-green-400'
                    : 'border-[rgba(255,255,255,0.2)] hover:border-cyan-500/40 hover:bg-cyan-500/10 text-gray-400'
                    }`}
            >
                <MapPin className="w-4 h-4" />
                {branch.lat && branch.lng
                    ? `📍 ${branch.lat.toFixed(5)}, ${branch.lng.toFixed(5)} — Change`
                    : 'Pin Location on Map (optional)'}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">City *</label>
                    <input
                        type="text"
                        required
                        value={branch.city}
                        onChange={(e) => update('city', e.target.value)}
                        placeholder="e.g., Lahore"
                        className="w-full px-3 py-2.5 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none text-sm transition-colors bg-[#111] text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Area *</label>
                    <input
                        type="text"
                        required
                        value={branch.area}
                        onChange={(e) => update('area', e.target.value)}
                        placeholder="e.g., Gulberg"
                        className="w-full px-3 py-2.5 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none text-sm transition-colors bg-[#111] text-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Full Address *</label>
                    <textarea
                        required
                        value={branch.address}
                        onChange={(e) => update('address', e.target.value)}
                        placeholder="Street address, building no., etc."
                        rows={2}
                        className="w-full px-3 py-2.5 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none text-sm transition-colors resize-none bg-[#111] text-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Phone</label>
                    <input
                        type="tel"
                        value={branch.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full px-3 py-2.5 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none text-sm transition-colors bg-[#111] text-white"
                    />
                </div>
            </div>

            <MapAddressSelector
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleMapSelect}
                initialCoords={branch.lat && branch.lng ? { lat: branch.lat, lng: branch.lng } : null}
                title={`Branch ${index + 1} — Select Location`}
            />
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────── */
/*  Review Card                                                        */
/* ─────────────────────────────────────────────────────────────────── */

const TagBadge: React.FC<{ tag: string; color: string }> = ({ tag, color }) => (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{tag}</span>
);

interface ReviewProps {
    basic: BasicInfo;
    identity: Identity;
    branches: BranchData[];
}

const ReviewPanel: React.FC<ReviewProps> = ({ basic, identity, branches }) => (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-2xl border border-blue-100">
            {basic.logo_url ? (
                <img src={basic.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow" />
            ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow">
                    {basic.name.charAt(0).toUpperCase()}
                </div>
            )}
            <div>
                <h3 className="text-xl font-bold text-white">{basic.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{basic.country}{basic.founded_year ? ` · Est. ${basic.founded_year}` : ''}</p>
                <span className="mt-1 inline-block px-3 py-0.5 bg-cyan-500/20 text-blue-800 rounded-full text-xs font-semibold capitalize">{basic.price_range}</span>
            </div>
        </div>

        {/* Identity */}
        <div className="bg-[#111] border border-white/5 border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-cyan-400" /> Categories &amp; Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Cuisine</p>
                    <div className="flex flex-wrap gap-1">{identity.categories.map((t, i) => <TagBadge key={i} tag={t} color="bg-cyan-500/10 text-cyan-300" />)}</div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-1">{identity.specialties.map((t, i) => <TagBadge key={i} tag={t} color="bg-purple-50 text-purple-700" />)}</div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-1">{identity.keywords.map((t, i) => <TagBadge key={i} tag={t} color="bg-white/5 text-gray-300" />)}</div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Food Categories</p>
                    <div className="flex flex-wrap gap-1">{identity.food_categories.map((t, i) => <TagBadge key={i} tag={t} color="bg-green-500/10 text-green-400" />)}</div>
                </div>
            </div>
        </div>

        {/* Branches */}
        <div className="bg-[#111] border border-white/5 border border-white/10 rounded-2xl p-5">
            <h4 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><GitBranch className="w-4 h-4 text-cyan-400" /> {branches.length} Branch{branches.length !== 1 ? 'es' : ''}</h4>
            <div className="space-y-3">
                {branches.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-[#050505] rounded-xl border border-white/10">
                        <div className="w-7 h-7 rounded-full bg-cyan-500 text-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm">{b.area}, {b.city}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{b.address}</p>
                            {b.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {b.phone}</p>}
                            {b.lat && b.lng && <p className="text-xs text-green-500 mt-0.5">📍 {b.lat.toFixed(5)}, {b.lng.toFixed(5)}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────── */
/*  Main Wizard                                                        */
/* ─────────────────────────────────────────────────────────────────── */

const EMPTY_BRANCH: BranchData = { city: '', area: '', address: '', phone: '', lat: null, lng: null };

const STEPS = [
    { id: 1, label: 'Basic Info', icon: Building2 },
    { id: 2, label: 'Identity', icon: Tag },
    { id: 3, label: 'Branches', icon: GitBranch },
    { id: 4, label: 'Review', icon: Eye },
];

const RestaurantSetupWizard: React.FC<RestaurantSetupWizardProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitLabel, setSubmitLabel] = useState<string>('');
    const [ragStatus, setRagStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>('idle');
    const [ragChunks, setRagChunks] = useState<number>(0);
    const [error, setError] = useState('');

    const [basic, setBasic] = useState<BasicInfo>({
        name: '',
        country: '',
        price_range: 'budget',
        founded_year: '',
        logo_url: '',
    });

    const [identity, setIdentity] = useState<Identity>({
        categories: [],
        specialties: [],
        keywords: [],
        food_categories: [],
    });

    const [branches, setBranches] = useState<BranchData[]>([{ ...EMPTY_BRANCH }]);

    /* ---- Navigation ---- */
    const validateStep = () => {
        if (step === 1) {
            if (!basic.name.trim() || !basic.country.trim()) {
                setError('Restaurant name and country are required.');
                return false;
            }
        }
        if (step === 2) {
            if (identity.categories.length === 0) {
                setError('Add at least one cuisine category.');
                return false;
            }
        }
        if (step === 3) {
            const invalid = branches.some(b => !b.city.trim() || !b.area.trim() || !b.address.trim());
            if (invalid) {
                setError('Each branch must have a city, area, and address.');
                return false;
            }
        }
        setError('');
        return true;
    };

    const next = () => { if (validateStep()) setStep(s => s + 1); };
    const back = () => { setError(''); setStep(s => s - 1); };

    /* ---- Branches ---- */
    const addBranch = () => setBranches(prev => [...prev, { ...EMPTY_BRANCH }]);
    const removeBranch = (idx: number) => setBranches(prev => prev.filter((_, i) => i !== idx));
    const updateBranch = useCallback((idx: number, branch: BranchData) => {
        setBranches(prev => prev.map((b, i) => (i === idx ? branch : b)));
    }, []);

    /* ---- Export ---- */
    const exportData: RestaurantExportData = { ...basic, ...identity, branches };

    const handleExportJSON = () => exportJSON(exportData);
    const handleExportPDF = () => exportPDF(exportData);

    /* ---- Submit ---- */
    const handleSubmit = async () => {
        if (!validateStep()) return;
        setSubmitting(true);
        setSubmitLabel('Creating restaurant…');
        setError('');
        setRagStatus('idle');
        try {
            const res = await apiService.createRestaurant({
                name: basic.name,
                description: {},
                country: basic.country,
                price_range: basic.price_range,
                categories: identity.categories,
                specialties: identity.specialties,
                keywords: identity.keywords,
                food_categories: identity.food_categories,
                logo_url: basic.logo_url || undefined,
                founded_year: basic.founded_year ? parseInt(basic.founded_year) : undefined,
            });

            if (res.success && res.data) {
                const restaurantData = res.data as any;
                // Handle both direct and wrapped responses
                const restaurantId =
                    restaurantData.restaurant_id ||
                    restaurantData.id ||
                    restaurantData.data?.restaurant_id ||
                    restaurantData.data?.id;

                console.log('📋 Created restaurant ID:', restaurantId, '| Raw data:', restaurantData);

                if (restaurantId) {
                    setSubmitLabel('Saving branches…');
                    for (const branch of branches) {
                        try {
                            await apiService.addRestaurantLocation(restaurantId, {
                                city: branch.city,
                                area: branch.area,
                                address: branch.address,
                                phone: branch.phone || undefined,
                                lat: branch.lat ?? undefined,
                                lng: branch.lng ?? undefined,
                            } as any);
                        } catch (locationErr) {
                            console.error('Branch save failed:', locationErr);
                        }
                    }

                    // ── Send PDF to RAG backend for embedding ──
                    setSubmitLabel('Uploading to AI knowledge base…');
                    setRagStatus('uploading');
                    try {
                        const pdfBlob = buildPDFBlob(exportData);
                        const pdfFile = new File(
                            [pdfBlob],
                            `${basic.name.toLowerCase().replace(/\s+/g, '-')}-restaurant.pdf`,
                            { type: 'application/pdf' }
                        );
                        const form = new FormData();
                        form.append('file', pdfFile);
                        form.append('restaurant_id', restaurantId);
                        form.append('restaurant_name', basic.name);

                        console.log(`📤 Posting PDF to ${RAG_BASE_URL}/ingest-restaurant (restaurant_id=${restaurantId})`);

                        const ragRes = await fetch(`${RAG_BASE_URL}/ingest-restaurant`, {
                            method: 'POST',
                            body: form,
                        });
                        if (ragRes.ok) {
                            const ragData = await ragRes.json();
                            console.log(`✅ RAG ingestion: ${ragData.chunks_created} chunks stored for "${basic.name}"`);
                            setRagChunks(ragData.chunks_created ?? 0);
                            setRagStatus('success');
                        } else {
                            const errText = await ragRes.text();
                            console.error(`❌ RAG ingestion HTTP ${ragRes.status}:`, errText);
                            setRagStatus('failed');
                        }
                    } catch (ragErr: any) {
                        console.error('❌ RAG ingestion network error:', ragErr?.message || ragErr);
                        setRagStatus('failed');
                    }
                } else {
                    console.warn('⚠️ Could not extract restaurantId from response:', restaurantData);
                }

                // Auto-trigger downloads
                setSubmitLabel('Preparing downloads…');
                exportJSON(exportData);
                exportPDF(exportData);

                // Brief pause so user sees the RAG status before redirect
                await new Promise(res => setTimeout(res, 1500));
                onComplete();
            } else {
                setError('Failed to create restaurant. Please try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setSubmitting(false);
            setSubmitLabel('');
        }
    };


    /* ─────── Render ─────── */
    return (
        <div className="bg-[#111] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
            {/* Progress header */}
            <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 px-8 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Setup Your Restaurant</h2>
                        <p className="text-blue-200 text-sm mt-1">Step {step} of {STEPS.length}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-blue-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#111] border border-white/5/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-0">
                    {STEPS.map((s, idx) => {
                        const Icon = s.icon;
                        const done = step > s.id;
                        const active = step === s.id;
                        return (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${done ? 'bg-green-400 text-white' : active ? 'bg-[#111] border border-white/5 text-cyan-300 shadow-lg scale-110' : 'bg-[#111] border border-white/5/20 text-white/70'
                                        }`}>
                                        {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                    </div>
                                    <span className={`text-xs mt-1 font-medium hidden sm:block ${active ? 'text-white' : 'text-white/60'}`}>{s.label}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all ${done ? 'bg-green-400' : 'bg-[#111] border border-white/5/20'}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Body */}
            <div className="p-8">
                {error && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-200 rounded-xl text-red-400 text-sm">
                        <X className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* STEP 1 — Basic Info */}
                {step === 1 && (
                    <div className="space-y-5 animate-fadeIn">
                        <div className="mb-2">
                            <h3 className="text-lg font-bold text-white">Basic Information</h3>
                            <p className="text-sm text-gray-500">Tell us the core details about your restaurant.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Restaurant Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={basic.name}
                                    onChange={(e) => setBasic({ ...basic, name: e.target.value })}
                                    placeholder="e.g., The Spice Garden"
                                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-[#111] text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Country <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={basic.country}
                                    onChange={(e) => setBasic({ ...basic, country: e.target.value })}
                                    placeholder="e.g., Pakistan"
                                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-[#111] text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Price Range <span className="text-red-500">*</span></label>
                                <select
                                    value={basic.price_range}
                                    onChange={(e) => setBasic({ ...basic, price_range: e.target.value as any })}
                                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-[#111] text-white"
                                >
                                    <option value="budget">💰 Budget</option>
                                    <option value="mid-range">💰💰 Mid-Range</option>
                                    <option value="premium">💰💰💰 Premium</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Founded Year</label>
                                <input
                                    type="number"
                                    value={basic.founded_year}
                                    onChange={(e) => setBasic({ ...basic, founded_year: e.target.value })}
                                    placeholder="e.g., 2018"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors bg-[#111] text-white"
                                />
                            </div>
                        </div>
                        <ImageUpload
                            value={basic.logo_url}
                            onChange={(url) => setBasic({ ...basic, logo_url: typeof url === 'string' ? url : url[0] || '' })}
                            multiple={false}
                            label="Restaurant Logo"
                        />
                    </div>
                )}

                {/* STEP 2 — Identity */}
                {step === 2 && (
                    <div className="space-y-5 animate-fadeIn">
                        <div className="mb-2">
                            <h3 className="text-lg font-bold text-white">Restaurant Identity</h3>
                            <p className="text-sm text-gray-500">Help customers discover you. Type and press Enter to add each tag.</p>
                        </div>
                        <TagInput
                            label="Cuisine Categories *"
                            tags={identity.categories}
                            onChange={(tags) => setIdentity({ ...identity, categories: tags })}
                            placeholder="Italian, Pizza, Fast Food…"
                            color="bg-cyan-500/20 text-blue-800"
                        />
                        <TagInput
                            label="Specialties"
                            tags={identity.specialties}
                            onChange={(tags) => setIdentity({ ...identity, specialties: tags })}
                            placeholder="Wood-fired Pizza, Pasta…"
                            color="bg-purple-100 text-purple-800"
                        />
                        <TagInput
                            label="Keywords"
                            tags={identity.keywords}
                            onChange={(tags) => setIdentity({ ...identity, keywords: tags })}
                            placeholder="family-friendly, outdoor seating…"
                            color="bg-white/10 text-gray-300"
                        />
                        <TagInput
                            label="Food Categories"
                            tags={identity.food_categories}
                            onChange={(tags) => setIdentity({ ...identity, food_categories: tags })}
                            placeholder="Main Course, Appetizers, Desserts…"
                            color="bg-green-500/20 text-green-400"
                        />
                    </div>
                )}

                {/* STEP 3 — Branches */}
                {step === 3 && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">Branches &amp; Locations</h3>
                                <p className="text-sm text-gray-500">Add as many branches as you have. At least one is required.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addBranch}
                                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-gray-900 text-white rounded-xl hover:bg-cyan-400 transition-colors text-sm font-semibold shadow"
                            >
                                <Plus className="w-4 h-4" />
                                Add Branch
                            </button>
                        </div>
                        <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1">
                            {branches.map((branch, idx) => (
                                <BranchCard
                                    key={idx}
                                    branch={branch}
                                    index={idx}
                                    onChange={updateBranch}
                                    onRemove={removeBranch}
                                    canRemove={branches.length > 1}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">Review &amp; Export</h3>
                                <p className="text-sm text-gray-500">Everything looks good? Download your profile or go live.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportJSON}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium border border-white/10"
                                >
                                    <FileJson className="w-4 h-4" />
                                    JSON
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-200"
                                >
                                    <Download className="w-4 h-4" />
                                    PDF
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[380px] overflow-y-auto pr-1">
                            <ReviewPanel basic={basic} identity={identity} branches={branches} />
                        </div>

                        {/* RAG Status Banner */}
                        {ragStatus === 'uploading' && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-300 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                Uploading restaurant profile to AI knowledge base&hellip;
                            </div>
                        )}
                        {ragStatus === 'success' && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-200 rounded-xl text-green-400 text-sm">
                                <Check className="w-4 h-4 flex-shrink-0" />
                                ✅ AI knowledge base updated &mdash; <strong>{ragChunks} chunks</strong> stored. The chatbot can now answer questions about this restaurant.
                            </div>
                        )}
                        {ragStatus === 'failed' && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                                <X className="w-4 h-4 flex-shrink-0" />
                                ⚠️ AI indexing skipped &mdash; RAG server not reachable. Start it with <code className="bg-amber-100 px-1 rounded text-xs">cd Backend/RAG &amp;&amp; python main.py</code> and re-save.
                            </div>
                        )}

                        {/* Submit progress label */}
                        {submitting && submitLabel && (
                            <p className="mt-3 text-center text-xs text-gray-500 animate-pulse">{submitLabel}</p>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                    <button
                        type="button"
                        onClick={step === 1 ? onCancel : back}
                        className="flex items-center gap-2 px-5 py-2.5 border-2 border-white/10 text-gray-300 rounded-xl hover:bg-[#050505] transition-colors font-medium"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={next}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-gray-900 text-white rounded-xl hover:bg-cyan-400 transition-colors font-semibold shadow-md"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-600 transition-all font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {submitLabel || 'Processing…'}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Create Restaurant
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RestaurantSetupWizard;
