// Main application functionality
class MarrowReportApp {
    constructor() {
        this.initializeEventListeners();
        this.loadDefaultValues();
    }

    initializeEventListeners() {
        // Report generation and controls
        document.getElementById('generate-report').addEventListener('click', () => this.generateReport());
        document.getElementById('copy-report').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('clear-form').addEventListener('click', () => this.clearForm());
        
        // Add event listeners for descriptor checkboxes to update summaries
        this.setupDescriptorEventListeners();
        
        // Add event listeners for all form elements to trigger auto-save
        this.setupFormAutoSave();
    }

    setupFormAutoSave() {
        // Listen for changes on all form elements
        const formElements = document.querySelectorAll('input, textarea, select');
        formElements.forEach(element => {
            element.addEventListener('change', () => this.updateFormData());
            element.addEventListener('input', () => this.updateFormData());
        });
        
        // Setup abnormal cells toggle functionality
        this.setupAbnormalToggle();
    }

    setupAbnormalToggle() {
        const coreToggle = document.getElementById('core-abnormal-toggle');
        if (coreToggle) {
            coreToggle.addEventListener('change', () => {
                this.toggleAbnormalSections('core', coreToggle.checked);
            });
        }
        
        const aspirateToggle = document.getElementById('aspirate-abnormal-toggle');
        if (aspirateToggle) {
            aspirateToggle.addEventListener('change', () => {
                this.toggleAbnormalSections('aspirate', aspirateToggle.checked);
            });
        }
    }

    toggleAbnormalSections(context, show) {
        // Only toggle the detailed descriptor sections, not the entire cell type sections
        const descriptorSections = document.querySelectorAll(`#${context}-megakaryocytes .descriptor-section, #${context}-erythroid .descriptor-section, #${context}-myeloid .descriptor-section, #${context}-lymphocytes .descriptor-section`);
        
        descriptorSections.forEach(section => {
            if (show) {
                section.style.display = 'block';
                section.style.opacity = '1';
            } else {
                section.style.display = 'none';
                section.style.opacity = '0';
            }
        });
        
        // Update toggle text
        const toggleText = document.querySelector(`#${context}-abnormal-toggle + .toggle-text`);
        if (toggleText) {
            toggleText.textContent = show ? 'Hide Detailed Descriptors' : 'Show Detailed Descriptors';
        }
    }



