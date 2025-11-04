// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2FsaWJlMjAiLCJhIjoiY2x5bXZtZDkxMDF6NjJqc2RwcDYwdzBsOCJ9.sM2piYvs-KRuVtcvNflmvQ';

// Initialize map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-0.1276, 51.5074], // London center
    zoom: 10
});

let selectedPostcode = null;

// Initialize app when map loads
map.on('load', function() {
    console.log('Map loaded, adding postcode areas...');
    addPostcodeAreas();
    setupEventListeners();
});

// Add postcode areas to the map
function addPostcodeAreas() {
    Object.keys(postcodeData).forEach(postcode => {
        const data = postcodeData[postcode];
        const color = getPostcodeColor(postcode);
        
        // Create a rectangle for each postcode area
        const bounds = data.bounds;
        const coordinates = [
            [
                [bounds[0][0], bounds[0][1]], // bottom-left
                [bounds[1][0], bounds[0][1]], // bottom-right
                [bounds[1][0], bounds[1][1]], // top-right
                [bounds[0][0], bounds[1][1]], // top-left
                [bounds[0][0], bounds[0][1]]  // close the polygon
            ]
        ];

        // Add source for this postcode
        map.addSource(postcode, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': coordinates
                },
                'properties': {
                    'postcode': postcode,
                    'name': data.name,
                    'group': data.group,
                    'hasFullInfo': data.hasFullInfo
                }
            }
        });

        // Add fill layer
        map.addLayer({
            'id': postcode + '-fill',
            'type': 'fill',
            'source': postcode,
            'paint': {
                'fill-color': color,
                'fill-opacity': 0.7
            }
        });

        // Add border layer
        map.addLayer({
            'id': postcode + '-border',
            'type': 'line',
            'source': postcode,
            'paint': {
                'line-color': '#ffffff',
                'line-width': 2
            }
        });

        // Add label
        map.addLayer({
            'id': postcode + '-label',
            'type': 'symbol',
            'source': postcode,
            'layout': {
                'text-field': postcode,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 14,
                'text-anchor': 'center'
            },
            'paint': {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1
            }
        });

        // Add click event for fill layer
        map.on('click', postcode + '-fill', function(e) {
            selectPostcode(postcode);
        });

        // Add hover effects
        map.on('mouseenter', postcode + '-fill', function() {
            map.getCanvas().style.cursor = 'pointer';
            map.setPaintProperty(postcode + '-fill', 'fill-opacity', 0.9);
        });

        map.on('mouseleave', postcode + '-fill', function() {
            map.getCanvas().style.cursor = '';
            map.setPaintProperty(postcode + '-fill', 'fill-opacity', 0.7);
        });
    });
}

// Select and display postcode information
function selectPostcode(postcode) {
    selectedPostcode = postcode;
    const data = postcodeData[postcode];
    const infoPanel = document.getElementById('info-panel');
    
    if (data.hasFullInfo) {
        infoPanel.innerHTML = `
            <div class="info-content">
                <h2>${postcode} - ${data.name}</h2>
                <p>${data.description}</p>
                
                <div class="info-stats">
                    <div class="stat-item">
                        <div class="stat-label">Properties</div>
                        <div class="stat-value">${data.propertyCount?.toLocaleString() || 'N/A'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Avg Price</div>
                        <div class="stat-value">£${data.avgPrice?.toLocaleString() || 'N/A'}</div>
                    </div>
                </div>
                
                <h3>Key Amenities</h3>
                <div class="amenities-list">
                    <ul>
                        ${data.amenities.map(amenity => `<li>${amenity}</li>`).join('')}
                    </ul>
                </div>
                
                <h3>Transport Links</h3>
                <div class="transport-info">
                    <p>${data.transport}</p>
                </div>
                
                <button class="edit-button" onclick="openEditModal('${postcode}')">
                    Edit Information
                </button>
            </div>
        `;
    } else {
        infoPanel.innerHTML = `
            <div class="info-content">
                <h2>${postcode} - ${data.name}</h2>
                <div class="limited-info">
                    <h3>Limited Information Available</h3>
                    <p>This postcode area has limited information. Click edit to add more details.</p>
                    <button class="edit-button" onclick="openEditModal('${postcode}')">
                        Add Information
                    </button>
                </div>
            </div>
        `;
    }

    // Fly to the selected postcode
    map.flyTo({
        center: data.center,
        zoom: 12,
        duration: 1000
    });
}

// Open edit modal
function openEditModal(postcode) {
    const data = postcodeData[postcode];
    const modal = document.getElementById('edit-modal');
    
    // Populate form with current data
    document.getElementById('edit-postcode').value = postcode;
    document.getElementById('edit-description').value = data.description;
    document.getElementById('edit-property-count').value = data.propertyCount || '';
    document.getElementById('edit-avg-price').value = data.avgPrice || '';
    document.getElementById('edit-amenities').value = data.amenities.join(', ');
    document.getElementById('edit-transport').value = data.transport;
    
    modal.style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Save edited information
function savePostcodeInfo(postcode, formData) {
    const data = postcodeData[postcode];
    
    // Update data
    data.description = formData.description;
    data.propertyCount = formData.propertyCount ? parseInt(formData.propertyCount) : null;
    data.avgPrice = formData.avgPrice ? parseInt(formData.avgPrice) : null;
    data.amenities = formData.amenities ? formData.amenities.split(',').map(a => a.trim()).filter(a => a) : [];
    data.transport = formData.transport;
    
    // Update hasFullInfo status based on whether we have substantial information
    data.hasFullInfo = !!(data.description && data.description !== "Limited information available for this area." && 
                         (data.propertyCount || data.avgPrice || data.amenities.length > 0 || data.transport));
    
    // Update map colors
    const newColor = getPostcodeColor(postcode);
    map.setPaintProperty(postcode + '-fill', 'fill-color', newColor);
    
    // Refresh the info panel
    selectPostcode(postcode);
    
    // Close modal
    closeEditModal();
    
    console.log(`Updated ${postcode} information`, data);
}

// Setup event listeners
function setupEventListeners() {
    // Modal close button
    document.querySelector('.close').addEventListener('click', closeEditModal);
    
    // Cancel edit button
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('edit-modal');
        if (event.target === modal) {
            closeEditModal();
        }
    });
    
    // Edit form submission
    document.getElementById('edit-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            description: document.getElementById('edit-description').value,
            propertyCount: document.getElementById('edit-property-count').value,
            avgPrice: document.getElementById('edit-avg-price').value,
            amenities: document.getElementById('edit-amenities').value,
            transport: document.getElementById('edit-transport').value
        };
        
        const postcode = document.getElementById('edit-postcode').value;
        savePostcodeInfo(postcode, formData);
    });
}

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

// Add fullscreen control
map.addControl(new mapboxgl.FullscreenControl());

// Error handling for map
map.on('error', function(e) {
    console.error('Map error:', e);
    document.getElementById('map').innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;">Error loading map. Please check your internet connection and try again.</div>';
});

// Add some sample popup functionality
map.on('click', function(e) {
    // Check if we clicked on a postcode area
    const features = map.queryRenderedFeatures(e.point);
    const postcodeFeature = features.find(f => f.layer.id.includes('-fill'));
    
    if (!postcodeFeature) {
        // Clicked on empty area, show general info popup
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="text-align: center;">
                    <h4>London Postcode Map</h4>
                    <p>Click on a colored area to view postcode information</p>
                </div>
            `)
            .addTo(map);
    }
});

// Initialize the application
console.log('London Postcode Map initialized');
console.log('Available postcodes:', Object.keys(postcodeData));