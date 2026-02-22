import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { AppProvider } from "./contexts/AppContext";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home/Home";
import Restaurants from "./pages/Restaurants/Restaurants";
import RestaurantDetails from "./pages/Restaurant/RestaurantDetails";
import Cart from "./pages/Cart/Cart";
import Profile from "./pages/Profile/Profile";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import RestaurantOwnerDashboard from "./pages/RestaurantOwner/RestaurantOwnerDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Checkout from "./pages/Checkout/Checkout";
import OrderSuccess from "./pages/Orders/OrderSuccess";
import Orders from "./pages/Orders/Orders";

function App() {
  return (
    <Provider store={store}>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="restaurants" element={<Restaurants />} />
              <Route path="restaurant/:id" element={<RestaurantDetails />} />
              <Route path="cart" element={<Cart />} />
              <Route path="profile" element={<Profile />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vocabite-mart" element={<div className="p-8 text-center">Vocabite Mart - Coming Soon</div>} />
              <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="orders/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
            </Route>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route
              path="restaurant-owner"
              element={
                <ProtectedRoute requiredRole="restaurant_owner">
                  <RestaurantOwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AppProvider>
    </Provider>
  );
}

export default App;
