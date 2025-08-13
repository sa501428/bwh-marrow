# Marrow Pathology Report Template

A comprehensive, client-side web application for composing and generating marrow pathology reports. This application provides an intuitive interface for pathologists to fill out detailed templates and automatically generate formatted reports.

## Features

### 🏥 **Complete Report Sections**
- **Case Overview**: Accession numbers, laterality, specimen types, clinical summary
- **Core Biopsy**: Adequacy assessment, limitations description
- **Clot Section**: Clot description and additional findings
- **Cell Populations**: Cellularity, aberrant cells, architecture, cytology, IHC
- **Aspirate Smear**: Specimen adequacy, spicules, touch prep evaluation
- **Cell Count**: Interactive counting system with hotkeys (1-9, 0)
- **Myeloid/Erythroid Analysis**: Maturation patterns, ratios, IHC findings
- **Megakaryocytes**: Quantity assessment and detailed descriptions
- **Additional Observations**: Lymphoid aggregates, granulomas, hemosiderin
- **Special Stains**: Reticulin, trichrome, iron, Congo Red, Giemsa
- **CBC Reporting**: Complete blood count data entry and auto-population
- **Differential Analysis**: Auto and manual differential percentages
- **Peripheral Smear**: Findings and additional observations

### 🎯 **Interactive Features**
- **Real-time Cell Counting**: Click +/- buttons or use number keys (1-9, 0) for quick counting
- **Auto-save**: Form data automatically saved every 30 seconds
- **Smart Form Validation**: Dynamic form behavior based on selections
- **Keyboard Shortcuts**: Number keys for rapid cell counting
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 📊 **Report Generation**
- **Automatic Formatting**: Generates properly formatted pathology reports
- **Copy to Clipboard**: One-click copying of generated reports
- **Export Options**: Save reports as text files
- **Print Support**: Print-friendly report formatting
- **Template Consistency**: Maintains standard pathology report structure

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No server installation required - runs entirely in the browser

### Installation
1. Download all files to a local directory
2. Open `index.html` in your web browser
3. The application will load immediately with no additional setup

### File Structure
```
MarrowTemplate/
├── index.html          # Main application interface
├── styles.css          # Application styling and layout
├── script.js           # Application functionality and logic
└── README.md           # This documentation file
```

## Usage Guide

### 1. **Filling Out the Template**
- Navigate through each section using the organized cards
- Fill in text fields with specific findings
- Select appropriate radio button options for categorical data
- Check relevant checkboxes for presence/absence findings
- Use the cell counting system for quantitative assessments

### 2. **Cell Counting System**
- **Manual Counting**: Click the +/- buttons for each cell type
- **Keyboard Shortcuts**: Use number keys 1-9 and 0 for rapid counting
  - 1: Neutrophils/precursors
  - 2: Erythroids
  - 3: Lymphocytes
  - 4: Monocytes
  - 5: Basophils
  - 6: Promyelocytes
  - 7: Blasts
  - 8: Plasma cells
  - 9: Eosinophils
  - 0: Others
- **Total Calculation**: Automatically updates as you count

### 3. **Generating Reports**
1. Fill out all relevant sections of the template
2. Click "Generate Report" to create the formatted report
3. Review the generated text in the output area
4. Use "Copy to Clipboard" to copy the report
5. Optionally export or print the report

### 4. **Data Persistence**
- Form data automatically saves every 30 seconds
- Data persists between browser sessions using localStorage
- Previous form data automatically restored on page reload

## Technical Details

### **Client-Side Architecture**
- **HTML5**: Semantic structure and form elements
- **CSS3**: Modern styling with gradients, shadows, and responsive design
- **Vanilla JavaScript**: No external dependencies, pure client-side functionality
- **Local Storage**: Data persistence without server requirements

### **Browser Compatibility**
- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Support**: Responsive design for tablets and smartphones
- **Offline Capability**: Works without internet connection once loaded

### **Performance Features**
- **Efficient DOM Manipulation**: Minimal re-rendering and updates
- **Event Delegation**: Optimized event handling for large forms
- **Memory Management**: Proper cleanup and resource management

## Customization

### **Adding New Fields**
1. Add HTML elements to `index.html`
2. Update CSS styling in `styles.css`
3. Modify JavaScript logic in `script.js` for data handling

### **Modifying Report Format**
- Edit the `buildReport()` method in `script.js`
- Customize the report structure and formatting
- Add new sections or modify existing ones

### **Styling Changes**
- Modify color schemes in `styles.css`
- Adjust layout and spacing
- Customize form element appearances

## Troubleshooting

### **Common Issues**
- **Form not saving**: Check browser localStorage support
- **Cell counting not working**: Ensure JavaScript is enabled
- **Styling issues**: Clear browser cache and reload

### **Browser-Specific Notes**
- **Safari**: May require user interaction for clipboard operations
- **Firefox**: Local storage works in private browsing mode
- **Chrome**: Best performance and feature support

## Support and Development

### **Reporting Issues**
- Check browser console for JavaScript errors
- Verify all files are in the same directory
- Test in different browsers to isolate issues

### **Feature Requests**
- The application is designed for easy extension
- New sections can be added following the existing pattern
- Report generation logic can be customized for specific needs

## License

This application is provided as-is for educational and professional use. No warranty is expressed or implied.

## Acknowledgments

- Designed for medical pathology professionals
- Based on standard marrow pathology reporting practices
- Optimized for clinical workflow efficiency

---

**Note**: This application is intended for professional medical use. Always verify generated reports against clinical findings and institutional requirements.
