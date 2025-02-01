const API_BASE_URL = "http://127.0.0.1:8000"; // Update if backend runs on a different URL/port

// Fetch and render stats
async function loadStats() {
  const statsContainer = document.getElementById("stats");

  try {
    const response = await fetch(`${API_BASE_URL}/extractions/stats/`);
    const data = await response.json();

    // Debugging: Log the response data to inspect the structure
    console.log("Stats response data:", data);

    statsContainer.innerHTML = `
      <div class="row">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h1>${data.total_documents}</h1>
              <p>Total Documents</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h1>${data.total_fields}</h1>
              <p>Total Fields</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card">
            <div class="card-body text-center">
              <h1>${data.correct_fields}</h1>
              <p>Correct Fields</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    statsContainer.innerHTML = `<p class="text-danger">Failed to load stats.</p>`;
    console.error("Error fetching stats:", error);
  }
}

// Fetch field stats data
async function loadFieldStats() {
  const ctx = document.getElementById('fieldStatsChart').getContext('2d');

  try {
    const response = await fetch(`${API_BASE_URL}/extractions/field-stats/`);
    const data = await response.json();

    // Prepare the data for the chart
    const labels = data.map(item => item.field);
    const avgAccuracy = data.map(item => item.avg_field_accuracy);
    const avgOcrConfidence = data.map(item => item.avg_document_ocr_confidence);

    // Create the chart
    new Chart(ctx, {
      type: 'bar', // You can also use 'line', 'pie', etc.
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Average Field Accuracy',
            data: avgAccuracy,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Average OCR Confidence',
            data: avgOcrConfidence,
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(tooltipItem) {
                return `${tooltipItem.dataset.label}: ${tooltipItem.raw.toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading field stats:', error);
  }
}

// Fetch and render table data
async function loadTableData() {
  const tableBody = document.querySelector("#data-table tbody");

  try {
    const response = await fetch(`${API_BASE_URL}/extractions/`);
    const { data } = await response.json();

    tableBody.innerHTML = data
      .map(
        (item) => `
      <tr>
        <td>${item.filename}</td>
        <td>${item.document_id}</td>
        <td>${item.field}</td>
        <td>${item.field_value || "N/A"}</td>
        <td>${item.validated_field_value || "N/A"}</td>
        <td>${item.confidence ? item.confidence.toFixed(2) : "N/A"}</td>
      </tr>
    `
      )
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Failed to load data.</td></tr>`;
    console.error("Error fetching table data:", error);
  }
}

// STP Dashboard
async function loadSTPDashboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/stp_dashboard`);
    const data = await response.json();

    // Update Overall STP Rate
    document.getElementById("overall-stp-rate").textContent = data.overall_stp.stp_rate_percentage;

    // Populate Model Output Accuracy Table
    const accuracyTableBody = document.querySelector("#stp-accuracy-table tbody");
    accuracyTableBody.innerHTML = data.accuracy_data
      .map(
        (row) => `
      <tr>
        <td>${row.filename}</td>
        <td>${row.document_id}</td>
        <td>${row.total_fields}</td>
        <td>${row.correct_fields}</td>
        <td>${row.accuracy_percentage}%</td>
      </tr>
    `
      )
      .join("");

    // Populate STP Rate Table
    const stpTableBody = document.querySelector("#stp-rate-table tbody");
    stpTableBody.innerHTML = data.stp_data
      .map(
        (row) => `
      <tr>
        <td>${row.filename}</td>
        <td>${row.document_id}</td>
        <td>${row.stp ? "Yes" : "No"}</td>
      </tr>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading STP Dashboard:", error);
  }
}

// Fetch the document stats from the backend
async function loadDocumentStats() {
  const tableBody = document.querySelector('#document-stats-table tbody');
  const documentIdFilter = document.querySelector('#document-id-filter').value;
  const filenameFilter = document.querySelector('#filename-filter').value;

  try {
    // Construct query parameters based on filter inputs
    let url = `${API_BASE_URL}/document_stats`;
    const params = new URLSearchParams();

    if (documentIdFilter) {
      params.append('document_id', documentIdFilter);
    }
    if (filenameFilter) {
      params.append('filename', filenameFilter);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    // Render document stats
    tableBody.innerHTML = '';
    data.forEach(stat => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${stat.document_id}</td>
        <td>${stat.filename}</td>
        <td>${(stat.avg_field_accuracy * 100).toFixed(2)}%</td>
        <td>${(stat.avg_ocr_accuracy * 100).toFixed(2)}%</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading document stats:', error);
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadFieldStats();
  loadTableData();
  loadDocumentStats();
  loadSTPDashboard();
});
