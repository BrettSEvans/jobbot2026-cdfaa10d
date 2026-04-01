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
  --md-outline: #49454F;
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
.metric-change.neutral { color: var(--md-on-surface); opacity: 0.7; }

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
  position: relative;
  transition: opacity 0.3s, box-shadow 0.3s;
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

/* Radar / spider charts need more room for axis labels */
.chart-container.chart-radar {
  min-height: 400px;
  height: 420px;
  max-height: 480px;
}

/* Cross-chart filter badge */
.chart-filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px 4px 12px;
  border-radius: 16px;
  margin-bottom: 8px;
  animation: filterBadgeIn 0.2s ease-out;
}

.chart-filter-badge button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--md-on-primary-container);
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.chart-filter-badge button:hover { opacity: 1; }

@keyframes filterBadgeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.chart-card.filtered-dimmed { opacity: 0.35; pointer-events: none; }
.chart-card.filtered-active { box-shadow: 0 0 0 2px var(--md-primary); }

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* === GLOBAL FILTER BAR === */
.global-filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 24px;
  background: var(--md-surface-container);
  border-bottom: 1px solid var(--md-outline-variant);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 45;
}

.gf-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gf-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-outline);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gf-select {
  padding: 6px 12px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--radius-xl);
  background: var(--md-surface);
  color: var(--md-on-surface);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}

.gf-select:focus { border-color: var(--md-primary); }

.gf-segmented {
  display: flex;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.gf-seg-btn {
  padding: 5px 14px;
  border: none;
  background: var(--md-surface);
  color: var(--md-on-surface);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.gf-seg-btn:not(:last-child) { border-right: 1px solid var(--md-outline-variant); }

.gf-seg-btn.active {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.gf-seg-btn:hover:not(.active) { background: var(--md-surface-container-high); }

.gf-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gf-chip {
  padding: 5px 14px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--radius-xl);
  background: var(--md-surface);
  color: var(--md-on-surface);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.gf-chip.active {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  border-color: var(--md-primary);
}

.gf-chip:hover:not(.active) { background: var(--md-surface-container-high); }

/* === HEATMAP === */
.heatmap-card { overflow-x: auto; }

.heatmap-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.heatmap-row {
  display: flex;
  gap: 2px;
}

.heatmap-cell {
  padding: 8px 12px;
  font-size: 12px;
  text-align: center;
  min-width: 80px;
  flex: 1;
  border-radius: 4px;
  transition: transform 0.15s;
}

.heatmap-cell:hover { transform: scale(1.05); z-index: 1; }

.heatmap-label {
  font-weight: 600;
  text-align: left;
  min-width: 120px;
  flex: 0 0 120px;
  background: transparent !important;
  color: var(--md-on-surface);
}

.heatmap-col-label {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: transparent !important;
  color: var(--md-outline);
}

.heatmap-header { border-bottom: 2px solid var(--md-outline-variant); padding-bottom: 4px; }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--md-outline);
  justify-content: flex-end;
}

.heatmap-swatch {
  width: 24px;
  height: 14px;
  border-radius: 3px;
}

/* === FUNNEL === */
.funnel-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 0;
}

.funnel-step {
  display: flex;
  justify-content: center;
}

.funnel-bar {
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease, opacity 0.3s;
  min-width: 120px;
}

.funnel-text {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  padding: 0 16px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

/* === GANTT === */
.gantt-container { height: 420px; max-height: 420px; }

/* === LAYOUT: KPI SPOTLIGHT === */
.kpi-spotlight-container {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  align-items: stretch;
}

.kpi-hero {
  background: var(--md-primary);
  color: var(--md-on-primary);
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 280px;
  flex: 0 0 280px;
}

.kpi-hero .metric-label {
  color: var(--md-on-primary);
  opacity: 0.85;
}

.kpi-hero-value {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: 700;
  line-height: 1.1;
  margin: 8px 0;
}

.kpi-hero .metric-change {
  color: var(--md-on-primary);
  opacity: 0.9;
}

.kpi-secondary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  flex: 1;
}

/* === LAYOUT: SPLIT PANEL === */
.split-panel {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}

.split-left .chart-card { height: 100%; }
.split-left .chart-container { height: 340px; max-height: 340px; }

