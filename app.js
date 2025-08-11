// Mapbox access token (using a demo token - replace with your own)
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

class LondonPostcodeMap {
    constructor() {
        this.map = null;
        this.editMode = false;
        this.currentPostcode = null;
        this.init();
    }

    init() {
        this.initMap();
        this.setupEventListeners();
        this.addPostcodeAreas();
    }

    initMap() {
        // Initialize the map centered on London
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/light-v11',
            center: [-0.1276, 51.5074], // London coordinates
            zoom: 10,
            pitch: 0,
            bearing: 0
        });

        this.map.on('load', () => {
            this.addPostcodeAreas();
        });

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    addPostcodeAreas() {
        // Create GeoJSON features for each postcode area
        const features = Object.keys(POSTCODE_DATA).map(postcode => {
            const data = POSTCODE_DATA[postcode];
            return {
                type: 'Feature',
                properties: {
                    postcode: postcode,
                    name: data.name,
                    hasInfo: data.hasDetailedInfo
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [data.coordinates]
                }
            };
        });

        const geojsonData = {
            type: 'FeatureCollection',
            features: features
        };

        // Add source
        this.map.addSource('postcodes', {
            type: 'geojson',
            data: geojsonData
        });

        // Add fill layer
        this.map.addLayer({
            id: 'postcode-fills',
            type: 'fill',
            source: 'postcodes',
            paint: {
                'fill-color': [
                    'case',
                    ['get', 'hasInfo'],
                    [
                        'match',
                        ['substr', ['get', 'postcode'], 0, 2],
                        'SW', 'rgba(231, 76, 60, 0.8)',
                        'SE', 'rgba(52, 152, 219, 0.8)',
                        'NW', 'rgba(46, 204, 113, 0.8)',
                        'NE', 'rgba(243, 156, 18, 0.8)',
                        'E', 'rgba(26, 188, 156, 0.8)',
                        'N', 'rgba(230, 126, 34, 0.8)',
                        'W', 'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 73, 94, 0.8)' // WC/EC
                    ],
                    [
                        'match',
                        ['substr', ['get', 'postcode'], 0, 2],
                        'SW', 'rgba(231, 76, 60, 0.4)',
                        'SE', 'rgba(52, 152, 219, 0.4)',
                        'NW', 'rgba(46, 204, 113, 0.4)',
                        'NE', 'rgba(243, 156, 18, 0.4)',
                        'E', 'rgba(26, 188, 156, 0.4)',
                        'N', 'rgba(230, 126, 34, 0.4)',
                        'W', 'rgba(155, 89, 182, 0.4)',
                        'rgba(52, 73, 94, 0.4)' // WC/EC
                    ]
                ],
                'fill-opacity': 1
            }
        });

        // Add border layer
        this.map.addLayer({
            id: 'postcode-borders',
            type: 'line',
            source: 'postcodes',
            paint: {
                'line-color': [
                    'match',
                    ['substr', ['get', 'postcode'], 0, 2],
                    'SW', '#e74c3c',
                    'SE', '#3498db',
                    'NW', '#2ecc71',
                    'NE', '#f39c12',
                    'E', '#1abc9c',
                    'N', '#e67e22',
                    'W', '#9b59b6',
                    '#34495e' // WC/EC
                ],
                'line-width': 2,
                'line-opacity': 1
            }
        });

        // Add hover effect
        this.map.on('mouseenter', 'postcode-fills', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            
            // Highlight on hover
            this.map.setPaintProperty('postcode-fills', 'fill-opacity', [
                'case',
                ['==', ['get', 'postcode'], e.features[0].properties.postcode],
                1,
                0.7
            ]);
        });

        this.map.on('mouseleave', 'postcode-fills', () => {
            this.map.getCanvas().style.cursor = '';
            this.map.setPaintProperty('postcode-fills', 'fill-opacity', 1);
        });

        // Add click handler
        this.map.on('click', 'postcode-fills', (e) => {
            const postcode = e.features[0].properties.postcode;
            this.showPostcodeInfo(postcode);
        });

        // Add labels
        this.map.addLayer({
            id: 'postcode-labels',
            type: 'symbol',
            source: 'postcodes',
            layout: {
                'text-field': ['get', 'postcode'],
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-size': 14,
                'text-anchor': 'center'
            },
            paint: {
                'text-color': '#2c3e50',
                'text-halo-color': 'rgba(255, 255, 255, 0.8)',
                'text-halo-width': 2
            }
        });
    }

    showPostcodeInfo(postcode) {
        const data = POSTCODE_DATA[postcode];
        if (!data) return;

        this.currentPostcode = postcode;
        const sidebar = document.getElementById('sidebar');
        const sidebarContent = document.getElementById('sidebar-content');

        // Create content based on whether area has detailed info
        let content = `
            <div class="postcode-info">
                <h3>${data.name}</h3>
        `;

        if (data.hasDetailedInfo) {
            content += `
                <div class="info-section">
                    <h4><i class="fas fa-info-circle"></i> Description</h4>
                    <p>${data.description}</p>
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-star"></i> Key Features</h4>
                    <ul class="features-list">
                        ${data.features.map(feature => `
                            <li><i class="fas fa-check"></i> ${feature}</li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="price-tag">
                    <i class="fas fa-pound-sign"></i> Average Price: ${data.averagePrice}
                </div>
            `;
        } else {
            content += `
                <div class="no-info-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Limited Information Available</strong>
                    <p>This postcode area currently has limited detailed information. Please check back later for updates.</p>
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Basic Information</h4>
                    <p>${data.description || 'General information about this area.'}</p>
                </div>
            `;
        }

        content += `
                <button class="btn btn-primary edit-btn" onclick="app.openEditModal('${postcode}')">
                    <i class="fas fa-edit"></i> Edit Information
                </button>
            </div>
        `;

        sidebarContent.innerHTML = content;
        sidebar.classList.add('open');

        // Zoom to the postcode area
        const coordinates = data.coordinates;
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 50, maxZoom: 13 });
    }

    openEditModal(postcode) {
        const data = POSTCODE_DATA[postcode];
        const modal = document.getElementById('edit-modal');
        
        // Populate form
        document.getElementById('postcode-name').value = data.name;
        document.getElementById('area-description').value = data.description || '';
        document.getElementById('key-features').value = data.features ? data.features.join('\n') : '';
        document.getElementById('average-price').value = data.averagePrice || '';
        document.getElementById('has-info').checked = data.hasDetailedInfo;
        
        modal.classList.add('open');
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('open');
    }

    savePostcodeChanges() {
        const postcode = this.currentPostcode;
        if (!postcode) return;

        // Get form values
        const description = document.getElementById('area-description').value;
        const features = document.getElementById('key-features').value.split('\n').filter(f => f.trim());
        const averagePrice = document.getElementById('average-price').value;
        const hasInfo = document.getElementById('has-info').checked;

        // Update data
        POSTCODE_DATA[postcode] = {
            ...POSTCODE_DATA[postcode],
            description: description,
            features: features,
            averagePrice: averagePrice,
            hasDetailedInfo: hasInfo
        };

        // Update map colors
        this.updateMapColors();
        
        // Refresh sidebar
        this.showPostcodeInfo(postcode);
        
        // Close modal
        this.closeEditModal();
        
        // Show success message
        this.showNotification('Postcode information updated successfully!', 'success');
    }

    updateMapColors() {
        // Remove existing layers
        if (this.map.getLayer('postcode-fills')) {
            this.map.removeLayer('postcode-fills');
        }
        if (this.map.getLayer('postcode-borders')) {
            this.map.removeLayer('postcode-borders');
        }

        // Re-add layers with updated data
        setTimeout(() => {
            this.map.addLayer({
                id: 'postcode-fills',
                type: 'fill',
                source: 'postcodes',
                paint: {
                    'fill-color': [
                        'case',
                        ['get', 'hasInfo'],
                        [
                            'match',
                            ['substr', ['get', 'postcode'], 0, 2],
                            'SW', 'rgba(231, 76, 60, 0.8)',
                            'SE', 'rgba(52, 152, 219, 0.8)',
                            'NW', 'rgba(46, 204, 113, 0.8)',
                            'NE', 'rgba(243, 156, 18, 0.8)',
                            'E', 'rgba(26, 188, 156, 0.8)',
                            'N', 'rgba(230, 126, 34, 0.8)',
                            'W', 'rgba(155, 89, 182, 0.8)',
                            'rgba(52, 73, 94, 0.8)' // WC/EC
                        ],
                        [
                            'match',
                            ['substr', ['get', 'postcode'], 0, 2],
                            'SW', 'rgba(231, 76, 60, 0.4)',
                            'SE', 'rgba(52, 152, 219, 0.4)',
                            'NW', 'rgba(46, 204, 113, 0.4)',
                            'NE', 'rgba(243, 156, 18, 0.4)',
                            'E', 'rgba(26, 188, 156, 0.4)',
                            'N', 'rgba(230, 126, 34, 0.4)',
                            'W', 'rgba(155, 89, 182, 0.4)',
                            'rgba(52, 73, 94, 0.4)' // WC/EC
                        ]
                    ],
                    'fill-opacity': 1
                }
            });

            this.map.addLayer({
                id: 'postcode-borders',
                type: 'line',
                source: 'postcodes',
                paint: {
                    'line-color': [
                        'match',
                        ['substr', ['get', 'postcode'], 0, 2],
                        'SW', '#e74c3c',
                        'SE', '#3498db',
                        'NW', '#2ecc71',
                        'NE', '#f39c12',
                        'E', '#1abc9c',
                        'N', '#e67e22',
                        'W', '#9b59b6',
                        '#34495e' // WC/EC
                    ],
                    'line-width': 2,
                    'line-opacity': 1
                }
            });

            // Re-add event handlers
            this.setupMapEventHandlers();
        }, 100);
    }

    setupMapEventHandlers() {
        // Add hover effect
        this.map.on('mouseenter', 'postcode-fills', (e) => {
            this.map.getCanvas().style.cursor = 'pointer';
            
            // Highlight on hover
            this.map.setPaintProperty('postcode-fills', 'fill-opacity', [
                'case',
                ['==', ['get', 'postcode'], e.features[0].properties.postcode],
                1,
                0.7
            ]);
        });

        this.map.on('mouseleave', 'postcode-fills', () => {
            this.map.getCanvas().style.cursor = '';
            this.map.setPaintProperty('postcode-fills', 'fill-opacity', 1);
        });

        // Add click handler
        this.map.on('click', 'postcode-fills', (e) => {
            const postcode = e.features[0].properties.postcode;
            this.showPostcodeInfo(postcode);
        });
    }

    setupEventListeners() {
        // Edit mode toggle
        document.getElementById('edit-mode-btn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // Legend toggle
        document.getElementById('legend-toggle').addEventListener('click', () => {
            document.getElementById('legend').classList.toggle('open');
        });

        // Sidebar close
        document.getElementById('close-sidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });

        // Modal handlers
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePostcodeChanges();
        });

        // Close modal when clicking outside
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                this.closeEditModal();
            }
        });

        // Close sidebar when clicking on map
        this.map.on('click', (e) => {
            // Only close if not clicking on a postcode area
            const features = this.map.queryRenderedFeatures(e.point, {
                layers: ['postcode-fills']
            });
            
            if (features.length === 0) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        const btn = document.getElementById('edit-mode-btn');
        const body = document.body;
        
        if (this.editMode) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-save"></i> Exit Edit Mode';
            body.classList.add('edit-mode');
            this.showNotification('Edit mode enabled. Click on postcode areas to edit their information.', 'info');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-edit"></i> Edit Mode';
            body.classList.remove('edit-mode');
            this.showNotification('Edit mode disabled.', 'info');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        // Add to body
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Method to add new postcode area (for future expansion)
    addNewPostcodeArea(postcode, coordinates, info) {
        POSTCODE_DATA[postcode] = {
            name: info.name,
            description: info.description,
            features: info.features || [],
            averagePrice: info.averagePrice,
            hasDetailedInfo: info.hasDetailedInfo,
            coordinates: coordinates
        };

        // Update map
        this.updateMapData();
    }

    updateMapData() {
        const features = Object.keys(POSTCODE_DATA).map(postcode => {
            const data = POSTCODE_DATA[postcode];
            return {
                type: 'Feature',
                properties: {
                    postcode: postcode,
                    name: data.name,
                    hasInfo: data.hasDetailedInfo
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [data.coordinates]
                }
            };
        });

        const geojsonData = {
            type: 'FeatureCollection',
            features: features
        };

        this.map.getSource('postcodes').setData(geojsonData);
    }
}

// Add notification styles dynamically
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transform: translateX(120%);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.notification.show {
    transform: translateX(0);
}

.notification-success {
    border-left: 4px solid #2ecc71;
    color: #27ae60;
}

.notification-error {
    border-left: 4px solid #e74c3c;
    color: #c0392b;
}

.notification-info {
    border-left: 4px solid #3498db;
    color: #2980b9;
}
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LondonPostcodeMap();
});

// Global functions for HTML event handlers
function openEditModal(postcode) {
    app.openEditModal(postcode);
}

function closeEditModal() {
    app.closeEditModal();
}

function savePostcodeChanges() {
    app.savePostcodeChanges();
}