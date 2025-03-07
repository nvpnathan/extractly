const API_BASE_URL = "http://127.0.0.1:8000/api/process-docs";
const API_WS_BASE_URL = "ws://localhost:8000/api/process-docs";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Process Documents page loaded");
    fetchExistingFiles();
});

function fetchExistingFiles() {
    fetch(`${API_BASE_URL}/files`)
        .then(response => response.json())
        .then(data => {
            const fileList = document.getElementById("document-list");
            const processButton = document.getElementById("process-docs-btn");

            if (data.files.length > 0) {
                processButton.disabled = false;
            }

            data.files.forEach(file => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${file}</td>
                    <td><span class="badge bg-success">Uploaded</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewDocument('${file}')">View</button>
                    </td>
                `;
                fileList.appendChild(row);
            });
        })
        .catch(error => {
            console.error("Error fetching files:", error);
        });
}

function uploadDocuments() {
    const fileInput = document.getElementById("document-upload");
    const fileList = document.getElementById("document-list");
    const processButton = document.getElementById("process-docs-btn");

    if (fileInput.files.length === 0) {
        alert("Please select at least one file.");
        return;
    }

    const formData = new FormData();
    const allowedExtensions = [".png", ".jpg", ".jpeg", ".pdf", ".tif"];

    Array.from(fileInput.files).forEach(file => {
        const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            alert(`File type not supported: ${file.name}`);
            return;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${file.name}</td>
            <td><span class="badge bg-warning">Processing...</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDocument('${file.name}')" disabled>View</button>
            </td>
        `;
        fileList.appendChild(row);
        formData.append("files", file);
    });

    fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        data.uploaded_files.forEach(file => {
            const row = Array.from(fileList.rows).find(row => row.cells[0].innerText === file);
            if (row) {
                const badge = row.querySelector(".badge");
                badge.classList.remove("bg-warning");
                badge.classList.add("bg-success");
                badge.innerText = "Uploaded";

                // Enable "View" button
                const viewButton = row.querySelector("button");
                viewButton.disabled = false;
            }
        });

        // Enable "Process Documents" button after successful upload
        processButton.disabled = false;
    })
    .catch(error => {
        console.error("Error uploading files:", error);
        Array.from(fileList.rows).forEach(row => {
            if (row.querySelector(".badge").innerText === "Processing...") {
                const badge = row.querySelector(".badge");
                badge.classList.remove("bg-warning");
                badge.classList.add("bg-danger");
                badge.innerText = "Failed";
            }
        });
    });
}

function processDocuments() {
    const processButton = document.getElementById("process-docs-btn");

    fetch(`${API_BASE_URL}/process`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Processing started") {
            alert("Document processing has started.");
        } else {
            alert("Error: " + (data.error || "Unknown error"));
        }

        // Disable button after processing to prevent multiple clicks
        processButton.disabled = true;
    })
    .catch(error => {
        console.error("Error processing documents:", error);
        alert("An error occurred while processing documents.");
    });
}

function viewDocument(filename) {
    alert(`Viewing document: ${filename}`);
    // Implement actual document viewer logic here
}

document.addEventListener("DOMContentLoaded", function () {
    const socket = new WebSocket(`${API_WS_BASE_URL}/ws/status/`);

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        updateDocumentTable(data.documents);
    };

    socket.onclose = function () {
        console.warn("WebSocket connection closed. Reconnecting...");
        setTimeout(() => location.reload(), 5000);
    };
});

function updateDocumentTable(documents) {
    const documentList = document.getElementById("document-list");
    documentList.innerHTML = "";  // Clear table before updating

    documents.forEach(doc => {
        const row = document.createElement("tr");

        // Filename Column
        const filenameCell = document.createElement("td");
        filenameCell.textContent = doc[0];

        // Status Column
        const statusCell = document.createElement("td");
        statusCell.textContent = doc[1]; // e.g., "Uploaded", "Processing", "Completed"
        statusCell.className = getStatusBadgeClass(doc[1]);

        // Append to row
        row.appendChild(filenameCell);
        row.appendChild(statusCell);
        documentList.appendChild(row);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "digitization":
            return "badge bg-secondary";
        case "classification":
            return "badge bg-warning";
        case "extraction":
            return "badge bg-success text-light";
        case "error":
            return "badge bg-error";
        default:
            return "badge bg-info text-light"; // Ensures readable text
    }
}
