export type Difficulty = 'Easy' | 'Moderate' | 'Hard' | null;
export type RouteType = 'Trek' | 'Hike';
export type RouteStatus = 'Published' | 'Draft';
export type ConservationStatus = 'CR' | 'EN' | 'VU' | 'NT' | 'LC';
export type UserRole = 'Super Admin' | 'Admin' | 'Editor' | 'Viewer';

export interface Route {
  id: string;
  name: string;
  type: RouteType;
  difficulty: Difficulty;
  distanceKm: number;
  elevationGain: number;
  elevationMin: number;
  elevationMax: number;
  durationDays: number | null;
  season: string | null;
  districts: string[];
  status: RouteStatus;
  imageCount: number;
  permitRequired: boolean;
  highlights: string;
  description: string;
}

export interface Bird {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  status: ConservationStatus;
  elevationMin: number;
  elevationMax: number;
  bestMonths: string;
  isNationalBird: boolean;
  isEndemic: boolean;
  locationLinks: number;
  habitat: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin: string;
  joinedDate: string;
  initials: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userName: string;
  userInitials: string;
  action: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
}

export interface HeritageSite {
  id: string;
  name: string;
  district: string;
  type: string;
  elevation: number;
  accessibleFromTrail: boolean;
  builtYear: string;
  lat: number;
  lon: number;
}

export interface ConservationArea {
  id: string;
  name: string;
  code: string;
  areaKm2: number;
  established: number;
  mammals: number;
  birds: number;
}

