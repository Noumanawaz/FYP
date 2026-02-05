/**
 * Script to add menu items to a restaurant
 * Usage: node scripts/add-menu-items.js <restaurant_id>
 * Or: tsx scripts/add-menu-items.ts
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { neon } = require('@neondatabase/serverless');
const { v4: uuidv4 } = require('uuid');

// Initialize database connection
const sql = neon(process.env.NEON_DATABASE_URL);

const restaurantId = process.argv[2] || '2058e0ca-9978-441b-afcb-b9353acceff4';

// Sample menu items for a Pakistani restaurant
const menuItems = [
  // Main Course - Biryani
  {
    category_name: 'Biryani',
    items: [
      {
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice cooked with tender chicken pieces, aromatic spices, and herbs. Served with raita.',
        base_price: 450,
        spice_level: 'medium',
        preparation_time: 25,
        calories: 650,
        ingredients: ['Basmati rice', 'Chicken', 'Onions', 'Yogurt', 'Ginger', 'Garlic', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
        is_featured: true,
      },
      {
        name: 'Mutton Biryani',
        description: 'Premium basmati rice layered with succulent mutton pieces, slow-cooked with traditional spices.',
        base_price: 650,
        spice_level: 'medium',
        preparation_time: 30,
        calories: 750,
        ingredients: ['Basmati rice', 'Mutton', 'Onions', 'Yogurt', 'Ginger', 'Garlic', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
        is_featured: true,
      },
      {
        name: 'Beef Biryani',
        description: 'Rich and flavorful biryani made with tender beef pieces and aromatic basmati rice.',
        base_price: 550,
        spice_level: 'medium',
        preparation_time: 30,
        calories: 700,
        ingredients: ['Basmati rice', 'Beef', 'Onions', 'Yogurt', 'Ginger', 'Garlic', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
      },
    ],
  },
  // Main Course - Karahi
  {
    category_name: 'Karahi',
    items: [
      {
        name: 'Chicken Karahi',
        description: 'Spicy and tangy chicken curry cooked in a traditional wok with tomatoes, green chilies, and fresh coriander.',
        base_price: 550,
        spice_level: 'hot',
        preparation_time: 20,
        calories: 580,
        ingredients: ['Chicken', 'Tomatoes', 'Green chilies', 'Ginger', 'Garlic', 'Coriander', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
        is_featured: true,
      },
      {
        name: 'Mutton Karahi',
        description: 'Tender mutton pieces cooked in a rich, spicy karahi with fresh tomatoes and herbs.',
        base_price: 750,
        spice_level: 'hot',
        preparation_time: 25,
        calories: 680,
        ingredients: ['Mutton', 'Tomatoes', 'Green chilies', 'Ginger', 'Garlic', 'Coriander', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
      },
    ],
  },
  // Main Course - Kebab
  {
    category_name: 'Kebabs',
    items: [
      {
        name: 'Seekh Kebab',
        description: 'Minced meat kebabs grilled on skewers, seasoned with traditional spices. Served with mint chutney.',
        base_price: 350,
        spice_level: 'medium',
        preparation_time: 15,
        calories: 320,
        ingredients: ['Minced meat', 'Onions', 'Ginger', 'Garlic', 'Spices', 'Coriander'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
        is_featured: true,
      },
      {
        name: 'Chapli Kebab',
        description: 'Flat, round kebabs made with minced meat, spices, and herbs. A Peshawari specialty.',
        base_price: 380,
        spice_level: 'medium',
        preparation_time: 18,
        calories: 350,
        ingredients: ['Minced meat', 'Onions', 'Tomatoes', 'Spices', 'Coriander', 'Mint'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: [],
      },
      {
        name: 'Chicken Tikka',
        description: 'Marinated chicken pieces grilled to perfection. Tender and juicy with a smoky flavor.',
        base_price: 420,
        spice_level: 'medium',
        preparation_time: 20,
        calories: 380,
        ingredients: ['Chicken', 'Yogurt', 'Lemon', 'Ginger', 'Garlic', 'Spices'],
        dietary_tags: ['halal', 'non-vegetarian'],
        allergens: ['dairy'],
        is_featured: true,
      },
    ],
  },
  // Bread
  {
    category_name: 'Bread',
    items: [
      {
        name: 'Naan',
        description: 'Freshly baked traditional flatbread, soft and fluffy.',
        base_price: 50,
        spice_level: 'mild',
        preparation_time: 5,
        calories: 150,
        ingredients: ['Flour', 'Yeast', 'Water', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['gluten'],
      },
      {
        name: 'Garlic Naan',
        description: 'Naan bread topped with fresh garlic and butter. Aromatic and delicious.',
        base_price: 80,
        spice_level: 'mild',
        preparation_time: 6,
        calories: 200,
        ingredients: ['Flour', 'Yeast', 'Garlic', 'Butter', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['gluten', 'dairy'],
        is_featured: true,
      },
      {
        name: 'Butter Naan',
        description: 'Soft naan brushed with butter for extra richness.',
        base_price: 70,
        spice_level: 'mild',
        preparation_time: 6,
        calories: 180,
        ingredients: ['Flour', 'Yeast', 'Butter', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['gluten', 'dairy'],
      },
      {
        name: 'Roti',
        description: 'Whole wheat flatbread, healthy and traditional.',
        base_price: 40,
        spice_level: 'mild',
        preparation_time: 4,
        calories: 120,
        ingredients: ['Whole wheat flour', 'Water', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['gluten'],
      },
    ],
  },
  // Rice
  {
    category_name: 'Rice',
    items: [
      {
        name: 'Plain Rice',
        description: 'Steamed basmati rice, light and fluffy.',
        base_price: 100,
        spice_level: 'mild',
        preparation_time: 15,
        calories: 200,
        ingredients: ['Basmati rice', 'Water', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: [],
      },
      {
        name: 'Zeera Rice',
        description: 'Basmati rice tempered with cumin seeds for a fragrant flavor.',
        base_price: 120,
        spice_level: 'mild',
        preparation_time: 15,
        calories: 220,
        ingredients: ['Basmati rice', 'Cumin seeds', 'Oil', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: [],
      },
    ],
  },
  // Desserts
  {
    category_name: 'Desserts',
    items: [
      {
        name: 'Gulab Jamun',
        description: 'Soft, sweet milk dumplings soaked in rose-flavored sugar syrup. Served warm.',
        base_price: 150,
        spice_level: 'mild',
        preparation_time: 10,
        calories: 280,
        ingredients: ['Milk powder', 'Flour', 'Sugar', 'Rose water', 'Cardamom'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy', 'gluten'],
        is_featured: true,
      },
      {
        name: 'Kheer',
        description: 'Creamy rice pudding made with milk, rice, and cardamom. Topped with nuts.',
        base_price: 180,
        spice_level: 'mild',
        preparation_time: 20,
        calories: 320,
        ingredients: ['Rice', 'Milk', 'Sugar', 'Cardamom', 'Almonds', 'Pistachios'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy', 'nuts'],
      },
      {
        name: 'Firni',
        description: 'Traditional rice pudding with a smooth, creamy texture. Flavored with cardamom and saffron.',
        base_price: 200,
        spice_level: 'mild',
        preparation_time: 25,
        calories: 300,
        ingredients: ['Rice flour', 'Milk', 'Sugar', 'Cardamom', 'Saffron', 'Pistachios'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy', 'nuts'],
      },
    ],
  },
  // Beverages
  {
    category_name: 'Beverages',
    items: [
      {
        name: 'Lassi',
        description: 'Refreshing yogurt-based drink. Available in sweet or salty.',
        base_price: 120,
        spice_level: 'mild',
        preparation_time: 5,
        calories: 150,
        ingredients: ['Yogurt', 'Water', 'Sugar', 'Salt'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy'],
        is_featured: true,
      },
      {
        name: 'Mango Lassi',
        description: 'Sweet and creamy mango-flavored lassi. Perfect for summer.',
        base_price: 150,
        spice_level: 'mild',
        preparation_time: 5,
        calories: 200,
        ingredients: ['Yogurt', 'Mango', 'Sugar', 'Ice'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy'],
      },
      {
        name: 'Chai',
        description: 'Traditional Pakistani tea, strong and aromatic. Served hot.',
        base_price: 80,
        spice_level: 'mild',
        preparation_time: 5,
        calories: 50,
        ingredients: ['Tea leaves', 'Milk', 'Sugar', 'Cardamom'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: ['dairy'],
      },
      {
        name: 'Soft Drink',
        description: 'Cold soft drinks. Available in various flavors.',
        base_price: 100,
        spice_level: 'mild',
        preparation_time: 1,
        calories: 140,
        ingredients: ['Carbonated water', 'Sugar', 'Flavoring'],
        dietary_tags: ['vegetarian', 'halal'],
        allergens: [],
      },
    ],
  },
];

async function addMenuItems() {
  try {
    console.log(`Adding menu items for restaurant: ${restaurantId}`);

    // First, check if restaurant exists
    const restaurantCheck = await sql`
      SELECT restaurant_id, name FROM restaurants WHERE restaurant_id = ${restaurantId}
    `;

    if (restaurantCheck.length === 0) {
      console.error(`Restaurant with ID ${restaurantId} not found!`);
      process.exit(1);
    }

    console.log(`Restaurant found: ${restaurantCheck[0].name}`);

    // Get or create categories
    const categoryMap = new Map();

    for (const categoryGroup of menuItems) {
      let categoryId;

      // Check if category exists
      const existingCategory = await sql`
        SELECT category_id FROM menu_categories 
        WHERE restaurant_id = ${restaurantId} AND name = ${categoryGroup.category_name}
      `;

      if (existingCategory.length > 0) {
        categoryId = existingCategory[0].category_id;
        console.log(`Using existing category: ${categoryGroup.category_name} (${categoryId})`);
      } else {
        // Create category
        categoryId = uuidv4();
        await sql`
          INSERT INTO menu_categories (
            category_id, restaurant_id, name, description, display_order, is_active, created_at, updated_at
          ) VALUES (
            ${categoryId}, ${restaurantId}, ${categoryGroup.category_name}, 
            ${`Delicious ${categoryGroup.category_name} options`}, 
            ${categoryMap.size}, true, NOW(), NOW()
          )
        `;
        console.log(`Created category: ${categoryGroup.category_name} (${categoryId})`);
      }

      categoryMap.set(categoryGroup.category_name, categoryId);

      // Add menu items for this category
      for (const item of categoryGroup.items) {
        const itemId = uuidv4();
        
        await sql`
          INSERT INTO menu_items (
            item_id, restaurant_id, category_id, name, description, base_price, currency,
            image_urls, dietary_tags, spice_level, preparation_time, calories, ingredients,
            allergens, is_available, is_featured, display_order, created_at, updated_at
          ) VALUES (
            ${itemId}, ${restaurantId}, ${categoryId}, ${item.name}, ${item.description},
            ${item.base_price}, 'PKR', ${[]}, ${item.dietary_tags || []}, ${item.spice_level || null},
            ${item.preparation_time || null}, ${item.calories || null}, ${item.ingredients || []},
            ${item.allergens || []}, ${item.is_available !== undefined ? item.is_available : true},
            ${item.is_featured || false}, 0, NOW(), NOW()
          )
        `;

        console.log(`  ✓ Added: ${item.name} (${item.base_price} PKR)`);
      }
    }

    console.log('\n✅ Successfully added all menu items!');
    
    // Count total items
    const countResult = await sql`
      SELECT COUNT(*) as count FROM menu_items WHERE restaurant_id = ${restaurantId}
    `;
    console.log(`\nTotal menu items for this restaurant: ${countResult[0].count}`);

  } catch (error) {
    console.error('Error adding menu items:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addMenuItems();

