const pdfUrl = "../pdfs/invoice.pdf";  // Make sure this matches your server path
const jsonUrl = "../pdfs/invoice.json"; // Make sure the JSON file is in this location

// Add these variables at the top of your script
let pdfPageHeight = 0;
let pdfPageWidth = 0;
let pdfViewport = null;
let pdfDoc = null;
let scale = 1.5;
const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const viewerContainer = document.getElementById("viewer-container");

// Variables for offset correction
let globalOffsetX = 0;
let globalOffsetY = 0;

// Object to store edited values
let editedValues = {
    fields: {}, // For non-table fields
    tableCells: {} // For table cells
};

// Update your PDF loading code
pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
    pdfDoc = doc;
    return doc.getPage(1);
}).then(page => {
    const viewport = page.getViewport({ scale });
    pdfViewport = viewport;

    // Store the actual PDF dimensions (unscaled)
    pdfPageWidth = viewport.width / scale;   // Original width
    pdfPageHeight = viewport.height / scale; // Original height

    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Adjust viewer-container to match canvas size
    viewerContainer.style.width = `${viewport.width}px`;
    viewerContainer.style.height = `${viewport.height}px`;

    const renderContext = { canvasContext: ctx, viewport };
    return page.render(renderContext).promise;
}).then(() => {
    loadExtractionResults();
});

