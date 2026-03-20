import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { ClipboardList, Filter, Clock, MapPin, User, ChevronDown, RefreshCw, Loader2, CheckCircle2, Package, Truck, XCircle, Search } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useApp } from '../../../contexts/AppContext';

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
  { value: 'pending', label: 'Incoming', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-500/20', icon: Clock, dot: 'bg-yellow-500' },
  { value: 'preparing', label: 'Preparing', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20', icon: Package, dot: 'bg-blue-500' },
  { value: 'ready', label: 'Ready', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20', icon: Truck, dot: 'bg-purple-500' },
  { value: 'completed', label: 'Done', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-500/20', icon: CheckCircle2, dot: 'bg-green-500' },
  { value: 'cancelled', label: 'Void', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20', icon: XCircle, dot: 'bg-red-500' }
];

const OrdersTab: React.FC<OrdersTabProps> = ({ restaurantId, locations: propLocations = [] }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations] = useState<Location[]>(propLocations);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { state } = useApp();
  const isBranchUser = state.user?.role === 'branch_user';
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const hasLoaded = React.useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadData();
    }
    const interval = setInterval(() => fetchOrders(false), 30000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMenuItems(), fetchOrders()]);
    setLoading(false);
  };

  const fetchMenuItems = async () => {
    try {
      const response = await apiService.getMenuItems(restaurantId);
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : ((response.data as any).items || []);
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
        let orderList = Array.isArray(response.data) ? response.data : ((response.data as any).items || (response.data as any).orders || []);
        
        orderList = orderList.filter((o: any) => o !== null && (typeof o === 'object')).map((o: any) => {
          const baseOrder = o.order_data ? o.order_data : o;
          return { 
            ...baseOrder, 
            status: baseOrder.order_status || baseOrder.status || 'pending',
            created_at: baseOrder.created_at || new Date().toISOString(),
            order_id: String(baseOrder.order_id || Math.random().toString(36).substr(2, 9)),
            total_amount: Number(baseOrder.total_amount || 0)
          };
        });

        const sorted = [...orderList].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
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
        setOrders(orders.map(o => o.order_id === orderId ? { ...o, status: newStatus as any } : o));
      }
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const getLocationLabel = (locationId?: string) => {
    if (!locationId) return 'Main Hub';
    const loc = locations.find(l => l.location_id === locationId);
    return loc ? `${loc.area}` : 'Remote';
  };

  const filteredOrders = orders.filter(order => {
    if (selectedLocation !== 'all' && order.location_id !== selectedLocation) return false;
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchId = (order.order_id || '').toLowerCase().includes(s);
      const matchName = (order.customer_name || '').toLowerCase().includes(s);
      const matchPhone = (order.phone || '').toLowerCase().includes(s);
      if (!matchId && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const getFormattedTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'h:mm a') : '00:00';
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Streaming Orders...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 max-w-[1600px] mx-auto">
      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-[136px] z-30 bg-[#F9FAFB]/80 dark:bg-[#0B0B0B]/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Name, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 rounded-full text-xs font-medium outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {!isBranchUser && (
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 outline-none"
            >
              <option value="all">Global Network</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>{loc.area}</option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 outline-none"
          >
            <option value="all">All Flow States</option>
            {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => fetchOrders(true)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg hover:text-cyan-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold tracking-widest uppercase text-center">
          {error}
        </div>
      )}

      {/* Orders List - Compact */}
      <div className="grid grid-cols-1 gap-4 pb-20">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#161616] border border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
            <ClipboardList className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">No orders detected</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const statusObj = ORDER_STATUSES.find(s => s.value === order.status) || ORDER_STATUSES[0];
            const StatusIcon = statusObj.icon;
            let items: any[] = [];
            try {
              items = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
            } catch (e) {
              items = [];
            }
            
            return (
              <div key={order.order_id} className="group relative bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                  {/* Left: ID & Time & Status */}
                  <div className="flex items-center gap-5 min-w-[300px]">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-black text-cyan-500">
                        #{order.order_id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {getFormattedTime(order.created_at)}
                        <span className="mx-1 opacity-20">•</span>
                        <MapPin className="w-3 h-3" /> {getLocationLabel(order.location_id)}
                      </span>
                    </div>
                    {/* Compact Status Pill */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusObj.dot} animate-pulse`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{statusObj.label}</span>
                    </div>
                  </div>

                  {/* Middle Row: Entity & Summary merged horizontally */}
                  <div className="flex-1 flex flex-col md:flex-row items-center gap-8 xl:gap-12 w-full">
                    {/* Entity Creds */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                        <User className="w-3 h-3" /> Credentials
                      </div>
                      <div className="flex items-baseline gap-3">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[150px]">{order.customer_name || 'Guest'}</h4>
                        <span className="text-[10px] font-medium text-gray-400">{order.phone || 'N/A'}</span>
                      </div>
                      {order.delivery_address && (
                         <p className="text-[10px] text-gray-500 italic truncate max-w-[200px]" title={order.delivery_address}>{order.delivery_address}</p>
                      )}
                    </div>

                    {/* Order Summary Row */}
                    <div className="flex-[2] space-y-1">
                       <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                         <Package className="w-3 h-3" /> Summary ({items.length} items)
                       </div>
                       <div className="flex flex-wrap gap-2">
                         {items.slice(0, 3).map((item: any, i: number) => (
                           <span key={i} className="px-2 py-0.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-md text-[10px] font-bold text-gray-600 dark:text-gray-400">
                             {item.quantity}x {item.name || `Item ${i+1}`}
                           </span>
                         ))}
                         {items.length > 3 && <span className="text-[10px] text-gray-400 font-bold">+{items.length - 3} more</span>}
                       </div>
                    </div>

                    {/* Total */}
                    <div className="text-right min-w-[100px]">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Valuation</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white">${Number(order.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 pl-4 border-l border-gray-100 dark:border-white/5 min-w-[150px]">
                     <div className="relative w-full">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                          disabled={updatingId === order.order_id}
                          className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none ${statusObj.color}`}
                        >
                          {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                        {updatingId === order.order_id && (
                          <Loader2 className="w-3 h-3 absolute -right-5 top-1/2 -translate-y-1/2 text-cyan-500 animate-spin" />
                        )}
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
