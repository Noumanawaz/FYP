import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { apiService } from '../../../services/api';
import ImageUpload from '../../../components/Common/ImageUpload';
import Modal from '../../../components/Common/Modal';

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
        const cats = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
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

  const inputClasses = "w-full px-5 py-3.5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-gray-900 dark:text-white font-medium shadow-sm active:scale-[0.99] focus:bg-white dark:focus:bg-[#1A1A1A]";
  const labelClasses = "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1 mb-2 block";

  const formFooter = (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-6 py-3 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all outline-none"
      >
        Discard
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
        {category ? 'Sync Category' : 'Create Category'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={category ? 'Update Taxonomy' : 'New Menu Category'}
      footer={formFooter}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className={labelClasses}>Category Designation *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClasses}
              placeholder="e.g. Signature Main Courses"
            />
          </div>

          <div>
            <label className={labelClasses}>Hierarchical Parent</label>
            <select
              value={formData.parent_category_id}
              onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
              className={inputClasses}
            >
              <option value="" className="dark:bg-[#121212]">Root Architectural Level</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id} className="dark:bg-[#121212]">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>Functional Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`${inputClasses} resize-none`}
              placeholder="Primary purpose of this classification..."
            />
          </div>

          <ImageUpload
            value={formData.image_url}
            onChange={(url) => setFormData({ ...formData, image_url: typeof url === 'string' ? url : url[0] || '' })}
            multiple={false}
            label="Category Key Visual"
          />

          <div className="flex items-center gap-3 cursor-pointer group px-1">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded-lg border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-cyan-500 focus:ring-cyan-500/20 transition-all cursor-pointer"
            />
            <label htmlFor="is_active" className="text-sm font-bold text-gray-500 group-hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px] cursor-pointer">
              Active Transmission Status
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryForm;

