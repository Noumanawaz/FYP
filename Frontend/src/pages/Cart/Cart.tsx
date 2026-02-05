import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import Button from '../../components/Common/Button';

const Cart: React.FC = () => {
  const { state, dispatch } = useApp();
  const cart = state.cart;

  const deliveryFee = cart.deliveryFee || 35;
  const tax = cart.tax || (cart.subtotal * 0.08); // 8% tax
  const total = cart.subtotal + deliveryFee + tax - cart.discount;

  const updateCartItem = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    } else {
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { itemId, quantity } });
    }
  };

  const removeFromCart = (itemId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">
              Add some delicious items to get started!
            </p>
            <Link to="/restaurants">
              <Button className="px-8 py-3">Browse Restaurants</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/restaurants">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
          <span className="text-gray-500">({cartItemCount} items)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-4">
                  {item.menuItem.image && (
                    <img
                      src={item.menuItem.image}
                      alt={item.menuItem.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.menuItem.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.menuItem.description}
                    </p>
                    
                    {item.customizations && item.customizations.length > 0 && (
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">Customizations: </span>
                        {item.customizations.map((custom, index) => (
                          <span key={index}>
                            {custom.name}
                            {index < item.customizations.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="font-medium">Add-ons: </span>
                        {item.addons.map((addon, index) => (
                          <span key={index}>
                            {addon.name} (+PKR {addon.price})
                            {index < item.addons.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {item.specialInstructions && (
                      <p className="text-xs text-gray-500 mb-3">
                        <span className="font-medium">Note: </span>{item.specialInstructions}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-primary-600">
                        PKR {item.price.toLocaleString()}
                      </span>
                      
                      <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        
                        <button
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={clearCart}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">PKR {cart.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">PKR {deliveryFee.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax & Fees</span>
                  <span className="font-medium">PKR {tax.toFixed(2)}</span>
                </div>
                
                {cart.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-PKR {cart.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900">Total</span>
                    <span className="text-primary-600">PKR {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <Link to="/checkout" className="block mt-6">
                <Button className="w-full">
                  Proceed to Checkout
                </Button>
              </Link>
              
              <Link to="/restaurants" className="block mt-3">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
              
              {/* Promo Code */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  <Button size="sm" variant="outline">
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;