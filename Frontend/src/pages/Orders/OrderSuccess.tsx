import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import Button from '../../components/Common/Button';

const OrderSuccess: React.FC = () => {
    const location = useLocation();
    const orderId = location.state?.orderId;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Successful!</h1>
                <p className="text-gray-600 mb-6">
                    Your order has been placed successfully. We've received it and the restaurant will start preparing it soon.
                </p>

                {orderId && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-8">
                        <p className="text-sm text-gray-500 uppercase tracking-wide">Order ID</p>
                        <p className="font-mono font-medium text-gray-900 break-all">{orderId}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <Link to="/orders" className="block">
                        <Button className="w-full">
                            View My Orders
                        </Button>
                    </Link>
                    <Link to="/restaurants" className="block">
                        <Button variant="outline" className="w-full" leftIcon={<ShoppingBag className="w-4 h-4" />}>
                            Continue Shopping
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
