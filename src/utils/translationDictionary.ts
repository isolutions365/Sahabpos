// Offline Bilingual Translation Dictionary Utility
// Provides offline English-to-Arabic auto-translation for POS products and admin dictionary management

export const DEFAULT_TRANSLATION_DICTIONARY: Record<string, string> = {
  // Staples & Essentials (As requested)
  'rice': 'أرز',
  'white rice': 'أرز أبيض',
  'basmati rice': 'أرز بسمتي',
  'sugar': 'سكر',
  'white sugar': 'سكر أبيض',
  'brown sugar': 'سكر أسمر',
  'milk': 'حليب',
  'fresh milk': 'حليب طازج',
  'powdered milk': 'حليب مجفف',
  'evaporated milk': 'حليب مبخر',
  'condensed milk': 'حليب مكثف',
  'water': 'مياه',
  'mineral water': 'مياه معدنية',
  'drinking water': 'مياه شرب',
  'bread': 'خبز',
  'white bread': 'خبز أبيض',
  'brown bread': 'خبز أسمر',
  'toast bread': 'خبز توست',
  'pita bread': 'خبز عربي',
  'tea': 'شاي',
  'red tea': 'شاي أحمر',
  'green tea': 'شاي أخضر',
  'tea bags': 'أكياس شاي',
  'coffee': 'قهوة',
  'arabic coffee': 'قهوة عربية',
  'instant coffee': 'قهوة سريعة التحضير',
  'turkish coffee': 'قهوة تركية',
  'oil': 'زيت',
  'cooking oil': 'زيت طبخ',
  'sunflower oil': 'زيت عباد الشمس',
  'corn oil': 'زيت ذرة',
  'olive oil': 'زيت زيتون',
  'vegetable oil': 'زيت نباتي',
  'flour': 'دقيق / طحين',
  'wheat flour': 'دقيق قمح',
  'white flour': 'دقيق أبيض',
  'salt': 'ملح',
  'table salt': 'ملح طعام',
  'sea salt': 'ملح بحري',
  'egg': 'بيض',
  'eggs': 'بيض',
  'egg carton': 'طبق بيض',
  'dates': 'تمر',
  'ajwa dates': 'تمر عجوة',
  'sukkari dates': 'تمر سكري',
  'juice': 'عصير',
  'orange juice': 'عصير برتقال',
  'apple juice': 'عصير تفاح',
  'mango juice': 'عصير مانجو',
  'mixed juice': 'عصير مشكل',
  'detergent': 'منظف غسيل',
  'laundry detergent': 'منظف غسيل',
  'washing powder': 'مسحوق غسيل',
  'tissue': 'مناديل',
  'facial tissue': 'مناديل وجه',
  'toilet paper': 'ورق تواليت / مناديل حمام',
  'kitchen roll': 'مناديل مطبخ',

  // Dairy & Refrigerated
  'cheese': 'جبنة',
  'cheddar cheese': 'جبنة شيدر',
  'mozzarella cheese': 'جبنة موزاريلا',
  'cream cheese': 'جبنة كريمية',
  'feta cheese': 'جبنة فيتا',
  'halloumi cheese': 'جبنة حلوم',
  'slice cheese': 'جبن شرائح',
  'yogurt': 'زبادي',
  'fresh yogurt': 'زبادي طازج',
  'greek yogurt': 'زبادي يوناني',
  'laban': 'لبن',
  'fresh laban': 'لبن طازج',
  'labneh': 'لبنة',
  'butter': 'زبدة',
  'salted butter': 'زبدة مملحة',
  'unsalted butter': 'زبدة غير مملحة',
  'cream': 'قشطة',
  'whipping cream': 'كريمة خفق',
  'margarine': 'مارجرين',

  // Bakery & Breakfast
  'biscuit': 'بسكويت',
  'biscuits': 'بسكويت',
  'cookies': 'كوكيز',
  'wafer': 'ويفر',
  'cake': 'كيك',
  'cupcake': 'كب كيك',
  'croissant': 'كرواسون',
  'jam': 'مربى',
  'strawberry jam': 'مربى فراولة',
  'honey': 'عسل',
  'pure honey': 'عسل طبيعي',
  'peanut butter': 'زبدة الفول السوداني',
  'oats': 'شوفان',
  'corn flakes': 'كورن فلكس / رقائق الذرة',
  'cereal': 'حبوب الإفطار',

  // Beverages & Soft Drinks
  'soda': 'صودا',
  'pepsi': 'بيبسي',
  'coca cola': 'كوكاكولا',
  'cola': 'كولا',
  '7up': 'سفن أب',
  'mirinda': 'ميريندا',
  'sprite': 'سبرايت',
  'fanta': 'فانتا',
  'energy drink': 'مشروب الطاقة',
  'iced tea': 'شاي مثلج',
  'flavored milk': 'حليب بنكهة',
  'chocolate milk': 'حليب شوكولاتة',

  // Snacks, Confectionery & Nuts
  'chips': 'شيبس',
  'potato chips': 'شيبس بطاطس',
  'snack': 'سناك / وجبة خفيفة',
  'chocolate': 'شوكولاتة',
  'dark chocolate': 'شوكولاتة داكنة',
  'milk chocolate': 'شوكولاتة بالحليب',
  'candy': 'حلوى',
  'chewing gum': 'علكة',
  'gum': 'علكة',
  'popcorn': 'فشار',
  'nuts': 'مكسرات',
  'almonds': 'لوز',
  'cashews': 'كاجو',
  'pistachio': 'فستق',
  'peanuts': 'فول سوداني',
  'sunflower seeds': 'بذور عباد الشمس',

  // Groceries, Canned Goods & Cooking Ingredients
  'canned tuna': 'تونة معلبة',
  'tuna': 'تونة',
  'sardines': 'سردين',
  'tomato paste': 'معجون طماطم',
  'ketchup': 'كاتشب',
  'mayonnaise': 'مايونيز',
  'mustard': 'خردل',
  'sauce': 'صوص',
  'hot sauce': 'شطة / صوص حار',
  'soy sauce': 'صويا صوص',
  'vinegar': 'خل',
  'white vinegar': 'خل أبيض',
  'pasta': 'معكرونة',
  'macaroni': 'معكرونة',
  'spaghetti': 'سباغيتي',
  'noodles': 'نودلز / إندومي',
  'instant noodles': 'إندومي / نودلز سريعة التحضير',
  'lentils': 'عدس',
  'chickpeas': 'حمص حب',
  'beans': 'فول',
  'foul': 'فول مدمس',
  'foul moudammas': 'فول مدمس',
  'corn': 'ذرة',
  'canned corn': 'ذرة معلبة',
  'spices': 'بهارات',
  'black pepper': 'فلفل أسود',
  'cumin': 'كمون',
  'turmeric': 'كركم',
  'cardamom': 'هيل',
  'cinnamon': 'قرفة',
  'saffron': 'زعفران',

  // Meats, Poultry & Frozen Foods
  'chicken': 'دجاج',
  'frozen chicken': 'دجاج مجمد',
  'chicken breast': 'صدور دجاج',
  'chicken wings': 'أجنحة دجاج',
  'chicken nuggets': 'ناجتس دجاج',
  'beef': 'لحم بقر',
  'ground beef': 'لحم مفروم',
  'minced meat': 'لحم مفروم',
  'mutton': 'لحم ضأن',
  'lamb': 'لحم غنم',
  'fish': 'سمك',
  'frozen fish': 'سمك مجمد',
  'shrimp': 'روبيان',
  'frozen vegetables': 'خضار مجمدة',
  'frozen peas': 'بزيلا مجمدة',
  'french fries': 'بطاطس مقلية',
  'frozen fries': 'بطاطس مجمدة',
  'ice cream': 'آيس كريم',

  // Fruits & Vegetables
  'apple': 'تفاح',
  'red apple': 'تفاح أحمر',
  'green apple': 'تفاح أخضر',
  'banana': 'موز',
  'orange': 'برتقال',
  'lemon': 'ليمون',
  'lime': 'ليمون أخضر',
  'mango': 'مانجو',
  'watermelon': 'بطيخ',
  'melon': 'شمام',
  'grapes': 'عنب',
  'strawberry': 'فراولة',
  'onion': 'بصل',
  'red onion': 'بصل أحمر',
  'tomato': 'طماطم',
  'cucumber': 'خيار',
  'potato': 'بطاطس',
  'garlic': 'ثوم',
  'ginger': 'زنجبيل',
  'carrot': 'جزر',
  'lettuce': 'خس',

  // Cleaning, Household & Personal Care
  'soap': 'صابون',
  'hand soap': 'صابون يدين',
  'liquid soap': 'صابون سائل',
  'shampoo': 'شامبو',
  'conditioner': 'بلسم',
  'body wash': 'شاور جل / غسول جسم',
  'toothpaste': 'معجون أسنان',
  'toothbrush': 'فرشاة أسنان',
  'dishwashing liquid': 'سائل غسيل الصحون',
  'bleach': 'مبيض / كلور',
  'fabric softener': 'منعم أقمشة',
  'glass cleaner': 'منظف زجاج',
  'floor cleaner': 'منظف أرضيات',
  'trash bags': 'أكياس قمامة',
  'garbage bags': 'أكياس نفاية',
  'aluminum foil': 'قصدير / ورق ألومنيوم',
  'plastic wrap': 'نايلون تغليف',
  'sponge': 'إسفنجة غسيل',
  'wet wipes': 'مناديل مبللة',
  'baby wipes': 'مناديل أطفال',
  'diapers': 'حفاضات أطفال',
  'batteries': 'بطاريات',
  'light bulb': 'لمبة / إضاءة',

  // Modifiers, Sizes, Units & Packaging
  'large': 'كبير',
  'medium': 'وسط',
  'small': 'صغير',
  'half': 'نصف',
  'full': 'كامل',
  'quarter': 'ربع',
  'hot': 'حار',
  'cold': 'بارد',
  'spicy': 'حار',
  'fresh': 'طازج',
  'frozen': 'مجمد',
  'canned': 'معلب',
  'organic': 'عضوي',
  'sugar free': 'خالي من السكر',
  'pack': 'عبوة',
  'box': 'صندوق',
  'bottle': 'زجاجة',
  'can': 'علبة',
  'bag': 'كيس',
  'carton': 'كرتون',
  'kg': 'كجم',
  'g': 'جرام',
  'liter': 'لتر',
  'ml': 'مل',
  'piece': 'قطعة',
  'pcs': 'قطع',
};

