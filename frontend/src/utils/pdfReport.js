/**
 * pdfReport.js
 * Generates a printable HTML report in a new window and triggers the browser
 * print dialog (Save as PDF). No external library required.
 */

const BRAND_COLOR = '#1b365d';
const ACCENT     = '#e87722';

function baseStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #222;
      background: #fff;
    }
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 18px 24px 14px;
      border-bottom: 3px solid ${BRAND_COLOR};
      margin-bottom: 18px;
    }
    .report-header h1 {
      font-size: 18px;
      color: ${BRAND_COLOR};
      margin-bottom: 3px;
    }
    .report-header p { font-size: 11px; color: #666; }
    .report-logo { font-size: 22px; font-weight: 800; color: ${BRAND_COLOR}; }
    .report-logo span { color: ${ACCENT}; }
    .report-meta {
      font-size: 10px;
      color: #888;
      text-align: right;
      line-height: 1.6;
    }

    /* Stat grid for dashboard */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .stat-box {
      border: 1px solid #ddd;
      padding: 12px 14px;
      border-left: 4px solid ${BRAND_COLOR};
    }
    .stat-box .label { font-size: 10px; color: #888; margin-bottom: 4px; }
    .stat-box .value { font-size: 22px; font-weight: 700; color: ${BRAND_COLOR}; }
    .stat-box .sub   { font-size: 10px; color: #aaa; margin-top: 2px; }

    /* Section title */
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: ${BRAND_COLOR};
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 5px;
      margin: 18px 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    thead { background: ${BRAND_COLOR}; }
    thead th {
      padding: 7px 10px;
      color: #fff;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
    }
    tbody td {
      padding: 6px 10px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 10px;
      color: #333;
    }
    tbody tr:nth-child(even) td { background: #fafafa; }

    /* Badge */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 600;
    }
    .badge-success  { background: #d4edda; color: #155724; }
    .badge-warning  { background: #fff3cd; color: #856404; }
    .badge-danger   { background: #f8d7da; color: #721c24; }
    .badge-info     { background: #d1ecf1; color: #0c5460; }
    .badge-default  { background: #e9ecef; color: #444; }

    /* Footer */
    .report-footer {
      border-top: 1px solid #ddd;
      padding-top: 8px;
      font-size: 9px;
      color: #aaa;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      @page { margin: 15mm 12mm; size: A4 portrait; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `;
}

function header(title, subtitle) {
  const now = new Date();
  return `
    <div class="report-header">
      <div>
        <div class="report-logo">Block<span>Lend</span></div>
        <h1>${title}</h1>
        <p>${subtitle || ''}</p>
      </div>
      <div class="report-meta">
        <div>Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
        <div>BlockLend Admin Report</div>
      </div>
    </div>
  `;
}

function footer() {
  return `
    <div class="report-footer">
      <span>BlockLend — Confidential</span>
      <span>Generated ${new Date().toISOString()}</span>
    </div>
  `;
}

function badge(text, type = 'default') {
  return `<span class="badge badge-${type}">${text}</span>`;
}

function statusBadge(status) {
  const map = {
    active: 'success', approved: 'success', completed: 'success', returned: 'success',
    pending: 'warning', return_pending: 'warning',
    declined: 'danger', rejected: 'danger', banned: 'danger',
    inactive: 'info',
  };
  return badge(status === 'return_pending' ? 'pending return' : status, map[status] || 'default');
}

function openPrint(html) {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>BlockLend Report</title>
    <style>${baseStyles()}</style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

/* ================================================================
   DASHBOARD REPORT
================================================================ */
export function exportDashboardPDF(stats) {
  const { assets, borrows, users } = stats;

  const statGrid = `
    <div class="stat-grid">
      <div class="stat-box">
        <div class="label">Total Assets</div>
        <div class="value">${assets.total}</div>
        <div class="sub">${assets.available} available · ${assets.unavailable} unavailable</div>
      </div>
      <div class="stat-box">
        <div class="label">Total Borrows</div>
        <div class="value">${borrows.total}</div>
        <div class="sub">${borrows.active} active · ${borrows.returned} returned</div>
      </div>
      <div class="stat-box">
        <div class="label">Pending Requests</div>
        <div class="value">${borrows.pending}</div>
        <div class="sub">Awaiting approval</div>
      </div>
      <div class="stat-box">
        <div class="label">Total Users</div>
        <div class="value">${users.total}</div>
        <div class="sub">${users.regular} regular · ${users.admins} admin</div>
      </div>
      <div class="stat-box">
        <div class="label">Active Loans</div>
        <div class="value">${borrows.active}</div>
        <div class="sub">Currently borrowed</div>
      </div>
      <div class="stat-box">
        <div class="label">Returned Items</div>
        <div class="value">${borrows.returned}</div>
        <div class="sub">Successfully returned</div>
      </div>
    </div>
  `;

  const html = `
    ${header('Dashboard Report', 'System overview snapshot')}
    <div class="section-title">Key Metrics</div>
    ${statGrid}
    ${footer()}
  `;

  openPrint(html);
}

/* ================================================================
   ASSETS REPORT
================================================================ */
export function exportAssetsPDF(assets) {
  const rows = assets.map(a => `
    <tr>
      <td>${a.name || '—'}</td>
      <td>${a.asset_type || '—'}</td>
      <td>${a.quantity ?? 0}</td>
      <td>${a.serial_number || '—'}</td>
      <td>${a.in_stock ? badge('In Stock', 'success') : badge('Out of Stock', 'warning')}</td>
    </tr>
  `).join('');

  const inStock   = assets.filter(a => a.in_stock).length;
  const outStock  = assets.filter(a => !a.in_stock).length;
  const totalQty  = assets.reduce((s, a) => s + (a.quantity || 0), 0);

  const html = `
    ${header('Assets Management Report', `${assets.length} total assets · ${inStock} in stock · ${outStock} out of stock · ${totalQty} total units`)}
    <div class="section-title">Asset Inventory (${assets.length})</div>
    <table>
      <thead><tr>
        <th>Name</th><th>Type</th><th>Quantity</th>
        <th>Serial No.</th><th>Status</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No assets found</td></tr>'}</tbody>
    </table>
    ${footer()}
  `;

  openPrint(html);
}

/* ================================================================
   BORROW REQUESTS REPORT
================================================================ */
export function exportBorrowsPDF(borrows) {
  const rows = borrows.map(b => `
    <tr>
      <td>${b.borrowerName || b.borrower_id || '—'}</td>
      <td>${b.assetName || '—'}</td>
      <td>${b.quantity ?? 1}</td>
      <td>${b.requestDate ? new Date(b.requestDate).toLocaleDateString() : '—'}</td>
      <td>${b.due_date ? new Date(b.due_date).toLocaleDateString() : '—'}</td>
      <td>${b.returnDate ? new Date(b.returnDate).toLocaleDateString() : '—'}</td>
      <td>${statusBadge(b.status)}</td>
      <td>${b.status === 'completed' ? (b.trustPoints > 0 ? `+${b.trustPoints}` : b.trustPoints ?? 0) : '—'}</td>
    </tr>
  `).join('');

  const counts = {
    pending:  borrows.filter(b => b.status === 'pending').length,
    active:   borrows.filter(b => ['active','approved'].includes(b.status)).length,
    completed:borrows.filter(b => b.status === 'completed').length,
    declined: borrows.filter(b => b.status === 'declined').length,
  };

  const html = `
    ${header('Borrow Requests Report',
      `${borrows.length} total · ${counts.pending} pending · ${counts.active} active · ${counts.completed} completed · ${counts.declined} declined`)}
    <div class="section-title">Borrow Records (${borrows.length})</div>
    <table>
      <thead><tr>
        <th>Borrower</th><th>Asset</th><th>Qty</th>
        <th>Request Date</th><th>Due Date</th><th>Return Date</th>
        <th>Status</th><th>Trust Pts</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8">No records found</td></tr>'}</tbody>
    </table>
    ${footer()}
  `;

  openPrint(html);
}

/* ================================================================
   USERS REPORT
================================================================ */
export function exportUsersPDF(users) {
  const rows = users.map(u => `
    <tr>
      <td>${u.username || '—'}</td>
      <td>${u.email || '—'}</td>
      <td>${u.role || 'user'}</td>
      <td>${u.trust_score ?? u.credit_score ?? 0}</td>
      <td>${u.warning_count ?? 0} / ${u.max_warnings ?? 3}</td>
      <td>${u.borrow_count ?? 0}</td>
      <td>${
        u.is_banned
          ? badge('Banned', 'danger')
          : u.is_active
            ? badge('Active', 'success')
            : badge('Inactive', 'warning')
      }</td>
      <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
    </tr>
  `).join('');

  const active   = users.filter(u => u.is_active && !u.is_banned).length;
  const banned   = users.filter(u => u.is_banned).length;
  const inactive = users.filter(u => !u.is_active && !u.is_banned).length;

  const html = `
    ${header('Users Management Report',
      `${users.length} total · ${active} active · ${inactive} inactive · ${banned} banned`)}
    <div class="section-title">User Accounts (${users.length})</div>
    <table>
      <thead><tr>
        <th>Username</th><th>Email</th><th>Role</th>
        <th>Trust Score</th><th>Warnings</th><th>Borrows</th>
        <th>Status</th><th>Member Since</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8">No users found</td></tr>'}</tbody>
    </table>
    ${footer()}
  `;

  openPrint(html);
}
