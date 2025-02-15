document.addEventListener("DOMContentLoaded", () => {
    console.log("Process Documents page loaded");
});

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
    });

    // Simulate processing
    setTimeout(() => {
        document.querySelectorAll("#document-list .badge").forEach(badge => {
            badge.classList.remove("bg-warning");
            badge.classList.add("bg-success");
            badge.innerText = "Completed";
        });
    }, 2000);
}

function viewDocument(filename) {
    alert("Viewing: " + filename);
    // Implement PDF Viewer Logic Here
}
