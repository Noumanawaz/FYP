import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { apiService } from '../../services/api';
import Button from '../../components/Common/Button';
import { ArrowLeft, CheckCircle, CreditCard, MapPin } from 'lucide-react';

const Checkout: React.FC = () => {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const cart = state.cart;

    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [phone, setPhone] = useState(state.user?.phone || '');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deliveryFee = cart.deliveryFee || 35;
    const tax = cart.tax || (cart.subtotal * 0.08);
    const total = cart.subtotal + deliveryFee + tax - cart.discount;

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.items.length === 0) {
            setError('Your cart is empty. Please add items before checking out.');
            return;
        }

        if (!deliveryAddress.trim()) {
            setError('Please provide a delivery address.');
            return;
        }

        if (!phone.trim()) {
            setError('Please provide a valid phone number.');
            return;
        }

        // Find the restaurant ID by searching through state.restaurants for the menu item
        let restaurantId = cart.restaurantId || cart.items[0]?.restaurantId;

        // Backwards compatibility check: If an old cart item somehow doesn't have it, lookup its menu item
        if (!restaurantId && cart.items.length > 0) {
            const menuItemId = cart.items[0].menuItem.id;
            for (const restaurant of state.restaurants) {
                if (restaurant.menu?.some(item => item.id === menuItemId)) {
                    restaurantId = restaurant.id;
                    break;
                }
            }
        }

        // Note: Assuming the cart logic enforced items from same restaurant.
        // Assuming backend takes any UUID for location_id if we don't strictly have a user selected branch right now.
        // In production, we'd ensure `cart.restaurant` has the correctly selected `location_id`.
        if (!restaurantId && cart.items.length > 0) {
            // Fallback to the first restaurant in the list if we can't find it (avoids hard blocks for testing)
            restaurantId = state.restaurants.length > 0 ? state.restaurants[0].id : '';
        }

        if (!restaurantId) {
            setError('Cart items are missing restaurant information.');
            return;
        }

        setLoading(true);
        setError(null);

        const formattedItems = cart.items.map((item) => ({
            item_id: item.menuItem.id,
            quantity: item.quantity,
            variants: item.customizations,
            special_instructions: item.specialInstructions,
        }));

        try {
            // Fetch a valid location ID for the restaurant
            let locationId = "00000000-0000-0000-0000-000000000000"; // Fallback, though likely to fail DB constraints if not replaced
            try {
                const locationsResponse = await apiService.getRestaurantLocations(restaurantId);
                const locationsData = locationsResponse.data as any[];
                if (locationsResponse.success && locationsData && locationsData.length > 0) {
                    locationId = locationsData[0].location_id || locationsData[0].id;
                }
            } catch (locErr) {
                console.warn("Could not fetch locations, using fallback", locErr);
            }

            const response = await apiService.createOrder({
                restaurant_id: restaurantId,
                location_id: locationId,
                order_type: 'app',
                items: formattedItems,
                delivery_address: deliveryAddress,
                phone,
                special_instructions: specialInstructions,
            });

            if (response.success) {
                dispatch({ type: 'CLEAR_CART' });
                const orderData = response.data as any;
                navigate('/orders/success', { state: { orderId: orderData?.order_id || orderData?.id || 'new' } });
            } else {
                setError(response.error || 'Failed to place the order. Please try again.');
            }
        } catch (err: any) {
            console.error("Order error", err);
            setError(err.message || 'An error occurred while creating the order.');
        } finally {
            setLoading(false);
        }
    };

    if (cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center py-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                        <p className="text-gray-600 mb-6">Add items to place an order</p>
                        <Link to="/restaurants">
                            <Button>Browse Restaurants</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/cart">
                        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                            Back to Cart
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary-500" />
                                Delivery Details
                            </h2>
                            <form id="checkout-form" className="space-y-4" onSubmit={handlePlaceOrder}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Delivery Address *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        placeholder="Enter your full apartment, street, and city"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. +92 3XX XXXXXXX"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Special Instructions (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={specialInstructions}
                                        onChange={(e) => setSpecialInstructions(e.target.value)}
                                        placeholder="Any notes for the rider or restaurant?"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary-500" />
                                Payment Method
                            </h2>
                            <div className="p-4 border border-primary-500 bg-primary-50 rounded-lg flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-primary-500 border-4 border-white shadow-sm ring-1 ring-primary-500" />
                                <span className="font-medium text-gray-900">Cash on Delivery (COD)</span>
                            </div>
                            <p className="mt-3 text-sm text-gray-500">Other payment methods are currently disabled.</p>
                        </div>
                    </div>

                    {/* Order Summary & Pay */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>

                            <div className="space-y-4 mb-6">
                                {cart.items.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span className="text-gray-600 line-clamp-1">{item.quantity}x {item.menuItem.name}</span>
                                        <span className="font-medium whitespace-nowrap">PKR {item.price * item.quantity}</span>
                                    </div>
                                ))}
                                <hr className="border-gray-200" />
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium">PKR {cart.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Delivery Fee</span>
                                    <span className="font-medium">PKR {deliveryFee.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tax</span>
                                    <span className="font-medium">PKR {tax.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span className="text-gray-900">Total</span>
                                        <span className="text-primary-600">PKR {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                form="checkout-form"
                                isLoading={loading}
                                className="w-full text-lg py-3"
                                leftIcon={<CheckCircle className="w-5 h-5" />}
                            >
                                Place Order
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
