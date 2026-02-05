-- Restaurant RAG Database Schema
-- Neon PostgreSQL Migration
-- Run this migration to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector extension for embeddings (if using pgvector)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ====== RESTAURANTS TABLE ======
CREATE TABLE IF NOT EXISTS restaurants (
    restaurant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description JSONB NOT NULL DEFAULT '{}',
    founded_year INTEGER,
    country VARCHAR(100) NOT NULL,
    price_range VARCHAR(20) NOT NULL CHECK (price_range IN ('budget', 'mid-range', 'premium')),
    categories TEXT[] NOT NULL DEFAULT '{}',
    specialties TEXT[] NOT NULL DEFAULT '{}',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    food_categories TEXT[] NOT NULL DEFAULT '{}',
    logo_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for restaurants
CREATE INDEX idx_restaurants_name ON restaurants(name);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_price_range ON restaurants(price_range);
CREATE INDEX idx_restaurants_categories ON restaurants USING GIN(categories);
CREATE INDEX idx_restaurants_keywords ON restaurants USING GIN(keywords);
CREATE INDEX idx_restaurants_created_at ON restaurants(created_at DESC);

-- ====== RESTAURANT LOCATIONS TABLE ======
CREATE TABLE IF NOT EXISTS restaurant_locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    phone VARCHAR(20),
    operating_hours JSONB DEFAULT '{}',
    delivery_zones JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'temporarily_closed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for locations
CREATE INDEX idx_locations_restaurant_id ON restaurant_locations(restaurant_id);
CREATE INDEX idx_locations_city ON restaurant_locations(city);
CREATE INDEX idx_locations_status ON restaurant_locations(status);
CREATE INDEX idx_locations_lat_lng ON restaurant_locations(lat, lng);

-- ====== MENU CATEGORIES TABLE ======
CREATE TABLE IF NOT EXISTS menu_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_category_id UUID REFERENCES menu_categories(category_id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX idx_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_categories_parent_id ON menu_categories(parent_category_id);
CREATE INDEX idx_categories_active ON menu_categories(is_active);

-- ====== MENU ITEMS TABLE ======
CREATE TABLE IF NOT EXISTS menu_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(category_id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    image_urls TEXT[] DEFAULT '{}',
    dietary_tags TEXT[] DEFAULT '{}',
    spice_level VARCHAR(20) CHECK (spice_level IN ('mild', 'medium', 'hot', 'extra-hot')),
    preparation_time INTEGER,
    calories INTEGER,
    ingredients TEXT[] DEFAULT '{}',
    allergens TEXT[] DEFAULT '{}',
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    customization_options JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for menu items
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(is_featured);
CREATE INDEX idx_menu_items_name ON menu_items(name);
CREATE INDEX idx_menu_items_ingredients ON menu_items USING GIN(ingredients);
CREATE INDEX idx_menu_items_display_order ON menu_items(display_order);

-- ====== MENU ITEM VARIANTS TABLE ======
CREATE TABLE IF NOT EXISTS menu_item_variants (
    variant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    variant_type VARCHAR(20) NOT NULL CHECK (variant_type IN ('size', 'add-on', 'modification')),
    variant_name VARCHAR(255) NOT NULL,
    price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for variants
CREATE INDEX idx_variants_menu_item_id ON menu_item_variants(menu_item_id);
CREATE INDEX idx_variants_type ON menu_item_variants(variant_type);

-- ====== DEALS AND OFFERS TABLE ======
CREATE TABLE IF NOT EXISTS deals_and_offers (
    deal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deal_type VARCHAR(20) NOT NULL CHECK (deal_type IN ('combo', 'discount', 'special_offer')),
    discount_percentage DECIMAL(5, 2),
    discount_fixed DECIMAL(10, 2),
    items_included TEXT[] DEFAULT '{}',
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NOT NULL,
    min_order_amount DECIMAL(10, 2),
    max_uses_per_customer INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url VARCHAR(500),
    terms TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for deals
CREATE INDEX idx_deals_restaurant_id ON deals_and_offers(restaurant_id);
CREATE INDEX idx_deals_active ON deals_and_offers(is_active);
CREATE INDEX idx_deals_valid_dates ON deals_and_offers(valid_from, valid_to);
CREATE INDEX idx_deals_type ON deals_and_offers(deal_type);

-- ====== EMBEDDINGS TABLE ======
CREATE TABLE IF NOT EXISTS embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('menu_item', 'deal', 'restaurant_description', 'category')),
    source_id UUID NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    embedding_vector REAL[] NOT NULL, -- Use REAL[] for now, can switch to vector type if pgvector is enabled
    chunk_text TEXT NOT NULL,
    chunk_metadata JSONB DEFAULT '{}',
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for embeddings
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_restaurant_id ON embeddings(restaurant_id);
CREATE INDEX idx_embeddings_source_type ON embeddings(source_type);
-- Vector index would be created here if using pgvector
-- CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding_vector vector_cosine_ops);

-- ====== USERS TABLE ======
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ur')),
    favorite_restaurants UUID[] DEFAULT '{}',
    dietary_preferences TEXT[] DEFAULT '{}',
    addresses JSONB[] DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_favorites ON users USING GIN(favorite_restaurants);

-- ====== ORDERS TABLE ======
CREATE TABLE IF NOT EXISTS orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES restaurant_locations(location_id) ON DELETE RESTRICT,
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('voice', 'app', 'web', 'phone')),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    delivery_address TEXT,
    phone VARCHAR(20) NOT NULL,
    special_instructions TEXT,
    voice_transcript TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);

-- ====== ORDER ITEMS TABLE ======
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    variants_selected JSONB DEFAULT '{}',
    special_instructions TEXT,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for order items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ====== USER INTERACTIONS TABLE ======
CREATE TABLE IF NOT EXISTS user_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    session_id UUID NOT NULL,
    query_text TEXT NOT NULL,
    query_type VARCHAR(20) NOT NULL CHECK (query_type IN ('menu_search', 'order', 'question', 'comparison')),
    detected_restaurants UUID[] DEFAULT '{}',
    response_text TEXT NOT NULL,
    response_language VARCHAR(10) NOT NULL CHECK (response_language IN ('en', 'ur')),
    restaurant_id UUID REFERENCES restaurants(restaurant_id) ON DELETE SET NULL,
    confidence_score REAL NOT NULL DEFAULT 0,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for interactions
CREATE INDEX idx_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_interactions_session_id ON user_interactions(session_id);
CREATE INDEX idx_interactions_timestamp ON user_interactions(timestamp DESC);
CREATE INDEX idx_interactions_query_type ON user_interactions(query_type);

-- ====== RESTAURANT METADATA TABLE ======
CREATE TABLE IF NOT EXISTS restaurant_metadata (
    metadata_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    metadata_key VARCHAR(100) NOT NULL,
    metadata_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, metadata_key)
);

-- Indexes for metadata
CREATE INDEX idx_metadata_restaurant_id ON restaurant_metadata(restaurant_id);
CREATE INDEX idx_metadata_key ON restaurant_metadata(metadata_key);

-- ====== TRIGGERS FOR UPDATED_AT ======
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON restaurant_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON menu_item_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals_and_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metadata_updated_at BEFORE UPDATE ON restaurant_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

