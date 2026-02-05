import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { apiService } from '../../../services/api';
import ImageUpload from '../../../components/Common/ImageUpload';

interface Category {
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  parent_category_id?: string;
}

interface CategoryFormProps {
  restaurantId: string;
  category?: Category;
  onClose: () => void;
  onSuccess: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ restaurantId, category, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
    parent_category_id: category?.parent_category_id || '',
    is_active: category?.is_active ?? true,
  });

  useEffect(() => {
    loadCategories();
  }, [restaurantId]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getCategories(restaurantId);
      if (response.success && response.data) {
        const cats = Array.isArray(response.data) ? response.data : response.data.items || [];
        setCategories(cats.filter((c: Category) => c.category_id !== category?.category_id));
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
        name: formData.name,
        description: formData.description || undefined,
        image_url: formData.image_url || undefined,
        parent_category_id: formData.parent_category_id || undefined,
        is_active: formData.is_active,
      };

      if (category) {
        await apiService.updateCategory(category.category_id, data);
      } else {
        await apiService.createCategory(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{category ? 'Edit Category' : 'Create Category'}</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Appetizers, Main Course, Desserts"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (Optional)</label>
            <select
              value={formData.parent_category_id}
              onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Root Category)</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of this category..."
            />
          </div>

          <div>
            <ImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: typeof url === 'string' ? url : url[0] || '' })}
              multiple={false}
              label="Category Image"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active (visible to customers)
            </label>
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
              {loading ? 'Saving...' : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;