export const routes: Route[] = [
  {
    id: 'RT-001',
    name: 'Snowman Trek',
    type: 'Trek',
    difficulty: 'Hard',
    distanceKm: 216,
    elevationGain: 8420,
    elevationMin: 2100,
    elevationMax: 5320,
    durationDays: 25,
    season: 'Sep–Oct',
    districts: ['Gasa', 'Lunana'],
    status: 'Draft',
    imageCount: 12,
    permitRequired: true,
    highlights: 'Remote high-altitude passes, glacial lakes, pristine wilderness',
    description: 'One of the most challenging and remote treks in the world, crossing the Himalayas through Bhutan\'s least populated region.',
  },
  {
    id: 'RT-002',
    name: 'Druk Path Trek',
    type: 'Trek',
    difficulty: 'Moderate',
    distanceKm: 54,
    elevationGain: 2100,
    elevationMin: 2280,
    elevationMax: 4220,
    durationDays: 6,
    season: 'Mar–May, Sep–Nov',
    districts: ['Paro', 'Thimphu'],
    status: 'Draft',
    imageCount: 8,
    permitRequired: true,
    highlights: 'Pristine alpine lakes, panoramic mountain views, Buddhist monasteries',
    description: 'A classic high-altitude trek connecting Paro and Thimphu with stunning views of Himalayan peaks.',
  },
  {
    id: 'RT-003',
    name: 'Bumthang Cultural Trek',
    type: 'Trek',
    difficulty: 'Easy',
    distanceKm: 22,
    elevationGain: 450,
    elevationMin: 2580,
    elevationMax: 3050,
    durationDays: 3,
    season: 'Year Round',
    districts: ['Bumthang'],
    status: 'Draft',
    imageCount: 5,
    permitRequired: false,
    highlights: 'Ancient temples, fertile valleys, traditional villages',
    description: 'A gentle cultural walk through the heartland of Bhutanese spirituality and tradition.',
  },
  {
    id: 'RT-004',
    name: 'Gangtey Trail',
    type: 'Trek',
    difficulty: 'Moderate',
    distanceKm: 37.7,
    elevationGain: 3174,
    elevationMin: 1461,
    elevationMax: 3523,
    durationDays: 3,
    season: 'Oct–Nov, Mar–Apr',
    districts: ['Wangdue Phodrang'],
    status: 'Draft',
    imageCount: 7,
    permitRequired: false,
    highlights: 'Black-necked crane sanctuary, Phobjikha Valley, Gangtey Monastery',
    description: 'A scenic trail through the Phobjikha Valley offering unmatched wildlife viewing of the endangered black-necked crane.',
  },
  {
    id: 'RT-005',
    name: 'Jomolhari Trek',
    type: 'Trek',
    difficulty: 'Hard',
    distanceKm: 112,
    elevationGain: 5600,
    elevationMin: 2280,
    elevationMax: 4890,
    durationDays: 8,
    season: 'Apr–Jun, Sep–Nov',
    districts: ['Paro', 'Gasa'],
    status: 'Draft',
    imageCount: 10,
    permitRequired: true,
    highlights: 'Mt. Jomolhari base camp, Jimilang Tsho lake, high yak pastures',
    description: 'Trek to the base of Bhutan\'s most iconic peak through varied landscapes.',
  },
  {
    id: 'RT-006',
    name: 'Dagala Thousand Lakes',
    type: 'Trek',
    difficulty: 'Hard',
    distanceKm: 45,
    elevationGain: 2800,
    elevationMin: 2580,
    elevationMax: 4520,
    durationDays: 5,
    season: 'Apr–May, Sep–Oct',
    districts: ['Thimphu'],
    status: 'Draft',
    imageCount: 3,
    permitRequired: false,
    highlights: 'Cluster of glacial lakes, sweeping views, isolation',
    description: 'A remote trek past countless glacial lakes with near-solitary wilderness experience.',
  },
  {
    id: 'RT-007',
    name: 'Merak-Sakteng Trek',
    type: 'Trek',
    difficulty: 'Moderate',
    distanceKm: 38,
    elevationGain: 1900,
    elevationMin: 2400,
    elevationMax: 4200,
    durationDays: 5,
    season: 'Mar–May, Oct',
    districts: ['Trashigang'],
    status: 'Draft',
    imageCount: 6,
    permitRequired: true,
    highlights: 'Unique semi-nomadic Brokpa culture, yak herders, restricted zone access',
    description: 'A rare trek into the restricted Sakteng Wildlife Sanctuary homeland of the Brokpa people.',
  },
  {
    id: 'RT-008',
    name: 'Duer Hot Springs Trek',
    type: 'Trek',
    difficulty: null,
    distanceKm: 66,
    elevationGain: 2200,
    elevationMin: 1000,
    elevationMax: 3850,
    durationDays: null,
    season: null,
    districts: ['Bumthang'],
    status: 'Draft',
    imageCount: 0,
    permitRequired: false,
    highlights: 'Natural hot springs, subtropical forest transition, remote',
    description: 'Trek through dramatic landscape changes from subtropical valleys to alpine meadows.',
  },
  {
    id: 'RT-009',
    name: 'Haa Valley Hike',
    type: 'Hike',
    difficulty: 'Easy',
    distanceKm: 14,
    elevationGain: 520,
    elevationMin: 2700,
    elevationMax: 3220,
    durationDays: 1,
    season: 'May–Oct',
    districts: ['Haa'],
    status: 'Draft',
    imageCount: 4,
    permitRequired: false,
    highlights: 'Hidden valley, military monastery, rural landscapes',
    description: 'A day hike through the serene Haa valley, one of Bhutan\'s least-visited regions.',
  },
  {
    id: 'RT-010',
    name: 'Tiger\'s Nest Ascent',
    type: 'Hike',
    difficulty: 'Moderate',
    distanceKm: 9.6,
    elevationGain: 900,
    elevationMin: 2430,
    elevationMax: 3120,
    durationDays: 1,
    season: 'Year Round',
    districts: ['Paro'],
    status: 'Draft',
    imageCount: 14,
    permitRequired: false,
    highlights: 'Paro Taktsang cliff monastery, prayer flags, waterfall',
    description: 'Bhutan\'s most iconic hike to the sacred Tiger\'s Nest Monastery clinging to a sheer cliff face.',
  },
];

