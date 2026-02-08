import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Truck, Navigation, Flame, Crown } from 'lucide-react';
import { Restaurant } from '../../types';
import { getRestaurantImage } from '../../utils/imageUtils';

interface RestaurantCardProps {
  restaurant: Restaurant & { distance?: number };
  showFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, restaurantId: string) => void;
  isFavorite?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ 
  restaurant, 
  showFavorite = false,
  onToggleFavorite,
  isFavorite = false
}) => {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block h-full">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary-500/20 h-full flex flex-col border border-gray-100">
        <div className="relative h-48 overflow-hidden shrink-0">
          <img 
            src={restaurant.coverImage || getRestaurantImage(restaurant.name, 'cover', restaurant.cuisines)} 
            alt={restaurant.name}
            onError={(e) => {
              // Only apply if not already using the backup
              const backup = getRestaurantImage(restaurant.name, 'cover', restaurant.cuisines);
              if ((e.target as HTMLImageElement).src !== backup) {
                 (e.target as HTMLImageElement).src = backup;
              } else {
                 (e.target as HTMLImageElement).src = "/restaurant-5521372_1920.jpg";
              }
            }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" 
          />
          {/* Subtle gradient for badges readability only */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent opacity-60"></div>
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {restaurant.promo && (
              <div className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center animate-fade-in">
                <Flame className="w-3 h-3 mr-1 text-white fill-current" />
                {restaurant.promo.title}
              </div>
            )}
            {restaurant.isPremium && (
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center animate-fade-in">
                <Crown className="w-3 h-3 mr-1 text-white fill-current" />
                Premium
              </div>
            )}
          </div>

          {!restaurant.isOpen && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <span className="text-white font-bold text-xl block">Closed</span>
                <p className="text-white/80 text-sm mt-1">Opens tomorrow at 9:00 AM</p>
              </div>
            </div>
          )}

          {/* Favorite Button */}
          {showFavorite && onToggleFavorite && (
             <button
               onClick={(e) => {
                 e.preventDefault();
                 onToggleFavorite(e, restaurant.id);
               }}
               className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-all duration-300 shadow-sm z-20 group/fav"
             >
               <svg
                 xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 24 24"
                 fill={isFavorite ? "currentColor" : "none"}
                 stroke="currentColor"
                 strokeWidth="2"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 className={`w-5 h-5 transition-colors duration-300 ${
                   isFavorite
                     ? 'text-red-500 fill-red-500'
                     : 'text-white group-hover/fav:text-red-500'
                 }`}
               >
                 <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5 4.5 1.5-1.5 1-1.5-1 4.5-5.5 5.5 0 0 0 16.5 3 0 0 0 0 11c2.5 0 2.5 0 5.5 1.5 8z" />
               </svg>
             </button>
          )}

          {/* Delivery Time Badge (moved from overlay to image corner) */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-primary-600" />
            <span>{restaurant.deliveryTime}</span>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">{restaurant.name}</h3>
              <div className="flex items-center bg-gray-100 px-2 py-1 rounded-lg shrink-0 ml-2">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-current mr-1" />
                <span className="text-xs font-bold text-gray-900">{restaurant.rating}</span>
                <span className="text-xs text-gray-500 ml-1">({restaurant.reviewCount})</span>
              </div>
            </div>
            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{restaurant.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {restaurant.cuisines.slice(0, 3).map((cuisine) => (
                <span key={cuisine} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors">
                  {cuisine}
                </span>
              ))}
              {restaurant.cuisines.length > 3 && (
                <span className="px-2 py-1 text-gray-400 text-xs font-medium">+{restaurant.cuisines.length - 3}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
            <div className="flex items-center text-gray-500 text-xs font-medium space-x-4">
              <div className="flex items-center">
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                <span>Rs. {restaurant.deliveryFee}</span>
              </div>
              <div className="flex items-center">
                 <span>Min Rs. {restaurant.minimumOrder}</span>
              </div>
            </div>
            
            {restaurant.distance !== undefined && (
              <div className="flex items-center text-primary-600 text-xs font-bold bg-primary-50 px-2 py-1 rounded-full">
                <Navigation className="w-3 h-3 mr-1" />
                <span>{typeof restaurant.distance === 'number' ? restaurant.distance.toFixed(1) : restaurant.distance} km</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
