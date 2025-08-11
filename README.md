# London Postcode Map

An interactive map application for displaying London postcode areas with detailed information and editing capabilities. Built with HTML, CSS, JavaScript, and Mapbox GL JS.

## Features

- **Interactive Map**: Click on postcode areas to view detailed information
- **Color-Coded Areas**: Different colors for postcode groups (SW, SE, N, W)
- **Information Levels**: Darker shades for areas with full information, lighter shades for limited information
- **Editable Content**: Add or modify postcode information through an intuitive modal interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional design suitable for integration into existing websites

## Project Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── app.js             # Main JavaScript application
├── postcodeData.js    # Postcode data and color schemes
└── README.md          # This file
```

## Setup Instructions

1. **Clone or Download** the project files to your local directory
2. **Open** `index.html` in a web browser
3. The map will automatically load with sample London postcode data

### Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for Mapbox tiles and API)

## Usage

### Viewing Postcode Information
- Click on any colored area on the map to view detailed information
- The information panel will display:
  - Postcode name and description
  - Property statistics (count and average price)
  - Key amenities
  - Transport links

### Editing Postcode Information
1. Click on a postcode area to select it
2. Click the "Edit Information" or "Add Information" button
3. Fill in the form with updated information
4. Click "Save Changes" to update the data
5. The map colors will automatically update based on information availability

### Map Controls
- **Zoom**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag to move around the map
- **Fullscreen**: Click the fullscreen button in the top-right corner

## Color Scheme

| Group | Full Information | Limited Information |
|-------|------------------|-------------------|
| SW (Southwest) | Red (#e74c3c) | Light Red (#f1948a) |
| SE (Southeast) | Blue (#3498db) | Light Blue (#85c1e9) |
| N (North) | Green (#2ecc71) | Light Green (#82e0aa) |
| W (West) | Orange (#f39c12) | Light Orange (#f8c471) |

## Squarespace Integration

### Method 1: Code Injection (Recommended)

1. **Upload Files**: Upload `styles.css`, `app.js`, and `postcodeData.js` to your Squarespace site's file storage
2. **Add Code Block**: In your Squarespace page editor, add a "Code" block
3. **Insert HTML**: Copy the content from `index.html` (excluding `<html>`, `<head>`, and `<body>` tags)
4. **Link External Files**: In your site's header code injection, add:

```html
<script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
<link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
<link rel="stylesheet" href="/s/styles.css">
<script src="/s/postcodeData.js"></script>
<script src="/s/app.js"></script>
```

### Method 2: Embedded iframe

1. **Host Externally**: Upload the complete application to a web hosting service
2. **Embed**: Use Squarespace's "Embed" block to include the hosted map

### Method 3: Developer Platform

For advanced users with Squarespace Developer Platform access:
1. Include the files in your custom template
2. Integrate the map component into your site's layout

## Customization

### Adding New Postcodes

Edit `postcodeData.js` and add new entries:

```javascript
"NEW_POSTCODE": {
    group: "GROUP", // SW, SE, N, or W
    name: "Area Name",
    hasFullInfo: true, // or false
    bounds: [[-0.1489, 51.4956], [-0.1289, 51.5056]], // [southwest, northeast]
    center: [-0.1389, 51.5006], // [longitude, latitude]
    description: "Area description...",
    propertyCount: 1000,
    avgPrice: 500000,
    amenities: ["Amenity 1", "Amenity 2"],
    transport: "Transport information..."
}
```

### Modifying Colors

Update the `colorScheme` object in `postcodeData.js`:

```javascript
const colorScheme = {
    SW: {
        full: '#your-color',
        limited: '#your-lighter-color'
    }
    // ... other groups
};
```

### Styling Changes

Modify `styles.css` to match your website's design:
- Update color variables
- Adjust fonts and spacing
- Modify responsive breakpoints

## API Configuration

The application uses Mapbox GL JS with the provided API key. To use your own Mapbox account:

1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Get your access token
3. Replace the token in `app.js`:

```javascript
mapboxgl.accessToken = 'your-mapbox-token-here';
```

## Browser Support

- Chrome 50+
- Firefox 45+
- Safari 9+
- Edge 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes

- Map tiles are cached by the browser for better performance
- Postcode data is loaded once on page load
- Responsive design ensures good performance on mobile devices

## Troubleshooting

### Map Not Loading
- Check internet connection
- Verify Mapbox API key is valid
- Check browser console for error messages

### Styling Issues
- Ensure CSS file is properly linked
- Check for conflicting styles from parent site
- Verify responsive design on different screen sizes

### Data Not Updating
- Check browser console for JavaScript errors
- Ensure form validation is working
- Verify data structure matches expected format

## License

This project is provided as-is for integration into your Squarespace website. Mapbox usage is subject to their terms of service and pricing.

## Support

For customization or integration assistance, refer to:
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Squarespace Developer Documentation](https://developers.squarespace.com/)