const STORAGE_KEY = 'POS_CUSTOM_TRANSLATION_DICT';

/**
 * Retrieves merged dictionary of default + user-added custom translations
 */
export function getActiveDictionary(): Record<string, string> {
  try {
    const custom = localStorage.getItem(STORAGE_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      return { ...DEFAULT_TRANSLATION_DICTIONARY, ...parsed };
    }
  } catch (e) {
    console.warn('[Dictionary] Error reading custom dictionary from localStorage:', e);
  }
  return { ...DEFAULT_TRANSLATION_DICTIONARY };
}

/**
 * Saves a new custom translation word or edits existing entry
 */
export function saveCustomWord(englishWord: string, arabicTranslation: string): Record<string, string> {
  const currentDict = getActiveDictionary();
  const key = englishWord.trim().toLowerCase();
  const value = arabicTranslation.trim();

  if (key && value) {
    currentDict[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDict));
    } catch (e) {
      console.error('[Dictionary] Failed to save custom translation:', e);
    }
  }
  return currentDict;
}

/**
 * Removes a custom word from custom translations
 */
export function removeCustomWord(englishWord: string): Record<string, string> {
  const currentDict = getActiveDictionary();
  const key = englishWord.trim().toLowerCase();

  delete currentDict[key];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDict));
  } catch (e) {
    console.error('[Dictionary] Failed to remove translation:', e);
  }
  return currentDict;
}

