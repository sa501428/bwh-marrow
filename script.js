// Epic Data Parser - Enhanced version to handle complex Epic formats
class EpicDataParser {
    constructor() {
        // Enhanced CBC patterns to handle Epic format with flags
        this.cbcPatterns = {
            date: /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/,
            wbc: /WBC[:\s]*(\d+\.?\d*)/i,
            rbc: /RBC[:\s]*(\d+\.?\d*)/i,
            hgb: /H[GH]B[:\s]*(\d+\.?\d*)/i,
            hct: /HCT[:\s]*(\d+\.?\d*)/i,
            mcv: /MCV[:\s]*(\d+\.?\d*)/i,
            mch: /MCH[:\s]*(\d+\.?\d*)/i,
            mchc: /MCHC[:\s]*(\d+\.?\d*)/i,
            plt: /PLT[:\s]*(\d+\.?\d*)/i,
            mpv: /MPV[:\s]*(\d+\.?\d*)/i,
            rdw: /RDW[:\s]*(\d+\.?\d*)/i
        };

        // Morphology and special findings patterns
        this.morphologyPatterns = {
            toxicGranulation: /Toxic\s+Granulation[:\s]*([A-Z]+)/i,
            giantPlatelets: /PLTS,\s*giant[:\s]*([A-Z]+)/i,
            rbcMorph: /RBC\s+MORPH[:\s]*([A-Z\s]+)/i,
            atypicalLymphs: /Lymphs,\s*atypical\/reactive[:\s]*(\d+\.?\d*)/i
        };
    }

    parseCBC(text) {
        const results = {};
        if (!text) return results;

        // Parse CBC values
        Object.keys(this.cbcPatterns).forEach(key => {
            const match = text.match(this.cbcPatterns[key]);
            if (match) {
                results[key] = key === 'date' ? match[1] : parseFloat(match[1]);
            }
        });

        return results;
    }

    parseDifferential(text) {
        const results = {};
        if (!text) return results;

        // Check if differential was performed
        const diffMethodMatch = text.match(/Diff Method[:\s]*(.+)/i);
        const diffMethod = diffMethodMatch ? diffMethodMatch[1].trim() : null;
        
        if (diffMethod && diffMethod.includes('not performed')) {
            results.diffMethod = diffMethod;
            return results;
        }

        results.diffMethod = diffMethod || 'Unknown';

        // Flexible differential parsing - looks for any percentage followed by cell type
        // This handles both auto and manual differentials dynamically
        const lines = text.split('\n');
        
        // First pass: collect all matches with priority info
        const allMatches = [];
        
        for (const line of lines) {
            // Skip absolute count lines (those with #)
            if (line.includes('#')) continue;
            
            // Match percentage patterns: "CellType: XX.X" or "CellType (qualifier): XX.X" or "CellType (%): XX.X"
            const percentMatch = line.match(/^([^:]+?)(?:\s*\([^)]*\))?\s*:\s*(\d+\.?\d*)/);
            
            if (percentMatch) {
                const cellType = percentMatch[1].trim();
                const percentage = parseFloat(percentMatch[2]);
                
                // Normalize cell type names
                const normalizedType = this.normalizeCellType(cellType);
                if (normalizedType && !isNaN(percentage)) {
                    // Determine priority: percentage (%) > qualifiers > plain
                    let priority = 0;
                    if (cellType.includes('(%)') || cellType.includes('% (')) {
                        priority = 3; // Highest priority for explicit percentage
                    } else if (cellType.includes('(')) {
                        priority = 2; // Medium priority for qualifiers like (auto)
                    } else {
                        priority = 1; // Lowest priority for plain entries
                    }
                    
                    allMatches.push({
                        normalizedType,
                        percentage,
                        priority,
                        originalLine: line
                    });
                }
            }
        }
        
        // Second pass: select highest priority entry for each cell type
        const typeGroups = {};
        allMatches.forEach(match => {
            if (!typeGroups[match.normalizedType] || 
                typeGroups[match.normalizedType].priority < match.priority) {
                typeGroups[match.normalizedType] = match;
            }
        });
        
        // Build final results
        Object.values(typeGroups).forEach(match => {
            results[match.normalizedType] = match.percentage;
        });

