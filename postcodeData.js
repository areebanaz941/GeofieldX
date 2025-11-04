// Dummy data for London postcodes
const postcodeData = {
    "SW1": {
        group: "SW",
        name: "Westminster",
        hasFullInfo: true,
        bounds: [[-0.1489, 51.4956], [-0.1289, 51.5056]],
        center: [-0.1389, 51.5006],
        description: "Westminster is the heart of London's political district, home to the Houses of Parliament, Big Ben, and Westminster Abbey. This prestigious area offers luxury living with easy access to government buildings and tourist attractions.",
        propertyCount: 1250,
        avgPrice: 1850000,
        amenities: ["Westminster Abbey", "Houses of Parliament", "St. James's Park", "Victoria Station", "Luxury shopping", "Fine dining"],
        transport: "Excellent transport links with Westminster, Victoria, and St. James's Park stations. Multiple bus routes and easy access to major roads."
    },
    "SW3": {
        group: "SW",
        name: "Chelsea",
        hasFullInfo: true,
        bounds: [[-0.1789, 51.4856], [-0.1589, 51.4956]],
        center: [-0.1689, 51.4906],
        description: "Chelsea is one of London's most exclusive areas, known for the King's Road, designer boutiques, and elegant Victorian architecture. Home to celebrities and affluent professionals.",
        propertyCount: 980,
        avgPrice: 2200000,
        amenities: ["King's Road", "Chelsea Physic Garden", "Saatchi Gallery", "Royal Hospital Chelsea", "Designer boutiques", "Michelin-starred restaurants"],
        transport: "Sloane Square station provides direct access to central London. Excellent bus connections along King's Road."
    },
    "SW7": {
        group: "SW",
        name: "South Kensington",
        hasFullInfo: false,
        bounds: [[-0.1889, 51.4956], [-0.1689, 51.5056]],
        center: [-0.1789, 51.5006],
        description: "Limited information available for this area.",
        propertyCount: null,
        avgPrice: null,
        amenities: [],
        transport: ""
    },
    "SE1": {
        group: "SE",
        name: "Southwark",
        hasFullInfo: true,
        bounds: [[-0.1089, 51.4956], [-0.0889, 51.5156]],
        center: [-0.0989, 51.5056],
        description: "Southwark combines historic charm with modern development. Home to Borough Market, Shakespeare's Globe Theatre, and stunning riverside views of the Thames.",
        propertyCount: 1680,
        avgPrice: 750000,
        amenities: ["Borough Market", "Shakespeare's Globe", "Tate Modern", "London Bridge", "The Shard", "Riverside walks"],
        transport: "London Bridge and Borough stations provide excellent connectivity. Multiple bus routes and river services available."
    },
    "SE10": {
        group: "SE",
        name: "Greenwich",
        hasFullInfo: true,
        bounds: [[-0.0189, 51.4756], [0.0011, 51.4856]],
        center: [-0.0089, 51.4806],
        description: "Greenwich offers maritime history, royal parks, and the famous Observatory. A UNESCO World Heritage site with excellent family amenities and river access.",
        propertyCount: 890,
        avgPrice: 520000,
        amenities: ["Royal Observatory", "National Maritime Museum", "Greenwich Park", "Cutty Sark", "Greenwich Market", "Thames Path"],
        transport: "Greenwich station with direct trains to central London. DLR connections and river boat services available."
    },
    "SE22": {
        group: "SE",
        name: "East Dulwich",
        hasFullInfo: false,
        bounds: [[-0.0689, 51.4556], [-0.0489, 51.4656]],
        center: [-0.0589, 51.4606],
        description: "Limited information available for this area.",
        propertyCount: null,
        avgPrice: null,
        amenities: [],
        transport: ""
    },
    "N1": {
        group: "N",
        name: "Islington",
        hasFullInfo: true,
        bounds: [[-0.1189, 51.5356], [-0.0989, 51.5456]],
        center: [-0.1089, 51.5406],
        description: "Islington is a vibrant area known for its excellent restaurants, independent shops, and Georgian architecture. Popular with young professionals and families.",
        propertyCount: 1420,
        avgPrice: 680000,
        amenities: ["Angel tube station", "Islington Green", "Camden Passage antiques", "Excellent restaurants", "Independent theaters", "Victorian squares"],
        transport: "Angel and Highbury & Islington stations provide excellent tube and rail connections. Numerous bus routes serve the area."
    },
    "N4": {
        group: "N",
        name: "Finsbury Park",
        hasFullInfo: false,
        bounds: [[-0.1289, 51.5556], [-0.1089, 51.5656]],
        center: [-0.1189, 51.5606],
        description: "Limited information available for this area.",
        propertyCount: null,
        avgPrice: null,
        amenities: [],
        transport: ""
    },
    "N16": {
        group: "N",
        name: "Stoke Newington",
        hasFullInfo: true,
        bounds: [[-0.0889, 51.5556], [-0.0689, 51.5656]],
        center: [-0.0789, 51.5606],
        description: "Stoke Newington is known for its village-like atmosphere, independent cafes, and strong community spirit. Popular with creative professionals and families.",
        propertyCount: 760,
        avgPrice: 580000,
        amenities: ["Clissold Park", "Church Street shops", "Independent cafes", "Abney Park Cemetery", "Community gardens", "Local markets"],
        transport: "Stoke Newington rail station and multiple bus routes. Easy access to central London and Hackney."
    },
    "W1": {
        group: "W",
        name: "West End",
        hasFullInfo: true,
        bounds: [[-0.1589, 51.5056], [-0.1389, 51.5156]],
        center: [-0.1489, 51.5106],
        description: "The West End is London's entertainment and shopping district, featuring world-class theaters, Oxford Street shopping, and Soho's vibrant nightlife.",
        propertyCount: 890,
        avgPrice: 1650000,
        amenities: ["Oxford Street", "West End theaters", "Soho nightlife", "Regent Street", "Covent Garden", "British Museum"],
        transport: "Multiple tube stations including Oxford Circus, Tottenham Court Road, and Leicester Square. Excellent bus connectivity."
    },
    "W8": {
        group: "W",
        name: "Kensington",
        hasFullInfo: false,
        bounds: [[-0.1989, 51.4956], [-0.1789, 51.5056]],
        center: [-0.1889, 51.5006],
        description: "Limited information available for this area.",
        propertyCount: null,
        avgPrice: null,
        amenities: [],
        transport: ""
    },
    "W11": {
        group: "W",
        name: "Notting Hill",
        hasFullInfo: true,
        bounds: [[-0.2189, 51.5056], [-0.1989, 51.5156]],
        center: [-0.2089, 51.5106],
        description: "Notting Hill is famous for its colorful houses, Portobello Road Market, and the annual Carnival. A trendy area with excellent restaurants and boutique shopping.",
        propertyCount: 1120,
        avgPrice: 1450000,
        amenities: ["Portobello Road Market", "Notting Hill Carnival", "Hyde Park", "Westfield Shopping Center", "Independent cinemas", "Trendy restaurants"],
        transport: "Notting Hill Gate and Ladbroke Grove stations. Excellent bus links and proximity to major roads."
    }
};

// Color scheme for different postcode groups
const colorScheme = {
    SW: {
        full: '#e74c3c',    // Red for Southwest with full info
        limited: '#f1948a'  // Light red for Southwest with limited info
    },
    SE: {
        full: '#3498db',    // Blue for Southeast with full info
        limited: '#85c1e9'  // Light blue for Southeast with limited info
    },
    N: {
        full: '#2ecc71',    // Green for North with full info
        limited: '#82e0aa'  // Light green for North with limited info
    },
    W: {
        full: '#f39c12',    // Orange for West with full info
        limited: '#f8c471'  // Light orange for West with limited info
    }
};

// Function to get color for a postcode
function getPostcodeColor(postcode) {
    const data = postcodeData[postcode];
    if (!data) return '#95a5a6'; // Gray for unknown postcodes
    
    const group = data.group;
    const hasFullInfo = data.hasFullInfo;
    
    return hasFullInfo ? colorScheme[group].full : colorScheme[group].limited;
}