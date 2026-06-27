/**
 * Bhutan cultural data — entirely absent from the existing DB.
 * Covers: festivals, food & drink, traditional crafts, hot springs,
 * national symbols, cultural customs, Dzongkha phrases, and more.
 */

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type FestivalType =
  | 'Tsechu'
  | 'Dromchoe'
  | 'Lhosar'
  | 'National'
  | 'Agricultural'
  | 'Religious';

export type FestivalMask = 'Cham' | 'Mask Dance' | 'Fire Ceremony' | 'Procession' | 'None';

export interface Festival {
  id: string;
  name: string;
  localName: string;
  type: FestivalType;
  location: string;
  district: string;
  /** Tibetan lunar calendar month (1–12) */
  lunarMonth: number;
  /** Approximate Gregorian months (can shift year to year) */
  gregorianApprox: string;
  durationDays: number;
  significance: string;
  description: string;
  highlights: string[];
  thangka?: string;           // if a giant silk thangka is unfurled
  dresscode: string;
  visitorTips: string[];
  notableFor: string[];
  touristAccessible: boolean;
}

export interface BhutaneseFood {
  id: string;
  name: string;
  localName: string;
  category:
    | 'Main Dish'
    | 'Side Dish'
    | 'Soup'
    | 'Snack'
    | 'Dessert'
    | 'Beverage'
    | 'Condiment'
    | 'Street Food';
  spiceLevel: 'None' | 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  mainIngredients: string[];
  description: string;
  wherToFind: string;
  bestSeason?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  culturalSignificance?: string;
  dietaryNotes?: string;
}

export interface TraditionalCraft {
  id: string;
  name: string;
  localName: string;
  zorigNumber: number;       // 1–13 of the Thirteen Traditional Arts
  craft: string;
  description: string;
  mainMaterials: string[];
  regions: string[];
  products: string[];
  whereToSee: string[];
  apprenticeshipYears: number;
  culturalSignificance: string;
}

export interface HotSpring {
  id: string;
  name: string;
  localName: string;
  district: string;
  elevation: number;
  tempCelsius: number;
  mineralProperties: string[];
  access: 'Easy' | 'Moderate' | 'Hard';
  accessDays: number;        // trekking days to reach
  nearestTown: string;
  healingClaims: string[];
  description: string;
  bestSeason: string;
  facilities: string;
  permit: boolean;
}

export interface NationalSymbol {
  id: string;
  category:
    | 'Animal'
    | 'Bird'
    | 'Tree'
    | 'Flower'
    | 'Sport'
    | 'Dress'
    | 'Religion'
    | 'Language'
    | 'Currency'
    | 'Capital'
    | 'Flag'
    | 'Emblem';
  name: string;
  localName: string;
  description: string;
  funFact: string;
}

export interface DzongkhaPhrase {
  id: string;
  category: 'Greeting' | 'Polite' | 'Food' | 'Trail' | 'Emergency' | 'Numbers' | 'Religion';
  english: string;
  dzongkha: string;
  pronunciation: string;
  notes?: string;
}

export interface CulturalCustom {
  id: string;
  category: 'Etiquette' | 'Dress' | 'Religion' | 'Taboo' | 'GNH' | 'Social';
  title: string;
  description: string;
  importance: 'Essential' | 'Important' | 'Good to know';
  applies: string;
}

export interface TraditionalGame {
  id: string;
  name: string;
  localName: string;
  type: 'Archery' | 'Darts' | 'Wrestling' | 'Horseback' | 'Board' | 'Running';
  description: string;
  equipment: string;
  participants: string;
  whenPlayed: string;
  culturalSignificance: string;
  whereToWatch: string;
}

// ─── FESTIVALS ────────────────────────────────────────────────────────────────

