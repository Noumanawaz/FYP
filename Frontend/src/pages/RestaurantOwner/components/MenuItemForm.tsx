import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { apiService } from '../../../services/api';
import ImageUpload from '../../../components/Common/ImageUpload';
import Modal from '../../../components/Common/Modal';

interface MenuItem {
  item_id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  currency?: string;
  image_urls?: string[];
  dietary_tags?: string[];
  spice_level?: 'mild' | 'medium' | 'hot' | 'extra-hot';
  preparation_time?: number;
  calories?: number;
  ingredients?: string[];
  allergens?: string[];
  is_available?: boolean;
  is_featured?: boolean;
}

interface Category {
  category_id: string;
  name: string;
}

interface MenuItemFormProps {
  restaurantId: string;
  menuItem?: MenuItem;
  onClose: () => void;
  onSuccess: () => void;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({ restaurantId, menuItem, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    category_id: menuItem?.category_id || '',
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    base_price: menuItem?.base_price?.toString() || '',
    currency: menuItem?.currency || 'USD',
    image_urls: menuItem?.image_urls || [],
    dietary_tags: menuItem?.dietary_tags || [],
    spice_level: menuItem?.spice_level || 'mild',
    preparation_time: menuItem?.preparation_time?.toString() || '',
    calories: menuItem?.calories?.toString() || '',
    ingredients: menuItem?.ingredients || [],
    allergens: menuItem?.allergens || [],
    is_available: menuItem?.is_available ?? true,
    is_featured: menuItem?.is_featured ?? false,
  });

  const [newDietaryTag, setNewDietaryTag] = useState('');
  const [newIngredient, setNewIngredient] = useState('');
  const [newAllergen, setNewAllergen] = useState('');

