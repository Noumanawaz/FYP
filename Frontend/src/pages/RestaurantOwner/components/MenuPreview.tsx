import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Clock, Flame, Leaf, AlertCircle } from 'lucide-react';
import { apiService } from '../../../services/api';

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
  description?: string;
  image_url?: string;
  is_active: boolean;
  parent_category_id?: string;
}

interface MenuPreviewProps {
  restaurantId: string;
}

const MenuPreview: React.FC<MenuPreviewProps> = ({ restaurantId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadMenuData();
  }, [restaurantId]);

  const loadMenuData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load categories
      const categoriesResponse = await apiService.getCategories(restaurantId, { is_active: true });
      if (categoriesResponse.success && categoriesResponse.data) {
        const cats = Array.isArray(categoriesResponse.data) 
          ? categoriesResponse.data 
          : categoriesResponse.data.items || [];
        setCategories(cats.filter((c: Category) => c.is_active));
      }

      // Load menu items
      const itemsResponse = await apiService.getMenuItems(restaurantId, { is_available: true });
      if (itemsResponse.success && itemsResponse.data) {
        const items = Array.isArray(itemsResponse.data) 
          ? itemsResponse.data 
          : itemsResponse.data.items || [];
        setMenuItems(items.filter((item: MenuItem) => item.is_available));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const getSpiceLevelColor = (level?: string) => {
    switch (level) {
      case 'mild': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'hot': return 'text-orange-500 bg-orange-500/10';
      case 'extra-hot': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-400 bg-[#050505]';
    }
  };

  const getSpiceLevelIcon = (level?: string) => {
    if (level === 'hot' || level === 'extra-hot') {
      return <Flame className="w-3 h-3" />;
    }
    return null;
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems;

  const rootCategories = categories.filter(cat => !cat.parent_category_id);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading menu preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-200 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">Menu Preview</h3>
        <p className="text-gray-400">This is how your menu appears to customers</p>
      </div>

      {/* Category Filter */}
      {rootCategories.length > 0 && (
        <div className="mb-6 bg-[#111] border border-white/5 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-cyan-500 text-gray-900 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              All Items
            </button>
            {rootCategories.map((category) => (
              <button
                key={category.category_id}
                onClick={() => setSelectedCategory(category.category_id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.category_id
                    ? 'bg-cyan-500 text-gray-900 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items by Category */}
      {rootCategories.length === 0 ? (
        <div className="bg-[#111] border border-white/5 rounded-lg shadow p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No menu items available yet</p>
          <p className="text-gray-500 text-sm mt-2">Add categories and menu items to see them here</p>
        </div>
      ) : (
        <div className="space-y-8">
          {rootCategories.map((category) => {
            const categoryItems = filteredItems.filter(
              item => item.category_id === category.category_id
            );

            if (selectedCategory && selectedCategory !== category.category_id) {
              return null;
            }

            if (categoryItems.length === 0 && selectedCategory === category.category_id) {
              return (
                <div key={category.category_id} className="bg-[#111] border border-white/5 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-400">No items in this category yet</p>
                </div>
              );
            }

            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <div key={category.category_id} className="bg-[#111] border border-white/5 rounded-lg shadow overflow-hidden">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 px-6 py-4 border-b">
                  <h4 className="text-xl font-bold text-white">{category.name}</h4>
                  {category.description && (
                    <p className="text-sm text-gray-400 mt-1">{category.description}</p>
                  )}
                </div>

                {/* Menu Items Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categoryItems.map((item) => {
                      const price = typeof item.base_price === 'number' 
                        ? item.base_price 
                        : parseFloat(item.base_price || '0');

                      return (
                        <div
                          key={item.item_id}
                          className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Item Image */}
                          {item.image_urls && item.image_urls.length > 0 && (
                            <div className="relative h-48 bg-white/10">
                              <img
                                src={item.image_urls[0]}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              {item.is_featured && (
                                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                                  Featured
                                </div>
                              )}
                            </div>
                          )}

                          {/* Item Details */}
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-lg font-semibold text-white">{item.name}</h5>
                              <span className="text-lg font-bold text-cyan-400">
                                {item.currency || 'USD'} {price.toFixed(2)}
                              </span>
                            </div>

                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{item.description}</p>

                            {/* Tags and Info */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {item.spice_level && (
                                <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getSpiceLevelColor(item.spice_level)}`}>
                                  {getSpiceLevelIcon(item.spice_level)}
                                  {item.spice_level}
                                </span>
                              )}
                              {item.preparation_time && (
                                <span className="px-2 py-1 text-xs bg-white/5 text-gray-300 rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.preparation_time} min
                                </span>
                              )}
                              {item.calories && (
                                <span className="px-2 py-1 text-xs bg-white/5 text-gray-300 rounded-full">
                                  {item.calories} cal
                                </span>
                              )}
                            </div>

                            {/* Dietary Tags */}
                            {item.dietary_tags && item.dietary_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.dietary_tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1"
                                  >
                                    <Leaf className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Allergens Warning */}
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="flex items-start gap-1">
                                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium text-orange-500">Contains:</p>
                                    <p className="text-xs text-gray-400">
                                      {item.allergens.join(', ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Ingredients */}
                            {item.ingredients && item.ingredients.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-white/10">
                                <p className="text-xs font-medium text-gray-300 mb-1">Ingredients:</p>
                                <p className="text-xs text-gray-400">
                                  {item.ingredients.join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && categories.length > 0 && (
        <div className="bg-[#111] border border-white/5 rounded-lg shadow p-12 text-center">
          <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No menu items available</p>
          <p className="text-gray-500 text-sm mt-2">Add menu items to see them in the preview</p>
        </div>
      )}
    </div>
  );
};

export default MenuPreview;

