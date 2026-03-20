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
    Globe,
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
    color = 'bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-500/10',
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

    const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

    return (
        <div className="space-y-2">
            <label className={labelClasses}>{label}</label>
            <div className="min-h-[58px] flex flex-wrap gap-2 items-center px-4 py-3 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all cursor-text focus-within:bg-white dark:focus-within:bg-[#1A1A1A]">
                {tags.map((tag, i) => (
                    <span
                        key={i}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}
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
                    className="flex-1 min-w-[140px] outline-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                    placeholder={tags.length === 0 ? placeholder : ''}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                />
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1 italic font-medium ml-2">Atomic Directive: Press Enter or comma to append</p>
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
            const result = await geoapifyService.reverseGeocodeDetails(coords.lat, coords.lng);
            if (result) {
                const city = result.city || result.county || '';
                const area = result.suburb || result.district || result.neighbourhood || '';
                onChange(index, {
                    ...branch,
                    lat: coords.lat,
                    lng: coords.lng,
                    city: branch.city || city,
                    area: branch.area || area,
                    address: branch.address || result.formatted || address || '',
                });
            } else {
                onChange(index, {
                    ...branch,
                    lat: coords.lat,
                    lng: coords.lng,
                    address: branch.address || address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                });
            }
        } catch {
            onChange(index, {
                ...branch,
                lat: coords.lat,
                lng: coords.lng,
                address: branch.address || address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            });
        }
    };

    const inputClasses = "w-full px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm active:scale-[0.99] focus:bg-white dark:focus:bg-[#1A1A1A]";
    const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

    return (
        <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-cyan-500/20">
                        {index + 1}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 dark:text-white tracking-tight">Geospatial Hub {index + 1}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Physical Node Configuration</p>
                    </div>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Map selector */}
            <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className={`group w-full mb-8 p-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 ${branch.lat && branch.lng
                    ? 'border-green-500 bg-green-500/5 text-green-600'
                    : 'border-gray-200 dark:border-white/10 text-gray-400 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02]'
                    }`}
            >
                <div className={`p-4 rounded-full transition-colors ${branch.lat && branch.lng ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-white/5 group-hover:bg-cyan-500/10'}`}>
                    <MapPin className={`w-6 h-6 ${branch.lat && branch.lng ? 'text-green-500' : 'group-hover:text-cyan-500'}`} />
                </div>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] block mb-1">Geospatial Selector</span>
                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest block font-mono">
                        {branch.lat && branch.lng ? `LAT: ${branch.lat.toFixed(5)} LNG: ${branch.lng.toFixed(5)}` : 'Initialize GPS Handshake'}
                    </span>
                </div>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClasses}>City Hub</label>
                    <input
                        type="text"
                        required
                        value={branch.city}
                        onChange={(e) => update('city', e.target.value)}
                        placeholder="e.g. London"
                        className={inputClasses}
                    />
                </div>
                <div>
                    <label className={labelClasses}>Operational Area</label>
                    <input
                        type="text"
                        required
                        value={branch.area}
                        onChange={(e) => update('area', e.target.value)}
                        placeholder="e.g. Mayfair"
                        className={inputClasses}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className={labelClasses}>Physical Address</label>
                    <textarea
                        required
                        value={branch.address}
                        onChange={(e) => update('address', e.target.value)}
                        placeholder="Digital address credentials..."
                        rows={2}
                        className={`${inputClasses} resize-none`}
                    />
                </div>
                <div>
                    <label className={labelClasses}>Direct Line</label>
                    <input
                        type="tel"
                        value={branch.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+XX..."
                        className={inputClasses}
                    />
                </div>
            </div>

            <MapAddressSelector
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelect={handleMapSelect}
                initialCoords={branch.lat && branch.lng ? { lat: branch.lat, lng: branch.lng } : null}
                title={`Node ${index + 1} Location Sync`}
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
    <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-8 p-10 bg-gradient-to-br from-gray-50 to-white dark:from-[#1A1A1A] dark:to-[#111] rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[60px] rounded-full group-hover:bg-cyan-500/10 transition-colors" />
            
            {basic.logo_url ? (
                <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-xl relative z-10 bg-white dark:bg-[#1A1A1A]">
                    <img src={basic.logo_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl relative z-10">
                    {basic.name.charAt(0).toUpperCase()}
                </div>
            )}
            
            <div className="flex-1 text-center md:text-left space-y-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">{basic.name}</h3>
                    <span className="px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20 w-fit mx-auto md:mx-0">
                        {basic.price_range} tier
                    </span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center justify-center md:justify-start gap-2">
                    <Globe className="w-3 h-3" /> {basic.country} {basic.founded_year && ` · Est. ${basic.founded_year}`}
                </p>
            </div>
        </div>

        {/* Identity */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
            <h4 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase text-[12px] tracking-widest border-l-4 border-cyan-500 pl-4">Network Phylogeny</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Cuisine Array</p>
                    <div className="flex flex-wrap gap-2">{identity.categories.map((t, i) => <TagBadge key={i} tag={t} color="bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/10" />)}</div>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Core Specialties</p>
                    <div className="flex flex-wrap gap-2">{identity.specialties.map((t, i) => <TagBadge key={i} tag={t} color="bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10" />)}</div>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Discovery Tags</p>
                    <div className="flex flex-wrap gap-2">{identity.keywords.map((t, i) => <TagBadge key={i} tag={t} color="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10" />)}</div>
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-3 ml-1">Food Domains</p>
                    <div className="flex flex-wrap gap-2">{identity.food_categories.map((t, i) => <TagBadge key={i} tag={t} color="bg-green-500/5 text-green-600 dark:text-green-400 border border-green-500/10" />)}</div>
                </div>
            </div>
        </div>

        {/* Branches */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-[2rem] p-8 shadow-sm">
            <h4 className="font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase text-[12px] tracking-widest border-l-4 border-cyan-500 pl-4">{branches.length} Operational Nodes</h4>
            <div className="space-y-4">
                {branches.map((b, i) => (
                    <div key={i} className="flex items-start gap-5 p-6 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 group/node transition-all hover:bg-white dark:hover:bg-white/[0.05]">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5 shadow-lg shadow-cyan-500/10 group-hover/node:scale-110 transition-transform">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 dark:text-white text-base tracking-tight">{b.area}, {b.city}</p>
                            <p className="text-xs text-gray-500 mt-1 italic font-medium truncate">{b.address}</p>
                            <div className="flex gap-4 mt-3">
                                {b.phone && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3 h-3" /> {b.phone}</span>}
                                {b.lat && b.lng && <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {b.lat.toFixed(4)}, {b.lng.toFixed(4)}</span>}
                            </div>
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
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in max-w-5xl mx-auto my-10">
            {/* Progress header */}
            <div className="bg-gray-900 dark:bg-[#161616] px-10 py-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
                
                <div className="relative z-10 flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Network Onboarding</h2>
                        <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.3em]">Module {step} of {STEPS.length} Calibration</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="relative z-10 flex items-center gap-0 max-w-3xl mx-auto">
                    {STEPS.map((s, idx) => {
                        const Icon = s.icon;
                        const done = step > s.id;
                        const active = step === s.id;
                        return (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center group">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                        done ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-95' : 
                                        active ? 'bg-cyan-500 text-white shadow-2xl shadow-cyan-500/40 scale-110 ring-4 ring-cyan-500/20' : 
                                        'bg-white/5 border border-white/10 text-white/30'
                                        }`}>
                                        {done ? <Check className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-[9px] mt-4 font-black uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-white/20'}`}>{s.label}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 px-4 mb-12">
                                        <div className={`h-[2px] w-full rounded-full transition-all duration-700 ${done ? 'bg-green-500' : 'bg-white/10'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Body */}
            <div className="p-12 min-h-[500px] flex flex-col">
                {error && (
                    <div className="mb-8 flex items-center gap-4 px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest animate-shake">
                        <X className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex-1">
                    {/* STEP 1 — Basic Info */}
                    {step === 1 && (
                        <div className="space-y-10 animate-fade-up">
                            <div className="border-b border-gray-100 dark:border-white/5 pb-6">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Base Configuration</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic font-medium opacity-80">Define the core identity parameters of your enterprise.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Restaurant Designation</label>
                                    <input
                                        type="text"
                                        required
                                        value={basic.name}
                                        onChange={(e) => setBasic({ ...basic, name: e.target.value })}
                                        placeholder="e.g. Ranchers"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Operational Hub (Country)</label>
                                    <input
                                        type="text"
                                        required
                                        value={basic.country}
                                        onChange={(e) => setBasic({ ...basic, country: e.target.value })}
                                        placeholder="e.g. Pakistan"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Economic Tier</label>
                                    <select
                                        required
                                        value={basic.price_range}
                                        onChange={(e) => setBasic({ ...basic, price_range: e.target.value as any })}
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm"
                                    >
                                        <option value="budget">Value / Budget (💰)</option>
                                        <option value="mid-range">Contemporary Mid-Range (💰💰)</option>
                                        <option value="premium">High-End Premium (💰💰💰)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Establishment Year</label>
                                    <input
                                        type="number"
                                        value={basic.founded_year}
                                        onChange={(e) => setBasic({ ...basic, founded_year: e.target.value })}
                                        placeholder="e.g. 2012"
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">Brand Visual Key (Logo)</label>
                                <div className="p-8 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-[2rem]">
                                    <ImageUpload
                                        value={basic.logo_url}
                                        onChange={(url) => setBasic({ ...basic, logo_url: typeof url === 'string' ? url : url[0] || '' })}
                                        multiple={false}
                                        label="Official Entity Logo"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Identity */}
                    {step === 2 && (
                        <div className="space-y-10 animate-fade-up">
                            <div className="border-b border-gray-100 dark:border-white/5 pb-6">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Taxonomy Alignment</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic font-medium opacity-80">Categorize your menu systems and specialties for AI discoverability.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <TagInput
                                    label="Cuisine Categories *"
                                    tags={identity.categories}
                                    onChange={(tags) => setIdentity({ ...identity, categories: tags })}
                                    placeholder="Italian, Fast Food, etc."
                                />
                                <TagInput
                                    label="Network Specialties"
                                    tags={identity.specialties}
                                    onChange={(tags) => setIdentity({ ...identity, specialties: tags })}
                                    placeholder="Wood-fired Pizza, etc."
                                    color="bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/10"
                                />
                                <TagInput
                                    label="Discovery Keywords"
                                    tags={identity.keywords}
                                    onChange={(tags) => setIdentity({ ...identity, keywords: tags })}
                                    placeholder="family-friendly, rooftop..."
                                    color="bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/10"
                                />
                                <TagInput
                                    label="Menu Domains"
                                    tags={identity.food_categories}
                                    onChange={(tags) => setIdentity({ ...identity, food_categories: tags })}
                                    placeholder="Main Course, Appetizers..."
                                    color="bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/10"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Branches */}
                    {step === 3 && (
                        <div className="space-y-10 animate-fade-up">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Geographic Expansion</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic font-medium opacity-80">Integrate physical operational nodes into the network.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addBranch}
                                    className="px-8 py-3 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Provision New Node
                                </button>
                            </div>

                            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
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

                    {/* STEP 4 — Review */}
                    {step === 4 && (
                        <div className="space-y-10 animate-fade-up">
                            <div className="border-b border-gray-100 dark:border-white/5 pb-6">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Integrity Sync</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic font-medium opacity-80">Final verification before initializing the AI search engine sync.</p>
                            </div>

                            <div className="flex flex-wrap gap-4 mb-4">
                                <button
                                    type="button"
                                    onClick={handleExportPDF}
                                    className="px-6 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportJSON}
                                    className="px-6 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-cyan-500 hover:bg-cyan-500/5 transition-all text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 flex items-center gap-2"
                                >
                                    <FileJson className="w-4 h-4" />
                                    Export JSON
                                </button>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                <ReviewPanel basic={basic} identity={identity} branches={branches} />
                            </div>

                            {/* RAG Status Messages */}
                            <div className="space-y-4">
                                {ragStatus === 'uploading' && (
                                    <div className="flex items-center gap-4 px-6 py-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl text-cyan-600 dark:text-cyan-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Synchronizing with AI Knowledge Base...
                                    </div>
                                )}
                                {ragStatus === 'success' && (
                                    <div className="flex items-center gap-4 px-6 py-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-green-600 text-[10px] font-black uppercase tracking-widest">
                                        <Check className="w-5 h-5" />
                                        Core Synced: {ragChunks} neural nodes updated
                                    </div>
                                )}
                                {ragStatus === 'failed' && (
                                    <div className="flex items-center gap-4 px-6 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-amber-600 text-[10px] font-black uppercase tracking-widest">
                                        <Eye className="w-5 h-5" />
                                        Manual override required: RAG link inactive
                                    </div>
                                )}
                            </div>

                            {submitting && submitLabel && (
                                <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 animate-pulse">{submitLabel}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Sticky Footer Actions */}
                <div className="mt-auto pt-10 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={step === 1 ? onCancel : back}
                        disabled={loading}
                        className="px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all flex items-center gap-2 border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {step === 1 ? 'Discard' : 'Previous Phase'}
                    </button>

                    <div className="flex gap-4">
                        {step === STEPS.length ? (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-12 py-3.5 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-green-400 shadow-xl shadow-green-500/20 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Finalizing Sync...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Initialize Network
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={next}
                                className="px-12 py-3.5 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2 active:scale-95"
                            >
                                Proceed to Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantSetupWizard;
