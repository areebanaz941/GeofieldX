# London Postcode Map - Interactive Explorer

An interactive web application featuring a clickable map of London postcode areas with detailed information, editing capabilities, and modern UI design.

## 🚀 Features

### Interactive Map
- **Clickable Postcode Areas**: Click on any postcode area to view detailed information
- **Color-Coded Regions**: Different colors for each postcode group (SW, SE, NW, NE, W, E, N, WC/EC)
- **Visual Information Indicator**: Lighter shades for areas with limited information
- **Hover Effects**: Interactive hover states with highlighting
- **Zoom to Area**: Automatically zooms to selected postcode area

### Information Management
- **Detailed Postcode Pages**: Rich information display for each area
- **Edit Capabilities**: Full editing functionality for all postcode information
- **Dynamic Content**: Real-time updates when information is modified
- **Information Status**: Clear indication of areas with complete vs. limited information

### User Interface
- **Modern Design**: Clean, professional interface with gradient backgrounds
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Sliding Sidebar**: Smooth animations for information display
- **Toggle Legend**: Show/hide color-coded legend
- **Edit Mode**: Special mode for content editing
- **Notifications**: User feedback for actions

## 🛠️ Setup Instructions

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Mapbox tiles and external libraries)

### Installation
1. **Clone or download** the project files to your local machine
2. **Get a Mapbox Access Token**:
   - Visit [Mapbox](https://www.mapbox.com/)
   - Create a free account
   - Generate an access token
   - Replace the demo token in `app.js` with your token:
   ```javascript
   mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN_HERE';
   ```

3. **Serve the files**:
   - **Option 1**: Use a local web server (recommended)
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js
     npx serve .
     
     # Using PHP
     php -S localhost:8000
     ```
   - **Option 2**: Open `index.html` directly in your browser (may have CORS limitations)

4. **Access the application**:
   - Open your browser and go to `http://localhost:8000`

## 📁 Project Structure

```
london-postcode-map/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── app.js             # Main JavaScript application logic
├── data.js            # Postcode data and color schemes
└── README.md          # This file
```

## 🎯 Usage Guide

### Viewing Postcode Information
1. **Click** on any colored postcode area on the map
2. The **sidebar** will slide in from the right showing detailed information
3. Areas with **full opacity** have complete information
4. Areas with **lighter shades** have limited information
5. **Close** the sidebar by clicking the X button or clicking elsewhere on the map

### Using the Legend
1. **Click** the "Legend" button in the header
2. The legend shows color coding for all postcode groups
3. **Click** the button again to hide the legend

### Editing Postcode Information
1. **Enable Edit Mode**: Click the "Edit Mode" button in the header
2. **Select Area**: Click on any postcode area to view its information
3. **Edit**: Click the "Edit Information" button in the sidebar
4. **Modify**: Update description, features, price, and information status
5. **Save**: Click "Save Changes" to apply updates
6. **Exit**: Click "Exit Edit Mode" when finished

### Mobile Usage
- The application is fully responsive
- On mobile devices, the sidebar takes full width
- Touch interactions work for all map functions
- Legend becomes a fixed overlay on smaller screens

## 🎨 Customization

### Adding New Postcode Areas
1. Open `data.js`
2. Add new entries to the `POSTCODE_DATA` object:
```javascript
'NEW_POSTCODE': {
    name: 'Display Name',
    description: 'Area description',
    features: ['Feature 1', 'Feature 2'],
    averagePrice: '£XXX,XXX',
    hasDetailedInfo: true/false,
    coordinates: [[lng, lat], [lng, lat], ...] // Polygon coordinates
}
```

### Modifying Colors
1. Open `data.js`
2. Update the `POSTCODE_COLORS` object with new hex colors
3. Update corresponding CSS classes in `styles.css`

### Styling Changes
- Modify `styles.css` for visual customizations
- Update color schemes, fonts, spacing, etc.
- All styles use CSS custom properties for easy theming

## 🔧 Integration with Squarespace

### Embedding in Squarespace
1. **Upload Files**: Upload all project files to your Squarespace site
2. **Code Injection**: Use Squarespace's Code Injection feature
3. **Custom Page**: Create a new page and embed using HTML blocks

### Code Injection Method
Add to your Squarespace site's header:
```html
<link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<link rel="stylesheet" href="/path/to/your/styles.css">
```

Add to your page content:
```html
<div id="london-postcode-map">
    <!-- Include the map container and other HTML elements -->
</div>
<script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
<script src="/path/to/your/data.js"></script>
<script src="/path/to/your/app.js"></script>
```

## 📊 Dummy Data Included

The application comes with realistic dummy data for 15 London postcode areas:

**Areas with Full Information** (darker colors):
- SW1 (Westminster/Belgravia)
- SW3 (Chelsea)
- SW7 (South Kensington)
- SE1 (Southwark/Borough)
- NW1 (Camden/Regent's Park)
- NW3 (Hampstead)
- E1 (Whitechapel/Spitalfields)
- E14 (Canary Wharf)
- W1 (Mayfair/Marylebone)
- N1 (Islington)
- WC1 (Bloomsbury)

**Areas with Limited Information** (lighter colors):
- SW11 (Battersea)
- SE10 (Greenwich)
- NW8 (St. John's Wood)
- W8 (Kensington)
- EC1 (Clerkenwell)

Each area includes:
- Detailed descriptions
- Key features and amenities
- Average property prices
- Geographic boundaries

## 🔒 Security Notes

- The included Mapbox token is a demo token with limited usage
- Replace with your own token for production use
- Consider implementing user authentication for edit capabilities
- Validate and sanitize user inputs in production

## 📱 Browser Compatibility

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support
- **Edge**: ✅ Full support
- **Mobile browsers**: ✅ Responsive design

## 🐛 Troubleshooting

### Map Not Loading
- Check your internet connection
- Verify Mapbox access token is valid
- Ensure you're serving files via HTTP/HTTPS (not file://)

### Styling Issues
- Clear browser cache
- Check for JavaScript console errors
- Verify all CSS files are loading properly

### Edit Mode Not Working
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

## 📄 License

This project is provided as-is for demonstration purposes. Please ensure you comply with Mapbox's terms of service when using their mapping services.

## 🤝 Support

For questions or issues:
1. Check the browser console for error messages
2. Verify all files are properly loaded
3. Ensure Mapbox token is valid and has sufficient quota