export const festivals: Festival[] = [
  {
    id: 'F-001',
    name: 'Paro Tsechu',
    localName: 'སྤ་རོ་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Rinpung Dzong, Paro',
    district: 'Paro',
    lunarMonth: 2,
    gregorianApprox: 'March–April',
    durationDays: 5,
    significance: 'Celebrates the birth, enlightenment, and death of Guru Rinpoche (Padmasambhava) who brought Buddhism to Bhutan in the 8th century.',
    description: 'One of the most important and widely attended festivals in Bhutan. Held at the spectacular Rinpung Dzong, the festival features elaborate mask dances (Cham) performed by monks and laypeople in vibrant costumes representing deities, demons, and historic figures.',
    highlights: [
      'Unfurling of a massive Thangkha silk painting at dawn on the final day',
      'Eight Manifestations of Guru Rinpoche mask dance',
      'Dance of the Lords of the Cremation Grounds (Durdag)',
      'Dance of the Ging and Tsholing — clown dances that amuse and teach',
      'Folk singing and archery competitions alongside the formal program',
    ],
    thangka: 'Massive Guru Thangkha unveiled at first light on the final morning — one of the most sacred moments in Bhutanese religious calendar',
    dresscode: 'Traditional dress mandatory — men in Gho (knee-length robe), women in Kira (ankle-length dress). Visitors encouraged to wear traditional or respectful clothing.',
    visitorTips: [
      'Arrive before 7 AM on the Thangka day or you will miss the unveiling',
      'Book accommodation 4–6 months in advance — Paro fills completely',
      'Early March dates align with Cherry blossom season for double spectacle',
      'Photography allowed in the courtyard but not inside dzong chapels',
      'Bring a zoom lens — best viewing spots fill fast',
    ],
    notableFor: ['Thangka unveiling', 'Cham dances', 'Colorful costumes', 'Most photographed festival in Bhutan'],
    touristAccessible: true,
  },
  {
    id: 'F-002',
    name: 'Thimphu Tsechu',
    localName: 'ཐིམ་ཕུ་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Tashichho Dzong, Thimphu',
    district: 'Thimphu',
    lunarMonth: 8,
    gregorianApprox: 'September–October',
    durationDays: 3,
    significance: "The capital's major festival, held at the seat of Bhutan's government and monastic body.",
    description: "Thimphu's biggest annual festival draws crowds from across the country. Unlike Paro, it is held in the capital's Tashichho Dzong and is easily accessible. The final day features a sacred Thangka display of Guru Rinpoche.",
    highlights: [
      'Dance of the Eight Manifestations of Guru Rinpoche',
      'Dance of the Judgment of the Dead (Raksha Mangcham)',
      'Folk dances from different regions of Bhutan',
      'Thangka of Guru Rinpoche unfurled on the final morning',
      'Massive crowds including the Royal Family',
    ],
    thangka: 'Giant Guru Thangkha displayed on the final day at dawn',
    dresscode: 'Traditional Gho (men) and Kira (women) required. Visitors are welcome in smart casual.',
    visitorTips: [
      'Easiest major festival to attend — no remote travel needed',
      'The dzong forecourt gets very crowded — arrive at opening',
      'Clown characters (Atsaras) entertain crowd between dances — engage with them',
      'Best photographed from the upper balconies of the dzong',
    ],
    notableFor: ['Capital city festival', 'Largest attendance', 'Traditional dress showcase', 'Accessible for short-stay visitors'],
    touristAccessible: true,
  },
  {
    id: 'F-003',
    name: 'Punakha Drubchen',
    localName: 'སྤུ་ན་ཁའི་སྒྲུབ་ཆེན།',
    type: 'Dromchoe',
    location: 'Punakha Dzong',
    district: 'Punakha',
    lunarMonth: 1,
    gregorianApprox: 'February–March',
    durationDays: 3,
    significance: 'Commemorates a historic 17th-century Tibetan invasion repelled by the Zhabdrung. Re-enacts the victory battle with 136 warriors in full armor.',
    description: 'One of the most spectacular and unusual festivals in Bhutan. Unlike the meditative Tsechus, the Punakha Drubchen is a reenactment festival where 136 local men don authentic war costumes and 17th-century armor to perform a martial battle ceremony.',
    highlights: [
      '136 warriors in armor and war costumes marching through the dzong',
      'Mock battle recreating the 1639 repulsion of Tibetan forces',
      'Procession of the sacred golden relic (Rang Jong Kharsapani) across the Mo Chhu suspension bridge',
      'River crossing ceremony when waters are low in winter',
      'Traditional weapons, shields, and helmets on display',
    ],
    dresscode: 'Traditional dress expected from locals. Visitors in smart respectful clothing.',
    visitorTips: [
      'Followed immediately by Punakha Tsechu — combine both for a 5-day experience',
      'The Punakha Valley in February has jacaranda blossoms in bloom',
      'Arrive early for the procession which starts at dawn',
      'The most photogenic festival for action and historical drama',
    ],
    notableFor: ['Battle reenactment', 'Armor and war costumes', 'Most historically dramatic festival', 'River procession'],
    touristAccessible: true,
  },
  {
    id: 'F-004',
    name: 'Punakha Tsechu',
    localName: 'སྤུ་ན་ཁའི་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Punakha Dzong',
    district: 'Punakha',
    lunarMonth: 1,
    gregorianApprox: 'February–March',
    durationDays: 1,
    significance: 'One-day Tsechu immediately following the Drubchen at the magnificent Punakha Dzong.',
    description: 'A shorter but deeply sacred single-day Tsechu held at the Punakha Dzong — the most beautiful dzong in Bhutan, situated at the confluence of two rivers. Best combined with the preceding 3-day Drubchen.',
    highlights: [
      'Mask dances in the stunning courtyard of Punakha Dzong',
      'Backdrop of the Mo Chhu and Pho Chhu river confluence',
      'Jacaranda trees in full purple bloom around the festival grounds',
    ],
    dresscode: 'Traditional dress for locals. Visitors in respectful clothing.',
    visitorTips: [
      'Stay for the Drubchen (3 days earlier) for the full Punakha festival experience',
      'The dzong courtyard is smaller than Paro — more intimate atmosphere',
      'February is one of the most pleasant months weather-wise in Punakha valley',
    ],
    notableFor: ['Most beautiful dzong setting', 'Jacaranda blossoms', 'Intimate scale'],
    touristAccessible: true,
  },
  {
    id: 'F-005',
    name: 'Haa Summer Festival',
    localName: 'ཧཱ་དབྱར་རྒྱལ་འཁོར།',
    type: 'Agricultural',
    location: 'Haa Valley',
    district: 'Haa',
    lunarMonth: 6,
    gregorianApprox: 'July–August',
    durationDays: 2,
    significance: 'A cultural showcase festival celebrating the unique traditions, food, and way of life of the Haa district — one of Bhutan\'s most isolated and least-visited regions.',
    description: 'Established in 2008 to promote tourism and preserve local culture, the Haa Summer Festival is an outdoor cultural fair showcasing local foods, nomadic life, traditional games, and the distinctive traditions of the Haa valley people including the semi-nomadic Bjop community.',
    highlights: [
      'Archery and khuru (traditional darts) competitions',
      'Yak rides and yak cheese tastings',
      'Traditional nomadic tent demonstrations',
      'Local food stalls with Haa specialties',
      'Folk dances and songs unique to Haa district',
      'Horseback riding and equestrian displays',
      'Display of traditional Bjop (nomadic) costumes',
      'Camping festival atmosphere in alpine meadow',
    ],
    dresscode: 'Casual, outdoor. Traditional dress appreciated but not required.',
    visitorTips: [
      'Great introduction to nomadic culture without trekking to remote areas',
      'Try zaw (roasted rice) and a range of dried yak meat products',
      'The Haa valley is a restricted zone — ensure your tourism permit is extended to Haa',
      'July weather can be rainy — bring a waterproof layer',
    ],
    notableFor: ['Nomadic Bjop culture', 'Yak products', 'Alpine meadow setting', 'Most casual of Bhutan\'s festivals'],
    touristAccessible: true,
  },
  {
    id: 'F-006',
    name: 'Jambay Lhakhang Drup',
    localName: 'བྱམས་པ་ལྷ་ཁང་གྲུབ།',
    type: 'Religious',
    location: 'Jambay Lhakhang, Bumthang',
    district: 'Bumthang',
    lunarMonth: 9,
    gregorianApprox: 'October–November',
    durationDays: 5,
    significance: 'One of the holiest festivals in Bhutan, held at the Jambay Lhakhang temple (built by the Tibetan king Songtsen Gampo in 659 AD). The night ceremony with naked dancers is unique in all of Asia.',
    description: 'A 5-day festival at one of Bhutan\'s oldest and most sacred temples. The most remarkable event is the Mewang (Fire Blessing) on the third night — a night-time ceremony where people run through fire for purification, and a group of dancers (Tercham) perform briefly unclothed as a symbol of purity and liberation from worldly desires.',
    highlights: [
      'Fire ceremony (Mewang) — running through flames for blessing',
      'Tercham — the naked dance performed only at this festival',
      'Atsara (clown) performances that last through the night',
      'Elaborate mask dances by day',
      'One of the oldest festival sites in Bhutan (temple dates to 659 AD)',
    ],
    dresscode: 'Traditional dress. Festival runs day and night — bring warm clothing for the nighttime ceremonies.',
    visitorTips: [
      'The night ceremonies begin around midnight and run until dawn — rest in the afternoon',
      'Very remote location in Bumthang — book accommodation far in advance',
      'October is peak trekking season; combine with Bumthang Owl trek or Ngang Lhakhang',
      'The Tercham dance is sacred — attend respectfully and follow photography guidance on the night',
    ],
    notableFor: ['Unique naked Tercham dance', 'Fire ceremony', 'Ancient 659 AD temple', 'Night-long ceremonies'],
    touristAccessible: true,
  },
  {
    id: 'F-007',
    name: 'Black-Necked Crane Festival',
    localName: 'མཐིང་འཛིན་ཀང་ཀྲུང་དུས་ཆེན།',
    type: 'National',
    location: 'Gangtey Monastery, Phobjikha',
    district: 'Wangdue Phodrang',
    lunarMonth: 10,
    gregorianApprox: 'November 11 (fixed date)',
    durationDays: 1,
    significance: 'Celebrates the arrival of the endangered Black-necked Crane at Phobjikha valley — about 600 birds winter here annually, one of the highest concentrations in the world.',
    description: 'A unique nature-cultural festival held each November 11th to coincide with the arrival of the black-necked cranes from Tibet. Children perform crane dances and songs, locals make offerings for the cranes\' safe arrival, and conservation awareness activities take place.',
    highlights: [
      'Children dressed as cranes performing traditional dances',
      'Real crane watching in the valley below the monastery',
      'Conservation talks and education displays',
      'Local food and handicraft fair',
      'Documentary screenings about crane biology and conservation',
    ],
    dresscode: 'Casual. Outdoor layers needed in November — Phobjikha valley is cold.',
    visitorTips: [
      'Combine with staying multiple nights in Phobjikha to observe cranes at dawn and dusk',
      'Cranes typically arrive in late October and depart in late February/March',
      'The valley is cold but dry in November — ideal photography weather',
      'Stay at one of the eco-lodges overlooking the wetlands for best viewing',
    ],
    notableFor: ['Black-necked crane conservation', 'Unique nature festival', 'Children crane dances', 'Phobjikha valley wetlands'],
    touristAccessible: true,
  },
  {
    id: 'F-008',
    name: 'Kurjey Tsechu',
    localName: 'སྐུར་རྗེས་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Kurjey Lhakhang, Bumthang',
    district: 'Bumthang',
    lunarMonth: 4,
    gregorianApprox: 'June',
    durationDays: 1,
    significance: 'Held at Bhutan\'s most sacred site — the rock cave where Guru Rinpoche meditated and left his body imprint in the 8th century.',
    description: 'A single-day Tsechu at Kurjey Lhakhang, where a white procession of monks carries the relics of the protective deity. Pilgrims from across Bumthang attend. Unique for the morning procession of white-robed monks.',
    highlights: [
      'White-robed monk procession carrying sacred relics',
      'Mask dances at the sacred body-print cave of Guru Rinpoche',
      'Bumthang valley summer scenery at its most lush',
      'Intense pilgrimage atmosphere',
    ],
    dresscode: 'Traditional dress. White is auspicious for this festival.',
    visitorTips: [
      'Bumthang in June is lush green with wildflowers',
      'Arrive early for the procession which begins at sunrise',
      'The interior of the cave where Guru Rinpoche\'s body imprint is found is one of the holiest spots in Bhutan',
    ],
    notableFor: ['Holy body-imprint cave', 'White procession', 'Bumthang summer'],
    touristAccessible: true,
  },
  {
    id: 'F-009',
    name: 'Ura Yakchoe',
    localName: 'དབུ་ར་གཡག་མཆོད།',
    type: 'Dromchoe',
    location: 'Ura Village Temple',
    district: 'Bumthang',
    lunarMonth: 3,
    gregorianApprox: 'April–May',
    durationDays: 5,
    significance: 'A unique festival centered on the discovery of a sacred relic — a 14th-century statue of Guru Rinpoche that was found by the spiritual teacher Dorji Lingpa. One of the rarest festival types in Bhutan.',
    description: 'Held in the remote and spectacularly beautiful Ura valley, this festival involves the carrying of a precious relic around the village in procession. Unique for the prostration circuit — pilgrims circumambulate the village on their knees.',
    highlights: [
      'Procession of sacred relic around Ura village',
      'Prostration circumambulation by pilgrims',
      'Dramatic views of snow-capped peaks from Ura village (3100m)',
      'Wildflowers in full bloom across the high-altitude meadows',
      'Very intimate — Ura is a small village of ~40 households',
    ],
    dresscode: 'Traditional dress. Layers needed at 3100m altitude.',
    visitorTips: [
      'One of the least touristy major festivals — a more authentic experience',
      'Ura is a 1.5-hour drive from Bumthang town — easily combined with Jakar/Kurjey visits',
      'Spring wildflowers make this one of the most photogenic festival settings',
      'Try local buckwheat pancakes (khurey) from the village',
    ],
    notableFor: ['Prostration procession', 'Remote village setting', 'Spring wildflowers', 'Intimate scale'],
    touristAccessible: true,
  },
  {
    id: 'F-010',
    name: 'Wangdue Tsechu',
    localName: 'དབང་འདུས་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Wangduephodrang Dzong',
    district: 'Wangdue Phodrang',
    lunarMonth: 10,
    gregorianApprox: 'October–November',
    durationDays: 3,
    significance: 'Wangduephodrang\'s main festival, held at the historic hilltop dzong overlooking the river confluence.',
    description: 'A 3-day Tsechu at Wangduephodrang Dzong, one of Bhutan\'s most strategically positioned dzongs on a promontory above two river valleys. The festival includes the full program of mask dances and a Thangka display.',
    highlights: [
      'Mask dances at the hilltop dzong',
      'Panoramic views of river confluence below the dzong grounds',
      'Sacred Thangka unfurled on the final morning',
    ],
    dresscode: 'Traditional dress.',
    visitorTips: [
      'Easily combined with a visit to the Gangtey Trail and Black-necked Crane festival (same time, nearby)',
      'October is peak season — arrange transport and accommodation early',
    ],
    notableFor: ['Hilltop dzong setting', 'River confluence views'],
    touristAccessible: true,
  },
  {
    id: 'F-011',
    name: 'Losar (Bhutanese New Year)',
    localName: 'ལོ་གསར།',
    type: 'Lhosar',
    location: 'Nationwide',
    district: 'All districts',
    lunarMonth: 1,
    gregorianApprox: 'February–March',
    durationDays: 3,
    significance: 'The Bhutanese Lunar New Year — one of the most important family and community celebrations. Different regions celebrate at slightly different times.',
    description: 'Losar is a 3-day family celebration marking the beginning of the Bhutanese lunar calendar. Families gather for special meals, give gifts, wear new clothes, and visit monasteries for prayers. Unlike the Tsechus, Losar is primarily a home and family festival.',
    highlights: [
      'Traditional feast with families — khapse (deep-fried pastries), dried meat, ara (local spirit)',
      'Visiting monasteries and making offerings at dawn on New Year\'s Day',
      'New traditional clothes (Gho/Kira) worn for the first time',
      'Archery competitions in town squares',
      'Raucous celebrations at community archery grounds',
    ],
    dresscode: 'New traditional dress — Bhutanese wear their finest Gho and Kira.',
    visitorTips: [
      'A wonderful time to observe genuine family-centered celebration rather than staged tourism',
      'Many businesses close — plan restaurant and activity bookings in advance',
      'Invited into a family home? Bring a small gift and be prepared to taste ara (local spirit)',
      'Archery grounds become very lively social gathering spaces',
    ],
    notableFor: ['Family celebration', 'Traditional food feast', 'Archery competitions', 'New traditional dress'],
    touristAccessible: true,
  },
  {
    id: 'F-012',
    name: 'National Day',
    localName: 'རྒྱལ་གཞི་དུས་ཆེན།',
    type: 'National',
    location: 'Chang Lim Thang Grounds, Thimphu',
    district: 'Thimphu',
    lunarMonth: 0,
    gregorianApprox: 'December 17 (fixed date)',
    durationDays: 1,
    significance: 'Commemorates the coronation of the first King of Bhutan, Ugyen Wangchuck, on December 17, 1907. A national holiday with major ceremony.',
    description: 'Bhutan\'s most important secular national holiday, celebrated with a large military parade, traditional dances, and a royal address. The King appears at the national ceremony.',
    highlights: [
      'Royal Guard of Honour parade',
      'Traditional dances from all 20 districts',
      'Archery competitions',
      'Royal address to the nation',
      'Cultural performances at Chang Lim Thang',
    ],
    dresscode: 'Traditional dress mandatory for citizens. Smart attire for visitors.',
    visitorTips: [
      'December 17 sees Thimphu hotels fill fast — book far in advance',
      'Cold December weather — bring warm layers',
      'A rare chance to see the King at public ceremony',
    ],
    notableFor: ['Royal ceremony', 'Military parade', 'All-district cultural showcase'],
    touristAccessible: true,
  },
  {
    id: 'F-013',
    name: 'Nimalung Tsechu',
    localName: 'ནི་མ་ལུང་ཚེས་བཅུ།',
    type: 'Tsechu',
    location: 'Nimalung Monastery, Bumthang',
    district: 'Bumthang',
    lunarMonth: 6,
    gregorianApprox: 'July–August',
    durationDays: 3,
    significance: 'A significant Bumthang Tsechu at a beautiful 17th-century monastery.',
    description: 'One of several Bumthang Tsechus, held at Nimalung Monastery which was founded by Pema Rigdzin, the first reincarnation of Longchen Rabjam. An intimate festival in a less-visited monastery.',
    highlights: [
      'Mask dances at one of Bumthang\'s finest monastery complexes',
      'Smaller scale than Paro or Thimphu — more intimate',
      'Bumthang summer landscape',
    ],
    dresscode: 'Traditional dress.',
    visitorTips: [
      'Combine with a visit to the nearby Nanzhing Monastery and Tamshing',
      'July brings monsoon clouds but vivid green landscapes in Bumthang',
    ],
    notableFor: ['Intimate monastery setting', 'Less-visited festival'],
    touristAccessible: true,
  },
  {
    id: 'F-014',
    name: 'Wangchuck Lo Dzom (King\'s Birthday)',
    localName: 'རྒྱལ་གཞི་ཆེན་མོ།',
    type: 'National',
    location: 'Chang Lim Thang, Thimphu',
    district: 'Thimphu',
    lunarMonth: 0,
    gregorianApprox: 'February 21 (fixed date)',
    durationDays: 3,
    significance: 'Celebration of His Majesty the King\'s birthday — a beloved national holiday.',
    description: 'Three-day national holiday marking the birthday of His Majesty the Fifth King Jigme Khesar Namgyel Wangchuck. Celebrated with cultural events, dances, charity events, and public gatherings across the country.',
    highlights: [
      'National ceremonies at Chang Lim Thang',
      'Traditional dances and music',
      'Royal Bhutan Archery Federation tournaments',
      'Community volunteering and national beautification drives',
    ],
    dresscode: 'Traditional dress.',
    visitorTips: [
      'One of the easiest national celebrations to attend in Thimphu',
      'February aligns with Punakha Drubchen and Tsechu — ideal combination',
    ],
    notableFor: ['Royal Birthday', 'National celebrations'],
    touristAccessible: true,
  },
];

