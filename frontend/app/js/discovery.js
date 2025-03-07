const API_BASE_URL = "http://127.0.0.1:8000/api/discovery";
let settings = {
    validate_classification: false,
    validate_extraction: false,
    validate_extraction_later: false,
    perform_classification: false,
    perform_extraction: false,
    project: {}
};

let availableProjects = [];
let availableClassifiers = [];
let availableExtractors = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchProjects();
    fetchSettings();
});

function fetchSettings() {
    fetch(`${API_BASE_URL}/settings`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        settings = data; // Store settings globally
        updateSliders();

        // If we have a selected project, update the UI to reflect it
        if (settings.project && settings.project.id) {
            updateSelectedProjectUI(settings.project.id);

            // Load classifiers and extractors if needed
            if (settings.perform_classification) {
                fetchClassifiers(settings.project.id);
            }

            if (settings.perform_extraction) {
                fetchExtractors(settings.project.id);
            }
        }
    })
    .catch(error => {
        console.error("Error fetching settings:", error);
        showStatusMessage("Failed to load settings. Please try again.", "danger");
    });
}

function updateSettings() {
    // console.log("Sending settings:", settings);  // Debug log before sending

    fetch(`${API_BASE_URL}/settings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Settings updated:", data);
    })
    .catch(error => {
        console.error("Error updating settings:", error);
        showStatusMessage("Failed to update settings. Please try again.", "danger");
    });
}

function updateSliders() {
    document.getElementById("validate_classification").checked = settings.validate_classification;
    document.getElementById("validate_extraction").checked = settings.validate_extraction;
    document.getElementById("validate_extraction_later").checked = settings.validate_extraction_later;
    document.getElementById("perform_classification").checked = settings.perform_classification;
    document.getElementById("perform_extraction").checked = settings.perform_extraction;

    // Update the disabled state of validate_extraction_later
    toggleExtractionLater();
}

function toggleSetting(settingKey) {
    settings[settingKey] = !settings[settingKey]; // Toggle boolean value

    // If toggling classification, show/hide classifier section
    if (settingKey === 'perform_classification') {
        toggleClassifierSection(settings.perform_classification);

        if (settings.perform_classification && settings.project && settings.project.id) {
            fetchClassifiers(settings.project.id);
        }
    }

    if (settingKey === 'perform_extraction' && settings.project && settings.project.id) {
        toggleExtractorSection(settings.perform_extraction);

        if (settings.perform_extraction) {
            fetchExtractors(settings.project.id);
        }
    }
}

function toggleClassifierSection(show) {
    const classifierSection = document.getElementById("classifier-section");
    if (show) {
        classifierSection.style.display = "block";  // Show classifier section
    } else {
        classifierSection.style.display = "none";   // Hide classifier section
    }
}

function toggleExtractorSection(show) {
    const extractorSection = document.getElementById("extractor-section");
    if (show) {
        extractorSection.style.display = "block";  // Show extractor section
    } else {
        extractorSection.style.display = "none";   // Hide extractor section
    }
}

// Fetch Projects
function fetchProjects() {
    fetch(`${API_BASE_URL}/projects`)
        .then(response => response.json())
        .then(data => {
            availableProjects = data; // Store all projects
            const tableBody = document.getElementById("project-table-body");
            tableBody.innerHTML = ""; // Clear existing data

            if (data.length === 0) {
                const row = document.createElement("tr");
                row.innerHTML = `<td colspan="4" class="text-center">No projects available</td>`;
                tableBody.appendChild(row);
            } else {
                data.forEach(project => {
                    const row = document.createElement("tr");

                    // Highlight the selected project if any
                    if (settings.project && settings.project.id === project.id) {
                        row.classList.add("table-active");
                    }

                    // Create the select button
                    const selectBtn = document.createElement("button");
                    selectBtn.className = "btn btn-sm btn-primary";
                    selectBtn.textContent = "Select";

                    // Update the button if this is the selected project
                    if (settings.project && settings.project.id === project.id) {
                        selectBtn.textContent = "Selected";
                        selectBtn.className = "btn btn-sm btn-success";
                    }

                    // Add click handler to select button
                    selectBtn.addEventListener("click", () => {
                        // Reset all buttons and rows
                        document.querySelectorAll("#project-table-body tr").forEach(tr => {
                            tr.classList.remove("table-active");
                            const btn = tr.querySelector("button");
                            if (btn) {
                                btn.textContent = "Select";
                                btn.className = "btn btn-sm btn-primary";
                            }
                        });

                        // Update this row and button
                        row.classList.add("table-active");
                        selectBtn.textContent = "Selected";
                        selectBtn.className = "btn btn-sm btn-success";

                        // Update the selected project in settings
                        settings.project = {
                            id: project.id,
                            name: project.name
                        };

                        // Update the UI to show selected project
                        updateSelectedProjectUI(project.id);

                        // Fetch classifiers and extractors if needed
                        if (settings.perform_classification) {
                            fetchClassifiers(project.id);
                        }

                        if (settings.perform_extraction) {
                            fetchExtractors(project.id);
                        }
                    });

                    row.innerHTML = `
                        <td>${project.name}</td>
                        <td>${project.type}</td>
                        <td>${project.description}</td>
                        <td id="button-cell-${project.id}"></td>
                    `;

                    tableBody.appendChild(row);

                    // Append the button to the last cell
                    document.getElementById(`button-cell-${project.id}`).appendChild(selectBtn);
                });
            }
        })
        .catch(error => {
            console.error("Error fetching projects:", error);
            showStatusMessage("Failed to load projects. Please try again.", "danger");
        });
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

    // Find the project details from our available projects
    const selectedProject = availableProjects.find(p => p.id === projectId);

    if (!selectedProject) {
        console.error("Project not found:", projectId);
        return;
    }

    // Update our settings object with the selected project
    settings.project = {
        id: selectedProject.id,
        name: selectedProject.name
    };

    // Update the UI to show the selected project
    updateSelectedProjectUI(projectId);

    // Fetch classifiers and extractors if needed
    if (settings.perform_classification) {
        fetchClassifiers(projectId);
    }

    if (settings.perform_extraction) {
        fetchExtractors(projectId);
    }
}

function updateSelectedProjectUI(projectId) {
    // Find the project in our available projects
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) return;

    // Update UI to show selected project
    const projectInfo = document.getElementById("selected-project-info");
    if (projectInfo) {
        projectInfo.innerHTML = `
            <div class="alert alert-info">
                <div class="d-flex">
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
                            <path d="M12 9h.01"></path>
                            <path d="M11 12h1v4h1"></path>
                        </svg>
                    </div>
                    <div>
                        Selected Project: <strong>${project.name}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    // Check the corresponding radio button
    const radioButton = document.querySelector(`input[name="project-select"][value="${projectId}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
}

function fetchClassifiers(projectId) {
    fetch(`${API_BASE_URL}/project/${projectId}/classifiers`)
        .then(response => response.json())
        .then(data => {
            availableClassifiers = data; // Store all classifiers

            // Get the table body
            const tableBody = document.getElementById("classifier-table-body");
            tableBody.innerHTML = ''; // Clear the table

            if (data.length === 0) {
                // Display a message when no classifiers are available
                const row = document.createElement("tr");
                row.innerHTML = `<td colspan="4" class="text-center">No classifiers available</td>`;
                tableBody.appendChild(row);
            } else {
                // Populate table with classifiers
                data.forEach(classifier => {
                    const row = document.createElement("tr");

                    // Highlight the selected classifier if any
                    if (settings.project && settings.project.classifier_id &&
                        settings.project.classifier_id.id === classifier.id) {
                        row.classList.add("table-active");
                    }

                    // Create the select button
                    const selectBtn = document.createElement("button");
                    selectBtn.className = "btn btn-sm btn-primary";
                    selectBtn.textContent = "Select";

                    // Update the button text if this is the selected classifier
                    if (settings.project && settings.project.classifier_id &&
                        settings.project.classifier_id.id === classifier.id) {
                        selectBtn.textContent = "Selected";
                        selectBtn.className = "btn btn-sm btn-success";
                    }

                    // Add click handler to select button
                    selectBtn.addEventListener("click", () => {
                        // Reset all buttons
                        document.querySelectorAll("#classifier-table-body tr").forEach(tr => {
                            tr.classList.remove("table-active");
                            const btn = tr.querySelector("button");
                            if (btn) {
                                btn.textContent = "Select";
                                btn.className = "btn btn-sm btn-primary";
                            }
                        });

                        // Update this row and button
                        row.classList.add("table-active");
                        selectBtn.textContent = "Selected";
                        selectBtn.className = "btn btn-sm btn-success";

                        // Update the selected classifier in settings
                        if (!settings.project) settings.project = {};
                        settings.project.classifier_id = classifier;

                        // Trigger any necessary updates based on selection
                        updateUIBasedOnClassifierSelection(classifier);
                    });

                    // Create status badge
                    const statusBadge = document.createElement("span");
                    statusBadge.className = `badge ${classifier.status === 'Available' ? 'bg-success' : 'bg-secondary'}`;
                    statusBadge.textContent = classifier.status;

                    // Populate the row
                    row.innerHTML = `
                        <td>${classifier.name}</td>
                        <td>${classifier.resourceType}</td>
                        <td id="status-cell-${classifier.id}"></td>
                        <td id="button-cell-${classifier.id}"></td>
                    `;

                    tableBody.appendChild(row);

                    // Add the status badge and button to the cells
                    document.getElementById(`status-cell-${classifier.id}`).appendChild(statusBadge);
                    document.getElementById(`button-cell-${classifier.id}`).appendChild(selectBtn);
                });
            }
        })
        .catch(error => {
            console.error("Error fetching classifiers:", error);
            const tableBody = document.getElementById("classifier-table-body");
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">
                Failed to load classifiers. Please try again.
            </td></tr>`;
            showStatusMessage("Failed to load classifiers. Please try again.", "danger");
        });
}

