// Restaurant Export Utilities — JSON, print-to-PDF, and uploadable PDF blob
import jsPDF from 'jspdf';

export interface BranchData {
  city: string;
  area: string;
  address: string;
  phone: string;
  lat: number | null;
  lng: number | null;
}

export interface CategoryData {
  category_id: string;
  name: string;
  description?: string;
}

export interface MenuItemData {
  item_id: string;
  name: string;
  description: string;
  base_price: number;
  currency?: string;
  category_id?: string;
  dietary_tags?: string[];
  spice_level?: string;
  is_available?: boolean;
  is_featured?: boolean;
  calories?: number;
}

export interface RestaurantExportData {
  name: string;
  country: string;
  price_range: string;
  founded_year: string;
  categories: string[];
  specialties: string[];
  keywords: string[];
  food_categories: string[];
  logo_url: string;
  branches: BranchData[];
  menuCategories?: CategoryData[];
  menuItems?: MenuItemData[];
}

/* ─────────────────────────────────────────────────────────────────── */
/*  JSON Download                                                      */
/* ─────────────────────────────────────────────────────────────────── */

/** Download all restaurant data as a .json file */
export function exportJSON(data: RestaurantExportData): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    restaurant: {
      name: data.name,
      country: data.country,
      price_range: data.price_range,
      founded_year: data.founded_year || null,
      categories: data.categories,
      specialties: data.specialties,
      keywords: data.keywords,
      food_categories: data.food_categories,
      logo_url: data.logo_url || null,
    },
    branches: data.branches.map((b, i) => ({
      branch_number: i + 1,
      city: b.city,
      area: b.area,
      address: b.address,
      phone: b.phone || null,
      coordinates: b.lat && b.lng ? { lat: b.lat, lng: b.lng } : null,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.name.toLowerCase().replace(/\s+/g, '-')}-restaurant.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Print-to-PDF (browser window)                                      */
/* ─────────────────────────────────────────────────────────────────── */

/** Open a print-ready page in a new tab (user can Ctrl+P → Save as PDF) */
export function exportPDF(data: RestaurantExportData): void {
  const branchRows = data.branches
    .map(
      (b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escHtml(b.city)}</td>
        <td>${escHtml(b.area)}</td>
        <td>${escHtml(b.address)}</td>
        <td>${escHtml(b.phone || '—')}</td>
        <td>${b.lat && b.lng ? `${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}` : '—'}</td>
      </tr>`
    )
    .join('');

  const tagList = (arr: string[], color: string) =>
    arr.length
      ? arr
        .map(t => `<span style="background:${color};padding:2px 10px;border-radius:20px;font-size:12px;margin:2px;display:inline-block">${escHtml(t)}</span>`)
        .join('')
      : '<em>None</em>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(data.name)} — Restaurant Profile</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1f2937; background: #fff; padding: 40px; }
    .header { display: flex; align-items: center; gap: 24px; border-bottom: 3px solid #2563eb; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { width: 90px; height: 90px; border-radius: 12px; object-fit: cover; border: 1px solid #e5e7eb; }
    .logo-placeholder { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg,#2563eb,#7c3aed); display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;font-weight:700; }
    h1 { font-size: 28px; font-weight: 700; color: #111827; }
    .badge { display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;margin-left:8px; }
    .badge-blue  { background:#dbeafe; color:#1d4ed8; }
    .badge-green { background:#d1fae5; color:#065f46; }
    .meta { color:#6b7280; font-size:13px; margin-top:4px; }
    section { margin-bottom: 28px; }
    section h2 { font-size: 16px; font-weight: 700; color: #374151; border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom: 14px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .info-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px; }
    .info-card .label { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#9ca3af; margin-bottom:4px; }
    .info-card .value { font-size:15px; font-weight:600; color:#111827; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { background:#2563eb; color:#fff; padding:10px 12px; text-align:left; font-weight:600; }
    td { padding:9px 12px; border-bottom:1px solid #f3f4f6; vertical-align:top; }
    tr:nth-child(even) td { background:#f9fafb; }
    .tags { line-height:2; }
    footer { margin-top: 40px; text-align:center; color:#9ca3af; font-size:11px; border-top:1px solid #e5e7eb; padding-top:14px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.logo_url
      ? `<img src="${escHtml(data.logo_url)}" class="logo" alt="Logo" />`
      : `<div class="logo-placeholder">${escHtml(data.name.charAt(0).toUpperCase())}</div>`}
    <div>
      <h1>${escHtml(data.name)}
        <span class="badge badge-blue">${escHtml(data.price_range)}</span>
        <span class="badge badge-green">${data.branches.length} Branch${data.branches.length !== 1 ? 'es' : ''}</span>
      </h1>
      <div class="meta">${escHtml(data.country)}${data.founded_year ? ` &nbsp;·&nbsp; Est. ${escHtml(data.founded_year)}` : ''}</div>
    </div>
  </div>

  <section>
    <h2>Restaurant Details</h2>
    <div class="grid2">
      <div class="info-card"><div class="label">Price Range</div><div class="value">${escHtml(data.price_range)}</div></div>
      <div class="info-card"><div class="label">Country</div><div class="value">${escHtml(data.country)}</div></div>
      ${data.founded_year ? `<div class="info-card"><div class="label">Founded</div><div class="value">${escHtml(data.founded_year)}</div></div>` : ''}
      <div class="info-card"><div class="label">Total Branches</div><div class="value">${data.branches.length}</div></div>
    </div>
  </section>

  <section>
    <h2>Categories &amp; Identity</h2>
    <div class="grid2">
      <div class="info-card">
        <div class="label">Cuisine Categories</div>
        <div class="tags" style="margin-top:6px">${tagList(data.categories, '#dbeafe')}</div>
      </div>
      <div class="info-card">
        <div class="label">Specialties</div>
        <div class="tags" style="margin-top:6px">${tagList(data.specialties, '#ede9fe')}</div>
      </div>
      <div class="info-card">
        <div class="label">Keywords</div>
        <div class="tags" style="margin-top:6px">${tagList(data.keywords, '#f3f4f6')}</div>
      </div>
      <div class="info-card">
        <div class="label">Food Categories</div>
        <div class="tags" style="margin-top:6px">${tagList(data.food_categories, '#d1fae5')}</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Branches &amp; Locations</h2>
    <table>
      <thead>
        <tr><th>#</th><th>City</th><th>Area</th><th>Address</th><th>Phone</th><th>Coordinates</th></tr>
      </thead>
      <tbody>${branchRows}</tbody>
    </table>
  </section>

  <footer>
    Restaurant Profile &nbsp;·&nbsp; Generated on ${new Date().toLocaleString()} &nbsp;·&nbsp; Vocabite Platform
  </footer>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*  PDF Blob (for RAG backend upload)                                  */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Build a real binary PDF Blob using jsPDF.
 * This is suitable for multipart upload to the RAG /ingest-restaurant endpoint.
 */
export function buildPDFBlob(data: RestaurantExportData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lm = 15; // left margin
  const pw = 180; // printable width
  let y = 20;

  const addLine = (text: string, fontSize = 11, bold = false, color = '#1f2937') => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const rgb = hexToRgb(color);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    const lines = doc.splitTextToSize(text, pw);
    doc.text(lines, lm, y);
    y += lines.length * (fontSize * 0.45) + 2;
  };

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    y += 4;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(lm, y, lm + pw, y);
    y += 5;
    addLine(title, 13, true, '#1d4ed8');
  };

  // Blue header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.name, lm, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const subLine = [data.country, data.price_range, data.founded_year ? `Est. ${data.founded_year}` : ''].filter(Boolean).join('  ·  ');
  doc.text(subLine, lm, 22);
  y = 38;

  // Basic Details
  addSection('Restaurant Details');
  addLine(`Country: ${data.country}`);
  addLine(`Price Range: ${data.price_range}`);
  if (data.founded_year) addLine(`Founded: ${data.founded_year}`);
  addLine(`Branches: ${data.branches.length}`);

  // Identity
  addSection('Categories & Identity');
  if (data.categories.length) addLine(`Cuisine: ${data.categories.join(', ')}`);
  if (data.specialties.length) addLine(`Specialties: ${data.specialties.join(', ')}`);
  if (data.keywords.length) addLine(`Keywords: ${data.keywords.join(', ')}`);
  if (data.food_categories.length) addLine(`Food Categories: ${data.food_categories.join(', ')}`);

  // Branches
  addSection(`Branches & Locations (${data.branches.length})`);
  if (data.branches.length === 0) {
    addLine('No branches added yet.');
  } else {
    data.branches.forEach((b, i) => {
      addLine(`Branch ${i + 1}: ${b.area}, ${b.city}`, 11, true);
      addLine(`  Address: ${b.address}`);
      if (b.phone) addLine(`  Phone: ${b.phone}`);
      if (b.lat && b.lng) addLine(`  Coordinates: ${Number(b.lat).toFixed(5)}, ${Number(b.lng).toFixed(5)}`);
      y += 2;
    });
  }

  // Menu Categories
  if (data.menuCategories && data.menuCategories.length > 0) {
    addSection(`Menu Categories (${data.menuCategories.length})`);
    data.menuCategories.forEach(cat => {
      addLine(`• ${cat.name}${cat.description ? ': ' + cat.description : ''}`);
    });
  }

  // Menu Items
  if (data.menuItems && data.menuItems.length > 0) {
    addSection(`Menu Items (${data.menuItems.length})`);
    // Group by category
    const byCategory: Record<string, MenuItemData[]> = {};
    const noCat: MenuItemData[] = [];
    data.menuItems.forEach(item => {
      const catName = data.menuCategories?.find(c => c.category_id === item.category_id)?.name;
      if (catName) {
        byCategory[catName] = byCategory[catName] || [];
        byCategory[catName].push(item);
      } else {
        noCat.push(item);
      }
    });

    const renderItems = (items: MenuItemData[]) => {
      items.forEach(item => {
        const price = `${item.currency || 'PKR'} ${typeof item.base_price === 'number' ? item.base_price.toFixed(0) : item.base_price}`;
        addLine(`  ${item.name} — ${price}${item.is_featured ? ' ★' : ''}`, 10, true);
        if (item.description) addLine(`    ${item.description}`, 9);
        const tags: string[] = [];
        if (item.dietary_tags?.length) tags.push(item.dietary_tags.join(', '));
        if (item.spice_level && item.spice_level !== 'mild') tags.push(`Spice: ${item.spice_level}`);
        if (item.calories) tags.push(`${item.calories} kcal`);
        if (!item.is_available) tags.push('Currently unavailable');
        if (tags.length) addLine(`    ${tags.join('  ·  ')}`, 8);
        y += 1;
      });
    };

    Object.entries(byCategory).forEach(([catName, items]) => {
      addLine(catName, 11, true, '#374151');
      renderItems(items);
      y += 2;
    });
    if (noCat.length) {
      addLine('Other Items', 11, true, '#374151');
      renderItems(noCat);
    }
  }

  // Footer on every page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Restaurant Profile — ${data.name} — Vocabite Platform   |   Page ${p} of ${totalPages}`,
      lm,
      292
    );
  }

  return doc.output('blob');
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                            */
/* ─────────────────────────────────────────────────────────────────── */

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