// ─── FOOD & DRINK ─────────────────────────────────────────────────────────────

export const foods: BhutaneseFood[] = [
  {
    id: 'FD-001',
    name: 'Ema Datshi',
    localName: 'ཨེ་མ་དར་ཚིལ།',
    category: 'Main Dish',
    spiceLevel: 'Very Hot',
    mainIngredients: ['Green/red chilies', 'Yak cheese (datshi)', 'Butter', 'Garlic', 'Water'],
    description: 'The national dish of Bhutan. A thick, fiery stew of whole green or red chilies simmered with yak or cow cheese and butter. Not a condiment — the chili IS the vegetable. Served at every meal.',
    wherToFind: 'Every restaurant and household in Bhutan',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Considered the national dish. A meal without ema datshi is barely considered a meal. The heat level is a point of Bhutanese pride.',
    dietaryNotes: 'Extremely spicy by international standards. Request "kaba" (less spicy) if needed — it will still be hot.',
  },
  {
    id: 'FD-002',
    name: 'Phaksha Paa',
    localName: 'ཕག་ཤ་དཔག།',
    category: 'Main Dish',
    spiceLevel: 'Hot',
    mainIngredients: ['Pork', 'Dried red chilies', 'Radish', 'Spinach', 'Ginger'],
    description: 'Stir-fried pork with dried red chilies and radishes. One of the most popular meat dishes in Bhutan. The pork is often semi-dried before cooking for extra depth of flavor.',
    wherToFind: 'Most restaurants serving Bhutanese food, especially in Thimphu and Paro',
    isVegetarian: false,
    isVegan: false,
    culturalSignificance: 'A festive dish often prepared for guests. Pork is the most widely eaten meat in Buddhist Bhutan (slaughtered by non-Buddhists).',
  },
  {
    id: 'FD-003',
    name: 'Jasha Maru',
    localName: 'བྱ་ཤ་སྨར།',
    category: 'Main Dish',
    spiceLevel: 'Hot',
    mainIngredients: ['Minced chicken', 'Tomatoes', 'Onion', 'Ginger', 'Garlic', 'Coriander'],
    description: 'A spicy minced chicken dish with tomatoes and aromatics. One of the most popular dishes for visitors as it is flavorful but more internationally approachable than pure chili dishes.',
    wherToFind: 'Widely available across restaurants in tourist areas',
    isVegetarian: false,
    isVegan: false,
    dietaryNotes: 'A good entry-point dish for visitors not yet acclimatized to full Bhutanese heat.',
  },
  {
    id: 'FD-004',
    name: 'Red Rice',
    localName: 'ཅམ་དམར།',
    category: 'Main Dish',
    spiceLevel: 'None',
    mainIngredients: ['Bhutanese red rice'],
    description: 'The staple carbohydrate of Bhutan. A short-grain red (actually deep brown-red) rice grown in the Paro Valley and other fertile valleys. Nutty, slightly sticky, rich in fiber and minerals. Served at nearly every Bhutanese meal.',
    wherToFind: 'Every restaurant in Bhutan. Exported internationally under "Royal Red Rice" or "Bhutan Red Rice" brands.',
    isVegetarian: true,
    isVegan: true,
    culturalSignificance: 'Bhutanese red rice is unique to the high-altitude valleys and is a source of national pride. It is one of Bhutan\'s most recognized agricultural exports.',
    dietaryNotes: 'Naturally gluten-free. High in antioxidants from the anthocyanins that give it the red color.',
  },
  {
    id: 'FD-005',
    name: 'Kewa Datshi',
    localName: 'སྐྱ་ཝ་དར་ཚིལ།',
    category: 'Main Dish',
    spiceLevel: 'Hot',
    mainIngredients: ['Potatoes', 'Chili', 'Yak cheese', 'Butter'],
    description: 'Potatoes cooked with cheese sauce and chilies. The potato version of Bhutan\'s iconic datshi family of dishes. Milder than Ema Datshi but still very spicy by international standards.',
    wherToFind: 'All restaurants',
    isVegetarian: true,
    isVegan: false,
    dietaryNotes: 'More approachable than Ema Datshi for visitors new to Bhutanese food.',
  },
  {
    id: 'FD-006',
    name: 'Shamu Datshi',
    localName: 'ཤ་མོ་དར་ཚིལ།',
    category: 'Main Dish',
    spiceLevel: 'Medium',
    mainIngredients: ['Wild mushrooms', 'Yak cheese', 'Chilies', 'Butter'],
    description: 'Wild mushroom and cheese stew — arguably the most refined of the datshi family. Bhutan\'s forests produce exceptional wild mushrooms including chanterelles, matsutake, and others.',
    wherToFind: 'Available seasonally (autumn especially) in restaurants in Bumthang and Thimphu',
    bestSeason: 'August–October (wild mushroom season)',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Wild mushroom foraging is a traditional activity in Bhutan\'s forests. Bumthang is especially known for its matsutake mushrooms.',
  },
  {
    id: 'FD-007',
    name: 'Nakey Datshi',
    localName: 'ས་ཀི་དར་ཚིལ།',
    category: 'Main Dish',
    spiceLevel: 'Medium',
    mainIngredients: ['Fiddlehead ferns (nakey)', 'Yak cheese', 'Chilies'],
    description: 'Young fiddlehead ferns cooked with cheese and chilies. A uniquely Bhutanese seasonal delicacy using forest-gathered fiddleheads in spring.',
    wherToFind: 'Bumthang and eastern Bhutan in spring',
    bestSeason: 'March–May',
    isVegetarian: true,
    isVegan: false,
  },
  {
    id: 'FD-008',
    name: 'Beef Datshi',
    localName: 'གལ་གུལ་དར་ཚིལ།',
    category: 'Main Dish',
    spiceLevel: 'Hot',
    mainIngredients: ['Dried beef (shakam)', 'Yak cheese', 'Chilies', 'Dried turnips'],
    description: 'Dried beef reconstituted and cooked with cheese and chilies. Often made with Shakam (sun-dried beef strips) which adds an intense, concentrated beef flavor.',
    wherToFind: 'Traditional homes and some restaurants, especially in rural areas',
    isVegetarian: false,
    isVegan: false,
  },
  {
    id: 'FD-009',
    name: 'Suja (Butter Tea)',
    localName: 'བདེ་ཞིམ་ཇ།',
    category: 'Beverage',
    spiceLevel: 'None',
    mainIngredients: ['Black tea', 'Yak butter', 'Salt', 'Milk'],
    description: 'Bhutan\'s traditional tea — black tea churned vigorously with yak butter and salt until emulsified into a thick, warming, savory drink. Served constantly to guests and during cold weather. A Western "acquired taste."',
    wherToFind: 'Every traditional household. Some restaurants. Cultural experiences and festival areas.',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Accepting suja offered by a host is a mark of respect. Refusing repeatedly can be considered rude. A full cup signals "please refill"; leaving it full means you are done.',
    dietaryNotes: 'High in calories and fat — essential fuel for cold, high-altitude environments. Very savory and unusual for those expecting sweet tea.',
  },
  {
    id: 'FD-010',
    name: 'Ngaja (Sweet Milk Tea)',
    localName: 'ཨིན་ཇ།',
    category: 'Beverage',
    spiceLevel: 'None',
    mainIngredients: ['Black tea', 'Milk', 'Sugar'],
    description: 'Sweetened milk tea similar to Indian chai — widely drunk alongside or instead of butter tea, especially in urban areas. The "safe" tea choice for visitors.',
    wherToFind: 'Everywhere — cafes, restaurants, roadside stalls',
    isVegetarian: true,
    isVegan: false,
  },
  {
    id: 'FD-011',
    name: 'Ara',
    localName: 'ཨ་རག',
    category: 'Beverage',
    spiceLevel: 'None',
    mainIngredients: ['Fermented rice', 'Corn', 'Millet', 'Wheat', 'Water'],
    description: 'Bhutan\'s traditional home-distilled spirit. Can be served hot (mixed with raw egg, butter, and chili — called Ara Chham) or cold. Strength varies from mild rice wine to strong moonshine. An essential part of ceremonies, festivals, and hospitality.',
    wherToFind: 'Traditional homes, festivals, some restaurants (especially outside Thimphu)',
    isVegetarian: true,
    isVegan: true,
    culturalSignificance: 'Refusing ara from a host is politely done by touching the rim of the cup to lips. Pouring a few drops on the ground before drinking is a traditional offering to local deities.',
    dietaryNotes: 'Alcohol strength varies widely — hot ara with egg and butter (Ara Chham) is milder but very filling.',
  },
  {
    id: 'FD-012',
    name: 'Hoentay',
    localName: 'ཧོར་བདེ།',
    category: 'Main Dish',
    spiceLevel: 'Mild',
    mainIngredients: ['Buckwheat flour dough', 'Turnip greens', 'Cheese', 'Spinach'],
    description: 'Steamed buckwheat dumplings filled with turnip greens (or cheese or buckwheat groats) — the signature dish of Haa district. Heavier and earthier than Tibetan momos. Traditionally eaten during Losar (New Year).',
    wherToFind: 'Haa district. Some specialty restaurants in Paro and Thimphu.',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Hoentay is so closely associated with Haa district identity that it is considered a symbol of Haa culture. Featured prominently at the Haa Summer Festival.',
  },
  {
    id: 'FD-013',
    name: 'Momo',
    localName: 'མོ་མོ།',
    category: 'Snack',
    spiceLevel: 'Mild',
    mainIngredients: ['Wheat or buckwheat flour', 'Pork/beef/vegetable filling', 'Garlic', 'Ginger', 'Onion'],
    description: 'Steamed dumplings shared with Tibet and Nepal but with distinctly Bhutanese fillings including pork, beef, or vegetables with local spices. A ubiquitous street food and restaurant staple.',
    wherToFind: 'Everywhere — street stalls, small restaurants, canteens',
    isVegetarian: false,
    isVegan: false,
    dietaryNotes: 'Vegetable momos widely available. Ask specifically for "shaksa momo" (vegetable) to ensure no meat.',
  },
  {
    id: 'FD-014',
    name: 'Puta (Buckwheat Noodles)',
    localName: 'ཕུ་ཏ།',
    category: 'Main Dish',
    spiceLevel: 'Mild',
    mainIngredients: ['Buckwheat flour', 'Egg (optional)', 'Vegetables', 'Dried meat'],
    description: 'Buckwheat noodles served with sautéed vegetables, dried meat, or simply with butter and soy sauce. A specialty of Bumthang district where buckwheat is a staple crop.',
    wherToFind: 'Bumthang district restaurants. Some Thimphu restaurants specializing in Bumthang cuisine.',
    isVegetarian: false,
    isVegan: false,
    culturalSignificance: 'Buckwheat is a staple crop of the high-altitude Bumthang valley and has been cultivated there for centuries. Puta represents the ingenuity of adapting to a cold, high-altitude agricultural environment.',
  },
  {
    id: 'FD-015',
    name: 'Khur-le (Buckwheat Pancake)',
    localName: 'ཁུར་ལེ།',
    category: 'Snack',
    spiceLevel: 'None',
    mainIngredients: ['Buckwheat flour', 'Water', 'Salt'],
    description: 'Thick, hearty buckwheat pancakes — a traditional Bumthang staple eaten for breakfast or as a snack. Made from locally-ground buckwheat flour, cooked on a dry cast-iron pan. Earthy, filling, and slightly nutty.',
    wherToFind: 'Bumthang district homes and restaurants. Ura village during festivals.',
    bestSeason: 'August–October (post-harvest season)',
    isVegetarian: true,
    isVegan: true,
    culturalSignificance: 'Khur-le is one of the few truly ancient staple foods that has survived unchanged in Bumthang\'s highland communities.',
  },
  {
    id: 'FD-016',
    name: 'Zow Shungo',
    localName: 'རྫོ་ཤུང་།',
    category: 'Main Dish',
    spiceLevel: 'Hot',
    mainIngredients: ['Leftover rice', 'Vegetables', 'Chilies', 'Edible fern leaves'],
    description: 'A rice and mixed vegetable stew often made with whatever is available — sometimes called "Bhutanese leftovers." The fern fronds add a unique earthy texture. A humble but satisfying farmhouse dish.',
    wherToFind: 'Traditional homes. Some rural guesthouses.',
    isVegetarian: true,
    isVegan: true,
  },
  {
    id: 'FD-017',
    name: 'Shakam (Dried Beef/Yak)',
    localName: 'ཤག་ཁམ།',
    category: 'Side Dish',
    spiceLevel: 'Mild',
    mainIngredients: ['Beef or yak meat', 'Salt', 'Chili (sometimes)'],
    description: 'Sun-dried and air-cured strips of beef or yak meat. The Bhutanese version of jerky — deeply savory, chewy, and packed with flavor. Served as a side, snack, or incorporated into stews. Strips are air-dried in the open air of farmhouses.',
    wherToFind: 'Markets in Paro, Thimphu, Bumthang. Some restaurants. Farmhouses.',
    isVegetarian: false,
    isVegan: false,
    culturalSignificance: 'Traditional preservation method for meat before refrigeration. Still widely practiced and preferred for its depth of flavor over fresh meat.',
  },
  {
    id: 'FD-018',
    name: 'Zaw (Puffed/Dried Rice)',
    localName: 'རྫ་ར།',
    category: 'Snack',
    spiceLevel: 'None',
    mainIngredients: ['Rice'],
    description: 'Puffed or roasted rice used as a snack, offered to guests, or eaten with butter tea. A traditional Haa district specialty but found nationwide. Resembles rice krispies but with a more pronounced toasted flavor.',
    wherToFind: 'Markets, homes, roadside stalls',
    isVegetarian: true,
    isVegan: true,
  },
  {
    id: 'FD-019',
    name: 'Tsheringma (Herbal Tea)',
    localName: 'ཚེ་རིང་མ།',
    category: 'Beverage',
    spiceLevel: 'None',
    mainIngredients: ['Potentilla fulgens root', 'Artemisia', 'Other mountain herbs'],
    description: 'A traditional herbal tea made from mountain herbs gathered at high altitude. Named after Tsheringma, goddess of longevity. Lightly golden in color, earthy, and slightly sweet. Used medicinally and as a warming drink.',
    wherToFind: 'Some cafes in Thimphu and Paro. Traditional medicine practitioners.',
    isVegetarian: true,
    isVegan: true,
    culturalSignificance: 'Bhutan has a sophisticated traditional medicine (Sowa Rigpa) system. Many plants used in cooking also have medicinal roles.',
  },
  {
    id: 'FD-020',
    name: 'Datshi (Yak/Cow Cheese)',
    localName: 'དར་ཚིལ།',
    category: 'Condiment',
    spiceLevel: 'None',
    mainIngredients: ['Yak or cow milk', 'Salt'],
    description: 'Bhutan\'s essential dairy product — a soft, slightly stringy, high-fat white cheese made from yak or cow milk. Has a mild, fresh flavor with a creamy texture. The essential ingredient in all datshi dishes and a key protein source in the Bhutanese diet.',
    wherToFind: 'Markets, supermarkets. Used in cooking everywhere.',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Datshi is not just a cheese — it is a cultural cornerstone. Yak cheese from high-altitude herders carries particular prestige.',
  },
  {
    id: 'FD-021',
    name: 'Serzam (Dried Cheese Balls)',
    localName: 'གསེར་ཟམ།',
    category: 'Snack',
    spiceLevel: 'None',
    mainIngredients: ['Yak milk cheese', 'Salt'],
    description: 'Hard, sun-dried cubes or balls of yak cheese — intensely flavored, slightly sour, very hard. Travelers suck on them for hours like a hard candy. The traditional trail food and snack of high-altitude communities.',
    wherToFind: 'Markets in Haa, Bumthang, Gasa. Airport duty-free shops.',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'The quintessential Bhutanese trail snack. Important protein source for herders and travelers.',
  },
  {
    id: 'FD-022',
    name: 'Khabzey/Khapse',
    localName: 'ཁབ་ཟེ།',
    category: 'Dessert',
    spiceLevel: 'None',
    mainIngredients: ['Wheat flour', 'Butter', 'Oil', 'Sugar'],
    description: 'Deep-fried pastry twists — the traditional festive pastry of Bhutan, made in large quantities for Losar (New Year), weddings, and religious ceremonies. Crispy, slightly sweet, and very shelf-stable.',
    wherToFind: 'Households during festivals and celebrations. Bakeries around Losar.',
    bestSeason: 'February–March (Losar season)',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Khapse is synonymous with celebration in Bhutan. A house that hasn\'t made khapse for Losar is considered unprepared for the new year.',
  },
  {
    id: 'FD-023',
    name: 'Chhurpi Soup',
    localName: 'གྲུབ།',
    category: 'Soup',
    spiceLevel: 'Mild',
    mainIngredients: ['Dried yak cheese (chhurpi)', 'Vegetables', 'Dried meat', 'Ginger'],
    description: 'A warming soup made with chhurpi (dried yak cheese that has been aged until very hard), which slowly dissolves as it cooks to create a rich, slightly sour broth. A cold-weather staple in high-altitude communities.',
    wherToFind: 'Rural guesthouses and farmhouses in high-altitude areas (Bumthang, Haa, Gasa).',
    isVegetarian: false,
    isVegan: false,
  },
  {
    id: 'FD-024',
    name: 'Dochu Goen (Coriander Chutney)',
    localName: 'ཌུ་ཆུ་མགོན།',
    category: 'Condiment',
    spiceLevel: 'Hot',
    mainIngredients: ['Fresh coriander', 'Chilies', 'Garlic', 'Salt', 'Lemon'],
    description: 'A bright, fiery green chutney made from fresh coriander and green chilies. The everyday condiment served alongside rice-based meals. Every household has its own recipe.',
    wherToFind: 'All traditional restaurants and homes',
    isVegetarian: true,
    isVegan: true,
  },
  {
    id: 'FD-025',
    name: 'Bhutanese Honey',
    localName: 'ལྕབ་ཚ།',
    category: 'Condiment',
    spiceLevel: 'None',
    mainIngredients: ['Wild honey'],
    description: 'Wild honey harvested from cliff-hanging hive colonies in central and southern Bhutan. Some of the rarest and most prized honey in the world, collected by rope-descending harvesters. Varieties include spring honey (from rhododendron and citrus), dark monsoon honey, and bitter autumn honey.',
    wherToFind: 'Specialty shops in Thimphu. Some hotels serve it at breakfast.',
    isVegetarian: true,
    isVegan: false,
    culturalSignificance: 'Cliff honey harvesting is a dying traditional practice. In some areas the practice is ancient and has been passed through generations. Bhutanese wild honey is exported and considered a luxury product.',
  },
];

