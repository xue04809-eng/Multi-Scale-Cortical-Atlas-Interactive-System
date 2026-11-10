import Chart from "chart.js/auto";

export default class ConnectivityPanel {
  constructor() {
    this.panel = document.getElementById("fcPanel");

    this.chart = null;

    this.closeButton = document.querySelector(".fc-close");

    if (this.closeButton) {
      this.closeButton.onclick = () => {
        this.hide();
      };
    }
  }

  show(data) {
    this.currentConnections = data.connections;

    this.panel.style.display = "block";

    document.getElementById("fcParcelName").innerText = data.name || "-";

    document.getElementById("fcNetwork").innerText = data.network || "-";

    document.getElementById("fcLevel").innerText = data.level;

    this.drawChart(data.connections);
  }

  refreshChart() {
    if (this.currentConnections) {
      this.drawChart(this.currentConnections);
    }
  }

  isVisible() {
    return this.panel.style.display === "block";
  }

  getThemeColor(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  drawChart(connections) {
    const ctx = document.getElementById("fcChart");

    if (this.chart) {
      this.chart.destroy();
    }

    const textColor = this.getThemeColor("--text-color");

    const borderColor = this.getThemeColor("--border");

    const accent = this.getThemeColor("--accent");

    this.chart = new Chart(ctx, {
      type: "bar",

      data: {
        labels: connections.map((c) => c.target),

        datasets: [
          {
            label: "FC Strength",

            data: connections.map((c) => c.strength),

            backgroundColor: accent,

            borderRadius: 6,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 10,
        },

        plugins: {
          legend: {
            display: false,
            labels: {
              color: textColor,
            },
          },

          tooltip: {
            titleColor: textColor,

            bodyColor: textColor,

            backgroundColor: this.getThemeColor("--panel-color"),

            callbacks: {
              title: (items) => {
                const index = items[0].dataIndex;
                const conn = connections[index];

                return conn.name || `Parcel ${conn.target}`;
              },

              label: (item) => {
                return `Strength: ${item.raw.toFixed(4)}`;
              },
            },
          },
        },

        scales: {
          x: {
            title: {
              display: true,
              text: "Target Parcel ID",
              color: textColor,
            },

            grid: {
              color: borderColor,
            },

            ticks: {
              maxRotation: 0,
              autoSkip: true,
              color: textColor,
            },
          },

          y: {
            beginAtZero: true,

            title: {
              display: true,
              text: "Functional Connectivity (r)",
              color: textColor,
            },

            grid: {
              color: borderColor,
            },

            ticks: {
              precision: 2,
              color: textColor,
            },
          },
        },
      },
    });
  }

  hide() {
    this.panel.style.display = "none";
  }
}