export const birds: Bird[] = [
  { id: 'B-001', commonName: 'Himalayan Monal', scientificName: 'Lophophorus impejanus', family: 'Phasianidae', status: 'LC', elevationMin: 2100, elevationMax: 4500, bestMonths: 'Apr–Jun', isNationalBird: true, isEndemic: false, locationLinks: 14, habitat: ['alpine', 'forest'] },
  { id: 'B-002', commonName: 'Black-necked Crane', scientificName: 'Grus nigricollis', family: 'Gruidae', status: 'VU', elevationMin: 1200, elevationMax: 3500, bestMonths: 'Oct–Mar', isNationalBird: false, isEndemic: false, locationLinks: 3, habitat: ['wetland', 'open'] },
  { id: 'B-003', commonName: 'Satyr Tragopan', scientificName: 'Tragopan satyra', family: 'Phasianidae', status: 'NT', elevationMin: 2200, elevationMax: 4250, bestMonths: 'Apr–Jun', isNationalBird: false, isEndemic: false, locationLinks: 11, habitat: ['forest'] },
  { id: 'B-004', commonName: "Ward's Trogon", scientificName: 'Harpactes wardi', family: 'Trogonidae', status: 'NT', elevationMin: 1500, elevationMax: 3200, bestMonths: 'Mar–May', isNationalBird: false, isEndemic: false, locationLinks: 8, habitat: ['forest'] },
  { id: 'B-005', commonName: 'White-bellied Heron', scientificName: 'Ardea insignis', family: 'Ardeidae', status: 'CR', elevationMin: 150, elevationMax: 1500, bestMonths: 'Dec–Mar', isNationalBird: false, isEndemic: false, locationLinks: 5, habitat: ['riverside'] },
  { id: 'B-006', commonName: 'Blood Pheasant', scientificName: 'Ithaginis cruentus', family: 'Phasianidae', status: 'LC', elevationMin: 3000, elevationMax: 4500, bestMonths: 'May–Sep', isNationalBird: false, isEndemic: false, locationLinks: 7, habitat: ['alpine', 'scrub'] },
  { id: 'B-007', commonName: 'Rufous-necked Hornbill', scientificName: 'Aceros nipalensis', family: 'Bucerotidae', status: 'VU', elevationMin: 200, elevationMax: 2000, bestMonths: 'Year-round', isNationalBird: false, isEndemic: false, locationLinks: 6, habitat: ['forest'] },
  { id: 'B-008', commonName: 'Himalayan Griffon', scientificName: 'Gyps himalayensis', family: 'Accipitridae', status: 'LC', elevationMin: 1200, elevationMax: 5500, bestMonths: 'Nov–Apr', isNationalBird: false, isEndemic: false, locationLinks: 9, habitat: ['alpine', 'cliff'] },
  { id: 'B-009', commonName: 'Beautiful Nuthatch', scientificName: 'Sitta formosa', family: 'Sittidae', status: 'VU', elevationMin: 1000, elevationMax: 2400, bestMonths: 'Mar–Jun', isNationalBird: false, isEndemic: false, locationLinks: 4, habitat: ['forest'] },
  { id: 'B-010', commonName: 'Fire-tailed Sunbird', scientificName: 'Aethopyga ignicauda', family: 'Nectariniidae', status: 'LC', elevationMin: 2500, elevationMax: 4200, bestMonths: 'Apr–Jul', isNationalBird: false, isEndemic: false, locationLinks: 5, habitat: ['alpine', 'forest'] },
];

export const users: User[] = [
  { id: 'U-001', name: 'Dechen Wangmo', email: 'dechen@hiddenbhutan.bt', role: 'Super Admin', active: true, lastLogin: '2 hours ago', joinedDate: '2024-01-15', initials: 'DW' },
  { id: 'U-002', name: 'Sonam Tshering', email: 'sonam@hiddenbhutan.bt', role: 'Admin', active: true, lastLogin: '1 day ago', joinedDate: '2024-02-20', initials: 'ST' },
  { id: 'U-003', name: 'Karma Dorji', email: 'karma@hiddenbhutan.bt', role: 'Editor', active: true, lastLogin: '3 hours ago', joinedDate: '2024-03-10', initials: 'KD' },
  { id: 'U-004', name: 'Pema Choden', email: 'pema@hiddenbhutan.bt', role: 'Editor', active: true, lastLogin: '5 hours ago', joinedDate: '2024-04-05', initials: 'PC' },
  { id: 'U-005', name: 'Tashi Namgyal', email: 'tashi@hiddenbhutan.bt', role: 'Viewer', active: true, lastLogin: '1 week ago', joinedDate: '2024-05-12', initials: 'TN' },
  { id: 'U-006', name: 'Rinchen Zangmo', email: 'rinchen@hiddenbhutan.bt', role: 'Editor', active: false, lastLogin: '2 weeks ago', joinedDate: '2024-06-01', initials: 'RZ' },
  { id: 'U-007', name: 'Jigme Wangchuk', email: 'jigme@hiddenbhutan.bt', role: 'Viewer', active: true, lastLogin: '3 days ago', joinedDate: '2024-07-18', initials: 'JW' },
  { id: 'U-008', name: 'Kinley Dorji', email: 'kinley@hiddenbhutan.bt', role: 'Admin', active: true, lastLogin: '4 hours ago', joinedDate: '2024-08-22', initials: 'KD' },
];