// ─── TRADITIONAL CRAFTS (ZORIG CHUSUM) ───────────────────────────────────────

export const traditionalCrafts: TraditionalCraft[] = [
  {
    id: 'C-001',
    name: 'Thagzo (Weaving)',
    localName: 'ཐགས་གཟོ།',
    zorigNumber: 1,
    craft: 'Textile Weaving',
    description: 'The most revered of Bhutan\'s Thirteen Traditional Arts. Hand-loom weaving of silk and cotton fabrics into intricate patterns. Different districts have distinct patterns — Bumthang\'s yathra (woolen stripes), Kishuthara (patterned silk from eastern Bhutan), Menthsi Mathra (silk with golden metallic thread).',
    mainMaterials: ['Raw silk', 'Cotton', 'Wool', 'Natural dyes', 'Metallic thread'],
    regions: ['Bumthang (Yathra)', 'Khoma, Trashiyangtse (Kishuthara)', 'Lhuentse (Kishuthara Mathra)', 'Haa (Woolen)'],
    products: ['Kira (women\'s dress)', 'Gho fabric', 'Yathra woolen strips', 'Wall hangings', 'Cushions'],
    whereToSee: ['National Institute for Zorig Chusum, Thimphu', 'Khoma village, Trashiyangtse', 'Bumthang weaving centers'],
    apprenticeshipYears: 5,
    culturalSignificance: 'Weaving is the primary artistic expression of Bhutanese women. A woman\'s weaving skill traditionally influenced her social standing and marriage prospects. The patterns encode religious symbolism, clan identity, and regional heritage.',
  },
  {
    id: 'C-002',
    name: 'Lhazo (Painting)',
    localName: 'ལྷ་གཟོ།',
    zorigNumber: 2,
    craft: 'Thangka Painting',
    description: 'Sacred scroll paintings (Thangkas) depicting Buddhist deities, mandalas, and cosmological maps. Created according to strict iconometric rules (bod-tsig) that specify every detail of a deity\'s proportions, color, and posture. Painted with mineral pigments and gold.',
    mainMaterials: ['Cotton canvas', 'Mineral pigments', '24-carat gold', 'Yak glue', 'Ox bile (to fix gold)'],
    regions: ['Thimphu', 'Paro', 'Bumthang'],
    products: ['Thangka scrolls', 'Temple murals', 'Deity paintings', 'Mandala paintings'],
    whereToSee: ['National Institute for Zorig Chusum, Thimphu', 'Traditional temples throughout Bhutan', 'Private ateliers in Paro'],
    apprenticeshipYears: 7,
    culturalSignificance: 'Thangkas are not art — they are meditation supports. Every proportion follows sacred iconometric texts. A Thangka must be consecrated by a lama before it can function as a sacred object.',
  },
  {
    id: 'C-003',
    name: 'Jinzo (Sculpting)',
    localName: 'མཇིན་གཟོ།',
    zorigNumber: 3,
    craft: 'Clay and Bronze Sculpture',
    description: 'The art of creating religious statues in clay, bronze casting, or papier-mâché. Sculptors create everything from tiny altar figurines to towering multi-story statues of Buddha. Bronze casting uses the lost-wax method.',
    mainMaterials: ['Clay', 'Bronze', 'Copper', 'Gold leaf', 'Precious stones', 'Papier-mâché'],
    regions: ['Thimphu', 'Paro', 'Throughout Bhutan'],
    products: ['Buddha statues', 'Deity figures', 'Offering vessels (bumpa)', 'Ritual masks'],
    whereToSee: ['National Institute for Zorig Chusum', 'Monasteries throughout Bhutan'],
    apprenticeshipYears: 6,
    culturalSignificance: 'Statues are considered living presences once consecrated. The creation of a statue is itself considered a religious act, and sculptors often fast and maintain special vows during the work.',
  },
  {
    id: 'C-004',
    name: 'Parzo (Carving)',
    localName: 'དཔར་གཟོ།',
    zorigNumber: 4,
    craft: 'Wood and Stone Carving',
    description: 'Intricate carving of wood for architectural elements (windows, doors, roof beams) and stone for religious objects (prayer wheels, mani stones, chortens). Bhutan\'s distinctive architectural style is defined by its carved window frames and elaborate wooden facades.',
    mainMaterials: ['Fir wood', 'Teak', 'Local stone', 'Slate'],
    regions: ['Paro', 'Thimphu', 'Punakha'],
    products: ['Window frames', 'Door panels', 'Prayer wheels', 'Mani stones', 'Architectural details'],
    whereToSee: ['Any traditional dzong or temple', 'National Institute for Zorig Chusum', 'Craft markets'],
    apprenticeshipYears: 5,
    culturalSignificance: 'The carved phallus motifs seen on houses throughout Bhutan (especially Punakha and Wangdue) protect against evil spirits and bring fertility — an ancient pre-Buddhist tradition that survived.',
  },
  {
    id: 'C-005',
    name: 'Shingzo (Woodworking)',
    localName: 'ཤིང་གཟོ།',
    zorigNumber: 5,
    craft: 'Carpentry and Joinery',
    description: 'Traditional Bhutanese carpentry — construction of houses, dzongs, and monasteries using wooden joints, no nails or modern fasteners. The distinctive Bhutanese building style with its whitewashed walls and elaborate wooden upper stories relies entirely on this craft.',
    mainMaterials: ['Fir', 'Bamboo', 'Pine', 'Teak'],
    regions: ['Throughout Bhutan'],
    products: ['Traditional houses', 'Dzong construction', 'Furniture', 'Prayer boxes (chogtsé)'],
    whereToSee: ['Under-construction buildings in any town', 'National Museum restoration, Paro'],
    apprenticeshipYears: 5,
    culturalSignificance: 'Traditional Bhutanese architecture is regulated by the government — all new construction in towns must follow traditional design guidelines.',
  },
  {
    id: 'C-006',
    name: 'Dozo (Masonry)',
    localName: 'རྡོ་གཟོ།',
    zorigNumber: 6,
    craft: 'Stone and Mud Masonry',
    description: 'Traditional construction using local stone or rammed earth (mud), with characteristic tapering walls and no mortar in some traditional methods. Dzong construction expertise.',
    mainMaterials: ['Local stone', 'Mud', 'Lime plaster'],
    regions: ['Throughout Bhutan'],
    products: ['Dzongs', 'Farmhouses', 'Chortens', 'Mani walls'],
    whereToSee: ['Traditional dzongs and farmhouses throughout Bhutan'],
    apprenticeshipYears: 4,
    culturalSignificance: 'The distinctive Bhutanese dzong architecture — massive stone fortresses that house both government and monastery — represents the fusion of secular and religious power.',
  },
  {
    id: 'C-007',
    name: 'Tshazo (Bamboo Craft)',
    localName: 'གཙ་གཟོ།',
    zorigNumber: 7,
    craft: 'Bamboo Weaving',
    description: 'Intricate weaving of bamboo and cane into baskets, mats, hats, quivers, and containers. The Khengpa people of southern Bumthang are particularly famous for their bamboo craft. Patterns include complex geometric designs that take years to master.',
    mainMaterials: ['Bamboo', 'Rattan', 'Cane'],
    regions: ['Kheng (Bumthang south)', 'Sarpang', 'Zhemgang', 'Eastern Bhutan'],
    products: ['Bangchung (bamboo food containers with lid)', 'Palangs (hats)', 'Baskets', 'Quivers', 'Winnowing trays'],
    whereToSee: ['Craft markets in Thimphu', 'Zhemgang district', 'Traditional market in Mongar'],
    apprenticeshipYears: 3,
    culturalSignificance: 'The bangchung — a round bamboo container with a fitted lid — is the traditional Bhutanese lunchbox. Seeing them in markets and carried by farmers is one of the most distinctively Bhutanese visual experiences.',
  },
  {
    id: 'C-008',
    name: 'Garzo (Blacksmithing)',
    localName: 'གར་གཟོ།',
    zorigNumber: 8,
    craft: 'Metal Forging',
    description: 'Traditional iron and steel smithing to create tools, weapons, and farming implements. Bhutanese blacksmiths made the agricultural tools that shaped the landscape and the weapons that defended the kingdom. The craft is declining rapidly.',
    mainMaterials: ['Iron', 'Steel', 'Charcoal'],
    regions: ['Bumthang (iron forging)', 'Paro', 'Trashiyangtse'],
    products: ['Patangs (curved swords)', 'Daggers', 'Agricultural tools', 'Locks', 'Bells'],
    whereToSee: ['National Institute for Zorig Chusum', 'Some craft villages in Bumthang'],
    apprenticeshipYears: 4,
    culturalSignificance: 'The Patang (Bhutanese curved sword) is the most prestigious weapon in Bhutan and is carried ceremonially by high officials in national dress.',
  },
  {
    id: 'C-009',
    name: 'Trozo (Silver and Gold Smithing)',
    localName: 'གཏྲོ་གཟོ།',
    zorigNumber: 9,
    craft: 'Precious Metal Jewelry',
    description: 'Crafting ornamental jewelry and ceremonial objects in silver, gold, and precious stones. Includes fine filigree work, repousse, and inlay techniques. Traditional Bhutanese jewelry is worn during festivals and ceremonies.',
    mainMaterials: ['Silver', 'Gold', 'Turquoise', 'Coral', 'Amber', 'Precious stones'],
    regions: ['Thimphu', 'Trashiyangtse', 'Eastern Bhutan'],
    products: ['Koma (traditional dress clasps)', 'Bracelets', 'Prayer boxes (ga\'u)', 'Earrings', 'Ceremonial cups'],
    whereToSee: ['Thimphu craft market', 'National Institute for Zorig Chusum'],
    apprenticeshipYears: 5,
    culturalSignificance: 'The koma — decorative silver clasps that hold the Kira dress together at the shoulders — are the most important piece of jewelry a Bhutanese woman owns and are often heirloom objects.',
  },
  {
    id: 'C-010',
    name: 'Luzo (Leather Work)',
    localName: 'ལྕི་གཟོ།',
    zorigNumber: 10,
    craft: 'Leather Craft',
    description: 'Traditional tanning and craft of yak and cow leather for boots, armaments, and carrying vessels. The traditional Bhutanese boot (tshoem) with its turned-up toe is made from yak leather.',
    mainMaterials: ['Yak leather', 'Cow leather', 'Natural dyes'],
    regions: ['Paro', 'Eastern Bhutan'],
    products: ['Tshoem (traditional boots)', 'Saddles', 'Quivers', 'Drum heads'],
    whereToSee: ['Craft fairs', 'Some shops in Paro'],
    apprenticeshipYears: 3,
    culturalSignificance: 'Traditional Bhutanese boots (tshoem) with their distinctive turned-up toes are worn with formal traditional dress at ceremonial occasions.',
  },
  {
    id: 'C-011',
    name: 'Tshemzo (Embroidery and Appliqué)',
    localName: 'ཚེམ་གཟོ།',
    zorigNumber: 11,
    craft: 'Needlework and Appliqué',
    description: 'The art of embroidery, appliqué, and patchwork to create decorative textiles, thangkas (appliqué version), and ceremonial costumes. The giant Thangkas (sacred silk panels) unveiled at Tsechu festivals are masterpieces of this craft.',
    mainMaterials: ['Silk thread', 'Cotton', 'Brocade fabric', 'Gold thread'],
    regions: ['Thimphu', 'Paro'],
    products: ['Appliqué thangkas', 'Ceremonial costumes', 'Prayer flags', 'Religious banners'],
    whereToSee: ['National Institute for Zorig Chusum', 'Tsechu festivals (to see thangkas displayed)'],
    apprenticeshipYears: 7,
    culturalSignificance: 'The giant silk thangkas (Kuchoe Thangka or Guru Thangka) revealed at dawn on the final morning of Tsechu festivals like Paro are the greatest achievements of this craft — some are the size of multiple basketball courts.',
  },
  {
    id: 'C-012',
    name: 'Dezo (Papermaking)',
    localName: 'སྡེ་གཟོ།',
    zorigNumber: 12,
    craft: 'Handmade Paper',
    description: 'Traditional making of Daphne paper (Dzo-sho) from the bark of Daphne plants and Edgeworthia plants found in Bhutanese forests. The resulting paper is exceptionally durable, resistant to insects, and used for official documents, religious texts, and prayer flags.',
    mainMaterials: ['Daphne plant bark', 'Edgeworthia bark', 'Water', 'Ash'],
    regions: ['Trashigang', 'Bumthang', 'Trongsa'],
    products: ['Dzo-sho paper (official documents)', 'Prayer flags', 'Manuscripts', 'Packaging'],
    whereToSee: ['Jungshi Handmade Paper Factory, Thimphu', 'Traditional paper-making villages in Trashigang'],
    apprenticeshipYears: 2,
    culturalSignificance: 'Dzo-sho paper has been used for official Bhutanese government documents and religious manuscripts for centuries. The paper can last 500+ years if stored properly.',
  },
  {
    id: 'C-013',
    name: 'Shagzo (Woodturning)',
    localName: 'ཤར་གཟོ།',
    zorigNumber: 13,
    craft: 'Lathe Woodturning',
    description: 'The turning of wooden bowls, cups, cups, plates, and decorative objects on a foot-powered lathe. Dapa (turned wooden bowls) are the most prized product — often made from burls or rare woods with beautiful grain patterns.',
    mainMaterials: ['Walnut burl', 'Maple', 'Cherry wood', 'Rhododendron wood'],
    regions: ['Trashiyangtse', 'Eastern Bhutan'],
    products: ['Dapa (turned wooden bowls)', 'Cups', 'Serving bowls', 'Lids for bangchung'],
    whereToSee: ['Trashiyangtse district (most famous center)', 'Craft shops in Thimphu'],
    apprenticeshipYears: 4,
    culturalSignificance: 'Dapa (wooden bowls) are among the most distinctively Bhutanese craft objects. Each piece is unique, following the natural grain and figure of the wood. High-quality dapa from Trashiyangtse are considered heirloom objects.',
  },
];