  useEffect(() => {
    loadCategories();
  }, [restaurantId]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategories(restaurantId);
      if (response.success && response.data) {
        const cats = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        restaurant_id: restaurantId,
        category_id: formData.category_id,
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        currency: formData.currency,
        image_urls: formData.image_urls.filter(url => url.trim()),
        dietary_tags: formData.dietary_tags.filter(tag => tag.trim()),
        spice_level: formData.spice_level,
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : undefined,
        calories: formData.calories ? parseInt(formData.calories) : undefined,
        ingredients: formData.ingredients.filter(ing => ing.trim()),
        allergens: formData.allergens.filter(all => all.trim()),
        is_available: formData.is_available,
        is_featured: formData.is_featured,
      };

      if (menuItem) {
        await apiService.updateMenuItem(menuItem.item_id, data);
      } else {
        await apiService.createMenuItem(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };


  const addDietaryTag = () => {
    if (newDietaryTag.trim()) {
      setFormData({ ...formData, dietary_tags: [...formData.dietary_tags, newDietaryTag.trim()] });
      setNewDietaryTag('');
    }
  };

  const removeDietaryTag = (index: number) => {
    setFormData({ ...formData, dietary_tags: formData.dietary_tags.filter((_, i) => i !== index) });
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setFormData({ ...formData, ingredients: [...formData.ingredients, newIngredient.trim()] });
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setFormData({ ...formData, ingredients: formData.ingredients.filter((_, i) => i !== index) });
  };

  const addAllergen = () => {
    if (newAllergen.trim()) {
      setFormData({ ...formData, allergens: [...formData.allergens, newAllergen.trim()] });
      setNewAllergen('');
    }
  };

  const removeAllergen = (index: number) => {
    setFormData({ ...formData, allergens: formData.allergens.filter((_, i) => i !== index) });
  };

  const inputClasses = "w-full px-5 py-3.5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm active:scale-[0.99] focus:bg-white dark:focus:bg-[#1A1A1A]";
  const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

  const formFooter = (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all outline-none"
      >
        Discard Changes
      </button>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex-1 px-8 py-3 bg-cyan-500 text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 transition-all outline-none disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {menuItem ? 'Sync Updates' : 'Commit Item'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={menuItem ? 'Update Menu Item' : 'New Culinary Asset'}
      footer={formFooter}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        {/* Essential Info Section */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Primary Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className={inputClasses}
              >
                <option value="" className="dark:bg-[#121212]">Select Architecture</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id} className="dark:bg-[#121212]">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Item Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                placeholder="e.g. Signature Truffle Pizza"
              />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Description & Ingredients Note *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`${inputClasses} resize-none`}
              placeholder="Detailed culinary description..."
            />
          </div>
        </section>

        {/* Logistics & Valuation Section */}
        <section className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelClasses}>Price *</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold border-r border-gray-200 dark:border-white/10 pr-3">
                  {formData.currency}
                </div>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className={`${inputClasses} pl-16`}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Prep Cycle (Mins)</label>
              <input
                type="number"
                min="0"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                className={inputClasses}
                placeholder="e.g. 15"
              />
            </div>

            <div>
              <label className={labelClasses}>Caloric Profile</label>
              <input
                type="number"
                min="0"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className={inputClasses}
                placeholder="e.g. 350"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Spice Level</label>
              <select
                value={formData.spice_level}
                onChange={(e) => setFormData({ ...formData, spice_level: e.target.value as any })}
                className={inputClasses}
              >
                <option value="mild" className="dark:bg-[#121212]">Mild / Delicate</option>
                <option value="medium" className="dark:bg-[#121212]">Medium / Balanced</option>
                <option value="hot" className="dark:bg-[#121212]">Hot / Intense</option>
                <option value="extra-hot" className="dark:bg-[#121212]">Extra Hot / Explosive</option>
              </select>
            </div>

            <div className="flex items-center gap-8 pt-6 px-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-cyan-500 focus:ring-cyan-500/20 transition-all cursor-pointer"
                />
                <span className="text-sm font-bold text-gray-500 group-hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">Live Available</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-purple-500 focus:ring-purple-500/20 transition-all cursor-pointer"
                />
                <span className="text-sm font-bold text-gray-500 group-hover:text-purple-400 transition-colors uppercase tracking-widest text-[10px]">Featured Asset</span>
              </label>
            </div>
          </div>
        </section>

        {/* Visual Assets Section */}
        <section className="pt-6 border-t border-gray-100 dark:border-white/5">
          <ImageUpload
            value={formData.image_urls}
            onChange={(urls) => setFormData({ ...formData, image_urls: Array.isArray(urls) ? urls : [urls] })}
            multiple={true}
            maxImages={5}
            label="Visual Representation"
          />
        </section>

        {/* Tags & Taxonomy Section */}
        <section className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dietary Tags */}
            <div className="space-y-4">
              <label className={labelClasses}>Dietary Profile</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newDietaryTag}
                  onChange={(e) => setNewDietaryTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietaryTag())}
                  className={inputClasses}
                  placeholder="e.g. Vegan"
                />
                <button
                  type="button"
                  onClick={addDietaryTag}
                  className="px-4 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-cyan-500 hover:text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.dietary_tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1.5 bg-green-500/5 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold tracking-widest border border-green-500/10 flex items-center gap-2">
                    {tag}
                    <button type="button" onClick={() => removeDietaryTag(index)} className="hover:text-red-500"><X className="w-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4">
              <label className={labelClasses}>Core Ingredients</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  className={inputClasses}
                  placeholder="e.g. Fresh Basil"
                />
                <button
                  type="button"
                  onClick={addIngredient}
                  className="px-4 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-cyan-500 hover:text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.ingredients.map((ing, index) => (
                  <span key={index} className="px-3 py-1.5 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 rounded-full text-[10px] font-bold tracking-widest border border-yellow-500/10 flex items-center gap-2">
                    {ing}
                    <button type="button" onClick={() => removeIngredient(index)} className="hover:text-red-500"><X className="w-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            {/* Allergens */}
            <div className="space-y-4">
              <label className={labelClasses}>Known Allergens</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
                  className={inputClasses}
                  placeholder="e.g. Shellfish"
                />
                <button
                  type="button"
                  onClick={addAllergen}
                  className="px-4 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-cyan-500 hover:text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allergens.map((all, index) => (
                  <span key={index} className="px-3 py-1.5 bg-red-500/5 text-red-600 dark:text-red-400 rounded-full text-[10px] font-bold tracking-widest border border-red-500/10 flex items-center gap-2">
                    {all}
                    <button type="button" onClick={() => removeAllergen(index)} className="hover:text-red-500"><X className="w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
};

export default MenuItemForm;

