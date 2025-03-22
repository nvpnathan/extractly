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

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderContext = { canvasContext: ctx, viewport };
    return page.render(renderContext).promise;
}).then(() => {
    loadExtractionResults();
});

// Updated highlight function
function highlightField(bbox, pageWidth, pageHeight) {
    const highlight = document.createElement("div");
    highlight.className = "highlight";

    // Get the canvas dimensions (scaled)
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;

    // Normalize the coordinates based on the difference between JSON and PDF.js page dimensions
    const widthRatio = pdfPageWidth / pageWidth;
    const heightRatio = pdfPageHeight / pageHeight;

    // Calculate scaling factors based on the original page dimensions
    const scaleX = actualWidth / pdfPageWidth;
    const scaleY = actualHeight / pdfPageHeight;

    // Get bounding box values: [y, x, width, height]
    let y = bbox[0];      // Y-coordinate (bottom-left origin)
    let x = bbox[1];      // X-coordinate
    let width = bbox[2];
    let height = bbox[3];

    // Log the raw values for debugging
    console.log(`Raw bbox: y=${y}, x=${x}, width=${width}, height=${height}`);
    console.log(`Page dimensions from JSON: width=${pageWidth}, height=${pageHeight}`);
    console.log(`PDF.js page dimensions (unscaled): width=${pdfPageWidth}, height=${pdfPageHeight}`);
    console.log(`Scaling ratios: widthRatio=${widthRatio}, heightRatio=${heightRatio}`);

    // Normalize the coordinates based on the page dimension ratios
    x = x * widthRatio;
    y = y * heightRatio;
    width = width * widthRatio;
    height = height * heightRatio;

    // Apply scaling to match the canvas
    const left = x * scaleX + globalOffsetX;
    const top = y * scaleY + globalOffsetY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    // Log the calculated positions
    console.log(`Calculated position: left=${left}, top=${top}, scaledWidth=${scaledWidth}, scaledHeight=${scaledHeight}`);

    // Set styles for the highlight
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${scaledWidth}px`;
    highlight.style.height = `${scaledHeight}px`;
    highlight.style.border = "2px solid rgba(255, 0, 0, 0.7)"; // Visible border for debugging

    // Add highlight to viewer
    viewerContainer.appendChild(highlight);
}

// Update loadExtractionResults to clear existing highlights first
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

            // Process each field
            data.extractionResult.ResultsDocument.Fields.forEach(field => {
                field.Values.forEach(value => {
                    // Create list item
                    const li = document.createElement("li");
                    li.className = "list-group-item";
                    li.textContent = `${field.FieldName}: ${value.Value}`;
                    extractedFields.appendChild(li);

                    // Process bounding boxes
                    if (value.Reference && value.Reference.Tokens) {
                        value.Reference.Tokens.forEach(token => {
                            if (token.Boxes && token.Boxes.length > 0) {
                                // If there are multiple boxes, we can either:
                                // 1. Create a single highlight that encompasses all boxes
                                // 2. Create a highlight for each box
                                // Let's go with option 1 for "PAYABLE WITHIN 15 DAYS OF RECEIPT"
                                if (token.Boxes.length > 1) {
                                    // Find the bounding box that encompasses all boxes
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
        })
        .catch(error => console.error("Error loading JSON:", error));
}
