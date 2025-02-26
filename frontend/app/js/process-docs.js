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

        // Upload file to ../pdf directory
        const formData = new FormData();
        formData.append("file", file);

        fetch("../pdfs/", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
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
