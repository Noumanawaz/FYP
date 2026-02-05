export interface ParsedOrder {
  items: OrderItem[];
  totalEstimate: number;
  confidence: number;
  suggestions: string[];
  errors: string[];
}

export interface OrderItem {
  name: string;
  quantity: number;
  size?: string;
  modifications?: string[];
  category: string;
  estimatedPrice: number;
}

// Mock food database for order processing
const FOOD_DATABASE = {
  pizza: {
    keywords: ['pizza', 'pizzas', 'pie', 'pies'],
    sizes: ['small', 'medium', 'large', 'extra large', 'xl'],
    basePrice: { small: 299, medium: 399, large: 499, 'extra large': 599, xl: 599 },
    defaultSize: 'medium'
  },
  burger: {
    keywords: ['burger', 'burgers', 'cheeseburger', 'hamburger'],
    sizes: ['regular', 'large', 'xl'],
    basePrice: { regular: 199, large: 249, xl: 299 },
    defaultSize: 'regular'
  },
  biryani: {
    keywords: ['biryani', 'biriyani', 'rice'],
    sizes: ['half', 'full', 'family'],
    basePrice: { half: 149, full: 249, family: 399 },
    defaultSize: 'full'
  },
  drink: {
    keywords: ['coke', 'pepsi', 'drink', 'soda', 'juice', 'water', 'coffee', 'tea'],
    sizes: ['small', 'medium', 'large'],
    basePrice: { small: 49, medium: 69, large: 89 },
    defaultSize: 'medium'
  },
  fries: {
    keywords: ['fries', 'chips', 'french fries'],
    sizes: ['small', 'medium', 'large'],
    basePrice: { small: 79, medium: 99, large: 129 },
    defaultSize: 'medium'
  }
};

export class VoiceOrderProcessor {
  private static extractQuantity(text: string): { quantity: number; cleanText: string } {
    const quantityPatterns = [
      /(\d+)\s*(pieces?|pcs?)?/i,
      /(one|two|three|four|five|six|seven|eight|nine|ten)/i,
      /(a|an)\s+/i
    ];

    const numberWords: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'a': 1, 'an': 1
    };

    for (const pattern of quantityPatterns) {
      const match = text.match(pattern);
      if (match) {
        let quantity = 1;
        if (match[1] && !isNaN(parseInt(match[1]))) {
          quantity = parseInt(match[1]);
        } else if (match[1] && numberWords[match[1].toLowerCase()]) {
          quantity = numberWords[match[1].toLowerCase()];
        }
        
        const cleanText = text.replace(pattern, '').trim();
        return { quantity, cleanText };
      }
    }

    return { quantity: 1, cleanText: text };
  }

  private static extractSize(text: string, foodType: keyof typeof FOOD_DATABASE): { size: string; cleanText: string } {
    const food = FOOD_DATABASE[foodType];
    const sizePattern = new RegExp(`\\b(${food.sizes.join('|')})\\b`, 'i');
    const match = text.match(sizePattern);
    
    if (match) {
      const size = match[1].toLowerCase();
      const cleanText = text.replace(sizePattern, '').trim();
      return { size, cleanText };
    }

    return { size: food.defaultSize, cleanText: text };
  }

  private static identifyFoodType(text: string): keyof typeof FOOD_DATABASE | null {
    for (const [foodType, data] of Object.entries(FOOD_DATABASE)) {
      for (const keyword of data.keywords) {
        if (text.toLowerCase().includes(keyword)) {
          return foodType as keyof typeof FOOD_DATABASE;
        }
      }
    }
    return null;
  }

  private static extractModifications(text: string): string[] {
    const modificationPatterns = [
      /with\s+([^,]+)/gi,
      /extra\s+([^,]+)/gi,
      /no\s+([^,]+)/gi,
      /without\s+([^,]+)/gi,
      /add\s+([^,]+)/gi
    ];

    const modifications: string[] = [];
    
    for (const pattern of modificationPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        modifications.push(match[0].trim());
      }
    }

    return modifications;
  }

  static parseOrder(orderText: string): ParsedOrder {
    const items: OrderItem[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];
    let totalEstimate = 0;
    let confidence = 0.8;

    // Split order by common separators
    const orderParts = orderText.split(/\s+and\s+|\s*,\s*|\s*\+\s*/i);

    for (let part of orderParts) {
      part = part.trim();
      if (!part) continue;

      const { quantity, cleanText: textAfterQuantity } = this.extractQuantity(part);
      const foodType = this.identifyFoodType(textAfterQuantity);

      if (!foodType) {
        errors.push(`Could not identify food item: "${part}"`);
        suggestions.push(`Try being more specific about "${part}" - mention pizza, burger, biryani, etc.`);
        confidence -= 0.2;
        continue;
      }

      const { size, cleanText: textAfterSize } = this.extractSize(textAfterQuantity, foodType);
      const modifications = this.extractModifications(textAfterSize);

      const food = FOOD_DATABASE[foodType];
      const basePrice = food.basePrice[size as keyof typeof food.basePrice] || food.basePrice[food.defaultSize as keyof typeof food.basePrice];
      const estimatedPrice = basePrice * quantity;

      items.push({
        name: `${size} ${foodType}`,
        quantity,
        size,
        modifications,
        category: foodType,
        estimatedPrice
      });

      totalEstimate += estimatedPrice;
    }

    // Add helpful suggestions
    if (items.length === 0) {
      suggestions.push("Try saying something like: 'I want 2 large pizzas and 1 coke'");
      suggestions.push("Or: 'Order chicken biryani with extra raita'");
    } else if (items.length > 0 && !items.some(item => item.category === 'drink')) {
      suggestions.push("Would you like to add a drink to your order?");
    }

    return {
      items,
      totalEstimate,
      confidence: Math.max(0, confidence),
      suggestions,
      errors
    };
  }

  static generateConfirmationMessage(parsedOrder: ParsedOrder): string {
    if (parsedOrder.items.length === 0) {
      return "I couldn't understand your order. Please try again with more specific items.";
    }

    let message = "I understood your order as:\n\n";
    
    parsedOrder.items.forEach((item, index) => {
      message += `${index + 1}. ${item.quantity}x ${item.name}`;
      if (item.modifications && item.modifications.length > 0) {
        message += ` (${item.modifications.join(', ')})`;
      }
      message += ` - ₹${item.estimatedPrice}\n`;
    });

    message += `\nEstimated Total: ₹${parsedOrder.totalEstimate}`;
    
    if (parsedOrder.confidence < 0.7) {
      message += "\n\nNote: I'm not completely sure about this order. Please review before confirming.";
    }

    return message;
  }

  static generateSuggestionMessage(suggestions: string[]): string {
    if (suggestions.length === 0) return "";
    
    return "\n\nSuggestions:\n" + suggestions.map(s => `• ${s}`).join('\n');
  }
}