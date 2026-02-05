import React from 'react';
import { Check, X, Edit, ShoppingCart } from 'lucide-react';
import { ParsedOrder } from '../../utils/voiceOrderProcessor';
import Button from '../Common/Button';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  parsedOrder: ParsedOrder;
  confirmationMessage: string;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  parsedOrder,
  confirmationMessage
}) => {
  if (!isOpen) return null;

  const hasErrors = parsedOrder.errors.length > 0;
  const lowConfidence = parsedOrder.confidence < 0.7;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Your Order</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Confidence Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Order Understanding</span>
              <span className={`text-sm font-medium ${
                parsedOrder.confidence >= 0.8 ? 'text-green-600' : 
                parsedOrder.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(parsedOrder.confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  parsedOrder.confidence >= 0.8 ? 'bg-green-500' : 
                  parsedOrder.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${parsedOrder.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Order Items */}
          {parsedOrder.items.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
              <div className="space-y-3">
                {parsedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.quantity}x {item.name}
                      </div>
                      {item.modifications && item.modifications.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {item.modifications.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      ₹{item.estimatedPrice}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    ₹{parsedOrder.totalEstimate}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Issues Found:</h4>
              <ul className="space-y-1">
                {parsedOrder.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {parsedOrder.suggestions.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Suggestions:</h4>
              <ul className="space-y-1">
                {parsedOrder.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-700">• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Low Confidence Warning */}
          {lowConfidence && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-yellow-600 mt-0.5">⚠️</div>
                <div>
                  <h4 className="font-medium text-yellow-800">Please Review</h4>
                  <p className="text-sm text-yellow-700">
                    I'm not completely confident about this order interpretation. 
                    Please review the items above before confirming.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onEdit}
              leftIcon={<Edit className="w-4 h-4" />}
              className="flex-1"
            >
              Edit Order
            </Button>
            
            {parsedOrder.items.length > 0 && (
              <Button
                onClick={onConfirm}
                leftIcon={<ShoppingCart className="w-4 h-4" />}
                className="flex-1"
                disabled={hasErrors}
              >
                Add to Cart
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> This is a demo. In a real app, these items would be matched 
              with actual restaurant menus and added to your cart for checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;