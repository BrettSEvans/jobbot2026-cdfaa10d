/**
 * Fixed CSS template for Material Design 3 dashboard.
 * Branding CSS variables are overridden at runtime by the JS rendering engine.
 */

export function getStylesCss(): string {
  return `
:root {
  --md-primary: #6750A4;
  --md-on-primary: #FFFFFF;
  --md-primary-container: #EADDFF;
  --md-on-primary-container: #21005E;
  --md-secondary: #625B71;
  --md-on-secondary: #FFFFFF;
  --md-surface: #FEF7FF;
  --md-on-surface: #1D1B20;
  --md-surface-variant: #E7E0EC;
  --md-outline: #79747E;
  --md-outline-variant: #CAC4D0;
  --md-error: #B3261E;
  --md-surface-container: #F3EDF7;
  --md-surface-container-high: #ECE6F0;
  --md-surface-container-highest: #E6E0E9;
  --font-heading: 'Roboto', sans-serif;
  --font-body: 'Roboto', sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 28px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-body);
  background: var(--md-surface);
  color: var(--md-on-surface);
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* === SIDEBAR === */
#sidebar {
  width: 280px;
  min-width: 280px;
  background: var(--md-surface-container);
  border-right: 1px solid var(--md-outline-variant);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease;
  overflow: hidden;
  z-index: 100;
}

#sidebar.collapsed {
  width: 0;
  min-width: 0;
  padding: 0;
  border-right: none;
}

#sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--md-outline-variant);
  background: var(--md-primary);
  color: var(--md-on-primary);
}

#sidebar-header h2 {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  color: var(--md-on-primary);
  white-space: nowrap;
  overflow: hidden;
}

#sidebar-header p {
  font-size: 12px;
  color: var(--md-on-primary);
  opacity: 0.85;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
}

#sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-xl);
  color: var(--md-on-surface);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 2px;
  text-align: left;
}

.nav-link:hover { background: var(--md-surface-container-highest); }

.nav-link.active {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-weight: 600;
}

.nav-link .material-icons-outlined {
  font-size: 20px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.nav-link .nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* === MAIN WRAPPER === */
#main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--md-surface);
  border-bottom: 1px solid var(--md-outline-variant);
  z-index: 50;
}

#hamburger-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-sm);
  color: var(--md-on-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

#hamburger-btn:hover { background: var(--md-surface-container-high); }

#page-title {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 400;
  flex: 1;
  color: var(--md-primary);
}

#main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.dashboard-section { display: none; }

.section-header { margin-bottom: 24px; }

.section-header h2 {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 400;
  margin-bottom: 8px;
  color: var(--md-primary);
  border-left: 4px solid var(--md-primary);
  padding-left: 12px;
}

.section-header p {
  font-size: 14px;
  color: var(--md-outline);
  line-height: 1.5;
  max-width: 700px;
  padding-left: 16px;
}

/* === METRICS === */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--md-surface-container);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--md-outline);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-family: var(--font-heading);
  font-size: 32px;
  font-weight: 600;
  color: var(--md-on-surface);
}

.metric-change { font-size: 13px; font-weight: 500; }
.metric-change.up { color: #1B5E20; }
.metric-change.down { color: var(--md-error); }
.metric-change.neutral { color: var(--md-outline); }

/* === CHARTS === */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  background: var(--md-surface-container);
  border-radius: var(--radius-md);
  padding: 20px;
}

.chart-card h3 {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--md-on-surface);
}

.chart-container {
  position: relative;
  height: 380px;
  max-height: 380px;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* === TABLES === */
.table-card {
  background: var(--md-surface-container);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 24px;
}

.table-card h3 {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
}

.table-scroll {
  max-height: 450px;
  overflow-y: auto;
  overflow-x: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--md-outline-variant);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

th {
  background: var(--md-surface-container-highest);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--md-outline);
  border-bottom: 2px solid var(--md-outline-variant);
  white-space: nowrap;
}

td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--md-outline-variant);
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

tbody tr:hover { background: var(--md-surface-container-high); }

/* === DRILL-DOWN === */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.overlay.hidden { display: none; }

.drilldown-modal {
  background: var(--md-surface);
  border-radius: var(--radius-lg);
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.24);
  transform: scale(0.95);
  transition: transform 0.25s ease;
}

.overlay.visible .drilldown-modal { transform: scale(1); }

.drilldown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--md-outline-variant);
}

.drilldown-header h3 {
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 500;
}

.drilldown-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--md-outline);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.drilldown-close:hover { background: var(--md-surface-container-high); }

.drilldown-body { padding: 24px; }

.drilldown-field {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid var(--md-outline-variant);
}

.drilldown-field:last-child { border-bottom: none; }

.drilldown-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-outline);
  text-transform: uppercase;
  width: 140px;
  flex-shrink: 0;
}

.drilldown-value {
  font-size: 14px;
  color: var(--md-on-surface);
}

/* === AGENTIC WORKFORCE === */
.coming-soon-banner {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  padding: 24px;
  border-radius: var(--radius-lg);
  text-align: center;
  margin-bottom: 24px;
}

.coming-soon-banner h2 { font-size: 24px; margin-bottom: 8px; }
.coming-soon-banner p { font-size: 14px; opacity: 0.8; }

.agentic-table { opacity: 0.85; }

/* Agentic Workforce table text wrapping — no horizontal scroll */
#section-agentic-workforce .table-scroll {
  overflow-x: hidden;
}
#section-agentic-workforce table {
  table-layout: fixed;
  width: 100%;
}
#section-agentic-workforce th,
#section-agentic-workforce td {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}
#section-agentic-workforce th:nth-child(1),
#section-agentic-workforce td:nth-child(1) { width: 18%; }
#section-agentic-workforce th:nth-child(2),
#section-agentic-workforce td:nth-child(2) { width: 52%; }
#section-agentic-workforce th:nth-child(3),
#section-agentic-workforce td:nth-child(3) { width: 30%; }

/* === CFO SCENARIOS === */
.cfo-card {
  background: var(--md-surface-container);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 24px;
}

.cfo-card h3 {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
}

.cfo-card .cfo-desc {
  font-size: 13px;
  color: var(--md-outline);
  margin-bottom: 20px;
}

.slider-group { margin-bottom: 16px; }

.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}

.slider-label span:last-child {
  font-weight: 600;
  color: var(--md-primary);
}

input[type="range"] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--md-outline-variant);
  border-radius: 2px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--md-primary);
  cursor: pointer;
}

.cfo-chart-container {
  position: relative;
  height: 300px;
  margin-top: 16px;
}

/* === TOAST === */
#toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  background: var(--md-on-surface);
  color: var(--md-surface);
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s ease;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  #sidebar {
    position: fixed;
    height: 100vh;
    z-index: 200;
    box-shadow: 4px 0 16px rgba(0,0,0,0.15);
  }

  #sidebar.collapsed { width: 0; }

  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .charts-grid { grid-template-columns: 1fr; }
  .chart-card { min-width: 0; }
}
`;
}
