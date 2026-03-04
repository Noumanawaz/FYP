import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { ClipboardList, Filter, Clock, MapPin, User, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  item_id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

interface Order {
  order_id: string;
  restaurant_id: string;
  location_id?: string;
  user_id?: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  order_type: 'app' | 'voice' | 'web' | 'phone';
  created_at: string;
  delivery_address?: string;
  phone?: string;
  customer_name?: string;
}

interface Location {
  location_id: string;
  city: string;
  area: string;
  address: string;
}

interface OrdersTabProps {
  restaurantId: string;
  locations?: Location[];
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-500' },
  { value: 'preparing', label: 'Preparing', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'ready', label: 'Ready for Pickup/Delivery', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-500' }
];

const OrdersTab: React.FC<OrdersTabProps> = ({ restaurantId, locations: propLocations = [] }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations] = useState<Location[]>(propLocations);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Status update tracking
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadData();
    }
    
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchMenuItems(),
      fetchOrders()
    ]);
    setLoading(false);
  };

  const fetchMenuItems = async () => {
    try {
      const response = await apiService.getMenuItems(restaurantId);
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : (response.data.items || []);
        setMenuItems(items);
      }
    } catch (err) {
      console.error('Failed to load menu items', err);
    }
  };

  const fetchOrders = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await apiService.getRestaurantOrders(restaurantId);
      if (response.success && response.data) {
        let orderList = Array.isArray(response.data) ? response.data : 
                          (response.data.items || response.data.orders || []);
        
        // Handle MongoDB wrapping vs Postgres flat structure, and map order_status to status
        orderList = orderList.map((o: any) => {
          const baseOrder = o.order_data ? o.order_data : o;
          return {
            ...baseOrder,
            status: baseOrder.order_status || baseOrder.status // Postgres uses order_status 
          };
        });
        
        // Sort newest first
        const sorted = [...orderList].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setOrders(sorted);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const response = await apiService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        // Optimistically update local state
        setOrders(orders.map(o => 
          o.order_id === orderId ? { ...o, status: newStatus as any } : o
        ));
      } else {
        alert('Failed to update order status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating order');
    } finally {
      setUpdatingId(null);
    }
  };

  const getLocationLabel = (locationId?: string) => {
    if (!locationId) return 'Main Branch';
    const loc = locations.find(l => l.location_id === locationId);
    return loc ? `${loc.area}, ${loc.city}` : 'Unknown Branch';
  };

  const filteredOrders = orders.filter(order => {
    if (selectedLocation !== 'all' && order.location_id !== selectedLocation) return false;
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    return true;
  });

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            Orders Management
          </h3>
          <p className="text-gray-400 text-sm mt-1">View and manage orders across your branches</p>
        </div>
        
        <button 
          onClick={() => fetchOrders(true)} 
          className="px-4 py-2 bg-[#111] border border-white/10 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors"
        >
          Refresh Now
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">Filters:</span>
        </div>
        
        <div>
          <label className="sr-only">Branch</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 bg-[#050505] text-white border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
          >
            <option value="all">All Branches</option>
            {locations.length === 0 && <option value="unassigned">Main Branch</option>}
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.area}, {loc.city}
              </option>
            ))}
          </select>
        </div>

        <div>
           <label className="sr-only">Status</label>
           <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#050505] text-white border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 text-sm"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        
        <div className="ml-auto text-sm text-gray-400">
          Showing {filteredOrders.length} order(s)
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#111] border border-white/5 rounded-xl p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No orders found</h3>
            <p className="text-gray-400 text-sm">Waiting for incoming orders matching your filters.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
             const currentStatusObj = ORDER_STATUSES.find(s => s.value === order.status) || ORDER_STATUSES[0];
             
             return (
              <div key={order.order_id} className="bg-[#111] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-semibold text-cyan-400">
                        #{order.order_id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">
                        {order.order_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {getLocationLabel(order.location_id)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="block text-sm text-gray-400">Status</span>
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                          disabled={updatingId === order.order_id}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium border border-transparent hover:border-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${currentStatusObj.color} bg-[#050505] disabled:opacity-50`}
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Details</h4>
                     <div className="flex items-start gap-2 text-sm text-gray-300">
                        <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-white">{order.customer_name || 'Guest Customer'}</p>
                          {order.phone && <p>{order.phone}</p>}
                          {order.delivery_address && (
                            <p className="mt-1 text-gray-400">{order.delivery_address}</p>
                          )}
                        </div>
                     </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Items</h4>
                     <ul className="space-y-2">
                       {(Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : [])).map((item: any, idx: number) => {
                         const menuItem = menuItems.find((m: any) => m.item_id === item.item_id) || {};
                         const itemName = item.name || menuItem.name || `Item ${item.item_id?.substring(0,4) || 'Unknown'}`;
                         
                         // Determine price. First check if order payload has it. Then menu item. Default 0.
                         let itemStrPrice = String(item.price || menuItem.base_price || '0');
                         const parsedPrice = parseFloat(itemStrPrice);
                         const finalItemPrice = isNaN(parsedPrice) ? 0 : parsedPrice;
                         const itemTotal = finalItemPrice * (item.quantity || 1);

                         return (
                         <li key={idx} className="flex justify-between items-start text-sm">
                           <div className="flex gap-2">
                             <span className="font-medium text-cyan-400">{item.quantity}x</span>
                             <div>
                               <span className="text-gray-200">{itemName}</span>
                               {item.special_instructions && (
                                 <p className="text-xs text-yellow-500/80 mt-0.5">Note: {item.special_instructions}</p>
                               )}
                             </div>
                           </div>
                           <span className="text-gray-400 font-medium whitespace-nowrap">
                             ${itemTotal.toFixed(2)}
                           </span>
                         </li>
                         );
                       })}
                     </ul>
                     <div className="pt-3 mt-3 border-t border-white/5 flex justify-between items-center">
                       <span className="font-medium text-gray-300">Total Amount</span>
                       <span className="text-lg font-bold text-white">
                         ${typeof order.total_amount === 'number' ? order.total_amount.toFixed(2) : parseFloat((order as any).total_amount || '0').toFixed(2)}
                       </span>
                     </div>
                  </div>
                </div>
              </div>
             );
          })
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