// ─── HOT SPRINGS ─────────────────────────────────────────────────────────────

export const hotSprings: HotSpring[] = [
  {
    id: 'HS-001',
    name: 'Gasa Tshachu',
    localName: 'མགར་ས་ཚ་ཆུ།',
    district: 'Gasa',
    elevation: 2770,
    tempCelsius: 47,
    mineralProperties: ['Sulfur', 'Calcium', 'Magnesium', 'Lithium'],
    access: 'Moderate',
    accessDays: 2,
    nearestTown: 'Gasa Dzong',
    healingClaims: ['Arthritis relief', 'Skin conditions', 'Muscle fatigue', 'Digestive issues', 'Rheumatism'],
    description: 'The most famous hot spring complex in Bhutan, located in the remote Gasa district. Four separate pools of different temperatures flow from the hillside. Pilgrims trek 2 days from the roadhead to bathe in the sacred waters. The surrounding valley is also one of the best birding locations in Bhutan.',
    bestSeason: 'November–April (dry season, accessible trail)',
    facilities: 'Basic changing rooms, concrete soaking pools, no accommodation at springs (nearest tents/camping nearby). Gasa Dzong accommodation 1 day away.',
    permit: true,
  },
  {
    id: 'HS-002',
    name: 'Dur Tshachu',
    localName: 'དུར་ཚ་ཆུ།',
    district: 'Bumthang',
    elevation: 3600,
    tempCelsius: 62,
    mineralProperties: ['Sulfur', 'Iron', 'Calcium', 'Radon (trace)'],
    access: 'Hard',
    accessDays: 3,
    nearestTown: 'Ura or Tang, Bumthang',
    healingClaims: ['Skin diseases', 'Bone and joint conditions', 'Nerve disorders', 'Chronic pain'],
    description: 'The hottest and most remote major hot spring in Bhutan, at 3600m in the upper Tang valley. The waters emerge at 62°C and flow into a natural bathing pool. Traditionally credited with healing serious skin and bone conditions. A pilgrimage destination for Bhutanese.',
    bestSeason: 'May–October',
    facilities: 'Very basic — stone and concrete pools. No facilities. Camping required. Bring all supplies.',
    permit: true,
  },
  {
    id: 'HS-003',
    name: 'Chubu Tshachu',
    localName: 'ཆུ་བུ་ཚ་ཆུ།',
    district: 'Punakha',
    elevation: 1200,
    tempCelsius: 38,
    mineralProperties: ['Sulfur', 'Bicarbonate', 'Silica'],
    access: 'Easy',
    accessDays: 0,
    nearestTown: 'Punakha',
    healingClaims: ['Skin conditions', 'Relaxation', 'Muscle tension'],
    description: 'A relatively accessible hot spring near Punakha, making it popular for day-trippers. Lower elevation and moderate temperature make it comfortable year-round. Less powerful minerally than Gasa or Dur but much easier to reach.',
    bestSeason: 'Year-round',
    facilities: 'Modest facilities including changing area. Accessible by road.',
    permit: false,
  },
  {
    id: 'HS-004',
    name: 'Khambalung Tshachu',
    localName: 'ཁམ་བ་ལུང་ཚ་ཆུ།',
    district: 'Mongar',
    elevation: 1600,
    tempCelsius: 44,
    mineralProperties: ['Sulfur', 'Iron', 'Manganese'],
    access: 'Moderate',
    accessDays: 1,
    nearestTown: 'Mongar',
    healingClaims: ['Skin conditions', 'Arthritis', 'Digestive complaints'],
    description: 'A hot spring complex in the Khambalung valley of Mongar district in eastern Bhutan. Less visited by tourists, making it an authentic local experience. The spring is associated with the sacred Khambalung pilgrimage site.',
    bestSeason: 'October–April',
    facilities: 'Basic pools. Local guesthouses in Mongar town (1 day away).',
    permit: false,
  },
  {
    id: 'HS-005',
    name: 'Gelephu Tshachu',
    localName: 'གེ་ལེ་ཕུག་ཚ་ཆུ།',
    district: 'Sarpang',
    elevation: 300,
    tempCelsius: 41,
    mineralProperties: ['Sulfur', 'Sodium', 'Chloride'],
    access: 'Easy',
    accessDays: 0,
    nearestTown: 'Gelephu',
    healingClaims: ['Skin conditions', 'Relaxation'],
    description: 'A low-elevation hot spring near Gelephu in southern Bhutan. Popular with locals from Gelephu town. Good combination with the Manas National Park area.',
    bestSeason: 'November–March',
    facilities: 'Concrete soaking pools, changing rooms. Accessible by road from Gelephu.',
    permit: false,
  },
];

