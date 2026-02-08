// @ts-nocheck
import { sql } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const CENTER_LAT = 33.638349;
const CENTER_LNG = 72.983180;

const generateCoordinates = (lat: number, lng: number, radiusKm: number) => {
  const r = (radiusKm * Math.sqrt(Math.random())) / 111.32;
  const t = Math.random() * 2 * Math.PI;
  return {
    lat: lat + r * Math.sin(t),
    lng: lng + (r * Math.cos(t)) / Math.cos(lat * (Math.PI / 180)),
  };
};

// Rich dataset with extensive menus and photos
const restaurants = [
  {
    name: "Cheezious - F-11",
    description: "Famous for Crown Crust Pizza and Pasta. The go-to place for cheese lovers.",
    country: "PK",
    categories: ["Pizza", "Fast Food", "Italian"],
    price_range: "mid-range",
    rating: 4.8,
    logo: "https://images.unsplash.com/photo-1549488352-257a9e97b163?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=1600&q=80",
    menu: [
      {
        category: "Pizza",
        items: [
          { name: "Crown Crust Pizza", description: "Rich cheese stuffed crust with spicy chicken chunks.", price: 1500, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80" },
          { name: "Sriracha Beast", description: "Spicy sriracha sauce with jalapenos.", price: 1400, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80" },
          { name: "Pepperoni Passion", description: "Classic pepperoni with extra mozzarella.", price: 1300, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80" },
          { name: "Chicken Tikka Pizza", description: "Desi twist to Italian pizza.", price: 1250, image: "https://images.unsplash.com/photo-1593560708920-6389280b1161?w=800&q=80" },
          { name: "Veggie Delight", description: "Loaded with fresh vegetables and cheese.", price: 1100, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80" }
        ]
      },
      {
        category: "Pasta",
        items: [
          { name: "Fettuccine Alfredo", description: "Creamy white sauce pasta with grilled chicken.", price: 950, image: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=800&q=80" },
          { name: "Roasted Chicken Pasta", description: "Baked pasta with lots of cheese.", price: 850, image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80" }
        ]
      },
      {
        category: "Sides",
        items: [
            { name: "Garlic Bread", description: "Crispy bread with garlic butter.", price: 300, image: "https://images.unsplash.com/photo-1573140247632-f84660f67627?w=800&q=80" },
            { name: "Chicken Wings", description: "Spicy buffalo wings.", price: 450, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80" }
        ]
      }
    ]
  },
  {
    name: "Savor Foods",
    description: "Traditional Pulao Kabab. A staple of Islamabad/Rawalpindi.",
    country: "PK",
    categories: ["Pakistani", "Rice"],
    price_range: "budget",
    rating: 4.6,
    logo: "https://images.unsplash.com/photo-1626804475297-411dbcc75132?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&q=80",
    menu: [
      {
        category: "Pulao",
        items: [
          { name: "Chicken Pulao Kabab", description: "Double kabab special with raita.", price: 450, image: "https://images.unsplash.com/photo-1626804475297-411dbcc75132?w=800&q=80" },
          { name: "Single Pulao", description: "Standard serving with one kabab.", price: 350, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80" },
          { name: "Pulao Only", description: "Aromatic rice without kabab.", price: 250, image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&q=80" }
        ]
      },
      {
        category: "Extras",
        items: [
            { name: "Extra Shami Kabab", description: "Traditional beef lentil patty.", price: 80, image: "https://images.unsplash.com/photo-1603360946369-dc9bb6f54262?w=800&q=80" },
            { name: "Fresh Salad", description: "Seasonal vegetables.", price: 50, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80" }
        ]
      },
      {
        category: "Dessert",
        items: [
          { name: "Kheer", description: "Traditional rice pudding with nuts.", price: 150, image: "https://images.unsplash.com/photo-1549488352-257a9e97b163?w=800&q=80" }
        ]
      }
    ]
  },
  // Add other restaurants with robust menus...
  {
    name: "KFC - F-10",
    description: "World famous fried chicken. Zinger burgers and bucket meals.",
    country: "PK",
    categories: ["Fast Food", "Chicken", "Burgers"],
    price_range: "mid-range",
    rating: 4.5,
    logo: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1513639776629-7b611d236304?w=1600&q=80",
    menu: [
        {
            category: "Deals",
            items: [
                { name: "Mighty Zinger", description: "Double fillet spicy burger.", price: 850, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80" },
                { name: "Zinger Burger", description: "Classic spicy chicken burger.", price: 650, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80" },
                { name: "Twister", description: "Chicken wrap with special sauce.", price: 550, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80" }
            ]
        },
        {
            category: "Buckets",
            items: [
                { name: "9 Pcs Bucket", description: "Original recipe fried chicken.", price: 1800, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Monal - Pir Sohawa",
    description: "Iconic hilltop restaurant with panoramic views and diverse menu.",
    country: "PK",
    categories: ["Pakistani", "Continental", "Fine Dining"],
    price_range: "premium",
    rating: 4.7,
    logo: "https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?w=1600&q=80",
    menu: [
        {
            category: "Continental",
            items: [
                { name: "Grilled Chicken", description: "Served with mashed potatoes and vegetables.", price: 1400, image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80" },
                { name: "Beef Steak", description: "Tenderloin steak with pepper sauce.", price: 2200, image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80" }
            ]
        },
        {
            category: "Pakistani",
            items: [
                { name: "Mutton Karahi", description: "Traditional wok cooked mutton.", price: 2500, image: "https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800&q=80" },
                { name: "Chicken Makhni", description: "Butter chicken.", price: 1600, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Burning Brownie",
    description: "Best desserts and coffee in town.",
    country: "PK",
    categories: ["Dessert", "Cafe"],
    price_range: "premium",
    rating: 4.9,
    logo: "https://images.unsplash.com/photo-1551024601-5637ade9876c?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1515286595567-27ea7d1d5758?w=1600&q=80",
    menu: [
        {
            category: "Cakes",
            items: [
                { name: "New York Cheesecake", description: "Classic creamy cheesecake.", price: 800, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80" },
                { name: "Chocolate Fudge Cake", description: "Decadent chocolate cake.", price: 650, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80" }
            ]
        },
        {
            category: "Coffee",
            items: [
                { name: "Latte", description: "Rich espresso with steamed milk.", price: 450, image: "https://images.unsplash.com/photo-1517701604599-bb29b5dd7359?w=800&q=80" },
                { name: "Cappuccino", description: "Foamy coffee delight.", price: 450, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Asian Wok",
    description: "Authentic Chinese and Thai. Best pan-asian cuisine.",
    country: "PK",
    categories: ["Chinese", "Thai"],
    price_range: "premium",
    rating: 4.5,
    logo: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1520698424294-52d0a0d4a974?w=1600&q=80",
    menu: [
        {
            category: "Main Course",
            items: [
                { name: "Kung Pao Chicken", description: "Spicy chicken with peanuts.", price: 1200, image: "https://images.unsplash.com/photo-1525755662778-989d81206944?w=800&q=80" },
                { name: "Beijing Beef", description: "Crispy beef strips.", price: 1300, image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&q=80" }
            ]
        },
        {
            category: "Starters",
            items: [
                { name: "Chicken Dumplings", description: "Steamed or fried.", price: 600, image: "https://images.unsplash.com/photo-1541696490865-92dc723d0017?w=800&q=80" },
                { name: "Hot & Sour Soup", description: "Classic spicy soup.", price: 500, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Ranchers",
    description: "Gourmet Burgers. The meaty experience.",
    country: "PK",
    categories: ["Burgers", "Fast Food"],
    price_range: "mid-range",
    rating: 4.4,
    logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=1600&q=80",
    menu: [
        {
            category: "Burgers",
            items: [
                { name: "Big Bang", description: "Double patty beef burger with mushrooms.", price: 900, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80" },
                { name: "Wild West", description: "Crispy chicken burger with spicy mayo.", price: 750, image: "https://images.unsplash.com/photo-1619250005527-02dc2c938c82?w=800&q=80" },
                { name: "Mighty Rancher", description: "Triple patty beef monster.", price: 1200, image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80" }
            ]
        },
        {
            category: "Sides",
            items: [
                { name: "Curly Fries", description: "Seasoned fries.", price: 350, image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80" },
                { name: "Onion Rings", description: "Crispy fried onions.", price: 300, image: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Tandoori Hut",
    description: "Desi BBQ. Authentic street style barbecue.",
    country: "PK",
    categories: ["BBQ", "Desi"],
    price_range: "budget",
    rating: 4.3,
    logo: "https://images.unsplash.com/photo-1599487484050-43946764cb3d?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=80",
    menu: [
        {
            category: "BBQ",
            items: [
                { name: "Chicken Tikka", description: "Spicy grilled chicken piece.", price: 350, image: "https://images.unsplash.com/photo-1599487484050-43946764cb3d?w=800&q=80" },
                { name: "Seekh Kabab", description: "Minced beef kababs (4 pcs).", price: 400, image: "https://images.unsplash.com/photo-1603360946369-dc9bb6f54262?w=800&q=80" },
                { name: "Malai Boti", description: "Creamy boneless chicken tikka.", price: 500, image: "https://images.unsplash.com/photo-1599487484050-43946764cb3d?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Chaaye Khana",
    description: "Premium tea house with all-day breakfast and snacks.",
    country: "PK",
    categories: ["Cafe", "Breakfast", "Tea"],
    price_range: "mid-range",
    rating: 4.6,
    logo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80",
    menu: [
        {
            category: "Breakfast",
            items: [
                { name: "French Toast", description: "With maple syrup and butter.", price: 550, image: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80" },
                { name: "Omelette", description: "Cheese and mushroom omelette.", price: 450, image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&q=80" }
            ]
        },
        {
            category: "Tea",
            items: [
                { name: "Doodh Patti", description: "Strong milk tea.", price: 200, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "McDonald's - F-9 Park",
    description: "Classic burgers, fries, and happy meals for everyone.",
    country: "PK",
    categories: ["Fast Food", "Burgers", "American"],
    price_range: "budget",
    rating: 4.4,
    logo: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1600&q=80",
    menu: [
        {
            category: "Burgers",
            items: [
                { name: "Big Mac", description: "Double beef patty with special sauce.", price: 800, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80" },
                { name: "McChicken", description: "Breaded chicken patty burger.", price: 450, image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800&q=80" }
            ]
        },
        {
            category: "Sides",
            items: [
                { name: "Fries (L)", description: "Famous golden fries.", price: 350, image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80" }
            ]
        }
    ]
  },
  {
    name: "Habibi",
    description: "Original Arabic Mandi and grilled platters.",
    country: "PK",
    categories: ["Arabic", "Mandi", "Middle Eastern"],
    price_range: "premium",
    rating: 4.6,
    logo: "https://images.unsplash.com/photo-1549488352-257a9e97b163?w=800&q=80",
    cover: "https://images.unsplash.com/photo-1521917441209-e886f0404a7b?w=1600&q=80",
    menu: [
        {
            category: "Mandi",
            items: [
                { name: "Chicken Mandi", description: "Traditional rice platter with chicken.", price: 1800, image: "https://images.unsplash.com/photo-1549488352-257a9e97b163?w=800&q=80" },
                { name: "Mutton Madfoon", description: "Slow cooked underground mutton.", price: 2500, image: "https://images.unsplash.com/photo-1626804475297-411dbcc75132?w=800&q=80" }
            ]
        }
    ]
  }
];

async function getOrCreateOwner() {
  const existingOwner = await sql`SELECT user_id FROM users WHERE role = 'restaurant_owner' LIMIT 1`;
  if (existingOwner.length > 0) return existingOwner[0].user_id;

  const newOwnerId = uuidv4();
  await sql`
    INSERT INTO users (user_id, email, password, role, name, phone, is_verified)
    VALUES (${newOwnerId}, 'owner@vocabite.com', 'hashed_password_placeholder', 'restaurant_owner', 'Default Owner', '03001234567', true)
  `;
  return newOwnerId;
}

const seed = async () => {
  try {
    console.log('🌱 Starting seed process with expanded menus...');
    const ownerId = await getOrCreateOwner();
    
    // 1. Delete dependent data first
    await sql`DELETE FROM menu_items WHERE restaurant_id IN (SELECT restaurant_id FROM restaurants WHERE owner_id = ${ownerId})`;
    await sql`DELETE FROM menu_categories WHERE restaurant_id IN (SELECT restaurant_id FROM restaurants WHERE owner_id = ${ownerId})`;
    await sql`DELETE FROM restaurant_locations WHERE restaurant_id IN (SELECT restaurant_id FROM restaurants WHERE owner_id = ${ownerId})`;
    
    // 2. Delete main data
    await sql`DELETE FROM restaurants WHERE owner_id = ${ownerId}`;
    
    console.log('🧹 Cleaned up old data.');

    for (const r of restaurants) {
      const restaurantId = uuidv4();
      const locationId = uuidv4();
      const coords = generateCoordinates(CENTER_LAT, CENTER_LNG, Math.random() * 4 + 1);

      console.log(`Adding ${r.name}...`);

      // 1. Create Restaurant
      await sql`
        INSERT INTO restaurants (
          restaurant_id, name, description, country, categories, price_range, 
          logo_url, cover_url, status, owner_id, created_at, updated_at
        ) VALUES (
          ${restaurantId}, ${r.name}, ${JSON.stringify(r.description)}, ${r.country}, ${r.categories}, ${r.price_range},
          ${r.logo}, ${r.cover}, 'active', ${ownerId}, NOW(), NOW()
        )
      `;

      // 2. Create Location
      await sql`
        INSERT INTO restaurant_locations (
          location_id, restaurant_id, address, city, area, 
          lat, lng, status, created_at, updated_at
        ) VALUES (
          ${locationId}, ${restaurantId}, 'Islamabad Area', 'Islamabad', 'F-Sectors',
          ${coords.lat}, ${coords.lng}, 'open', NOW(), NOW()
        )
      `;

      // 3. Create Menus
      for (const [index, cat] of r.menu.entries()) {
        const categoryId = uuidv4();
        await sql`
            INSERT INTO menu_categories (
                category_id, restaurant_id, name, display_order, is_active, created_at, updated_at
            ) VALUES (
                ${categoryId}, ${restaurantId}, ${cat.category}, ${index}, true, NOW(), NOW()
            )
        `;

        for (const item of cat.items) {
            const itemId = uuidv4();
            await sql`
                INSERT INTO menu_items (
                    item_id, restaurant_id, category_id, name, description, base_price, currency,
                    image_urls, is_available, created_at, updated_at
                ) VALUES (
                    ${itemId}, ${restaurantId}, ${categoryId}, ${item.name}, ${item.description}, ${item.price}, 'PKR',
                    ${[item.image]}, true, NOW(), NOW()
                )
            `;
        }
      }
    }

    console.log('✅ Seeding completed with expanded menus!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit();
  }
};

seed();