export const auditLog: AuditEntry[] = [
  { id: 'A-001', timestamp: '2026-06-13 14:32:11', userName: 'Karma Dorji', userInitials: 'KD', action: 'updated', entityType: 'Route', entityName: 'Gangtey Trail', field: 'difficulty', oldValue: 'null', newValue: 'Moderate', ipAddress: '192.168.1.42' },
  { id: 'A-002', timestamp: '2026-06-13 14:15:08', userName: 'Pema Choden', userInitials: 'PC', action: 'updated', entityType: 'Bird', entityName: 'Black-necked Crane', field: 'best_months', oldValue: 'Oct–Feb', newValue: 'Oct–Mar', ipAddress: '192.168.1.55' },
  { id: 'A-003', timestamp: '2026-06-13 13:50:22', userName: 'Karma Dorji', userInitials: 'KD', action: 'updated', entityType: 'Route', entityName: 'Druk Path Trek', field: 'season', oldValue: 'null', newValue: 'Mar–May, Sep–Nov', ipAddress: '192.168.1.42' },
  { id: 'A-004', timestamp: '2026-06-13 12:20:45', userName: 'Sonam Tshering', userInitials: 'ST', action: 'created', entityType: 'Heritage', entityName: 'Tamshing Lhakhang', ipAddress: '192.168.1.21' },
  { id: 'A-005', timestamp: '2026-06-13 11:45:33', userName: 'Pema Choden', userInitials: 'PC', action: 'updated', entityType: 'Route', entityName: 'Jomolhari Trek', field: 'duration_days', oldValue: 'null', newValue: '8', ipAddress: '192.168.1.55' },
  { id: 'A-006', timestamp: '2026-06-13 10:30:18', userName: 'Dechen Wangmo', userInitials: 'DW', action: 'created', entityType: 'User', entityName: 'Kinley Dorji', ipAddress: '192.168.1.10' },
  { id: 'A-007', timestamp: '2026-06-13 09:15:07', userName: 'Karma Dorji', userInitials: 'KD', action: 'updated', entityType: 'Bird', entityName: 'Himalayan Monal', field: 'elevation_max', oldValue: '4200', newValue: '4500', ipAddress: '192.168.1.42' },
  { id: 'A-008', timestamp: '2026-06-12 17:42:55', userName: 'Sonam Tshering', userInitials: 'ST', action: 'updated', entityType: 'Route', entityName: "Tiger's Nest Ascent", field: 'description', oldValue: '...', newValue: "Bhutan's most iconic hike...", ipAddress: '192.168.1.21' },
  { id: 'A-009', timestamp: '2026-06-12 16:20:11', userName: 'Pema Choden', userInitials: 'PC', action: 'deleted', entityType: 'Media', entityName: 'snowman_old_photo.jpg', ipAddress: '192.168.1.55' },
  { id: 'A-010', timestamp: '2026-06-12 15:05:44', userName: 'Karma Dorji', userInitials: 'KD', action: 'updated', entityType: 'Route', entityName: 'Bumthang Cultural Trek', field: 'highlights', oldValue: 'null', newValue: 'Ancient temples, fertile valleys...', ipAddress: '192.168.1.42' },
  { id: 'A-011', timestamp: '2026-06-12 14:33:21', userName: 'Dechen Wangmo', userInitials: 'DW', action: 'updated', entityType: 'User', entityName: 'Rinchen Zangmo', field: 'active', oldValue: 'true', newValue: 'false', ipAddress: '192.168.1.10' },
  { id: 'A-012', timestamp: '2026-06-12 13:10:09', userName: 'Sonam Tshering', userInitials: 'ST', action: 'created', entityType: 'Bird', entityName: 'Beautiful Nuthatch', ipAddress: '192.168.1.21' },
  { id: 'A-013', timestamp: '2026-06-12 11:55:38', userName: 'Karma Dorji', userInitials: 'KD', action: 'updated', entityType: 'Route', entityName: 'Snowman Trek', field: 'difficulty', oldValue: 'null', newValue: 'Hard', ipAddress: '192.168.1.42' },
  { id: 'A-014', timestamp: '2026-06-12 10:40:15', userName: 'Pema Choden', userInitials: 'PC', action: 'updated', entityType: 'Media', entityName: 'gangtey_hero.jpg', field: 'route_association', oldValue: 'null', newValue: 'Gangtey Trail', ipAddress: '192.168.1.55' },
  { id: 'A-015', timestamp: '2026-06-12 09:22:47', userName: 'Dechen Wangmo', userInitials: 'DW', action: 'updated', entityType: 'Route', entityName: 'Merak-Sakteng Trek', field: 'season', oldValue: 'null', newValue: 'Mar–May, Oct', ipAddress: '192.168.1.10' },
];