// ─── NATIONAL SYMBOLS ─────────────────────────────────────────────────────────

export const nationalSymbols: NationalSymbol[] = [
  {
    id: 'NS-001',
    category: 'Animal',
    name: 'Takin',
    localName: 'བདུད་རྩི་སེམས་ཅན།',
    description: 'The national animal of Bhutan. The Takin (Budorcas taxicolor) is one of the world\'s strangest-looking large mammals — a stocky bovid that looks like a cross between a wildebeest and a cow. It lives in bamboo and rhododendron forest between 2000–4500m. Listed Vulnerable by IUCN.',
    funFact: 'According to Bhutanese legend, the Takin was created by the Divine Madman Drukpa Kunley in the 15th century. After eating a cow and a goat, he magically re-assembled the skeleton with the goat\'s head on the cow\'s body, then brought it to life — producing the first Takin.',
  },
  {
    id: 'NS-002',
    category: 'Bird',
    name: 'Raven',
    localName: 'ཀ་ཀ།',
    description: 'The national bird of Bhutan. The Raven (Corvus corax tibetanus) is deeply revered in Bhutan, associated with Gonpo Jachung — the raven deity who is the guardian of the Wangchuck royal dynasty. The raven appears on the royal crown.',
    funFact: 'The raven headdress on the royal crown represents Gonpo Jachung, the fierce protector deity of the royal family. The King of Bhutan wears this crown at coronations and national ceremonies — making the raven arguably the most sacred bird in the country.',
  },
  {
    id: 'NS-003',
    category: 'Tree',
    name: 'Himalayan Cypress',
    localName: 'ཤུགས་ཤིང།',
    description: 'The national tree (Cupressus torulosa). Tall, graceful conifers that grow at monastery sites throughout Bhutan, often planted by Guru Rinpoche or his disciples as sacred markers. Always associated with temples and holy sites.',
    funFact: 'Cypress trees planted at monasteries are believed to have been planted by Guru Rinpoche himself. Some trees at Taktshang (Tiger\'s Nest) and Kurjey are over 1300 years old.',
  },
  {
    id: 'NS-004',
    category: 'Flower',
    name: 'Blue Poppy',
    localName: 'བུད་མེད་མེ་ཏོག',
    description: 'The national flower (Meconopsis grandis). A stunning sky-blue poppy that blooms at 3500–4500m in alpine meadows and scree slopes. One of the most beautiful wildflowers in the Himalayas. Extremely difficult to cultivate outside its native range.',
    funFact: 'The blue poppy was unknown to Western science until 1922, when British botanist George Sherriff collected specimens in Bhutan. Its blue color is extraordinarily rare among poppies — caused by anthocyanin pigments.',
  },
  {
    id: 'NS-005',
    category: 'Sport',
    name: 'Archery (Dha)',
    localName: 'མདའ།',
    description: 'The national sport. Traditional Bhutanese archery (Dha) uses bamboo or carbon arrows shot at tiny wooden targets 140 meters apart — double the Olympic distance. Teams of five shoot alternately, accompanied by singing, dancing, and ritual taunting of the opposing team.',
    funFact: 'Bhutanese archery targets are only 30cm wide and placed 140m away. Hitting the target means your team performs a victory dance and sings a mocking song about the opposing team. Missing by a wide margin means the opposition dances in celebration. The social theater around archery is as important as the shooting itself.',
  },
  {
    id: 'NS-006',
    category: 'Dress',
    name: 'Gho and Kira',
    localName: 'མཐོ་ཙམ། / ཀི་ར།',
    description: 'The national dress of Bhutan. Gho (men\'s robe) and Kira (women\'s ankle-length wrapped dress) are mandatory dress in dzongs, government offices, and official occasions. The government actively promotes traditional dress as a marker of Bhutanese identity and GNH.',
    funFact: 'The Gho is essentially a robe that is folded and belted to reach knee height, forming a large front pocket (kera pocket) where Bhutanese men carry everything from phones to snacks. Foreign visitors do not need to wear traditional dress except in dzongs.',
  },
  {
    id: 'NS-007',
    category: 'Religion',
    name: 'Drukpa Kagyu Buddhism',
    localName: 'འབྲུག་པ་བཀའ་བརྒྱུད།',
    description: 'The state religion of Bhutan. The Drukpa Kagyu school of Tibetan Buddhism has been the dominant religion since the 17th century and is enshrined in the constitution. The Je Khenpo (Chief Abbot) is the highest religious authority.',
    funFact: 'Bhutan\'s name in Dzongkha is "Druk Yul" — Land of the Thunder Dragon. The thunder dragon (Druk) is also the emblem on the national flag. Druk was the sound heard during a storm by the founder of the Drukpa lineage — he took it as a divine sign.',
  },
  {
    id: 'NS-008',
    category: 'Language',
    name: 'Dzongkha',
    localName: 'རྫོང་ཁ།',
    description: 'The national language of Bhutan. Dzongkha is related to Tibetan and uses the Tibetan script (Uchen). It is the mother tongue of approximately 25% of the population (western Bhutan) and is taught in all schools. There are 19 other distinct languages spoken in Bhutan.',
    funFact: 'Dzongkha literally means "the language of the dzong (fortress)." It was the administrative language of the Wangchuck dynasty\'s court and was standardized as the national language only in 1971 when Bhutan joined the United Nations.',
  },
  {
    id: 'NS-009',
    category: 'Currency',
    name: 'Ngultrum',
    localName: 'དངུལ་ཀྲམ།',
    description: 'Bhutan\'s currency (Nu. or BTN). Pegged at par with the Indian Rupee. Indian Rupees are also legal tender in Bhutan. Notes feature images of dzongs, the King, and national symbols.',
    funFact: 'Bhutan only introduced currency in 1974. Before that, trade was conducted through barter — salt, butter, cloth, and grain were the primary exchange media. Paper money is still distrusted in rural areas where elders remember barter.',
  },
  {
    id: 'NS-010',
    category: 'Capital',
    name: 'Thimphu',
    localName: 'ཐིམ་ཕུག',
    description: 'Capital city of Bhutan and largest city, population approximately 130,000. Sits at 2334m elevation in the Wang Chhu valley. Only capital city in the world without traffic lights (a policeman in a white box directs traffic at the main intersection — when lights were installed in 2008, public outcry led to their removal within days).',
    funFact: 'Thimphu has no traffic lights by popular demand. When the government installed traffic lights at the main junction in 2008, Bhutanese complained they were impersonal and rude compared to the human traffic policeman who had directed traffic for decades. The lights were removed within days — the policeman reinstated.',
  },
];

