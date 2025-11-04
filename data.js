// London Postcode Areas Data
const POSTCODE_DATA = {
    'SW1': {
        name: 'SW1 - Westminster/Belgravia',
        description: 'Prime central London location featuring Westminster, Belgravia, and Pimlico. Home to Buckingham Palace, Westminster Abbey, and the Houses of Parliament.',
        features: [
            'Buckingham Palace nearby',
            'Excellent transport links',
            'Historic architecture',
            'High-end shopping at Victoria',
            'Green spaces including St. James\'s Park'
        ],
        averagePrice: '£1,200,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1419, 51.4945], [-0.1419, 51.5045], [-0.1219, 51.5045], [-0.1219, 51.4945], [-0.1419, 51.4945]]
    },
    'SW3': {
        name: 'SW3 - Chelsea',
        description: 'Affluent area known for the King\'s Road, Chelsea FC, and high-end boutiques. Popular with celebrities and professionals.',
        features: [
            'King\'s Road shopping',
            'Chelsea FC stadium',
            'Riverside location',
            'Michelin-starred restaurants',
            'Designer boutiques'
        ],
        averagePrice: '£1,500,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1819, 51.4845], [-0.1819, 51.4945], [-0.1519, 51.4945], [-0.1519, 51.4845], [-0.1819, 51.4845]]
    },
    'SW7': {
        name: 'SW7 - South Kensington',
        description: 'Cultural heart of London with world-class museums, Imperial College, and elegant Victorian architecture.',
        features: [
            'Natural History Museum',
            'Victoria & Albert Museum',
            'Imperial College London',
            'Hyde Park access',
            'Excellent restaurants'
        ],
        averagePrice: '£950,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1919, 51.4945], [-0.1919, 51.5045], [-0.1719, 51.5045], [-0.1719, 51.4945], [-0.1919, 51.4945]]
    },
    'SW11': {
        name: 'SW11 - Battersea',
        description: 'Rapidly developing area with new luxury developments, Battersea Power Station, and excellent riverside walks.',
        features: [
            'Battersea Power Station',
            'New developments',
            'Riverside walks',
            'Good transport links',
            'Family-friendly parks'
        ],
        averagePrice: '£650,000',
        hasDetailedInfo: false, // Limited information - will show lighter shade
        coordinates: [[-0.1719, 51.4645], [-0.1719, 51.4845], [-0.1419, 51.4845], [-0.1419, 51.4645], [-0.1719, 51.4645]]
    },
    'SE1': {
        name: 'SE1 - Southwark/Borough',
        description: 'Dynamic area featuring London Bridge, Borough Market, and the South Bank cultural quarter.',
        features: [
            'Borough Market',
            'London Bridge station',
            'South Bank attractions',
            'The Shard nearby',
            'Riverside dining'
        ],
        averagePrice: '£750,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1119, 51.4945], [-0.1119, 51.5145], [-0.0819, 51.5145], [-0.0819, 51.4945], [-0.1119, 51.4945]]
    },
    'SE10': {
        name: 'SE10 - Greenwich',
        description: 'Historic maritime district with the Royal Observatory, Cutty Sark, and beautiful riverside views.',
        features: [
            'Royal Observatory',
            'Cutty Sark',
            'Greenwich Park',
            'Maritime Museum',
            'University of Greenwich'
        ],
        averagePrice: '£520,000',
        hasDetailedInfo: false, // Limited information
        coordinates: [[-0.0219, 51.4745], [-0.0219, 51.4945], [0.0181, 51.4945], [0.0181, 51.4745], [-0.0219, 51.4745]]
    },
    'NW1': {
        name: 'NW1 - Camden/Regent\'s Park',
        description: 'Vibrant area combining the elegance of Regent\'s Park with the eclectic energy of Camden Market.',
        features: [
            'Camden Market',
            'Regent\'s Park',
            'London Zoo',
            'Alternative music scene',
            'Excellent nightlife'
        ],
        averagePrice: '£800,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1619, 51.5345], [-0.1619, 51.5545], [-0.1319, 51.5545], [-0.1319, 51.5345], [-0.1619, 51.5345]]
    },
    'NW3': {
        name: 'NW3 - Hampstead',
        description: 'Prestigious village-like area with Hampstead Heath, historic pubs, and stunning city views.',
        features: [
            'Hampstead Heath',
            'Village atmosphere',
            'Historic pubs',
            'Excellent schools',
            'Celebrity residents'
        ],
        averagePrice: '£1,100,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1819, 51.5545], [-0.1819, 51.5745], [-0.1519, 51.5745], [-0.1519, 51.5545], [-0.1819, 51.5545]]
    },
    'NW8': {
        name: 'NW8 - St. John\'s Wood',
        description: 'Upmarket residential area near Regent\'s Park, famous for Lord\'s Cricket Ground and tree-lined streets.',
        features: [
            'Lord\'s Cricket Ground',
            'Tree-lined streets',
            'Regent\'s Park nearby',
            'Excellent transport',
            'Quiet residential feel'
        ],
        averagePrice: '£850,000',
        hasDetailedInfo: false, // Limited information
        coordinates: [[-0.1819, 51.5245], [-0.1819, 51.5345], [-0.1619, 51.5345], [-0.1619, 51.5245], [-0.1819, 51.5245]]
    },
    'E1': {
        name: 'E1 - Whitechapel/Spitalfields',
        description: 'Historic East End area undergoing regeneration, with excellent curry houses and proximity to the City.',
        features: [
            'Spitalfields Market',
            'Brick Lane curry houses',
            'Close to the City',
            'Rich history',
            'Affordable options'
        ],
        averagePrice: '£550,000',
        hasDetailedInfo: true,
        coordinates: [[-0.0719, 51.5145], [-0.0719, 51.5245], [-0.0519, 51.5245], [-0.0519, 51.5145], [-0.0719, 51.5145]]
    },
    'E14': {
        name: 'E14 - Canary Wharf',
        description: 'Modern financial district with skyscrapers, excellent transport, and waterside developments.',
        features: [
            'Financial district',
            'Modern skyscrapers',
            'Canary Wharf shopping',
            'Waterside living',
            'Excellent transport'
        ],
        averagePrice: '£720,000',
        hasDetailedInfo: true,
        coordinates: [[-0.0219, 51.4945], [-0.0219, 51.5145], [0.0181, 51.5145], [0.0181, 51.4945], [-0.0219, 51.4945]]
    },
    'W1': {
        name: 'W1 - Mayfair/Marylebone',
        description: 'Ultra-premium central London featuring Mayfair\'s luxury shopping and Marylebone\'s village charm.',
        features: [
            'Bond Street shopping',
            'Michelin-starred dining',
            'Private members\' clubs',
            'Hyde Park access',
            'World-class hotels'
        ],
        averagePrice: '£1,800,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1619, 51.5045], [-0.1619, 51.5245], [-0.1319, 51.5245], [-0.1319, 51.5045], [-0.1619, 51.5045]]
    },
    'W8': {
        name: 'W8 - Kensington',
        description: 'Elegant residential area with Kensington Palace, Hyde Park, and high-end shopping at Kensington High Street.',
        features: [
            'Kensington Palace',
            'Hyde Park',
            'High Street shopping',
            'Museums nearby',
            'Garden squares'
        ],
        averagePrice: '£1,050,000',
        hasDetailedInfo: false, // Limited information
        coordinates: [[-0.2019, 51.4945], [-0.2019, 51.5145], [-0.1719, 51.5145], [-0.1719, 51.4945], [-0.2019, 51.4945]]
    },
    'N1': {
        name: 'N1 - Islington',
        description: 'Trendy area with excellent restaurants, antique markets, and a thriving arts scene.',
        features: [
            'Angel tube station',
            'Antique markets',
            'Excellent restaurants',
            'Arts scene',
            'Georgian architecture'
        ],
        averagePrice: '£680,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1119, 51.5345], [-0.1119, 51.5545], [-0.0819, 51.5545], [-0.0819, 51.5345], [-0.1119, 51.5345]]
    },
    'WC1': {
        name: 'WC1 - Bloomsbury',
        description: 'Academic quarter home to UCL, British Museum, and beautiful Georgian squares.',
        features: [
            'British Museum',
            'University College London',
            'Georgian squares',
            'Publishing houses',
            'Literary history'
        ],
        averagePrice: '£850,000',
        hasDetailedInfo: true,
        coordinates: [[-0.1319, 51.5145], [-0.1319, 51.5345], [-0.1119, 51.5345], [-0.1119, 51.5145], [-0.1319, 51.5145]]
    },
    'EC1': {
        name: 'EC1 - Clerkenwell',
        description: 'Historic area transformed into a hub for design agencies, gastropubs, and loft living.',
        features: [
            'Design agencies',
            'Historic architecture',
            'Gastropubs',
            'Loft conversions',
            'Close to the City'
        ],
        averagePrice: '£720,000',
        hasDetailedInfo: false, // Limited information
        coordinates: [[-0.1119, 51.5145], [-0.1119, 51.5245], [-0.0919, 51.5245], [-0.0919, 51.5145], [-0.1119, 51.5145]]
    }
};