// Highlight function (unchanged)
function highlightField(bbox, pageWidth, pageHeight) {
    const highlight = document.createElement("div");
    highlight.className = "highlight";


    // Get the canvas dimensions (scaled)

    // Get the canvas dimensions (scaled)
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;


    // Normalize the coordinates based on the difference between JSON and PDF.js page dimensions

    // Normalize the coordinates based on the difference between JSON and PDF.js page dimensions
    const widthRatio = pdfPageWidth / pageWidth;
    const heightRatio = pdfPageHeight / pageHeight;


    // Calculate scaling factors based on the original page dimensions

    // Calculate scaling factors based on the original page dimensions
    const scaleX = actualWidth / pdfPageWidth;
    const scaleY = actualHeight / pdfPageHeight;

    let y = bbox[0];
    let x = bbox[1];
    let width = bbox[2];
    let height = bbox[3];


    // Log the raw values for debugging

    // Log the raw values for debugging
    console.log(`Raw bbox: y=${y}, x=${x}, width=${width}, height=${height}`);
    console.log(`Page dimensions from JSON: width=${pageWidth}, height=${pageHeight}`);
    console.log(`PDF.js page dimensions (unscaled): width=${pdfPageWidth}, height=${pdfPageHeight}`);
    console.log(`Scaling ratios: widthRatio=${widthRatio}, heightRatio=${heightRatio}`);


    // Normalize the coordinates based on the page dimension ratios

    // Normalize the coordinates based on the page dimension ratios
    x = x * widthRatio;
    y = y * heightRatio;
    width = width * widthRatio;
    height = height * heightRatio;


    // Apply scaling to match the canvas

    // Apply scaling to match the canvas
    const left = x * scaleX + globalOffsetX;
    const top = y * scaleY + globalOffsetY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;


    // Log the calculated positions

    // Log the calculated positions
    console.log(`Calculated position: left=${left}, top=${top}, scaledWidth=${scaledWidth}, scaledHeight=${scaledHeight}`);


    // Set styles for the highlight

    // Set styles for the highlight
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${scaledWidth}px`;
    highlight.style.height = `${scaledHeight}px`;
    highlight.style.border = "2px solid rgba(255, 0, 0, 0.7)";

    viewerContainer.appendChild(highlight);
}

// Updated loadExtractionResults to make fields editable
function loadExtractionResults() {
    // Clear existing highlights
    document.querySelectorAll('.highlight').forEach(highlight => {
        highlight.remove();
    });

    fetch(jsonUrl)
        .then(response => response.json())
        .then(data => {
            const extractedFields = document.getElementById("extracted-fields");
            extractedFields.innerHTML = "";

            // Process Fields (non-table fields)
            data.extractionResult.ResultsDocument.Fields.forEach((field, fieldIndex) => {
                field.Values.forEach((value, valueIndex) => {
                    const fieldKey = `field-${fieldIndex}-${valueIndex}`;
                    const li = document.createElement("li");
                    li.className = "list-group-item d-flex align-items-center";

                    // Create a container for the field name and value
                    const fieldContainer = document.createElement("div");
                    fieldContainer.className = "d-flex align-items-center w-100";

                    // Field name
                    const fieldName = document.createElement("span");
                    fieldName.textContent = `${field.FieldName}: `;
                    fieldName.style.minWidth = "150px";
                    fieldContainer.appendChild(fieldName);

                    // Editable value
                    const valueSpan = document.createElement("span");
                    valueSpan.className = "editable-field";
                    valueSpan.textContent = editedValues.fields[fieldKey] || value.Value;
                    valueSpan.dataset.originalValue = value.Value;
                    valueSpan.dataset.fieldKey = fieldKey;

                    // On click, switch to input mode
                    valueSpan.onclick = function() {
                        const currentValue = valueSpan.textContent;
                        const input = document.createElement("input");
                        input.type = "text";
                        input.className = "editable-input form-control form-control-sm";
                        input.value = currentValue;

                        // Replace the span with the input
                        valueSpan.replaceWith(input);
                        input.focus();

                        // On blur or enter, save the value and switch back to span
                        input.onblur = function() {
                            const newValue = input.value;
                            const newSpan = document.createElement("span");
                            newSpan.className = "editable-field";
                            newSpan.textContent = newValue;
                            newSpan.dataset.originalValue = value.Value;
                            newSpan.dataset.fieldKey = fieldKey;
                            newSpan.onclick = valueSpan.onclick; // Reattach the click handler
                            input.replaceWith(newSpan);
                            editedValues.fields[fieldKey] = newValue;
                        };

                        input.onkeypress = function(e) {
                            if (e.key === "Enter") {
                                input.blur();
                            }
                        };
                    };

                    fieldContainer.appendChild(valueSpan);
                    li.appendChild(fieldContainer);
                    extractedFields.appendChild(li);

                    // Process bounding boxes
                    if (value.Reference && value.Reference.Tokens) {
                        value.Reference.Tokens.forEach(token => {
                            if (token.Boxes && token.Boxes.length > 0) {
                                if (token.Boxes.length > 1) {
                                    let minX = Infinity, minY = Infinity;
                                    let maxX = -Infinity, maxY = -Infinity;
                                    token.Boxes.forEach(box => {
                                        const y = box[0], x = box[1], width = box[2], height = box[3];
                                        minX = Math.min(minX, x);
                                        minY = Math.min(minY, y);
                                        maxX = Math.max(maxX, x + width);
                                        maxY = Math.max(maxY, y + height);
                                    });
                                    const combinedBox = [minY, minX, maxX - minX, maxY - minY];
                                    highlightField(combinedBox, token.PageWidth, token.PageHeight);
                                } else {
                                    token.Boxes.forEach(box => {
                                        highlightField(box, token.PageWidth, token.PageHeight);
                                    });
                                }
                            }
                        });
                    }
                });
            });

            // Process Tables (line items)
            const thead = document.getElementById("line-items-thead");
            const tbody = document.getElementById("line-items-tbody");
            thead.innerHTML = "";
            tbody.innerHTML = "";

            if (data.extractionResult.ResultsDocument.Tables && data.extractionResult.ResultsDocument.Tables.length > 0) {
                data.extractionResult.ResultsDocument.Tables.forEach((table, tableIndex) => {
                    // Step 1: Extract headers
                    const headers = [];
                    const headerCells = table.Values[0].Cells.filter(cell => cell.IsHeader);
                    headerCells.sort((a, b) => a.ColumnIndex - b.ColumnIndex);
                    headerCells.forEach(cell => {
                        const headerValue = cell.Values && cell.Values.length > 0 ? cell.Values[0].Value : "";
                        headers.push(headerValue);
                    });

                    // Step 2: Create table header row
                    const headerRow = document.createElement("tr");
                    headers.forEach(header => {
                        const th = document.createElement("th");
                        th.textContent = header;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);

                    // Step 3: Extract data rows
                    const dataCells = table.Values[0].Cells.filter(cell => !cell.IsHeader);
                    const rows = {};
                    dataCells.forEach(cell => {
                        const rowIndex = cell.RowIndex;
                        if (!rows[rowIndex]) {
                            rows[rowIndex] = [];
                        }
                        rows[rowIndex][cell.ColumnIndex] = cell;
                    });

                    // Step 4: Create table body rows
                    Object.keys(rows).forEach(rowIndex => {
                        const rowData = rows[rowIndex];
                        const tr = document.createElement("tr");
                        headers.forEach((_, colIndex) => {
                            const td = document.createElement("td");
                            const cell = rowData[colIndex];
                            const cellKey = `table-${tableIndex}-${rowIndex}-${colIndex}`;

                            const valueSpan = document.createElement("span");
                            valueSpan.className = "editable-field";
                            if (cell && cell.Values && cell.Values.length > 0) {
                                valueSpan.textContent = editedValues.tableCells[cellKey] || cell.Values[0].Value || "";
                                valueSpan.dataset.originalValue = cell.Values[0].Value || "";
                            } else {
                                valueSpan.textContent = editedValues.tableCells[cellKey] || "N/A";
                                valueSpan.dataset.originalValue = "N/A";
                            }
                            valueSpan.dataset.cellKey = cellKey;

                            // On click, switch to input mode
                            valueSpan.onclick = function() {
                                const currentValue = valueSpan.textContent;
                                const input = document.createElement("input");
                                input.type = "text";
                                input.className = "editable-input form-control form-control-sm";
                                input.value = currentValue;

                                // Replace the span with the input
                                valueSpan.replaceWith(input);
                                input.focus();

                                // On blur or enter, save the value and switch back to span
                                input.onblur = function() {
                                    const newValue = input.value;
                                    const newSpan = document.createElement("span");
                                    newSpan.className = "editable-field";
                                    newSpan.textContent = newValue;
                                    newSpan.dataset.originalValue = valueSpan.dataset.originalValue;
                                    newSpan.dataset.cellKey = cellKey;
                                    newSpan.onclick = valueSpan.onclick;
                                    input.replaceWith(newSpan);
                                    editedValues.tableCells[cellKey] = newValue;
                                };

                                input.onkeypress = function(e) {
                                    if (e.key === "Enter") {
                                        input.blur();
                                    }
                                };
                            };

                            td.appendChild(valueSpan);
                            tr.appendChild(td);

                            // Highlight the cell if it has bounding boxes
                            if (cell && cell.Values && cell.Values.length > 0 && cell.Values[0].Reference && cell.Values[0].Reference.Tokens) {
                                cell.Values[0].Reference.Tokens.forEach(token => {
                                    if (token.Boxes && token.Boxes.length > 0) {
                                        if (token.Boxes.length > 1) {
                                            let minX = Infinity, minY = Infinity;
                                            let maxX = -Infinity, maxY = -Infinity;
                                            token.Boxes.forEach(box => {
                                                const y = box[0], x = box[1], width = box[2], height = box[3];
                                                minX = Math.min(minX, x);
                                                minY = Math.min(minY, y);
                                                maxX = Math.max(maxX, x + width);
                                                maxY = Math.max(maxY, y + height);
                                            });
                                            const combinedBox = [minY, minX, maxX - minX, maxY - minY];
                                            highlightField(combinedBox, token.PageWidth, token.PageHeight);
                                        } else {
                                            token.Boxes.forEach(box => {
                                                highlightField(box, token.PageWidth, token.PageHeight);
                                            });
                                        }
                                    }
                                });
                            }
                        });
                        tbody.appendChild(tr);
                    });
                });
            }
        })
        .catch(error => console.error("Error loading JSON:", error));
}

// Function to save changes
function saveChanges() {
    // Update the UI with the edited values
    document.querySelectorAll('.editable-field').forEach(span => {
        const key = span.dataset.fieldKey || span.dataset.cellKey;
        if (key) {
            if (key.startsWith('field-')) {
                span.textContent = editedValues.fields[key] || span.dataset.originalValue;
            } else if (key.startsWith('table-')) {
                span.textContent = editedValues.tableCells[key] || span.dataset.originalValue;
            }
        }
    });

    // Optionally, you can save the edited values to a server or local storage
    console.log("Edited Values:", editedValues);

    // For now, we'll just log the changes
    alert("Changes saved successfully!");
}
