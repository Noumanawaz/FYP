import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Folder } from 'lucide-react';
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

  useEffect(() => {
    loadCategories();
  }, [restaurantId]);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCategories(restaurantId);
      if (response.success && response.data) {
        const cats = Array.isArray(response.data) ? response.data : response.data.items || [];
        setCategories(cats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Menu Categories</h3>
          <p className="text-sm text-gray-600 mt-1">Organize your menu items into categories</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No categories yet. Create your first category to organize your menu.</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category.category_id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{category.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.category_id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
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