// ─── DZONGKHA PHRASES ─────────────────────────────────────────────────────────

export const dzongkhaPhrases: DzongkhaPhrase[] = [
  // Greetings
  { id: 'DZ-001', category: 'Greeting', english: 'Hello / How are you?', dzongkha: 'Kuzuzangpo la', pronunciation: 'koo-ZOO-zang-po la', notes: 'Universal greeting used at any time of day. The "la" is an honorific particle, always added.' },
  { id: 'DZ-002', category: 'Greeting', english: 'I am fine, thank you', dzongkha: 'Nga leg yod', pronunciation: 'nga leg yo', notes: 'Simple positive response.' },
  { id: 'DZ-003', category: 'Greeting', english: 'Where are you going?', dzongkha: 'Kani phelab?', pronunciation: 'kah-NI pheh-LAB', notes: 'A standard Bhutanese greeting equivalent to "how are you" — not literally asking direction.' },
  { id: 'DZ-004', category: 'Greeting', english: 'Goodbye (said by one leaving)', dzongkha: 'Log na shog', pronunciation: 'log na shok', notes: 'Said by the person who is leaving.' },
  { id: 'DZ-005', category: 'Greeting', english: 'Goodbye (said to one leaving)', dzongkha: 'Jaw la', pronunciation: 'jaw la', notes: 'Said by those who are staying.' },
  // Polite
  { id: 'DZ-006', category: 'Polite', english: 'Thank you', dzongkha: 'Kadrinchhe la', pronunciation: 'kah-DRIN-cheh la', notes: 'The standard "thank you." The "la" shows respect.' },
  { id: 'DZ-007', category: 'Polite', english: 'Please', dzongkha: 'Bey da', pronunciation: 'bay da', notes: 'Polite request marker.' },
  { id: 'DZ-008', category: 'Polite', english: 'Yes', dzongkha: 'Ong la', pronunciation: 'ong la', notes: 'Respectful "yes." In casual speech just "In."' },
  { id: 'DZ-009', category: 'Polite', english: 'No', dzongkha: 'Men', pronunciation: 'men', notes: 'Simple negative.' },
  { id: 'DZ-010', category: 'Polite', english: 'Sorry / Excuse me', dzongkha: 'Gewa me la', pronunciation: 'geh-wa may la', notes: 'Apology or request to pass.' },
  { id: 'DZ-011', category: 'Polite', english: 'What is your name?', dzongkha: 'Choe gi ming ga chi mo?', pronunciation: 'choy gee ming ga chi mo', notes: undefined },
  { id: 'DZ-012', category: 'Polite', english: 'My name is...', dzongkha: 'Ngey ming... yin', pronunciation: 'ngay ming... yin', notes: 'Insert name between ming and yin.' },
  // Food
  { id: 'DZ-013', category: 'Food', english: 'Delicious!', dzongkha: 'Zim shim dug', pronunciation: 'zim shim dug', notes: 'High praise for food. Will delight any Bhutanese host.' },
  { id: 'DZ-014', category: 'Food', english: 'Less spicy please', dzongkha: 'Kaba tsam kha goen la', pronunciation: 'kah-ba tsam kha goen la', notes: 'Very useful for visitors. Expect food to still be quite spicy.' },
  { id: 'DZ-015', category: 'Food', english: 'I am vegetarian', dzongkha: 'Nga sha ma za', pronunciation: 'nga sha ma za', notes: 'Literally "I don\'t eat meat." Bhutanese food is still often cooked in meat-based stocks even if meat-free.' },
  { id: 'DZ-016', category: 'Food', english: 'Water', dzongkha: 'Chhu', pronunciation: 'choo', notes: 'Also means "river" — context makes it clear.' },
  { id: 'DZ-017', category: 'Food', english: 'More please', dzongkha: 'Phe na nang la', pronunciation: 'fay na nang la', notes: 'Said when offered more food — will greatly please a host.' },
  { id: 'DZ-018', category: 'Food', english: 'I am full / enough', dzongkha: 'Trog sang', pronunciation: 'trog sang', notes: 'Politely decline more food.' },
  // Trail
  { id: 'DZ-019', category: 'Trail', english: 'How far is it?', dzongkha: 'Kani drey katam re?', pronunciation: 'kah-ni dray kah-tam ray', notes: undefined },
  { id: 'DZ-020', category: 'Trail', english: 'Is the trail difficult?', dzongkha: 'Lam da khag gi dug ga?', pronunciation: 'lam da khag gi dug ga', notes: undefined },
  { id: 'DZ-021', category: 'Trail', english: 'Is this the right path?', dzongkha: 'Di lam rang ge re?', pronunciation: 'dee lam rang gay ray', notes: undefined },
  { id: 'DZ-022', category: 'Trail', english: 'How many hours?', dzongkha: 'Chu tse kadey re?', pronunciation: 'choo tsay kah-day ray', notes: undefined },
  { id: 'DZ-023', category: 'Trail', english: 'Snow / Ice', dzongkha: 'Kha / Shi', pronunciation: 'kha / shee', notes: 'Critical vocabulary for high passes.' },
  // Emergency
  { id: 'DZ-024', category: 'Emergency', english: 'Help!', dzongkha: 'Rogi la!', pronunciation: 'ro-gi la', notes: undefined },
  { id: 'DZ-025', category: 'Emergency', english: 'I am sick', dzongkha: 'Nga na gi dug', pronunciation: 'nga na gi dug', notes: undefined },
  { id: 'DZ-026', category: 'Emergency', english: 'Call a doctor', dzongkha: 'Amchi ko la', pronunciation: 'am-chi ko la', notes: '"Amchi" = traditional doctor. For modern doctor: "Nyen dok ko la"' },
  { id: 'DZ-027', category: 'Emergency', english: 'I am lost', dzongkha: 'Nga lam may par dro', pronunciation: 'nga lam may par dro', notes: undefined },
  // Numbers
  { id: 'DZ-028', category: 'Numbers', english: 'One', dzongkha: 'Chi', pronunciation: 'chee', notes: undefined },
  { id: 'DZ-029', category: 'Numbers', english: 'Two', dzongkha: 'Nyi', pronunciation: 'nyee', notes: undefined },
  { id: 'DZ-030', category: 'Numbers', english: 'Three', dzongkha: 'Sum', pronunciation: 'sum', notes: undefined },
  { id: 'DZ-031', category: 'Numbers', english: 'Four', dzongkha: 'Zhi', pronunciation: 'zhee', notes: undefined },
  { id: 'DZ-032', category: 'Numbers', english: 'Five', dzongkha: 'Nga', pronunciation: 'nga', notes: 'Also the word for "I/me" — context differentiates.' },
  { id: 'DZ-033', category: 'Numbers', english: 'Ten', dzongkha: 'Chu tham pa', pronunciation: 'choo tam pa', notes: undefined },
  { id: 'DZ-034', category: 'Numbers', english: 'One hundred', dzongkha: 'Gya', pronunciation: 'gya', notes: undefined },
  // Religion
  { id: 'DZ-035', category: 'Religion', english: 'Temple / Monastery', dzongkha: 'Lhakhang / Goemba', pronunciation: 'lha-khang / gwem-ba', notes: 'Lhakhang = smaller chapel/temple. Goemba = monastery (full monastic community).' },
  { id: 'DZ-036', category: 'Religion', english: 'Prayer wheel', dzongkha: 'Mane khor lo', pronunciation: 'mah-nay kor lo', notes: 'Always spin clockwise.' },
  { id: 'DZ-037', category: 'Religion', english: 'Prayer flags', dzongkha: 'Dar cho', pronunciation: 'dar cho', notes: 'Never walk under prayer flags — they carry prayers upward.' },
  { id: 'DZ-038', category: 'Religion', english: 'Blessing', dzongkha: 'Chin lab', pronunciation: 'chin lab', notes: 'Received by bowing head to a lama or touching a sacred object.' },
];

// ─── CULTURAL CUSTOMS ─────────────────────────────────────────────────────────