/**
 * Smart offline translator: Takes English string, looks up dictionary,
 * performs exact or phrase-based/word-by-word translation and returns Arabic string.
 */
export function translateEnglishToArabic(englishName: string): string {
  if (!englishName || !englishName.trim()) return '';

  const dict = getActiveDictionary();
  const trimmed = englishName.trim().toLowerCase();

  // 1. Direct exact phrase match
  if (dict[trimmed]) {
    return dict[trimmed];
  }

  // 2. Tokenize and perform greedy multi-word phrase matching
  const tokens = trimmed.split(/\s+/);
  const resultTokens: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    // Try 3-word phrase match
    if (i + 2 < tokens.length) {
      const phrase3 = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`.replace(/[^a-zA-Z0-9\s]/g, '');
      if (dict[phrase3]) {
        resultTokens.push(dict[phrase3]);
        i += 3;
        continue;
      }
    }
    // Try 2-word phrase match
    if (i + 1 < tokens.length) {
      const phrase2 = `${tokens[i]} ${tokens[i + 1]}`.replace(/[^a-zA-Z0-9\s]/g, '');
      if (dict[phrase2]) {
        resultTokens.push(dict[phrase2]);
        i += 2;
        continue;
      }
    }
    // Try single word match
    const cleanWord = tokens[i].replace(/[^a-zA-Z0-9]/g, '');
    if (dict[cleanWord]) {
      resultTokens.push(dict[cleanWord]);
    } else if (dict[tokens[i]]) {
      resultTokens.push(dict[tokens[i]]);
    }
    i++;
  }

  if (resultTokens.length > 0) {
    return resultTokens.join(' ');
  }

  return '';
}

/**
 * Helper to get clean English and Arabic names for any item
 */
export function getItemBilingualNames(item: { name?: string; nameAr?: string; productNameEnglish?: string; productNameArabic?: string }) {
  const english = (item.productNameEnglish || item.name || '').trim();
  const arabic = (item.productNameArabic || item.nameAr || '').trim();
  return { english, arabic };
}
