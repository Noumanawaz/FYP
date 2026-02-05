import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UtensilsCrossed, Filter } from 'lucide-react';
import { apiService } from '../../../services/api';
import MenuItemForm from './MenuItemForm';

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

interface MenuItemsTabProps {
  restaurantId: string;
}

const MenuItemsTab: React.FC<MenuItemsTabProps> = ({ restaurantId }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  useEffect(() => {
    loadCategories();
    loadMenuItems();
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

  const loadMenuItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getMenuItems(restaurantId);
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : response.data.items || [];
        setMenuItems(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
      return;
    }
    try {
      await apiService.deleteMenuItem(itemId);
      loadMenuItems();
    } catch (err: any) {
      alert(err.message || 'Failed to delete menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(undefined);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(undefined);
  };

  const filteredItems = menuItems.filter(item => {
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
    if (availabilityFilter === 'available' && !item.is_available) return false;
    if (availabilityFilter === 'unavailable' && item.is_available) return false;
    return true;
  });

  if (loading && menuItems.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading menu items...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Menu Items</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your restaurant menu items</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Menu Item
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Availability:</label>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            {menuItems.length === 0 
              ? 'No menu items yet. Create your first menu item to get started.'
              : 'No menu items match your filters.'}
          </p>
          {menuItems.length === 0 && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Menu Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const category = categories.find(c => c.category_id === item.category_id);
            return (
              <div key={item.item_id} className="bg-white rounded-lg shadow p-4">
                {item.image_urls && item.image_urls.length > 0 && (
                  <img
                    src={item.image_urls[0]}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-lg">{item.name}</h4>
                  <div className="flex gap-1">
                    {item.is_featured && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Featured</span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                {category && (
                  <p className="text-xs text-gray-500 mb-2">{category.name}</p>
                )}
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-blue-600">
                    {item.currency || 'USD'} {typeof item.base_price === 'number' ? item.base_price.toFixed(2) : parseFloat(item.base_price || '0').toFixed(2)}
                  </span>
                  {item.preparation_time && (
                    <span className="text-xs text-gray-500">{item.preparation_time} min</span>
                  )}
                </div>
                {item.dietary_tags && item.dietary_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.dietary_tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.item_id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <MenuItemForm
          restaurantId={restaurantId}
          menuItem={editingItem}
          onClose={handleFormClose}
          onSuccess={loadMenuItems}
        />
      )}
    </div>
  );
};

export default MenuItemsTab;

