
// Map specific restaurant names to high-quality images
const RESTAURANT_IMAGES: Record<string, { cover: string; logo: string }> = {
  "Cheezious - F-11": {
    cover: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200", 
    logo: "https://images.unsplash.com/photo-1593560708920-631629e9d143?q=80&w=200"
  },
  "Savor Foods": {
    cover: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200", // Rice/Pulao
    logo: "https://images.unsplash.com/photo-1598514982968-45e0223e7bd5?q=80&w=200"
  },
  "KFC - F-10": {
    cover: "https://images.unsplash.com/photo-1513639776629-9269d0522c38?q=80&w=1200", // Fried Chicken
    logo: "https://images.unsplash.com/photo-1626082927389-d52d83988ce2?q=80&w=200"
  },
  "Monal - Pir Sohawa": {
    cover: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200", // Scenic/Desi
    logo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=200"
  },
  "Burning Brownie": {
    cover: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1200", // Cake/Dessert
    logo: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=200"
  },
  "Asian Wok": {
    cover: "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200", // Chinese Wok
    logo: "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=200"
  },
  "Ranchers": {
    cover: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200", // Burger
    logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200"
  },
  "Tandoori Hut": {
    cover: "https://images.unsplash.com/photo-1606491956391-70868b5d0f47?q=80&w=1200", // Naan/Curry
    logo: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=200"
  },
  "Chaaye Khana": {
    cover: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=1200", // Tea/Coffee
    logo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=200"
  },
  "McDonald's - F-9 Park": {
    cover: "https://images.unsplash.com/photo-1615937691194-97dbd3f3dc29?q=80&w=1200", // Burger/Fries
    logo: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200"
  },
  "Habibi": {
    cover: "https://images.unsplash.com/photo-1541518760666-873f2c567a84?q=80&w=1200", // Mandi/Rice
    logo: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=200"
  }
};

const CUISINE_IMAGES: Record<string, string> = {
  "Italian": "https://images.unsplash.com/photo-1574868461051-efcdd20b308b?q=80&w=1200",
  "Chinese": "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=1200",
  "Indian": "https://images.unsplash.com/photo-1585937421612-70a008356f36?q=80&w=1200",
  "Pakistani": "https://images.unsplash.com/photo-1596797038530-2c107229654b?q=80&w=1200",
  "Fast Food": "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200",
  "Dessert": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1200",
};

export const getRestaurantImage = (name: string, type: 'cover' | 'logo' = 'cover', cuisines: string[] = []): string => {
  // 1. Try exact match
  if (RESTAURANT_IMAGES[name]) {
    return RESTAURANT_IMAGES[name][type];
  }
  
  // 2. Try partial match
  const found = Object.keys(RESTAURANT_IMAGES).find(key => name.includes(key) || key.includes(name));
  if (found) {
    return RESTAURANT_IMAGES[found][type];
  }

  // 3. Fallback by cuisine
  if (type === 'cover' && cuisines.length > 0) {
    for (const cuisine of cuisines) {
       const key = Object.keys(CUISINE_IMAGES).find(c => cuisine.includes(c));
       if (key) return CUISINE_IMAGES[key];
    }
  }

  // 4. Generic fallback
  return type === 'cover' 
    ? "/restaurant-5521372_1920.jpg" 
    : "/logo.png";
};
