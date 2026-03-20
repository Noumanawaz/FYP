import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Folder, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';
import CategoryForm from './CategoryForm';

interface Category {
  category_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  parent_category_id?: string;
}

interface CategoriesTabProps {
  restaurantId: string;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ restaurantId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadCategories();
  }, [restaurantId]);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCategories(restaurantId);
      if (response.success && response.data) {
        const cats = Array.isArray(response.data) ? response.data : (response.data as any).items || [];
        setCategories(cats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('This will purge the category and all associated metadata associations. Proceed?')) {
      return;
    }
    try {
      await apiService.deleteCategory(categoryId);
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingCategory(undefined);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(undefined);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Loading Categories...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-[#161616] p-8 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-sm transition-all">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Menu Categories</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organize your menu for better customer navigation</p>
        </div>
        <button
          onClick={handleCreate}
          className="group flex items-center gap-2.5 px-8 py-3 bg-cyan-500 text-white rounded-full font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-105 hover:bg-cyan-400 shadow-xl shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold tracking-widest uppercase">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#161616] border border-dashed border-gray-200 dark:border-white/10 rounded-[2.5rem] transition-all">
          <div className="p-6 rounded-full bg-gray-50 dark:bg-white/5 mb-6">
            <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">No Categories Added</h4>
          <p className="text-gray-400 text-center max-w-sm px-6 mb-8">Start organizing your menu items by adding your first category.</p>
          <button onClick={handleCreate} className="px-10 py-3.5 bg-cyan-500 text-white rounded-full font-bold text-[10px] tracking-[0.25em] uppercase hover:scale-105 transition-all shadow-lg shadow-cyan-500/20">
            Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12 transition-all">
          {categories.map((category) => (
            <div key={category.category_id} className="group relative bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <Folder className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">{category.name}</h4>
                </div>
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border ${
                  category.is_active ? 'bg-green-500/5 text-green-600 border-green-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent'
                }`}>
                  {category.is_active ? 'Active' : 'Draft'}
                </span>
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed line-clamp-2 h-10 italic">
                  "{category.description}"
                </p>
              )}

              <div className="flex gap-2.5 mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-cyan-500 hover:text-white transition-all border border-gray-200 dark:border-white/5 flex items-center justify-center gap-2"
                >
                  <Edit className="w-3 h-3" />
                  Update
                </button>
                <button
                  onClick={() => handleDelete(category.category_id)}
                  className="p-2.5 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CategoryForm
          restaurantId={restaurantId}
          category={editingCategory}
          onClose={handleFormClose}
          onSuccess={loadCategories}
        />
      )}
    </div>
  );
};

export default CategoriesTab;