// Color scheme for postcode areas
const POSTCODE_COLORS = {
    'SW': '#e74c3c',    // Red
    'SE': '#3498db',    // Blue
    'NW': '#2ecc71',    // Green
    'NE': '#f39c12',    // Orange
    'W': '#9b59b6',     // Purple
    'E': '#1abc9c',     // Teal
    'N': '#e67e22',     // Dark Orange
    'WC': '#34495e',    // Dark Blue-Grey
    'EC': '#34495e'     // Dark Blue-Grey
};

// Function to get postcode group from full postcode
function getPostcodeGroup(postcode) {
    if (postcode.startsWith('SW')) return 'SW';
    if (postcode.startsWith('SE')) return 'SE';
    if (postcode.startsWith('NW')) return 'NW';
    if (postcode.startsWith('NE')) return 'NE';
    if (postcode.startsWith('W')) return 'W';
    if (postcode.startsWith('E')) return 'E';
    if (postcode.startsWith('N')) return 'N';
    if (postcode.startsWith('WC')) return 'WC';
    if (postcode.startsWith('EC')) return 'EC';
    return 'OTHER';
}

// Function to get color for postcode with opacity based on info availability
function getPostcodeColor(postcode, hasInfo = true) {
    const group = getPostcodeGroup(postcode);
    const baseColor = POSTCODE_COLORS[group] || '#95a5a6';
    
    // Convert hex to RGB and apply opacity
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Use lower opacity for areas with limited information
    const opacity = hasInfo ? 0.8 : 0.4;
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Function to get border color (always full opacity)
function getPostcodeBorderColor(postcode) {
    const group = getPostcodeGroup(postcode);
    return POSTCODE_COLORS[group] || '#95a5a6';
}