        return results;
    }

    parseMorphology(text) {
        const results = {};
        if (!text) return results;

        // Parse morphology findings
        Object.keys(this.morphologyPatterns).forEach(key => {
            const match = text.match(this.morphologyPatterns[key]);
            if (match) {
                results[key] = match[1].trim();
            }
        });

        // Parse NRBC separately as it's important
        const nrbcMatch = text.match(/NRBC%[^:]*:\s*(\d+\.?\d*)/i);
        if (nrbcMatch) {
            results.nrbc = parseFloat(nrbcMatch[1]);
        }

        return results;
    }

    normalizeCellType(cellType) {
        const normalized = cellType.toLowerCase().trim();
        
        // Map various cell type names to standard names
        const typeMap = {
            'neutrophils': 'neutrophils',
            'neutrophil': 'neutrophils',
            'polys': 'neutrophils',
            'poly': 'neutrophils',
            'lymphs': 'lymphocytes',
            'lymphocytes': 'lymphocytes',
            'lymph': 'lymphocytes',
            'monos': 'monocytes',
            'monocytes': 'monocytes',
            'mono': 'monocytes',
            'eos': 'eosinophils',
            'eosinophils': 'eosinophils',
            'eosinophil': 'eosinophils',
            'basos': 'basophils',
            'basophils': 'basophils',
            'basophil': 'basophils',
            'basos (auto)': 'basophils',
            'bands': 'bands',
            'band': 'bands',
            'blasts': 'blasts',
            'blast': 'blasts',
            'metamyelocytes': 'metamyelocytes',
            'metamyelo': 'metamyelocytes',
            'meta': 'metamyelocytes',
            'myelocytes': 'myelocytes',
            'myelo': 'myelocytes',
            'promyelocytes': 'promyelocytes',
            'promyelo': 'promyelocytes',
            'other': 'other',
            'unknown': 'unknown',
            'atypical lymphs': 'atypical_lymphocytes',
            'reactive lymphs': 'atypical_lymphocytes',
            'lymphs, atypical/reactive (auto)': 'atypical_lymphocytes',
            'granulocytes, immature': 'immature_granulocytes',
            'granulocytes,immature': 'immature_granulocytes',
            'granulocytes, immature (%)': 'immature_granulocytes',
            'granulocytes,immature (%)': 'immature_granulocytes',
            'immature granulocytes': 'immature_granulocytes',
            'nrbc% (auto)': 'nrbc',
            'nrbc%': 'nrbc'
        };

        return typeMap[normalized] || null;
    }

    parseAll(text) {
        const cbc = this.parseCBC(text);
        const differential = this.parseDifferential(text);
        const morphology = this.parseMorphology(text);
        
        return {
            cbc,
            differential,
            morphology,
            raw: text
        };
    }
}

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
            // Initialize to current state on load
            this.toggleAbnormalSections('core', coreToggle.checked);
        }
        
        const aspirateToggle = document.getElementById('aspirate-abnormal-toggle');
        if (aspirateToggle) {
            aspirateToggle.addEventListener('change', () => {
                this.toggleAbnormalSections('aspirate', aspirateToggle.checked);
            });
            // Initialize to current state on load
            this.toggleAbnormalSections('aspirate', aspirateToggle.checked);
        }
    }

    toggleAbnormalSections(context, show) {
        // Only toggle the detailed descriptor sections, not the entire cell type sections
        const extraCoreSelector = context === 'core' ? ', #core-architecture .descriptor-section' : '';
        const descriptorSections = document.querySelectorAll(`#${context}-megakaryocytes .descriptor-section, #${context}-erythroid .descriptor-section, #${context}-myeloid .descriptor-section, #${context}-lymphocytes .descriptor-section${extraCoreSelector}`);
        
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
            report += 'Please enter a diagnosis\n\n';
            
            // CBC Section (if parsed from Epic data)
            if (window.cbcParagraph && window.cbcParagraph.trim()) {
                report += window.cbcParagraph + '\n\n';
            }
            
            // Core Biopsy Section
            report += 'CORE BIOPSY:\n';
            
            const biopsyAdequacy = this.getSelectedRadioValue('biopsy-adequacy');
            if (biopsyAdequacy) {
                const limitations = this.getValue('limitations');
                report += `Biopsy adequacy: ${biopsyAdequacy}${limitations ? `; ${limitations}` : ''}.\n`;
            }
            
            // Cellularity
            const cellularity = this.getValue('cellularity');
            const ageCellularity = this.getSelectedRadioValue('age-cellularity');
            
            if (cellularity || ageCellularity) {
                let cellularityText = 'Marrow biopsy cellularity: ';
                
                if (cellularity) {
                    cellularityText += `${cellularity}`;
                    // Add % if not already present
                    if (!cellularity.includes('%')) {
                        cellularityText += '%';
                    }
                } else {
                    cellularityText += 'Not specified';
                }
                
                if (ageCellularity) {
                    cellularityText += `; age adjusted ${ageCellularity}`;
                }
                
                cellularityText += '.\n';
                report += cellularityText;
            }
            
            // M:E Ratio
            const meRatio = this.getSelectedRadioValue('me-ratio');
            if (meRatio) {
                report += `Myeloid:Erythroid ratio is ${meRatio}.\n`;
            }
            
            // Core Biopsy - Myeloid Lineage (moved to first position)
            const coreMyeloid = this.getSelectedRadioValue('core-myeloid');
            const coreMyelDescription = this.getValue('core-myeloid-description');
            
            if (coreMyeloid) {
                let myelString = `Myeloid lineage maturation is ${coreMyeloid}`;
                
                // Add detailed descriptors in narrative form
                const coreMyelCellularity = this.getSelectedCheckboxValues('core-myel-cellularity');
                const coreMyelNuclear = this.getSelectedCheckboxValues('core-myel-nuclear');
                const coreMyelCytoplasm = this.getSelectedCheckboxValues('core-myel-cytoplasm');
                const coreMyelOther = this.getSelectedCheckboxValues('core-myel-other');
                
                const allMyelFeatures = [...coreMyelCellularity, ...coreMyelNuclear, ...coreMyelCytoplasm, ...coreMyelOther];
                if (allMyelFeatures.length > 0) {
                    myelString += ` with features including ${allMyelFeatures.join(', ')}`;
                }
                
                if (coreMyelDescription) {
                    myelString += `. ${coreMyelDescription}`;
                }
                
                report += myelString + '.\n';
            }
            
            // Core Biopsy - Erythroid Lineage (moved to second position)
            const coreErythroid = this.getSelectedRadioValue('core-erythroid');
            const coreEryDescription = this.getValue('core-erythroid-description');
            
            if (coreErythroid) {
                let eryString = `Erythroid lineage maturation is ${coreErythroid}`;
                
                // Add detailed descriptors in narrative form
                const coreErySize = this.getSelectedCheckboxValues('core-ery-size');
                const coreEryNuclear = this.getSelectedCheckboxValues('core-ery-nuclear');
                const coreEryCytoplasm = this.getSelectedCheckboxValues('core-ery-cytoplasm');
                const coreEryMaturation = this.getSelectedCheckboxValues('core-ery-maturation');
                
                const allEryFeatures = [...coreErySize, ...coreEryNuclear, ...coreEryCytoplasm, ...coreEryMaturation];
                if (allEryFeatures.length > 0) {
                    eryString += ` with features including ${allEryFeatures.join(', ')}`;
                }
                
                if (coreEryDescription) {
                    eryString += `. ${coreEryDescription}`;
                }
                
                report += eryString + '.\n';
            }
            
            // Core Biopsy - Megakaryocytes (moved to third position)
            const coreMegakaryocytes = this.getSelectedRadioValue('core-megakaryocytes');
            const coreMegIhc = this.getValue('core-megakaryocyte-ihc');
            const coreMegDescription = this.getValue('core-megakaryocyte-description');
            
            // Build megakaryocyte sentence
            if (coreMegakaryocytes) {
                let megSentence = `Megakaryocytes are ${coreMegakaryocytes}`;
                
                // Add detailed descriptors in narrative form
                const coreMegSize = this.getSelectedCheckboxValues('core-meg-size');
                const coreMegNuclear = this.getSelectedCheckboxValues('core-meg-nuclear');
                const coreMegCytoplasm = this.getSelectedCheckboxValues('core-meg-cytoplasm');
                const coreMegOther = this.getSelectedCheckboxValues('core-meg-other');
                
                const allMegFeatures = [...coreMegSize, ...coreMegNuclear, ...coreMegCytoplasm, ...coreMegOther];
                if (allMegFeatures.length > 0) {
                    megSentence += ` with ${allMegFeatures.join(', ')}`;
                }
                
                if (coreMegIhc) {
                    megSentence += `. Megakaryocyte IHC shows ${coreMegIhc}`;
                }
                
                if (coreMegDescription) {
                    megSentence += `. ${coreMegDescription}`;
                }
                
                report += megSentence + '.\n';
            }
            
            // Core Biopsy - Lymphocytes & Plasma Cells
            const coreLymphSize = this.getSelectedCheckboxValues('core-lymph-size');
            const coreLymphNuclear = this.getSelectedCheckboxValues('core-lymph-nuclear');
            const coreLymphCytoplasm = this.getSelectedCheckboxValues('core-lymph-cytoplasm');
            const coreLymphDistribution = this.getSelectedCheckboxValues('core-lymph-distribution');
            const coreLymphDescription = this.getValue('core-lymphocytes-description');
            
            const allLymphFeatures = [...coreLymphSize, ...coreLymphNuclear, ...coreLymphCytoplasm, ...coreLymphDistribution];
            if (allLymphFeatures.length > 0) {
                let lymphString = `Lymphocytes and plasma cells demonstrate ${allLymphFeatures.join(', ')}`;
                
                if (coreLymphDescription) {
                    lymphString += `. ${coreLymphDescription}`;
                }
                
                report += lymphString + '.\n';
            } else if (coreLymphDescription) {
                report += `Lymphocytes and plasma cells: ${coreLymphDescription}.\n`;
            }

            // Core Biopsy - Architecture & Other Findings
            const coreArchAggregates = this.getSelectedCheckboxValues('core-arch-aggregates');
            const coreArchHemosiderin = this.getSelectedCheckboxValues('core-arch-hemosiderin');
            const coreArchOther = this.getSelectedCheckboxValues('core-arch-other');
            
            if (coreArchAggregates.length > 0) {
                report += `Lymphoid aggregates: ${coreArchAggregates.join(', ')}.\n`;
            }
            if (coreArchHemosiderin.length > 0) {
                report += `Hemosiderin-laden macrophages: ${coreArchHemosiderin.join(', ')}.\n`;
            }
            if (coreArchOther.length > 0) {
                report += `Other core findings: ${coreArchOther.join(', ')}.\n`;
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
            const aspirateMegDescription = this.getValue('aspirate-megakaryocyte-description');
            
            if (aspirateMegakaryocytes) {
                let aspirateMegSentence = `Megakaryocytes are ${aspirateMegakaryocytes}`;
                
                // Add detailed descriptors in narrative form
                const aspirateMegSize = this.getSelectedCheckboxValues('aspirate-meg-size');
                const aspirateMegNuclear = this.getSelectedCheckboxValues('aspirate-meg-nuclear');
                const aspirateMegCytoplasm = this.getSelectedCheckboxValues('aspirate-meg-cytoplasm');
                const aspirateMegOther = this.getSelectedCheckboxValues('aspirate-meg-other');
                
                const allAspirateMegFeatures = [...aspirateMegSize, ...aspirateMegNuclear, ...aspirateMegCytoplasm, ...aspirateMegOther];
                if (allAspirateMegFeatures.length > 0) {
                    aspirateMegSentence += ` with ${allAspirateMegFeatures.join(', ')}`;
                }
                
                if (aspirateMegDescription) {
                    aspirateMegSentence += `. ${aspirateMegDescription}`;
                }
                
                report += aspirateMegSentence + '.\n';
            }
            
            // Aspirate - Erythroid Lineage
            const aspirateErythroid = this.getSelectedRadioValue('aspirate-erythroid');
            const aspirateEryDescription = this.getValue('aspirate-erythroid-description');
            
            if (aspirateErythroid) {
                let aspirateEryString = `Erythroid lineage maturation is ${aspirateErythroid}`;
                
                // Add detailed descriptors in narrative form
                const aspirateErySize = this.getSelectedCheckboxValues('aspirate-ery-size');
                const aspirateEryNuclear = this.getSelectedCheckboxValues('aspirate-ery-nuclear');
                const aspirateEryCytoplasm = this.getSelectedCheckboxValues('aspirate-ery-cytoplasm');
                const aspirateEryMaturation = this.getSelectedCheckboxValues('aspirate-ery-maturation');
                
                const allAspirateEryFeatures = [...aspirateErySize, ...aspirateEryNuclear, ...aspirateEryCytoplasm, ...aspirateEryMaturation];
                if (allAspirateEryFeatures.length > 0) {
                    aspirateEryString += ` with features including ${allAspirateEryFeatures.join(', ')}`;
                }
                
                if (aspirateEryDescription) {
                    aspirateEryString += `. ${aspirateEryDescription}`;
                }
                
                report += aspirateEryString + '.\n';
            }
            
            // Aspirate - Myeloid Lineage
            const aspirateMyeloid = this.getSelectedRadioValue('aspirate-myeloid');
            const aspirateMyelDescription = this.getValue('aspirate-myeloid-description');
            
            if (aspirateMyeloid) {
                let aspirateMyelString = `Myeloid lineage maturation is ${aspirateMyeloid}`;
                
                // Add detailed descriptors in narrative form
                const aspirateMyelCellularity = this.getSelectedCheckboxValues('aspirate-myel-cellularity');
                const aspirateMyelNuclear = this.getSelectedCheckboxValues('aspirate-myel-nuclear');
                const aspirateMyelCytoplasm = this.getSelectedCheckboxValues('aspirate-myel-cytoplasm');
                const aspirateMyelOther = this.getSelectedCheckboxValues('aspirate-myel-other');
                
                const allAspirateMyelFeatures = [...aspirateMyelCellularity, ...aspirateMyelNuclear, ...aspirateMyelCytoplasm, ...aspirateMyelOther];
                if (allAspirateMyelFeatures.length > 0) {
                    aspirateMyelString += ` with features including ${allAspirateMyelFeatures.join(', ')}`;
                }
                
                if (aspirateMyelDescription) {
                    aspirateMyelString += `. ${aspirateMyelDescription}`;
                }
                
                report += aspirateMyelString + '.\n';
            }
            
            // Aspirate - Lymphocytes & Plasma Cells
            const aspirateLymphSize = this.getSelectedCheckboxValues('aspirate-lymph-size');
            const aspirateLymphNuclear = this.getSelectedCheckboxValues('aspirate-lymph-nuclear');
            const aspirateLymphCytoplasm = this.getSelectedCheckboxValues('aspirate-lymph-cytoplasm');
            const aspirateLymphDistribution = this.getSelectedCheckboxValues('aspirate-lymph-distribution');
            const aspirateLymphDescription = this.getValue('aspirate-lymphocytes-description');
            
            const allAspirateLymphFeatures = [...aspirateLymphSize, ...aspirateLymphNuclear, ...aspirateLymphCytoplasm, ...aspirateLymphDistribution];
            if (allAspirateLymphFeatures.length > 0) {
                let aspirateLymphString = `Lymphocytes and plasma cells demonstrate ${allAspirateLymphFeatures.join(', ')}`;
                
                if (aspirateLymphDescription) {
                    aspirateLymphString += `. ${aspirateLymphDescription}`;
                }
                
                report += aspirateLymphString + '.\n';
            } else if (aspirateLymphDescription) {
                report += `Lymphocytes and plasma cells: ${aspirateLymphDescription}.\n`;
            }
            
            report += '\n';
            

            
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

// Epic Data Parser Global Functions
window.epicParser = new EpicDataParser();

function parseEpicData() {
    const inputText = document.getElementById('epic-data-input').value;
    const resultsDiv = document.getElementById('parsing-results');
    const cbcDiv = document.getElementById('cbc-values');
    const autoDiffDiv = document.getElementById('auto-diff-values');
    const manualDiffDiv = document.getElementById('manual-diff-values');
    const errorsDiv = document.getElementById('parsing-errors');
    const errorMessages = document.getElementById('error-messages');

    if (!inputText.trim()) {
        alert('Please enter some Epic data to parse.');
        return;
    }

    try {
        const parsed = window.epicParser.parseAll(inputText);
        
        // Show results section
        resultsDiv.style.display = 'block';
        
        // Display CBC results
        cbcDiv.innerHTML = '';
        if (Object.keys(parsed.cbc).length > 0) {
            Object.keys(parsed.cbc).forEach(key => {
                const value = parsed.cbc[key];
                const span = document.createElement('span');
                span.className = 'parsed-value';
                span.innerHTML = `<strong>${key.toUpperCase()}:</strong> ${value}`;
                cbcDiv.appendChild(span);
            });
        } else {
            cbcDiv.innerHTML = '<em>No CBC data found</em>';
        }
        
        // Display Differential results (combined auto/manual)
        autoDiffDiv.innerHTML = '<h5>Differential Results:</h5>';
        const diffData = parsed.differential;
        
        if (diffData.diffMethod) {
            const methodSpan = document.createElement('div');
            methodSpan.style.fontStyle = 'italic';
            methodSpan.style.marginBottom = '8px';
            methodSpan.innerHTML = `Method: ${diffData.diffMethod}`;
            autoDiffDiv.appendChild(methodSpan);
        }
        
        if (diffData.diffMethod && diffData.diffMethod.includes('not performed')) {
            autoDiffDiv.innerHTML += '<em>Differential not performed</em>';
        } else {
            const diffKeys = Object.keys(diffData).filter(key => key !== 'diffMethod');
            if (diffKeys.length > 0) {
                diffKeys.forEach(key => {
                    const value = diffData[key];
                    const span = document.createElement('span');
                    span.className = 'parsed-value';
                    span.innerHTML = `<strong>${key.replace('_', ' ')}:</strong> ${value}%`;
                    autoDiffDiv.appendChild(span);
                });
            } else {
                autoDiffDiv.innerHTML += '<em>No differential data found</em>';
            }
        }
        
        // Display Morphology results
        manualDiffDiv.innerHTML = '<h5>Morphology & Special Findings:</h5>';
        const morphData = parsed.morphology;
        
        if (Object.keys(morphData).length > 0) {
            Object.keys(morphData).forEach(key => {
                const value = morphData[key];
                const span = document.createElement('span');
                span.className = 'parsed-value';
                if (key === 'nrbc') {
                    span.innerHTML = `<strong>NRBC:</strong> ${value}%`;
                } else {
                    span.innerHTML = `<strong>${key.replace(/([A-Z])/g, ' $1').trim()}:</strong> ${value}`;
                }
                manualDiffDiv.appendChild(span);
            });
        } else {
            manualDiffDiv.innerHTML += '<em>No morphology findings</em>';
        }
        
        // Hide errors if parsing was successful
        errorsDiv.style.display = 'none';
        
        // Generate narrative paragraph
        generateCBCParagraph(parsed);
        
    } catch (error) {
        console.error('Parsing error:', error);
        errorsDiv.style.display = 'block';
        errorMessages.innerHTML = `<div style="color: #721c24;">Error parsing data: ${error.message}</div>`;
    }
}

function clearEpicData() {
    document.getElementById('epic-data-input').value = '';
    document.getElementById('parsing-results').style.display = 'none';
}

function generateCBCParagraph(parsed) {
    let paragraph = '';
    
    // CBC paragraph
    if (Object.keys(parsed.cbc).length > 0) {
        const cbc = parsed.cbc;
        if (cbc.date) {
            paragraph += `CBC results from ${cbc.date} are as follows: `;
        } else {
            paragraph += 'CBC results are as follows: ';
        }
        
        const cbcParts = [];
        if (cbc.wbc) cbcParts.push(`WBC ${cbc.wbc} K/μL`);
        if (cbc.rbc) cbcParts.push(`RBC ${cbc.rbc} M/μL`);
        if (cbc.hgb) cbcParts.push(`HGB ${cbc.hgb} g/dL`);
        if (cbc.hct) cbcParts.push(`HCT ${cbc.hct}%`);
        if (cbc.mcv) cbcParts.push(`MCV ${cbc.mcv} fL`);
        if (cbc.mch) cbcParts.push(`MCH ${cbc.mch} pg`);
        if (cbc.mchc) cbcParts.push(`MCHC ${cbc.mchc} g/dL`);
        if (cbc.plt) cbcParts.push(`PLT ${cbc.plt} K/μL`);
        if (cbc.rdw) cbcParts.push(`RDW ${cbc.rdw}%`);
        
        paragraph += cbcParts.join(', ') + '.';
    }
    
    // Differential paragraph
    const diff = parsed.differential;
    if (diff && Object.keys(diff).length > 1) { // More than just diffMethod
        if (diff.diffMethod && diff.diffMethod.includes('not performed')) {
            paragraph += ` Differential was not performed due to low WBC count.`;
        } else {
            const method = diff.diffMethod || 'Unknown method';
            paragraph += ` ${method} differential`;
            
            if (method.toLowerCase().includes('auto')) {
                paragraph += ' shows ';
            } else if (method.toLowerCase().includes('manual')) {
                paragraph += ' demonstrates ';
            } else {
                paragraph += ' shows ';
            }
            
            const diffParts = [];
            
            // Order cell types for better readability
            const orderedTypes = ['neutrophils', 'bands', 'lymphocytes', 'atypical_lymphocytes', 'monocytes', 
                                'eosinophils', 'basophils', 'metamyelocytes', 'myelocytes', 'promyelocytes', 'blasts', 'other'];
            
            orderedTypes.forEach(type => {
                if (diff[type] !== undefined) {
                    const displayName = type.replace('_', ' ');
                    diffParts.push(`${diff[type]}% ${displayName}`);
                }
            });
            
            paragraph += diffParts.join(', ');
        }
    }
    
    // Include special differential findings and morphology
    const morph = parsed.morphology;
    const morphParts = [];
    
    // Add immature granulocytes from differential
    if (diff && diff.immature_granulocytes !== undefined) {
        morphParts.push(`${diff.immature_granulocytes}% immature granulocytes`);
    }
    
    // Add NRBC from differential or morphology with improved formatting
    if (diff && diff.nrbc !== undefined) {
        morphParts.push(`${diff.nrbc}% NRBCs`);
    } else if (morph && morph.nrbc) {
        morphParts.push(`${morph.nrbc}% NRBCs`);
    }
    
    // Other morphology findings
    if (morph && Object.keys(morph).length > 0) {
        if (morph.toxicGranulation && morph.toxicGranulation.toLowerCase() === 'present') {
            morphParts.push('toxic granulation');
        }
        if (morph.giantPlatelets && morph.giantPlatelets.toLowerCase() === 'present') {
            morphParts.push('giant platelets');
        }
        if (morph.atypicalLymphs) {
            morphParts.push(`${morph.atypicalLymphs}% atypical/reactive lymphocytes`);
        }
        if (morph.rbcMorph && morph.rbcMorph.toLowerCase() !== 'normal' && morph.rbcMorph.toLowerCase() !== 'completed') {
            morphParts.push(`RBC morphology: ${morph.rbcMorph.toLowerCase()}`);
        }
    }
    
    if (morphParts.length > 0) {
        // Add comma if there were differential parts, otherwise add space
        if (paragraph.trim().endsWith(',') || paragraph.includes('shows')) {
            paragraph += `, ${morphParts.join(', ')}.`;
        } else {
            paragraph += ` ${morphParts.join(', ')}.`;
        }
    } else {
        // Add period to close the differential sentence if no morphology parts
        if (paragraph.trim().endsWith(',') || (paragraph.includes('shows') && !paragraph.trim().endsWith('.'))) {
            paragraph += '.';
        }
    }
    
    // Store the paragraph globally so it can be used in report generation
    window.cbcParagraph = paragraph;
    
    // Add a section to show the generated paragraph
    let paragraphDiv = document.getElementById('generated-paragraph');
    if (!paragraphDiv) {
        paragraphDiv = document.createElement('div');
        paragraphDiv.id = 'generated-paragraph';
        paragraphDiv.className = 'parsed-section';
        paragraphDiv.innerHTML = '<h5>Generated Paragraph:</h5><div id="paragraph-text"></div>';
        document.getElementById('parsing-results').appendChild(paragraphDiv);
    }
    
    document.getElementById('paragraph-text').innerHTML = `<div style="font-style: italic; padding: 8px; background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 4px;">${paragraph}</div>`;
}

// Loneman Quick Texts data parsed from CSV
const LONEMAN_QUICK_TEXTS = {
    // Parsed from Loneman-Quick_texts.csv
    'mmneg': 'An immunostain for CD138 does not reveal any definitive plasma cells. Too few plasma cells are present to evaluate by in-situ hybridization for kappa and lambda.',
    'mmnegtop': '__cellular marrow with maturing trilineage hematopoiesis. There is no morphologic  or immunophenotypic evidence of a plasma cell neoplasm.',
    'mmpos': 'An immunostain for CD138 highlights singly scattered and small, perivascular clusters of plasma cells (<5% of cells) which are monotypic for kappa by in-situ hybridization for kappa and lambda light chains.',
    'noplas': 'No circulating plasma cells are seen.',
    'cyclinneg': 'Cyclin D1 is negative in plasma cells.',
    'plasasp': 'Plasma cells: Medium- to large-sized cells with round nuclei, condensed chromatin, and abundant cytoplasm. Occasional binucleate forms are seen.',
    'corrplas': 'COMMENT: Clinical, radiographic, and laboratory correlation are required for definitive classification.',
    'congoneg': 'A Congo red stain is negative for amyloid.',
    'congopos': 'A Congo red stain highlights perivascular amyloid deposition.',
    'knownmm': 'Involvement by the patient\'s known PLASMA CELL NEOPLASM.',
    'mmcyto': 'Cytology: Intermediate- to large-sized cells with round to irregular nuclear contours, coarse chromatin, variably prominent nucleoli, and moderate to abundant cytoplasm. Occasional multinucleated forms are seen.',
    'mmcore': 'Architecture: Patchy interstitial infiltration.',
    'corrcyto': 'COMMENT: Correlation with concurrent cytogenetics is recommended.',
    'polykl': 'polytypic by in-situ hybridization for kappa and lambda light chains.',
    'corrmol': 'COMMENT: Correlation with pending molecular and cytogenetic studies is recommended.',
    'corrmolcyto': 'COMMENT: Correlation with pending molecular and cytogenetic studies is recommended.',
    'corrmolcytochim': 'COMMENT: Correlation with pending molecular, cytogenetic, and chimerism studies is recommended.',
    'corrmolcytomrd': 'COMMENT: Correlation with pending minimal residual disease, molecular, and cytogenetic studies is recommended.',
    'cd34n': 'Blasts are not increased (<5% of cells) by a CD34 immunostain.',
    'p53n': 'A p53 stain shows variably staining, suggestive of wild-type expression.',
    'header': 'A-C. BONE MARROW CORE BIOPSY AND ASPIRATE SMEARS, PERIPHERAL BLOOD SMEAR:',
    'lsbc': 'left-shifted but complete.',
    'limitedbx': 'Limited; predominantly blood and soft tissue with only a small area of evaluable marrow.',
    'fewnormal': 'Normal hematopoietic elements are markedly decreased and [cannot be adequately evaluated]/[difficult to evaluate]',
    'nonheme': 'Note: Most of the cellularity consists of stromal cells; histiocytes (including frequent hemosiderin-laden cells); lymphocytes; and singly scattered and small, perivascular aggregates of mature-appearing plasma cells. The lymphocytes are seen singly scattered in the interstitium and in occasional small, interstitial aggregates. Lymphocytes appear  small- to intermediate-sized with round to irregular nuclear contours, condensed to moderately dispersed chromatin, inconspicuous nucleoli, and scant cytoplasm.',
    'nodx': 'No morphologic or flow cytometric  features of the patient\'s known ___ are seen.',
    'altcell': 'A recent study has shown that marrow cellularity declines with age at a slower rate than previously assumed, and the mean cellularity for this patient\'s age group is ~44% (standard deviation ~11%, PMID: 37904278).',
    'mgkmf': 'with frequent tight clustering, occasional paratrabecular localization, and exhibiting a morphologic spectrum, from hypolobated to hyperlobated forms and including occasional bulbous, hyperchromatic cells.',
    'mdsmpn': 'with focal clustering and exhibiting morphologic heterogeneity: some cells are overtly dysplastic, including small, hypolobated forms and occasional cells with separated nuclear lobes. Other cells are atypical, including hyperlobated forms and occasional bulbous, hyperchromatic cells with high N:C ratio.',
    'mgknorm': 'adequate in number and with overall normal morphology.',
    'blastcore': 'Architecture: Diffuse sheets. Cytology: Predominantly intermediate-sized cells with ovoid to irregular nuclei, finely dispersed chromatin, variably prominent nucleoli, and scant to moderate amounts of cytoplasm.',
    'inadeq': 'Note: The aspirate smear(s) and touch prep contain inadequate numbers of maturing hematopoietic elements for cellular enumeration or morphologic evaluation.',
    'celllimit': 'Maturing myeloids and erythroids are markedly decreased but without overt morphologic abnormalities.',
    'feneg': 'adequate storage iron. Ring sideroblasts do not appear increased.',
    'felow': 'Storage iron appears decreased, correlation with serum iron studies recommended.',
    'mdys': 'dysplastic, with hypogranular and hyposegmented cells.',
    'edys': 'dysplastic, with occasional nuclear-cytoplasmic asynchrony and multinucleated cells.',
    'mgkdys': 'dysplastic, with hypolobated forms and occasional cells with separated nuclear lobes.',
    'blastasp': 'Predominantly medium-sized cells with round to irregular nuclear countours, finely dispersed chromatin, prominent nucleoli, and scant to moderate basophilic cytoplasm with occasional sparse granulation',
    'pbsleb': 'red cell anisopoikilocytosis with frequent dacrocytes and occasional nucleated red cells; thrombocytopenia with occasional large platelets; and maturing and left-shifted myeloids, including occasional blasts, consistent with an leukoerythroblastic reaction.',
    'pbsmds': 'red cell anisopoikilocytosis; thrombocytopenia with occasional large platelets; and occasional hypogranular and hyposegmented neutrophils, including pseudo-Pelger-Huet cells',
    'lplac': 'Extensive interstitial infiltration by predominantly small lymphocytes with round to slightly irregular nuclei, moderately dispersed chromatin, inconspicuous nucleoli, and scant cytoplasm; a subset of plasmacytoid cells contain moderate amounts of cytoplasm with eccentric nuclei. Admixed plasma cells are also seen.',
    'cllac': 'Lymphocytes: Large paratrabecular aggregates of small cells with round to slightly irregular nuclei, clumped chromatin, inconspicuous nucleoli, and scant cytoplasm. An immunostain reveals the cells to be B cells (PAX5+) with aberrant expression of CD5 and which constitute >90% of the cellularity.',
    'cllasp': 'Lymphocytes: Small- to medium-sized cells with round to slightly irregular nuclei, clumped to moderately dispersed chromatin, inconspicuous nucleoli, and scant cytoplasm.',
    'knownmn': 'Involvement by the patient\'s known MYELOID NEOPLASM.'
};

// Text Expansion System
class TextExpansionSystem {
    constructor() {
        this.quickTexts = LONEMAN_QUICK_TEXTS;
        this.setupEventListeners();
        this.createHelpModal();
        this.createFloatingHelpButton();
    }

    setupEventListeners() {
        // Add F8 key listener to all text areas and text inputs
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F8') {
                event.preventDefault();
                this.handleTextExpansion(event.target);
            }
        });
    }

    handleTextExpansion(targetElement) {
        // Check if the target is a text input or textarea
        if (!this.isTextInputElement(targetElement)) {
            return;
        }

        const cursorPosition = targetElement.selectionStart;
        const textBeforeCursor = targetElement.value.substring(0, cursorPosition);
        
        // Find the word immediately before the cursor
        const wordMatch = textBeforeCursor.match(/\S+$/);
        if (!wordMatch) {
            return;
        }

        const word = wordMatch[0];
        const wordStartPosition = cursorPosition - word.length;
        
        // Look for matching code (case insensitive)
        const matchingCode = this.findMatchingCode(word);
        if (matchingCode) {
            const expandedText = this.quickTexts[matchingCode];
            
            // Replace the word with the expanded text
            const textBefore = targetElement.value.substring(0, wordStartPosition);
            const textAfter = targetElement.value.substring(cursorPosition);
            
            targetElement.value = textBefore + expandedText + textAfter;
            
            // Position cursor at the end of the expanded text
            const newCursorPosition = wordStartPosition + expandedText.length;
            targetElement.selectionStart = newCursorPosition;
            targetElement.selectionEnd = newCursorPosition;
            
            // Trigger input event to update any form handling
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    isTextInputElement(element) {
        return element && (
            element.tagName === 'TEXTAREA' ||
            (element.tagName === 'INPUT' && element.type === 'text')
        );
    }

    findMatchingCode(word) {
        const lowerWord = word.toLowerCase();
        // Check for exact match first
        if (this.quickTexts[lowerWord]) {
            return lowerWord;
        }
        
        // Check all keys for case-insensitive match
        for (const code in this.quickTexts) {
            if (code.toLowerCase() === lowerWord) {
                return code;
            }
        }
        
        return null;
    }



    createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'text-expansion-help-modal';
        modal.className = 'text-expansion-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'text-expansion-modal-content';
        modalContent.style.cssText = `
            background-color: white;
            margin: 2% auto;
            padding: 20px;
            border-radius: 12px;
            width: 90%;
            max-width: 900px;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            position: relative;
        `;
        
        // Create modal header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 15px;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Text Expansion Reference';
        title.style.cssText = `
            color: #2c3e50;
            margin: 0;
            font-size: 1.5rem;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        `;
        closeButton.onmouseover = () => closeButton.style.background = '#f0f0f0';
        closeButton.onmouseout = () => closeButton.style.background = 'none';
        closeButton.onclick = () => this.hideHelpModal();
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Create instructions
        const instructions = document.createElement('div');
        instructions.innerHTML = `
            <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
                <strong>How to use:</strong> Type any CODE (case insensitive) and press <kbd style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; border: 1px solid #ccc;">F8</kbd> to expand it to the full Comment text.
            </div>
        `;
        
        // Create search box
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '20px';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search codes or comments...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 10px;
            border: 2px solid #e1e8ed;
            border-radius: 6px;
            font-size: 1rem;
            box-sizing: border-box;
        `;
        
        searchContainer.appendChild(searchInput);
        
        // Create expansions table
        const tableContainer = document.createElement('div');
        tableContainer.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e1e8ed;
            border-radius: 6px;
        `;
        
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        `;
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057; width: 150px;">CODE</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-weight: 600; color: #495057;">COMMENT</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        tbody.id = 'expansions-table-body';
        
        this.populateExpansionsTable(tbody);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        
        // Search functionality
        searchInput.addEventListener('input', () => {
            this.filterExpansions(searchInput.value.toLowerCase(), tbody);
        });
        
        modalContent.appendChild(header);
        modalContent.appendChild(instructions);
        modalContent.appendChild(searchContainer);
        modalContent.appendChild(tableContainer);
        modal.appendChild(modalContent);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.hideHelpModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                this.hideHelpModal();
            }
        });
        
        document.body.appendChild(modal);
    }

    populateExpansionsTable(tbody) {
        tbody.innerHTML = '';
        
        // Sort codes alphabetically
        const sortedCodes = Object.keys(this.quickTexts).sort();
        
        sortedCodes.forEach((code, index) => {
            const row = document.createElement('tr');
            row.style.cssText = `
                ${index % 2 === 0 ? 'background: #fff;' : 'background: #f8f9fa;'}
                transition: background-color 0.2s ease;
            `;
            row.onmouseover = () => row.style.background = '#e3f2fd';
            row.onmouseout = () => row.style.background = index % 2 === 0 ? '#fff' : '#f8f9fa';
            
            const comment = this.quickTexts[code];
            row.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #e1e8ed; font-family: 'Courier New', monospace; font-weight: 600; color: #2c3e50; vertical-align: top;">${code.toUpperCase()}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e1e8ed; line-height: 1.4; color: #495057;">${comment}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    filterExpansions(searchTerm, tbody) {
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const code = row.querySelector('td:first-child').textContent.toLowerCase();
            const comment = row.querySelector('td:last-child').textContent.toLowerCase();
            
            if (code.includes(searchTerm) || comment.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    createFloatingHelpButton() {
        const button = document.createElement('button');
        button.id = 'floating-help-button';
        button.innerHTML = '❓';
        button.title = 'Show Text Expansion Help (F8 to expand codes)';
        button.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #FF6B6B 0%, #ee5a52 100%);
            border: none;
            font-size: 1.5rem;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(255, 107, 107, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 16px rgba(255, 107, 107, 0.4)';
        };
        
        button.onclick = () => this.showHelpModal();
        
        document.body.appendChild(button);
    }

    showHelpModal() {
        const modal = document.getElementById('text-expansion-help-modal');
        if (modal) {
            modal.style.display = 'block';
            // Focus the search input
            const searchInput = modal.querySelector('input[type="text"]');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }

    hideHelpModal() {
        const modal = document.getElementById('text-expansion-help-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marrowApp = new MarrowReportApp();
    window.marrowApp.setupAutoSave();
    
    // Initialize text expansion system
    window.textExpansion = new TextExpansionSystem();
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
