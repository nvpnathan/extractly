const API_BASE_URL = "http://127.0.0.1:8000/api/process-docs";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Process Documents page loaded");
    fetchExistingFiles();
});

function fetchExistingFiles() {
    fetch(`${API_BASE_URL}/files`)
        .then(response => response.json())
        .then(data => {
            const fileList = document.getElementById("document-list");
            data.files.forEach(file => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${file}</td>
                    <td><span class="badge bg-success">Completed</span></td>
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

function processDocuments() {
    const fileInput = document.getElementById("document-upload");
    const fileList = document.getElementById("document-list");

    if (fileInput.files.length === 0) {
        alert("Please select at least one file.");
        return;
    }

    Array.from(fileInput.files).forEach((file, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${file.name}</td>
            <td><span class="badge bg-warning">Processing...</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDocument('${file.name}')">View</button>
            </td>
        `;
        fileList.appendChild(row);

        // Upload file to FastAPI /upload endpoint
        const formData = new FormData();
        formData.append("files", file);

        fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.info) {
                row.querySelector(".badge").classList.remove("bg-warning");
                row.querySelector(".badge").classList.add("bg-success");
                row.querySelector(".badge").innerText = "Completed";
            } else {
                row.querySelector(".badge").classList.remove("bg-warning");
                row.querySelector(".badge").classList.add("bg-danger");
                row.querySelector(".badge").innerText = "Failed";
            }
        })
        .catch(error => {
            console.error("Error uploading file:", error);
            row.querySelector(".badge").classList.remove("bg-warning");
            row.querySelector(".badge").classList.add("bg-danger");
            row.querySelector(".badge").innerText = "Failed";
        });
    });
}

function viewDocument(filename) {
    alert("Viewing: " + filename);
    // Implement PDF Viewer Logic Here
}