.split-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.split-right .metrics-grid {
  grid-template-columns: 1fr 1fr;
  margin-bottom: 0;
}

.split-right .chart-container { height: 200px; max-height: 200px; }
.split-right .chart-container.chart-radar { height: 300px; max-height: 340px; }

/* === LAYOUT: FULL WIDTH TIMELINE === */
.full-width-chart {
  margin-bottom: 24px;
}

.full-width-chart .chart-card { width: 100%; }
.full-width-chart .chart-container { height: 420px; max-height: 420px; }

/* === LAYOUT: GRID CARDS === */
.grid-cards-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.grid-card-item {
  background: var(--md-surface-container);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grid-card-chart {
  margin-top: 12px;
}

.grid-card-chart .chart-card {
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.grid-card-chart .chart-container {
  height: 140px;
  max-height: 140px;
}
.grid-card-chart .chart-container.chart-radar {
  height: 260px;
  max-height: 300px;
}

.grid-card-chart h3 { display: none; }

/* === LAYOUT: MAP TABLE === */
.map-table-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.map-table-left, .map-table-right {
  min-width: 0;
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

.table-filter-count {
  color: var(--md-primary);
  font-weight: 600;
  font-size: 13px;
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
  color: var(--md-on-surface);
  opacity: 0.8;
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

/* Agentic Workforce table text wrapping */
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
.cfo-chart-container.chart-radar {
  height: 400px;
}

/* === CFO TOGGLE & SEGMENTED CONTROLS === */
.cfo-controls { margin-bottom: 16px; }

.toggle-group, .segmented-group {
  margin-bottom: 16px;
}

.toggle-label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--md-on-surface);
}

.toggle-wrap, .segmented-wrap {
  display: flex;
  gap: 0;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.toggle-btn, .segmented-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: var(--md-surface);
  color: var(--md-on-surface);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.toggle-btn:not(:last-child), .segmented-btn:not(:last-child) {
  border-right: 1px solid var(--md-outline-variant);
}

.toggle-btn.active, .segmented-btn.active {
  background: var(--md-primary);
  color: var(--md-on-primary);
}

.toggle-btn:hover:not(.active), .segmented-btn:hover:not(.active) {
  background: var(--md-surface-container-high);
}

/* === DRILL-DOWN NOTES === */
.drilldown-notes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--md-outline-variant);
}

.drilldown-notes-title {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--md-primary);
  margin-bottom: 8px;
}

.drilldown-notes-text {
  font-size: 13px;
  color: var(--md-outline);
  line-height: 1.6;
  margin-bottom: 6px;
  padding-left: 12px;
  border-left: 2px solid var(--md-outline-variant);
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

/* === PER-COLUMN TABLE FILTER === */
.th-filter-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--md-outline);
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  vertical-align: middle;
  opacity: 0.5;
  transition: opacity 0.15s;
}
th:hover .th-filter-btn { opacity: 1; }
.th-filter-btn:hover { background: var(--md-surface-container-high); opacity: 1; }

.col-filter-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  max-height: 220px;
  overflow-y: auto;
  background: var(--md-surface);
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
  padding: 4px;
}

.col-filter-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--md-on-surface);
  white-space: nowrap;
}
.col-filter-option:hover { background: var(--md-surface-container-high); }
.col-filter-option.active { color: var(--md-primary); font-weight: 600; }

/* === GLOBAL FILTER DIMMING FOR CUSTOM CHARTS === */
.funnel-bar.gf-dimmed { opacity: 0.2; }
.heatmap-row.gf-dimmed { opacity: 0.2; }
.chart-card.filtered-dimmed-global { opacity: 0.35; pointer-events: none; }

tbody tr { transition: opacity 0.15s; }

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

  .global-filter-bar { flex-direction: column; align-items: flex-start; gap: 8px; }

  .kpi-spotlight-container { flex-direction: column; }
  .kpi-hero { min-width: auto; flex: auto; }

  .split-panel { grid-template-columns: 1fr; }

  .grid-cards-container { grid-template-columns: 1fr 1fr; }

  .map-table-panel { grid-template-columns: 1fr; }
}
`;
}