export const culturalCustoms: CulturalCustom[] = [
  {
    id: 'CC-001',
    category: 'Religion',
    title: 'Walk clockwise around chortens and mani walls',
    description: 'All sacred structures — chortens (stupas), mani walls (walls of prayer-inscribed stones), and prayer wheels — should be circumambulated clockwise. This applies to the exterior of temples too. The orientation aligns with the movement of the sun and Buddhist cosmology.',
    importance: 'Essential',
    applies: 'All sacred sites throughout Bhutan',
  },
  {
    id: 'CC-002',
    category: 'Religion',
    title: 'Remove shoes before entering temples',
    description: 'Shoes must be removed before entering any lhakhang (temple) or goemba (monastery). Some sites require removing shoes outside the gate — others at the door. Watch what locals do. Socks are fine to wear inside.',
    importance: 'Essential',
    applies: 'All temples, monasteries, and dzong interiors',
  },
  {
    id: 'CC-003',
    category: 'Dress',
    title: 'Traditional dress required in dzongs',
    description: 'Entering a dzong (fortress-monastery) requires traditional dress — Gho for men, Kira for women. This applies to both Bhutanese citizens and tourists. Rental services are available at major dzongs for visitors who don\'t have traditional dress. For women, a kabney (scarf) is also required.',
    importance: 'Essential',
    applies: 'All 20 district dzongs and important monasteries',
  },
  {
    id: 'CC-004',
    category: 'Dress',
    title: 'Scarves (kabney/rachu) indicate status and context',
    description: 'Bhutanese men wear a kabney (ceremonial scarf) over the Gho when visiting dzongs or official events. The color indicates rank: white = citizens, red = monks and senior officials, orange = members of National Assembly, yellow = Je Khenpo and King. Women wear the rachu (embroidered shoulder cloth).',
    importance: 'Important',
    applies: 'Formal occasions, dzong visits, government offices',
  },
  {
    id: 'CC-005',
    category: 'Etiquette',
    title: 'Accept food and drink with both hands or right hand',
    description: 'When receiving anything — food, a gift, butter tea, money, business cards — use both hands or the right hand only. Receiving with the left hand alone is considered rude. When accepting with one hand, touch the right elbow with the left hand as a gesture of respect.',
    importance: 'Important',
    applies: 'All social situations',
  },
  {
    id: 'CC-006',
    category: 'Etiquette',
    title: 'Bow slightly when passing monks or senior people',
    description: 'A slight bow or lowering of the head when encountering monks, lamas, or elderly people shows appropriate respect. Physical contact (touching the feet or lower robe) of a lama is a traditional way to receive blessing.',
    importance: 'Important',
    applies: 'Throughout society',
  },
  {
    id: 'CC-007',
    category: 'Taboo',
    title: 'Do not photograph religious ceremonies without permission',
    description: 'During sacred Tsechu festivals and religious ceremonies, photography may be restricted — particularly during the most sacred dances. Always ask permission. Flash photography inside temples is generally prohibited. Photographing monks during meditation or prayer is disrespectful.',
    importance: 'Essential',
    applies: 'All festivals and temples',
  },
  {
    id: 'CC-008',
    category: 'Taboo',
    title: 'Do not touch religious statues or sacred objects',
    description: 'Touching statues, sacred paintings (thangkas), or religious books without invitation is considered highly inappropriate. Even if no one stops you, it is deeply disrespectful. If invited to touch a sacred object for blessing, do so with your forehead.',
    importance: 'Essential',
    applies: 'All temples and religious spaces',
  },
  {
    id: 'CC-009',
    category: 'GNH',
    title: 'Gross National Happiness (GNH) — Bhutan\'s development philosophy',
    description: 'Bhutan famously measures GNH instead of GDP. The four pillars are: sustainable and equitable socio-economic development, conservation of the environment, preservation and promotion of culture, and good governance. GNH is not just a slogan but a policy framework — every government policy must pass a GNH screening. Understanding this helps make sense of why Bhutan does many things differently.',
    importance: 'Good to know',
    applies: 'Understanding Bhutan\'s approach to tourism, development, and daily life',
  },
  {
    id: 'CC-010',
    category: 'GNH',
    title: 'High-value, low-impact tourism policy',
    description: 'Bhutan limits tourism deliberately through a Sustainable Development Fee (SDF). All visitors (except Indians, Bangladeshis, Maldivians) must pay USD 100/day per person, which covers a government tourism royalty and carbon offset contributions. This is not a "luxury only" policy — budget accommodation exists, but the daily fee applies regardless. The policy keeps visitor numbers lower and funds conservation.',
    importance: 'Essential',
    applies: 'All international visitors',
  },
  {
    id: 'CC-011',
    category: 'Social',
    title: 'Pointing with a finger is rude — use the whole hand',
    description: 'Pointing with a single finger is considered rude and aggressive in Bhutan. When indicating direction or objects, extend the whole hand with fingers together, palm up or sideways. For indicating people or sacred objects, even a full-hand gesture should be avoided when possible.',
    importance: 'Good to know',
    applies: 'All social situations',
  },
  {
    id: 'CC-012',
    category: 'Etiquette',
    title: 'Greet monks and elderly with "Kuzuzangpo la"',
    description: '"Kuzuzangpo la" is the universal greeting and should be used liberally. The "la" honorific added to sentences is the key indicator of respect in Dzongkha — using it with monks, elderly people, or any new acquaintance is always appropriate.',
    importance: 'Essential',
    applies: 'All social interactions',
  },
  {
    id: 'CC-013',
    category: 'Religion',
    title: 'Never step over religious items on the ground',
    description: 'Prayer flags, mani stones, religious books, ritual offerings, or any object clearly placed for religious purposes should not be stepped over. Walk around them. This also applies to the threshold of some temples.',
    importance: 'Essential',
    applies: 'All religious sites and outdoor prayer sites',
  },
  {
    id: 'CC-014',
    category: 'Social',
    title: 'The phallus symbol is protective, not obscene',
    description: 'Throughout Bhutan — especially in Punakha and Wangdue — you will see large painted or carved phalluses on house walls. These are protective symbols from the tradition of Drukpa Kunley (the Divine Madman), believed to ward off evil spirits and bring fertility. Reacting with shock or ridicule is inappropriate — this is sacred iconography.',
    importance: 'Good to know',
    applies: 'Traditional architecture, especially Punakha district',
  },
  {
    id: 'CC-015',
    category: 'Taboo',
    title: 'Smoking is banned in public places',
    description: 'Bhutan was the first country in the world to ban tobacco sales entirely (2004). Sale and public use of tobacco is illegal. Visitors may bring tobacco for personal use with import taxes paid, but smoking in public, restaurants, vehicles, and cultural sites is prohibited.',
    importance: 'Essential',
    applies: 'All public spaces in Bhutan',
  },
];

// ─── TRADITIONAL GAMES ────────────────────────────────────────────────────────

export const traditionalGames: TraditionalGame[] = [
  {
    id: 'TG-001',
    name: 'Archery (Dha)',
    localName: 'མདའ།',
    type: 'Archery',
    description: 'The national sport of Bhutan. Teams of five alternately shoot at wooden targets 140m apart (nearly 5x the Olympic archery distance). The social elements — singing victory songs, dancing, ritual taunting between teams — are as important as the shooting itself. Traditional bamboo bows have been largely replaced by modern compound bows.',
    equipment: 'Compound bow or traditional bamboo bow, carbon or bamboo arrows, wooden target (30cm circular, with central circle of 7cm)',
    participants: 'Two teams of 5 players each',
    whenPlayed: 'Year-round at archery grounds. Major tournaments during national holidays, festivals, and weekends.',
    culturalSignificance: 'Archery tournaments are major social events. Winning teams perform celebration dances (zhey) mocking the opposing team. Losing teams must participate with dignity. The entire community gathers to watch, bet, and socialize.',
    whereToWatch: 'Chang Lim Thang Archery Ground, Thimphu (practice daily, tournaments on weekends). Every town has an archery ground.',
  },
  {
    id: 'TG-002',
    name: 'Khuru (Traditional Darts)',
    localName: 'ཁུ་རུ།',
    type: 'Darts',
    description: 'Bhutanese darts using heavy steel-tipped wooden darts (about 30cm) thrown at a wooden target 20m away. Closer than archery but similarly organized into team competitions with the same social atmosphere — victory dances, singing, and elaborate rituals around good and bad throws.',
    equipment: 'Heavy wooden dart with steel tip, small wooden target',
    participants: 'Teams of players, typically 4–6 per side',
    whenPlayed: 'Weekends, festivals, and national holidays',
    culturalSignificance: 'Considered slightly more democratic than archery (less expensive equipment). Especially popular in eastern Bhutan.',
    whereToWatch: 'Khuru grounds in Thimphu and most district towns. Haa Summer Festival.',
  },
  {
    id: 'TG-003',
    name: 'Digor (Stone Putting)',
    localName: 'གཏེར།',
    type: 'Running',
    description: 'A traditional stone-putting sport where competitors throw flat round stones as far as possible — similar to shot-put but using a flat stone. An ancient sport that tests pure strength.',
    equipment: 'Flat heavy stone',
    participants: 'Individual competition, typically 5–10 competitors',
    whenPlayed: 'National Day celebrations, Losar, festivals',
    culturalSignificance: 'One of Bhutan\'s oldest traditional sports, dating back centuries. Tests the strength associated with Bhutan\'s farming and warrior heritage.',
    whereToWatch: 'National Day celebrations, Losar events',
  },
  {
    id: 'TG-004',
    name: 'Soksom (Spear Throwing)',
    localName: 'སྲོག་གཟུངས།',
    type: 'Running',
    description: 'Traditional spear throwing at a target. Less common than archery or khuru but still practiced at traditional festivals and national events.',
    equipment: 'Wooden spear with iron tip',
    participants: 'Individual competition',
    whenPlayed: 'National Day, traditional festivals',
    culturalSignificance: 'Recalls Bhutan\'s warrior history and the martial skills that defended the kingdom against Tibetan and British invasions.',
    whereToWatch: 'National Day celebrations',
  },
  {
    id: 'TG-005',
    name: 'Pungdo (Stone Throwing)',
    localName: 'ཕུང་རྡོ།',
    type: 'Running',
    description: 'A game of throwing stones at a target pile of stones. Teams take turns throwing stones to knock over the opponent\'s pile while protecting their own.',
    equipment: 'Round throwing stones, target stone pile',
    participants: 'Two teams',
    whenPlayed: 'Rural festivals, school sports days',
    culturalSignificance: 'A children\'s and young adults\' game that develops accuracy and strategy.',
    whereToWatch: 'Rural festivals and community events',
  },
  {
    id: 'TG-006',
    name: 'Degor (Frisbee-like disc)',
    localName: 'གད་གོར།',
    type: 'Running',
    description: 'A traditional disc-throwing game using flat stones or, historically, wooden discs. Players compete to throw a disc to land closest to a target stick.',
    equipment: 'Flat stone or wooden disc, target stick',
    participants: 'Individual or team',
    whenPlayed: 'Children\'s games, rural festivals',
    culturalSignificance: 'A traditional game that requires both strength and accuracy, developing skills applicable to agricultural work.',
    whereToWatch: 'Rural community gatherings',
  },
];
