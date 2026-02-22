import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, ShoppingBag, MapPin, Search } from 'lucide-react';
import { apiService } from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import Button from '../../components/Common/Button';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'confirmed':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'preparing':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'ready':
            return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'delivered':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'cancelled':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

let globalOrdersPromise: Promise<any> | null = null;
let globalOrdersUserId: string | null = null;

const Orders: React.FC = () => {
    const { state } = useApp();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isInstanceMounted = true;

        const fetchOrders = async () => {
            if (!state.user?.id) {
                return;
            }

            try {
                if (globalOrdersUserId !== state.user.id || !globalOrdersPromise) {
                    globalOrdersPromise = apiService.getMyOrders({ limit: 50 });
                    globalOrdersUserId = state.user.id;
                }

                const response = await globalOrdersPromise;
                if (!isInstanceMounted) return;

                console.log('[Orders] Raw response:', response);

                if (response?.success && response?.data) {
                    const rpData = response.data as any;
                    console.log('[Orders] Parsed data object:', rpData);

                    // Handle generic unwrapping in case Axios double wrapped it (data.data.orders)
                    let extracted: any[] = [];
                    if (Array.isArray(rpData)) extracted = rpData;
                    else if (Array.isArray(rpData.orders)) extracted = rpData.orders;
                    else if (rpData.data && Array.isArray(rpData.data.orders)) extracted = rpData.data.orders;
                    else if (rpData.data && Array.isArray(rpData.data)) extracted = rpData.data;

                    console.log('[Orders] Extracted orders array:', extracted);
                    setOrders(extracted);
                } else {
                    console.error('[Orders] Response success was false or data missing');
                    setError('Failed to load orders.');
                }
            } catch (err) {
                if (!isInstanceMounted) return;
                console.error('Error fetching orders:', err);
                setError('An error occurred while loading your orders.');
            } finally {
                if (isInstanceMounted) {
                    setLoading(false);
                }
            }
        };

        fetchOrders();

        return () => {
            isInstanceMounted = false;
        };
    }, [state.user?.id]);

    if (!state.isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-primary-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view orders</h2>
                    <p className="text-gray-600 mb-6">Track your recent orders and reorder your favorites quickly.</p>
                    <Link to="/login">
                        <Button className="w-full">Sign In</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-primary-500" />
                        My Orders
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                {orders.length === 0 && !error ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
                        <p className="text-gray-500 mb-6">Looks like you haven't placed any orders with us.</p>
                        <Link to="/restaurants">
                            <Button>Explore Restaurants</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            const date = new Date(order.created_at || order.createdAt || Date.now());
                            const formattedDate = date.toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            });
                            const time = date.toLocaleTimeString('en-PK', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <div key={order.order_id || order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    Order <span className="text-primary-600">#{((order.order_id || order.id || "").split('-')[0] || "").toUpperCase()}</span>
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(order.order_status || order.status)}`}>
                                                    {order.order_status || order.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500 gap-4">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formattedDate} at {time}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {order.currency || 'PKR'} {parseFloat(order.total_amount || order.total || 0).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t border-b border-gray-100 py-4 mb-4">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Items</h4>
                                        <ul className="space-y-2">
                                            {(order.items || order.order_items || []).map((item: any, idx: number) => (
                                                <li key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700">
                                                        <span className="font-medium">{item.quantity}x</span> {item.menuItem?.name || item.name || "Menu Item"}
                                                    </span>
                                                    {(item.unit_price || item.price) ? (
                                                        <span className="text-gray-500 whitespace-nowrap">
                                                            PKR {((item.unit_price || item.price) * item.quantity).toFixed(2)}
                                                        </span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-gray-900">Delivery Address</p>
                                                <p className="line-clamp-2">{order.delivery_address || 'Address not specified'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
