import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../../services/api';
import ImageUpload from '../../../components/Common/ImageUpload';

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
        const cats = Array.isArray(response.data) ? response.data : response.data.items || [];
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{menuItem ? 'Edit Menu Item' : 'Create Menu Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Margherita Pizza"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the menu item..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price *</label>
              <div className="flex">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value="USD">USD</option>
                  <option value="PKR">PKR</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 border-l-0 rounded-r-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
              <input
                type="number"
                min="0"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
              <input
                type="number"
                min="0"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 350"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spice Level</label>
            <select
              value={formData.spice_level}
              onChange={(e) => setFormData({ ...formData, spice_level: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="mild">Mild</option>
              <option value="medium">Medium</option>
              <option value="hot">Hot</option>
              <option value="extra-hot">Extra Hot</option>
            </select>
          </div>

          <div>
            <ImageUpload
              value={formData.image_urls}
              onChange={(urls) => setFormData({ ...formData, image_urls: Array.isArray(urls) ? urls : [urls] })}
              multiple={true}
              maxImages={5}
              label="Menu Item Images"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newDietaryTag}
                onChange={(e) => setNewDietaryTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDietaryTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Vegetarian, Vegan, Gluten-Free"
              />
              <button
                type="button"
                onClick={addDietaryTag}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.dietary_tags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg flex items-center gap-2 text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeDietaryTag(index)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Tomato, Cheese, Basil"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.ingredients.map((ing, index) => (
                <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg flex items-center gap-2 text-sm">
                  {ing}
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergens</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Nuts, Dairy, Gluten"
              />
              <button
                type="button"
                onClick={addAllergen}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergens.map((all, index) => (
                <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-lg flex items-center gap-2 text-sm">
                  {all}
                  <button
                    type="button"
                    onClick={() => removeAllergen(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_available"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                Available
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_featured" className="ml-2 text-sm text-gray-700">
                Featured
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : menuItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemForm;