export const heritageSites: HeritageSite[] = [
  { id: 'H-001', name: 'Paro Taktsang (Tiger\'s Nest)', district: 'Paro', type: 'Monastery', elevation: 3120, accessibleFromTrail: true, builtYear: '1692', lat: 27.4928, lon: 89.3631 },
  { id: 'H-002', name: 'Punakha Dzong', district: 'Punakha', type: 'Dzong', elevation: 1250, accessibleFromTrail: true, builtYear: '1637', lat: 27.6093, lon: 89.8674 },
  { id: 'H-003', name: 'Tashichho Dzong', district: 'Thimphu', type: 'Dzong', elevation: 2350, accessibleFromTrail: false, builtYear: '1216', lat: 27.4770, lon: 89.6380 },
  { id: 'H-004', name: 'Gangtey Monastery', district: 'Wangdue Phodrang', type: 'Monastery', elevation: 3000, accessibleFromTrail: true, builtYear: '1613', lat: 27.4967, lon: 90.1620 },
  { id: 'H-005', name: 'Tamshing Lhakhang', district: 'Bumthang', type: 'Temple', elevation: 2600, accessibleFromTrail: true, builtYear: '1501', lat: 27.5497, lon: 90.7456 },
  { id: 'H-006', name: 'Kurje Lhakhang', district: 'Bumthang', type: 'Temple', elevation: 2620, accessibleFromTrail: true, builtYear: '1652', lat: 27.5536, lon: 90.7370 },
  { id: 'H-007', name: 'Chimi Lhakhang', district: 'Punakha', type: 'Temple', elevation: 1330, accessibleFromTrail: true, builtYear: '1499', lat: 27.5916, lon: 89.7861 },
  { id: 'H-008', name: 'Simtokha Dzong', district: 'Thimphu', type: 'Dzong', elevation: 2380, accessibleFromTrail: false, builtYear: '1629', lat: 27.4360, lon: 89.6720 },
  { id: 'H-009', name: 'Bodhnath Stupa', district: 'Bumthang', type: 'Stupa', elevation: 2630, accessibleFromTrail: true, builtYear: '8th century', lat: 27.5458, lon: 90.7213 },
  { id: 'H-010', name: 'Rinpung Dzong', district: 'Paro', type: 'Dzong', elevation: 2290, accessibleFromTrail: false, builtYear: '1644', lat: 27.4323, lon: 89.4115 },
];

export const conservationAreas: ConservationArea[] = [
  { id: 'CA-001', name: 'Jigme Dorji National Park', code: 'JDNP', areaKm2: 4316, established: 1974, mammals: 37, birds: 320 },
  { id: 'CA-002', name: 'Royal Manas National Park', code: 'RMNP', areaKm2: 1057, established: 1966, mammals: 46, birds: 365 },
  { id: 'CA-003', name: 'Black Mountains National Park', code: 'BMNP', areaKm2: 1400, established: 1993, mammals: 52, birds: 275 },
  { id: 'CA-004', name: 'Thrumshingla National Park', code: 'TNP', areaKm2: 768, established: 1993, mammals: 29, birds: 340 },
  { id: 'CA-005', name: 'Bumdeling Wildlife Sanctuary', code: 'BWS', areaKm2: 1520, established: 2003, mammals: 40, birds: 280 },
  { id: 'CA-006', name: 'Sakteng Wildlife Sanctuary', code: 'SWS', areaKm2: 741, established: 2003, mammals: 23, birds: 200 },
  { id: 'CA-007', name: 'Phibsoo Wildlife Sanctuary', code: 'PWS', areaKm2: 269, established: 1974, mammals: 30, birds: 195 },
  { id: 'CA-008', name: 'Khaling Wildlife Sanctuary', code: 'KWS', areaKm2: 273, established: 1974, mammals: 22, birds: 160 },
];

export const completenessData = [
  { field: 'difficulty', filled: 42, total: 64 },
  { field: 'duration_days', filled: 38, total: 64 },
  { field: 'season_open', filled: 35, total: 64 },
  { field: 'highlights', filled: 28, total: 64 },
  { field: 'description', filled: 38, total: 64 },
  { field: 'distance_km', filled: 64, total: 64 },
];