    setupDescriptorEventListeners() {
        // Add event listeners to all descriptor checkboxes
        const descriptorCheckboxes = document.querySelectorAll('.descriptor-section input[type="checkbox"]');
        descriptorCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateDescriptorSummary(checkbox));
        });
        
        // Add event listeners to all radio buttons for proper group behavior
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => this.handleRadioButtonChange(radio));
        });
        
        // Create summary displays for each descriptor section
        this.createDescriptorSummaries();
    }

    handleRadioButtonChange(radio) {
        // Ensure only one radio button in the group is selected
        const name = radio.name;
        if (name) {
            document.querySelectorAll(`input[name="${name}"]`).forEach(rb => {
                if (rb !== radio) {
                    rb.checked = false;
                }
            });
        }
        
        // Add visual feedback
        radio.closest('label').style.background = '#e3f2fd';
        setTimeout(() => {
            radio.closest('label').style.background = '';
        }, 200);
        
        // Update any related summaries or dependent fields
        this.updateDependentFields(radio);
        
        // Update form data
        this.updateFormData();
    }

    updateDependentFields(radio) {
        // Handle dependent field updates based on radio button selection
        const name = radio.name;
        const value = radio.value;
        
        // Example: Update related fields based on selection
        if (name === 'biopsy-adequacy' && value === 'Limited') {
            // Enable limitations field if Limited is selected
            const limitationsField = document.getElementById('limitations');
            if (limitationsField) {
                limitationsField.style.display = 'block';
            }
        }
        
        // Add more dependent field logic as needed
    }

    createDescriptorSummaries() {
        const descriptorSections = document.querySelectorAll('.descriptor-section');
        descriptorSections.forEach(section => {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'descriptor-summary';
            summaryDiv.innerHTML = `
                <h5>Selected Features Summary</h5>
                <div class="summary-text">No features selected yet</div>
            `;
            summaryDiv.id = section.id || `summary-${Math.random().toString(36).substr(2, 9)}`;
            section.appendChild(summaryDiv);
        });
    }

    updateDescriptorSummary(checkbox) {
        try {
            const section = checkbox.closest('.descriptor-section');
            if (!section) return;
            
            const summaryDiv = section.querySelector('.descriptor-summary');
            if (!summaryDiv) return;
            
            const summaryText = summaryDiv.querySelector('.summary-text');
            if (!summaryText) return;
            
            // Get all checked checkboxes in this section
            const checkedBoxes = section.querySelectorAll('input[type="checkbox"]:checked');
            
            if (checkedBoxes.length === 0) {
                summaryText.textContent = 'No features selected yet';
                summaryDiv.style.display = 'none'; // Hide empty summaries
            } else {
                const selectedFeatures = Array.from(checkedBoxes).map(cb => cb.value).filter(Boolean);
                if (selectedFeatures.length > 0) {
                    summaryText.textContent = selectedFeatures.join(', ');
                    summaryDiv.style.display = 'block'; // Show summaries with content
                } else {
                    summaryText.textContent = 'No features selected yet';
                    summaryDiv.style.display = 'none';
                }
            }
            
            // Update form data for auto-save
            this.updateFormData();
            
        } catch (error) {
            console.warn('Error updating descriptor summary:', error);
        }
    }

    updateFormData() {
        // Trigger auto-save when form data changes
        try {
            const data = this.getFormData();
            localStorage.setItem('marrowReportData', JSON.stringify(data));
        } catch (error) {
            console.warn('Error updating form data:', error);
        }
    }



    loadDefaultValues() {
        // Set some default values based on the images
        document.getElementById('clinical-summary').value = 'MDS s/p SCT';
        document.getElementById('limitations').value = 'fragmented';
    }

    generateReport() {
        try {
            const reportOutput = document.getElementById('report-output');
            if (!reportOutput) {
                this.showNotification('Report output element not found', 'error');
                return;
            }
            
            // Check if form has any data
            if (!this.hasFormData()) {
                const emptyReport = 'A. BONE MARROW, BIOPSY:\nPlease enter a diagnosis\nCOMMENT: No data entered yet\n_________________________________________________________________\n\nNo form data has been entered. Please fill out at least some sections of the form before generating a report.';
                reportOutput.value = emptyReport;
                this.showNotification('Form is empty. Please fill out some sections first.', 'info');
                return;
            }
            
            const report = this.buildReport();
            reportOutput.value = report;
            
            if (report && !report.startsWith('Error')) {
                this.showNotification('Report generated successfully!', 'success');
            } else {
                this.showNotification('Report generated with some issues. Please review.', 'error');
            }
        } catch (error) {
            console.error('Error in generateReport:', error);
            this.showNotification('Error generating report. Please check the console.', 'error');
        }
    }

    hasFormData() {
        try {
            // Check if any text inputs have values
            const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
            for (const input of textInputs) {
                if (input.value && input.value.trim()) {
                    return true;
                }
            }
            
            // Check if any radio buttons are selected
            const radioInputs = document.querySelectorAll('input[type="radio"]:checked');
            if (radioInputs.length > 0) {
                return true;
            }
            
            // Check if any checkboxes are checked
            const checkboxInputs = document.querySelectorAll('input[type="checkbox"]:checked');
            if (checkboxInputs.length > 0) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('Error checking form data:', error);
            return false;
        }
    }

    buildReport() {
        try {
            let report = 'A. BONE MARROW, BIOPSY:\n';
            report += 'Please enter a diagnosis\n';
            
            // Case Overview Section
            const accession = this.getValue('accession');
            if (accession) {
                report += `Accession #: ${accession}\n`;
            }
            
            const laterality = this.getSelectedRadioValue('laterality');
            if (laterality && laterality !== 'do not report') {
                report += `Laterality: ${laterality}\n`;
            }
            
            const specimens = this.getSelectedCheckboxValues('specimens');
            if (specimens.length > 0) {
                report += `Specimens: ${specimens.join(', ')}\n`;
            }
            
            const clinicalSummary = this.getValue('clinical-summary');
            if (clinicalSummary) {
                report += `Clinical Summary: ${clinicalSummary}\n`;
            }
            
            report += '_________________________________________________________________\n\n';
            
            // Core Biopsy Section
            report += 'CORE BIOPSY:\n';
            
            const biopsyAdequacy = this.getSelectedRadioValue('biopsy-adequacy');
            if (biopsyAdequacy) {
                const limitations = this.getValue('limitations');
                report += `Biopsy adequacy: ${biopsyAdequacy}${limitations ? `; ${limitations}` : ''}.\n`;
            }
            
            // Core Biopsy - Megakaryocytes
            const coreMegakaryocytes = this.getSelectedRadioValue('core-megakaryocytes');
            if (coreMegakaryocytes) {
                report += `Megakaryocytes: ${coreMegakaryocytes}.\n`;
            }
            
            // Add detailed core megakaryocyte descriptors if any are selected
            const coreMegSize = this.getSelectedCheckboxValues('core-meg-size');
            const coreMegNuclear = this.getSelectedCheckboxValues('core-meg-nuclear');
            const coreMegCytoplasm = this.getSelectedCheckboxValues('core-meg-cytoplasm');
            const coreMegOther = this.getSelectedCheckboxValues('core-meg-other');
            
            if (coreMegSize.length > 0 || coreMegNuclear.length > 0 || coreMegCytoplasm.length > 0 || coreMegOther.length > 0) {
                report += 'Megakaryocyte features include: ';
                const megFeatures = [...coreMegSize, ...coreMegNuclear, ...coreMegCytoplasm, ...coreMegOther];
                report += megFeatures.join(', ') + '.\n';
            }
            
            const coreMegDescription = this.getValue('core-megakaryocyte-description');
            if (coreMegDescription) {
                report += `Additional megakaryocyte findings: ${coreMegDescription}.\n`;
            }
            
            // Core Biopsy - Erythroid Lineage
            const coreErythroid = this.getSelectedRadioValue('core-erythroid');
            if (coreErythroid) {
                report += `Erythroid lineage: ${coreErythroid}.\n`;
            }
            
            // Add detailed core erythroid descriptors if any are selected
            const coreErySize = this.getSelectedCheckboxValues('core-ery-size');
            const coreEryNuclear = this.getSelectedCheckboxValues('core-ery-nuclear');
            const coreEryCytoplasm = this.getSelectedCheckboxValues('core-ery-cytoplasm');
            const coreEryMaturation = this.getSelectedCheckboxValues('core-ery-maturation');
            
            if (coreErySize.length > 0 || coreEryNuclear.length > 0 || coreEryCytoplasm.length > 0 || coreEryMaturation.length > 0) {
                report += 'Erythroid features include: ';
                const erythroidFeatures = [...coreErySize, ...coreEryNuclear, ...coreEryCytoplasm, ...coreEryMaturation];
                report += erythroidFeatures.join(', ') + '.\n';
            }
            
            const coreEryDescription = this.getValue('core-erythroid-description');
            if (coreEryDescription) {
                report += `Additional erythroid findings: ${coreEryDescription}.\n`;
            }
            
            // Core Biopsy - Myeloid Lineage
            const coreMyeloid = this.getSelectedRadioValue('core-myeloid');
            if (coreMyeloid) {
                report += `Myeloid lineage: ${coreMyeloid}.\n`;
            }
            
            // Add detailed core myeloid descriptors if any are selected
            const coreMyelCellularity = this.getSelectedCheckboxValues('core-myel-cellularity');
            const coreMyelNuclear = this.getSelectedCheckboxValues('core-myel-nuclear');
            const coreMyelCytoplasm = this.getSelectedCheckboxValues('core-myel-cytoplasm');
            const coreMyelOther = this.getSelectedCheckboxValues('core-myel-other');
            
            if (coreMyelCellularity.length > 0 || coreMyelNuclear.length > 0 || coreMyelCytoplasm.length > 0 || coreMyelOther.length > 0) {
                report += 'Myeloid features include: ';
                const myeloidFeatures = [...coreMyelCellularity, ...coreMyelNuclear, ...coreMyelCytoplasm, ...coreMyelOther];
                report += myeloidFeatures.join(', ') + '.\n';
            }
            
            const coreMyelDescription = this.getValue('core-myeloid-description');
            if (coreMyelDescription) {
                report += `Additional myeloid findings: ${coreMyelDescription}.\n`;
            }
            
            // Core Biopsy - Lymphocytes & Plasma Cells
            // Add detailed core lymphocyte descriptors if any are selected
            const coreLymphSize = this.getSelectedCheckboxValues('core-lymph-size');
            const coreLymphNuclear = this.getSelectedCheckboxValues('core-lymph-nuclear');
            const coreLymphCytoplasm = this.getSelectedCheckboxValues('core-lymph-cytoplasm');
            const coreLymphDistribution = this.getSelectedCheckboxValues('core-lymph-distribution');
            
            if (coreLymphSize.length > 0 || coreLymphNuclear.length > 0 || coreLymphCytoplasm.length > 0 || coreLymphDistribution.length > 0) {
                report += 'Lymphocyte/plasma cell features include: ';
                const lymphFeatures = [...coreLymphSize, ...coreLymphNuclear, ...coreLymphCytoplasm, ...coreLymphDistribution];
                report += lymphFeatures.join(', ') + '.\n';
            }
            
            const coreLymphDescription = this.getValue('core-lymphocytes-description');
            if (coreLymphDescription) {
                report += `Additional lymphocyte/plasma cell findings: ${coreLymphDescription}.\n`;
            }
            
            report += '\n';
            
            // Aspirate Section
            report += 'ASPIRATE:\n';
            
            const aspirateCellularity = this.getSelectedRadioValue('aspirate-cellularity');
            const spicules = this.getSelectedRadioValue('spicules');
            const touchPrep = this.getSelectedRadioValue('touch-prep');
            
            if (aspirateCellularity || spicules || touchPrep) {
                const adequacy = aspirateCellularity || 'Not specified';
                const spiculesText = spicules || 'Not specified';
                const touchPrepText = touchPrep || 'Not specified';
                report += `Aspirate adequacy: ${adequacy}, spicules: ${spiculesText}, touch prep: ${touchPrepText}.\n`;
            }
            
            // Aspirate - Megakaryocytes
            const aspirateMegakaryocytes = this.getSelectedRadioValue('aspirate-megakaryocytes');
            if (aspirateMegakaryocytes) {
                report += `Megakaryocytes: ${aspirateMegakaryocytes}.\n`;
            }
            
            // Add detailed aspirate megakaryocyte descriptors if any are selected
            const aspirateMegSize = this.getSelectedCheckboxValues('aspirate-meg-size');
            const aspirateMegNuclear = this.getSelectedCheckboxValues('aspirate-meg-nuclear');
            const aspirateMegCytoplasm = this.getSelectedCheckboxValues('aspirate-meg-cytoplasm');
            const aspirateMegOther = this.getSelectedCheckboxValues('aspirate-meg-other');
            
            if (aspirateMegSize.length > 0 || aspirateMegNuclear.length > 0 || aspirateMegCytoplasm.length > 0 || aspirateMegOther.length > 0) {
                report += 'Megakaryocyte features include: ';
                const megFeatures = [...aspirateMegSize, ...aspirateMegNuclear, ...aspirateMegCytoplasm, ...aspirateMegOther];
                report += megFeatures.join(', ') + '.\n';
            }
            
            const aspirateMegDescription = this.getValue('aspirate-megakaryocyte-description');
            if (aspirateMegDescription) {
                report += `Additional megakaryocyte findings: ${aspirateMegDescription}.\n`;
            }
            
            // Aspirate - Erythroid Lineage
            const aspirateErythroid = this.getSelectedRadioValue('aspirate-erythroid');
            if (aspirateErythroid) {
                report += `Erythroid lineage: ${aspirateErythroid}.\n`;
            }
            
            // Add detailed aspirate erythroid descriptors if any are selected
            const aspirateErySize = this.getSelectedCheckboxValues('aspirate-ery-size');
            const aspirateEryNuclear = this.getSelectedCheckboxValues('aspirate-ery-nuclear');
            const aspirateEryCytoplasm = this.getSelectedCheckboxValues('aspirate-ery-cytoplasm');
            const aspirateEryMaturation = this.getSelectedCheckboxValues('aspirate-ery-maturation');
            
            if (aspirateErySize.length > 0 || aspirateEryNuclear.length > 0 || aspirateEryCytoplasm.length > 0 || aspirateEryMaturation.length > 0) {
                report += 'Erythroid features include: ';
                const erythroidFeatures = [...aspirateErySize, ...aspirateEryNuclear, ...aspirateEryCytoplasm, ...aspirateEryMaturation];
                report += erythroidFeatures.join(', ') + '.\n';
            }
            
            const aspirateEryDescription = this.getValue('aspirate-erythroid-description');
            if (aspirateEryDescription) {
                report += `Additional erythroid findings: ${aspirateEryDescription}.\n`;
            }
            
            // Aspirate - Myeloid Lineage
            const aspirateMyeloid = this.getSelectedRadioValue('aspirate-myeloid');
            if (aspirateMyeloid) {
                report += `Myeloid lineage: ${aspirateMyeloid}.\n`;
            }
            
            // Add detailed aspirate myeloid descriptors if any are selected
            const aspirateMyelCellularity = this.getSelectedCheckboxValues('aspirate-myel-cellularity');
            const aspirateMyelNuclear = this.getSelectedCheckboxValues('aspirate-myel-nuclear');
            const aspirateMyelCytoplasm = this.getSelectedCheckboxValues('aspirate-myel-cytoplasm');
            const aspirateMyelOther = this.getSelectedCheckboxValues('aspirate-myel-other');
            
            if (aspirateMyelCellularity.length > 0 || aspirateMyelNuclear.length > 0 || aspirateMyelCytoplasm.length > 0 || aspirateMyelOther.length > 0) {
                report += 'Myeloid features include: ';
                const myeloidFeatures = [...aspirateMyelCellularity, ...aspirateMyelNuclear, ...aspirateMyelCytoplasm, ...aspirateMyelOther];
                report += myeloidFeatures.join(', ') + '.\n';
            }
            
            const aspirateMyelDescription = this.getValue('aspirate-myeloid-description');
            if (aspirateMyelDescription) {
                report += `Additional myeloid findings: ${aspirateMyelDescription}.\n`;
            }
            
            // Aspirate - Lymphocytes & Plasma Cells
            // Add detailed aspirate lymphocyte descriptors if any are selected
            const aspirateLymphSize = this.getSelectedCheckboxValues('aspirate-lymph-size');
            const aspirateLymphNuclear = this.getSelectedCheckboxValues('aspirate-lymph-nuclear');
            const aspirateLymphCytoplasm = this.getSelectedCheckboxValues('aspirate-lymph-cytoplasm');
            const aspirateLymphDistribution = this.getSelectedCheckboxValues('aspirate-lymph-distribution');
            
            if (aspirateLymphSize.length > 0 || aspirateLymphNuclear.length > 0 || aspirateLymphCytoplasm.length > 0 || aspirateLymphDistribution.length > 0) {
                report += 'Lymphocyte/plasma cell features include: ';
                const lymphFeatures = [...aspirateLymphSize, ...aspirateLymphNuclear, ...aspirateLymphCytoplasm, ...aspirateLymphDistribution];
                report += lymphFeatures.join(', ') + '.\n';
            }
            
            const aspirateLymphDescription = this.getValue('aspirate-lymphocytes-description');
            if (aspirateLymphDescription) {
                report += `Additional lymphocyte/plasma cell findings: ${aspirateLymphDescription}.\n`;
            }
            
            report += '\n';
            
            // Clinical Summary Section
            if (clinicalSummary) {
                report += `(Clinical summary: ${clinicalSummary})\n`;
            }
            
            return report;
            
        } catch (error) {
            console.error('Error generating report:', error);
            return `Error generating report: ${error.message}\n\nPlease check the form and try again.`;
        }
    }

    getValue(id) {
        try {
            const element = document.getElementById(id);
            return element && element.value ? element.value.trim() : '';
        } catch (error) {
            console.warn(`Error getting value for element ${id}:`, error);
            return '';
        }
    }

    getSelectedRadioValue(name) {
        try {
            const selected = document.querySelector(`input[name="${name}"]:checked`);
            return selected && selected.value ? selected.value : '';
        } catch (error) {
            console.warn(`Error getting radio value for name ${name}:`, error);
            return '';
        }
    }

    getSelectedCheckboxValues(name) {
        try {
            const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checkboxes).map(cb => cb.value).filter(Boolean);
        } catch (error) {
            console.warn(`Error getting checkbox values for name ${name}:`, error);
            return [];
        }
    }

    isChecked(id) {
        try {
            const element = document.getElementById(id);
            return element ? element.checked : false;
        } catch (error) {
            console.warn(`Error checking if element ${id} is checked:`, error);
            return false;
        }
    }

    async copyToClipboard() {
        const reportOutput = document.getElementById('report-output');
        try {
            await navigator.clipboard.writeText(reportOutput.value);
            this.showNotification('Report copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            reportOutput.select();
            document.execCommand('copy');
            this.showNotification('Report copied to clipboard!', 'success');
        }
    }

    clearForm() {
        if (confirm('Are you sure you want to clear all form data? This action cannot be undone.')) {
            // Reset all form elements
            document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
                input.value = '';
            });
            
            // Reset radio buttons to first option
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                if (radio.defaultChecked) {
                    radio.checked = true;
                } else {
                    radio.checked = false;
                }
            });
            
            // Reset checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = checkbox.defaultChecked || false;
            });
            
            // Clear report output
            document.getElementById('report-output').value = '';
            
            // Reload default values
            this.loadDefaultValues();
            
            this.showNotification('Form cleared successfully!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #28a745 0%, #218838 100%)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)';
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Method to get all form data as an object (useful for saving/loading)
    getFormData() {
        const data = {};
        
        // Get all text inputs
        document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            if (input.id) {
                data[input.id] = input.value;
            }
        });
        
        // Get all radio button selections
        document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
            data[radio.name] = radio.value;
        });
        
        // Get all checkbox states (including descriptor checkboxes)
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.id) {
                data[checkbox.id] = checkbox.checked;
            }
            if (checkbox.name) {
                if (!data[checkbox.name]) {
                    data[checkbox.name] = [];
                }
                if (checkbox.checked) {
                    data[checkbox.name].push(checkbox.value);
                }
            }
        });
        

        
        return data;
    }

    // Method to load form data from an object
    loadFormData(data) {
        // Set text inputs
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element && typeof data[key] === 'string') {
                element.value = data[key];
            }
        });
        
        // Set radio buttons
        Object.keys(data).forEach(key => {
            const radio = document.querySelector(`input[name="${key}"][value="${data[key]}"]`);
            if (radio) {
                radio.checked = true;
            }
        });
        
        // Set checkboxes
        Object.keys(data).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox && typeof data[key] === 'boolean') {
                checkbox.checked = data[key];
            }
        });
        
        // Set descriptor checkboxes
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                data[key].forEach(value => {
                    const checkbox = document.querySelector(`input[name="${key}"][value="${value}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        });
        

    }

    // Auto-save functionality
    setupAutoSave() {
        // Save form data every 30 seconds
        setInterval(() => {
            const data = this.getFormData();
            localStorage.setItem('marrowReportData', JSON.stringify(data));
        }, 30000);
        
        // Load saved data on page load
        const savedData = localStorage.getItem('marrowReportData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.loadFormData(data);
                this.showNotification('Previous form data restored', 'info');
            } catch (err) {
                console.error('Error loading saved data:', err);
            }
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marrowApp = new MarrowReportApp();
    window.marrowApp.setupAutoSave();
});



// Export functionality for saving reports
window.exportReport = function(format = 'txt') {
    const report = document.getElementById('report-output').value;
    if (!report.trim()) {
        window.marrowApp.showNotification('No report to export. Generate a report first.', 'error');
        return;
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marrow_report_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.marrowApp.showNotification('Report exported successfully!', 'success');
};

// Print functionality
window.printReport = function() {
    const report = document.getElementById('report-output').value;
    if (!report.trim()) {
        window.marrowApp.showNotification('No report to print. Generate a report first.', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Marrow Pathology Report</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 20px; }
                    .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                    .content { white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <div class="header">Marrow Pathology Report</div>
                <div class="content">${report}</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
