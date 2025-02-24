const API_BASE_URL = "http://127.0.0.1:8000/api/discovery";
let settings = {
    validate_classification: false,
    validate_extraction: false,
    validate_extraction_later: false,
    perform_classification: false,
    perform_extraction: false
};

document.addEventListener("DOMContentLoaded", () => {
    fetchProjects();
    fetchSettings();
});

function fetchProjects() {
    fetch(`${API_BASE_URL}/projects`)
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById("project-table-body");
            tableBody.innerHTML = ""; // Clear existing data

            data.forEach(project => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${project.name}</td>
                    <td>${project.type}</td>
                    <td>${project.description}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="selectProject('${project.id}')">Select</button></td>
                `;

                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Error fetching projects:", error));
}

function fetchSettings() {
    fetch(`${API_BASE_URL}/settings`)
        .then(response => response.json())
        .then(data => {
            settings = data; // Store settings globally
            updateSliders();
        })
        .catch(error => console.error("Error fetching settings:", error));
}

function updateSettings() {
    fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => console.log("Settings updated:", data))
    .catch(error => console.error("Error updating settings:", error));
}

function updateSliders() {
    document.getElementById("validate_classification").checked = settings.validate_classification;
    document.getElementById("validate_extraction").checked = settings.validate_extraction;
    document.getElementById("validate_extraction_later").checked = settings.validate_extraction_later;
    document.getElementById("perform_classification").checked = settings.perform_classification;
    document.getElementById("perform_extraction").checked = settings.perform_extraction;
}

function toggleSetting(settingKey) {
    settings[settingKey] = !settings[settingKey]; // Toggle boolean value
    updateSettings();
}

function filterProjects() {
    const searchValue = document.getElementById("project-search").value.toLowerCase();
    const rows = document.querySelectorAll("#project-table-body tr");

    rows.forEach(row => {
        const [name, type, description] = row.children;
        const rowText = `${name.textContent} ${type.textContent} ${description.textContent}`.toLowerCase();
        row.style.display = rowText.includes(searchValue) ? "" : "none";
    });
}

function selectProject(projectId) {
    console.log("Selected Project ID:", projectId);

    if (settings.perform_classification) {
        fetchClassifiers(projectId);
    }
}

function fetchClassifiers(projectId) {
    fetch(`${API_BASE_URL}/project/${projectId}/classifiers`)
        .then(response => response.json())
        .then(data => {
            const classifierSelect = document.getElementById("classifier-select");
            classifierSelect.innerHTML = '<option value="">Select a Classifier</option>'; // Reset options

            data.forEach(classifier => {
                const option = document.createElement("option");
                option.value = classifier.id;
                option.textContent = classifier.name;
                classifierSelect.appendChild(option);
            });

            classifierSelect.disabled = false; // Enable dropdown
        })
        .catch(error => console.error("Error fetching classifiers:", error));
}