// Add the filter function to search classifiers
function filterClassifiers() {
    const searchText = document.getElementById("classifier-search").value.toLowerCase();
    const tableRows = document.getElementById("classifier-table-body").getElementsByTagName("tr");

    for (let i = 0; i < tableRows.length; i++) {
        const row = tableRows[i];
        const nameColumn = row.cells[0];

        if (nameColumn) {
            const name = nameColumn.textContent || nameColumn.innerText;

            if (name.toLowerCase().indexOf(searchText) > -1) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    }
}

// Helper function to handle UI updates after classifier selection
function updateUIBasedOnClassifierSelection(classifier) {
    console.log(`Classifier selected: ${classifier.name}`);
    // Add any additional UI updates needed when a classifier is selected

    // Example: display a confirmation message
    showStatusMessage(`Classifier "${classifier.name}" selected successfully.`, "success");
}

function fetchExtractors(projectId) {
    const extractorTableBody = document.getElementById("extractor-table-body");

    if (!extractorTableBody) {
        console.error("Error: #extractor-table-body element not found.");
        return;
    }

    fetch(`${API_BASE_URL}/project/${projectId}/extractors`)
        .then(response => response.json())
        .then(data => {
            extractorTableBody.innerHTML = ""; // Clear previous entries

            data.forEach(extractor => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${extractor.name}</td>
                    <td>${extractor.resourceType}</td>
                    <td>
                        <span class="badge ${extractor.status === 'Available' ? 'bg-success' : 'bg-secondary'}">
                            ${extractor.status}
                        </span>
                    </td>
                    <td>
                        <input type="checkbox" class="form-check-input" id="extractor-${extractor.id}" value="${extractor.id}">
                    </td>
                `;

                // Add event listener to checkbox
                const checkbox = row.querySelector(`#extractor-${extractor.id}`);
                checkbox.addEventListener("change", (e) => {
                    if (e.target.checked) {
                        if (!settings.project.extractor_ids) {
                            settings.project.extractor_ids = {};
                        }
                        settings.project.extractor_ids[extractor.id] = {
                            id: extractor.id,
                            name: extractor.name
                        };
                    } else {
                        delete settings.project.extractor_ids[extractor.id];
                    }
                });

                // Check the checkbox if the extractor is already selected
                if (settings.project.extractor_ids && settings.project.extractor_ids[extractor.id]) {
                    checkbox.checked = true;
                }

                extractorTableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Error fetching extractors:", error));
}

function selectClassifier(classifierId) {
    // Find the classifier details
    const selectedClassifier = availableClassifiers.find(c => c.id === classifierId);

    if (!selectedClassifier) {
        console.error("Classifier not found:", classifierId);
        return;
    }

    // Update settings with selected classifier
    if (!settings.project) settings.project = {};
    settings.project.classifier_id = {
        id: selectedClassifier.id,
        name: selectedClassifier.name,
        doc_type_ids: selectedClassifier.doc_type_ids || []
    };
}

// Function to show status messages
function showStatusMessage(message, type = 'success') {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;

    statusDiv.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">
        ${message}
        <a href="#" class="btn-close" data-bs-dismiss="alert" aria-label="close"></a>
    </div>`;
    statusDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}
