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

// Function to load Classification Confidence Distribution
async function loadClassificationConfidenceChart() {
  const chartContainer = document.getElementById("classification-confidence-chart");

  try {
    const response = await fetch(`${API_BASE_URL}/classification_confidence`);
    const data = await response.json();

    // Group the data into buckets of 5% confidence
    const groupedData = groupDataByConfidence(data);

    const labels = Object.keys(groupedData); // Buckets (e.g., "0-5%", "5-10%", etc.)
    const counts = Object.values(groupedData); // Document counts for each bucket

    const ctx = chartContainer.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Document Count",
            data: counts,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: "Confidence (%)" } },
          y: { title: { display: true, text: "Document Count" } },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching classification confidence data:", error);
  }
}

// Function to group data into 5% buckets
function groupDataByConfidence(data) {
  const grouped = {};

  data.forEach((item) => {
    const confidence = item.confidence_percentage;
    const bucket = Math.floor(confidence / 5) * 5; // Group into 5% ranges (0-5%, 5-10%, etc.)

    // Create the bucket label (e.g., "0-5%", "5-10%")
    const bucketLabel = `${bucket}-${bucket + 5}%`;

    // Initialize the bucket if it doesn't exist
    if (!grouped[bucketLabel]) {
      grouped[bucketLabel] = 0;
    }

    // Add the document count to the appropriate bucket
    grouped[bucketLabel] += item.document_count;
  });

  return grouped;
}

// Top Classifiers by Confidence
async function loadTopClassifiersChart() {
  const chartContainer = document.getElementById("top-classifiers-chart");

  try {
    const response = await fetch(`${API_BASE_URL}/top_classifiers`);
    const data = await response.json();

    const labels = data.map((item) => item.classifier_name);
    const confidences = data.map((item) => item.average_confidence);

    const ctx = chartContainer.getContext("2d");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Average Confidence",
            data: confidences,
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching top classifiers data:", error);
  }
}

// Classification Accuracy by Document Type (Chart)
async function loadClassificationAccuracyChart() {
  try {
    // Fetch classification accuracy data
    const response = await fetch(`${API_BASE_URL}/classification_accuracy`);
    const data = await response.json();

    // Check if data is available
    if (data && Array.isArray(data)) {
      // Create datasets for the chart using the fetched data
      const datasets = createDatasets(data);

      // Extract document_type_ids as labels (X-axis)
      const labels = data.map(item => item.document_type_id);

      // Create and render the chart
      renderChart(labels, datasets);
    } else {
      console.error("Invalid data format received from API.");
    }
  } catch (error) {
    console.error("Error fetching or rendering classification accuracy chart:", error);
  }
}

// Creating datasets for the chart with unique colors
function createDatasets(data) {
  return [{
    label: 'Accuracy',
    data: data.map(item => item.accuracy),
    backgroundColor: generateRandomColors(data.length),
    borderColor: 'black',  // Optional: Border color for the bars
    borderWidth: 1,
    fill: true,  // Optional: Adds a fill under the bars
  }];
}

// Function to generate an array of random colors for each bar
function generateRandomColors(numColors) {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`; // Random color generator in HSL format
    colors.push(randomColor);
  }
  return colors;
}

// Rendering the chart
function renderChart(labels, datasets) {
  const ctx = document.getElementById('classification-accuracy-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar', // Bar chart for better clarity with document types
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Document Type' }
        },
        y: {
          title: { display: true, text: 'Accuracy (%)' },
          beginAtZero: true, // Start Y-axis at 0 for better visibility of low accuracies
        }
      }
    }
  });
}

// Creating datasets for the chart from the data (updated for document_type_id and accuracy)
function createDatasets(data) {
  return [{
    label: 'Accuracy',
    data: data.map(item => item.accuracy),
    borderColor: 'hsl(200, 70%, 50%)', // Example color, can be randomized
    fill: false,
  }];
}

// Rendering the chart
function renderChart(labels, datasets) {
  const ctx = document.getElementById('classification-accuracy-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar', // Use bar chart for better clarity with document types
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Document Type' }
        },
        y: {
          title: { display: true, text: 'Accuracy (%)' },
          beginAtZero: true, // Start Y-axis at 0 for better visibility of low accuracies
        }
      }
    }
  });
}

// Load Document Accuracy by Field Stats
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
      const overallSTPRate = data.overall_stp.stp_rate_percentage;
      document.getElementById("overall-stp-rate").textContent = overallSTPRate;

      // Render STP Pie Chart
      renderSTPPieChart(overallSTPRate);

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
    } catch (error) {
      console.error("Error loading STP Dashboard:", error);
    }
  }

  function renderSTPPieChart(overallSTPRate) {
    const ctx = document.getElementById("stp-pie-chart").getContext("2d");

    // Data for the Pie Chart
    const stpRate = overallSTPRate; // STP rate as a percentage
    const nonSTP = 100 - stpRate; // Non-STP rate

    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["STP", "Non-STP"],
        datasets: [
          {
            data: [stpRate, nonSTP],
            backgroundColor: ["#4caf50", "#f44336"], // Green for STP, Red for Non-STP
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
              },
            },
          },
        },
      },
    });
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
  loadClassificationConfidenceChart();
  loadTopClassifiersChart();
  loadClassificationAccuracyChart();
  loadFieldStats();
  loadTableData();
  loadDocumentStats();
  loadSTPDashboard();
});
