const loads  = [];
const charts = {};

let swEnabled = false;
let swMode    = 'auto';

function getSectionVolume() {
  const L  = parseFloat($('beamLength').value) || 5;
  const st = $('sectionType').value;
  let A = 0;
  if (st === 'rectangular') {
    const b = (+$('secWidth').value  || 50)  * 1e-3;
    const h = (+$('secHeight').value || 100) * 1e-3;
    A = b * h;
  } else if (st === 'circular') {
    const d = (+$('secDia').value || 100) * 1e-3;
    A = Math.PI * (d/2)**2;
  } else {
    const bf = (+$('iFw').value || 100) * 1e-3;
    const ht = (+$('iH').value  || 200) * 1e-3;
    const tf = (+$('iFt').value || 10)  * 1e-3;
    const tw = (+$('iWt').value || 6)   * 1e-3;
    const hw = ht - 2*tf;
    A = 2*bf*tf + hw*tw;
  }
  return A * L;
}

function getSelfWeightN() {
  if (!swEnabled) return 0;
  if (swMode === 'manual') {
    return (+$('swMass').value || 0) * 9.81;
  }
  const rho = +$('swDensity').value || 7850;
  const V   = getSectionVolume();
  return rho * V * 9.81;
}

function updateSWDisplay() {
  const W = getSelfWeightN();
  const el = $('swWeightDisplay');
  if (el) el.textContent = `Weight: ${(W/1000).toFixed(2)} kN`;
}

function setSWMode(mode) {
  swMode = mode;
  $('swModeAuto').classList.toggle('active',   mode === 'auto');
  $('swModeManual').classList.toggle('active', mode === 'manual');
  $('swAutoFields').style.display   = mode === 'auto'   ? 'block' : 'none';
  $('swManualFields').style.display = mode === 'manual' ? 'block' : 'none';
  updateSWDisplay();
  drawBeamDiagram();
}
let editingIndex = null;

const $ = id => document.getElementById(id);

const beamTypeEl  = $('beamType');
const sectionType = $('sectionType');
const materialEl  = $('material');

const MATERIAL_PRESETS = {
  structural_steel: { E: 200, sigma_y: 250 },
  aluminium_6061:   { E: 69,  sigma_y: 276 },
};

const C = {
  blue:    '#4d9de0',
  orange:  '#e07b4d',
  green:   '#5bb86b',
  purple:  '#a47de8',
  yellow:  '#e8c84d',
  muted:   '#555c68',
  border:  '#2a2d33',
  text:    '#e8eaed',
  panel:   '#1c1e22',
};

const LOAD_PALETTE = [
  { stroke: '#4d9de0', fill: '#1c2a3a', dim: 'rgba(77,157,224,0.12)'  },
  { stroke: '#e8c84d', fill: '#2a2200', dim: 'rgba(232,200,77,0.12)'  },
  { stroke: '#a47de8', fill: '#1a102a', dim: 'rgba(164,125,232,0.12)' },
  { stroke: '#5bb86b', fill: '#122012', dim: 'rgba(91,184,107,0.12)'  },
  { stroke: '#e07b4d', fill: '#2a1408', dim: 'rgba(224,123,77,0.12)'  },
  { stroke: '#4dcfcf', fill: '#0d2626', dim: 'rgba(77,207,207,0.12)'  },
  { stroke: '#e84d7d', fill: '#2a0d1a', dim: 'rgba(232,77,125,0.12)'  },
  { stroke: '#b8e84d', fill: '#1a2a0d', dim: 'rgba(184,232,77,0.12)'  },
];



beamTypeEl.addEventListener('change', () => {
  const t = beamTypeEl.value;
  $('supportsBlock').style.display = (t === 'overhanging' || t === 'continuous') ? 'block' : 'none';
  const L = parseFloat($('beamLength').value) || 5;
  if (t === 'continuous')  $('supportsInput').value = `0, ${(L/2).toFixed(1)}, ${L}`;
  if (t === 'overhanging') $('supportsInput').value = `0, ${L}`;
  drawBeamDiagram();
});

sectionType.addEventListener('change', () => {
  $('rectFields').style.display = sectionType.value === 'rectangular' ? 'grid'  : 'none';
  $('circFields').style.display = sectionType.value === 'circular'    ? 'block' : 'none';
  $('iFields').style.display    = sectionType.value === 'i_section'   ? 'block' : 'none';
});

materialEl.addEventListener('change', () => {
  const p = MATERIAL_PRESETS[materialEl.value];
  if (p) { $('matE').value = p.E; $('matSy').value = p.sigma_y; }
  $('matE').disabled  = !!p;
  $('matSy').disabled = !!p;
});
materialEl.dispatchEvent(new Event('change'));

$('selfWeightToggle').addEventListener('change', function() {
  swEnabled = this.checked;
  $('selfWeightPanel').style.display = swEnabled ? 'flex' : 'none';
  updateSWDisplay();
  drawBeamDiagram();
});
['swDensity', 'swMass', 'beamLength', 'secWidth', 'secHeight', 'secDia', 'iFw', 'iH', 'iFt', 'iWt'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('input', () => { updateSWDisplay(); drawBeamDiagram(); });
});

$('beamLength').addEventListener('input', () => {
  const L = parseFloat($('beamLength').value) || 5;
  const t = beamTypeEl.value;
  if (t === 'continuous')  $('supportsInput').value = `0, ${(L/2).toFixed(1)}, ${L}`;
  if (t === 'overhanging') $('supportsInput').value = `0, ${L}`;
  drawBeamDiagram();
});

$('supportsInput').addEventListener('input', drawBeamDiagram);


function openAddModal() {
  editingIndex = null;
  $('modalTitle').textContent = 'Add load';
  $('confirmLoad').textContent = 'Add load';
  $('newLoadType').value = 'udl';
  $('udlMag').value  = 10;   $('udlX0').value  = 0;  $('udlX1').value  = parseFloat($('beamLength').value) || 5;
  $('vdlW0').value   = 0;    $('vdlW1').value   = 10; $('vdlX0').value  = 0; $('vdlX1').value = parseFloat($('beamLength').value) || 5;
  $('ptMag').value   = 25;   $('ptX').value     = (parseFloat($('beamLength').value) || 5) / 2;
  $('momMag').value  = 10;   $('momX').value    = (parseFloat($('beamLength').value) || 5) / 2;
  $('newLoadType').dispatchEvent(new Event('change'));
  $('loadModal').style.display = 'flex';
}

function openEditModal(i) {
  editingIndex = i;
  const ld = loads[i];
  $('modalTitle').textContent = 'Edit load';
  $('confirmLoad').textContent = 'Save changes';

  $('newLoadType').value = ld.type;
  $('newLoadType').dispatchEvent(new Event('change'));

  if (ld.type === 'udl') {
    $('udlMag').value = ld.magnitude;
    $('udlX0').value  = ld.x_start;
    $('udlX1').value  = ld.x_end;
  } else if (ld.type === 'vdl') {
    $('vdlW0').value  = ld.w_start;
    $('vdlW1').value  = ld.w_end;
    $('vdlX0').value  = ld.x_start;
    $('vdlX1').value  = ld.x_end;
  } else if (ld.type === 'point') {
    $('ptMag').value  = ld.magnitude;
    $('ptX').value    = ld.x;
  } else if (ld.type === 'moment') {
    $('momMag').value = ld.magnitude;
    $('momX').value   = ld.x;
  }
  $('loadModal').style.display = 'flex';
}

$('addLoadBtn').addEventListener('click', openAddModal);
$('cancelLoad').addEventListener('click', () => { $('loadModal').style.display = 'none'; });

$('newLoadType').addEventListener('change', () => {
  const t = $('newLoadType').value;
  $('udlFields').style.display    = t === 'udl'    ? 'block' : 'none';
  $('vdlFields').style.display    = t === 'vdl'    ? 'block' : 'none';
  $('pointFields').style.display  = t === 'point'  ? 'block' : 'none';
  $('momentFields').style.display = t === 'moment' ? 'block' : 'none';
});
$('newLoadType').dispatchEvent(new Event('change'));

$('confirmLoad').addEventListener('click', () => {
  const t = $('newLoadType').value;
  const L = parseFloat($('beamLength').value) || 5;
  let load = null;

  if (t === 'udl') {
    load = { type: 'udl', magnitude: +$('udlMag').value || 10,
             x_start: +$('udlX0').value || 0, x_end: +$('udlX1').value || L };
  } else if (t === 'vdl') {
    load = { type: 'vdl', w_start: +$('vdlW0').value || 0, w_end: +$('vdlW1').value || 10,
             x_start: +$('vdlX0').value || 0, x_end: +$('vdlX1').value || L };
  } else if (t === 'point') {
    load = { type: 'point', magnitude: +$('ptMag').value || 25, x: +$('ptX').value };
  } else if (t === 'moment') {
    load = { type: 'moment', magnitude: +$('momMag').value || 10, x: +$('momX').value };
  }

  if (load) {
    if (editingIndex !== null) {
      loads[editingIndex] = load; 
    } else {
      loads.push(load);
    }
    renderLoadList();
    drawBeamDiagram();
  }
  $('loadModal').style.display = 'none';
});

function renderLoadList() {
  const container = $('loadList');
  container.innerHTML = '';
  loads.forEach((ld, i) => {
    let label = '';
    if (ld.type === 'udl')    label = `UDL  ${ld.magnitude} kN/m  [${ld.x_start}–${ld.x_end} m]`;
    if (ld.type === 'vdl')    label = `VDL  ${ld.w_start}→${ld.w_end} kN/m  [${ld.x_start}–${ld.x_end} m]`;
    if (ld.type === 'point')  label = `Point  ${ld.magnitude} kN  @ x=${ld.x} m`;
    if (ld.type === 'moment') label = `Moment  ${ld.magnitude} kN·m  @ x=${ld.x} m`;

    const pal = LOAD_PALETTE[i % LOAD_PALETTE.length];
    const div = document.createElement('div');
    div.className = 'load-row';
    div.innerHTML = `
      <div class="load-dot" style="background:${pal.stroke}"></div>
      <span class="load-label">${label}</span>
      <button class="load-edit" data-i="${i}" title="Edit">✎</button>
      <button class="load-del"  data-i="${i}" title="Delete">✕</button>`;
    container.appendChild(div);
  });

  container.querySelectorAll('.load-edit').forEach(btn =>
    btn.addEventListener('click', e => openEditModal(+e.currentTarget.dataset.i))
  );
  container.querySelectorAll('.load-del').forEach(btn =>
    btn.addEventListener('click', e => {
      loads.splice(+e.currentTarget.dataset.i, 1);
      renderLoadList();
      drawBeamDiagram();
    })
  );
}


$('analyseBtn').addEventListener('click', runAnalysis);

async function runAnalysis() {
  const btn = $('analyseBtn');
  btn.disabled = true; btn.textContent = 'Analysing…';
  $('errorBanner').style.display = 'none';

  const L  = parseFloat($('beamLength').value)  || 5;
  const n  = parseInt($('nSegments').value)      || 1000;
  const bt = beamTypeEl.value;
  const st = sectionType.value;

  const secCfg = { section_type: st };
  if (st === 'rectangular') { secCfg.width = +$('secWidth').value; secCfg.height = +$('secHeight').value; }
  else if (st === 'circular') { secCfg.diameter = +$('secDia').value; }
  else { secCfg.width = +$('iFw').value; secCfg.height = +$('iH').value;
         secCfg.flange_thick = +$('iFt').value; secCfg.web_thick = +$('iWt').value; }

  const matCfg = { material: materialEl.value, E: +$('matE').value, sigma_y: +$('matSy').value };

  let supports = [];
  if (bt === 'overhanging' || bt === 'continuous')
    supports = $('supportsInput').value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

  const allLoads = [...loads];
  if (swEnabled) {
    const W_kN = getSelfWeightN() / 1e3;
    allLoads.push({ type: 'point', magnitude: W_kN, x: L / 2, _isSelfWeight: true });
  }

  try {
    const res = await fetch('/api/analyse', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ beam_type: bt, length: L, n_segments: n,
                                section: secCfg, material: matCfg, loads: allLoads, supports }),
    });

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    updateMetrics(data.results);
    window._lastZ = data.results._Z_m3 || null;
    drawCharts(data);
    drawBeamDiagram(data);
  } catch (err) {
    $('errorBanner').textContent = 'Error: ' + err.message;
    $('errorBanner').style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Analyse beam';
  }
}

function updateMetrics(r) {
  $('v-sf').textContent    = r.safety_factor;
  $('v-sigma').innerHTML   = `${r.max_bending_stress_MPa} <span class="metric-unit">MPa</span>`;
  $('v-def').innerHTML     = `${r.max_deflection_mm} <span class="metric-unit">mm</span>`;
  $('v-shear').innerHTML   = `${r.max_shear_kN} <span class="metric-unit">kN</span>`;
  const card = $('m-sf');
  card.classList.remove('safe', 'warn', 'danger');
  const sf = parseFloat(r.safety_factor);
  if (!isNaN(sf)) {
    if (sf >= 2.5) card.classList.add('safe');
    else if (sf >= 1.5) card.classList.add('warn');
    else card.classList.add('danger');
  }
}

function makeChartCfg(color, label, yLabel) {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label, data: [], borderColor: color, borderWidth: 1.8,
        pointRadius: 0, fill: true, backgroundColor: color + '1a', tension: 0.3,
      }],
    },
    options: {
      animation: false, responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 8 } },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          display: true,
          ticks: {
            color: C.muted,
            font: { family: "'JetBrains Mono'", size: 11 },
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 30,
            maxTicksLimit: 6,
            callback: function(val, idx, ticks) {
              const total = ticks.length;
              const label = (+this.getLabelForValue(val)).toFixed(2);
              if (idx === total - 1) return label;   
              if (idx === 0)         return label; 
              if (idx === total - 2) return null;
              return label;
            },
          },
          grid: { color: C.border },
          border: { color: C.border },
          title: {
            display: true,
            text: 'Position  x (m)',
            color: C.muted,
            font: { family: "'JetBrains Mono'", size: 10 },
            padding: { top: 4 },
          },
        },
        y: {
          ticks: {
            color: C.muted,
            font: { family: "'JetBrains Mono'", size: 11 },
            maxTicksLimit: 6,
            callback: v => v.toFixed(v === 0 ? 0 : 2),
          },
          grid: {
            color: ctx => ctx.tick.value === 0 ? 'rgba(255,255,255,.22)' : C.border,
            lineWidth: ctx => ctx.tick.value === 0 ? 1.5 : 1,
          },
          border: { color: C.border },
          title: {
            display: true,
            text: yLabel || '',
            color: C.muted,
            font: { family: "'JetBrains Mono'", size: 10 },
            padding: { bottom: 4 },
          },
        },
      },
    },
  };
}

function initCharts() {
  charts.sfd = new Chart($('chartSFD'), makeChartCfg(C.blue,   'SFD',        'Shear force  V (kN)'));
  charts.bmd = new Chart($('chartBMD'), makeChartCfg(C.orange, 'BMD',        'Moment  M (kN·m)'));
  charts.def = new Chart($('chartDef'), makeChartCfg(C.green,  'Deflection', 'Deflection  δ (mm)'));
}

function downsample(arr, target = 300) {
  if (arr.length <= target) return arr;
  const first = arr[0];
  const last  = arr[arr.length - 1];
  const step  = Math.ceil((arr.length - 2) / (target - 2));
  const mid   = arr.slice(1, arr.length - 1).filter((_, i) => i % step === 0);
  return [first, ...mid, last];
}

function drawCharts(data) {
  const x   = downsample(data.x);
  const V   = downsample(data.V).map(v => +(v / 1e3).toFixed(3));
  const M   = downsample(data.M).map(v => +(v / 1e3).toFixed(3));
  const def = downsample(data.y).map(v => +v.toFixed(4));
  const lbl = x.map(v => v.toFixed(3));

  function upd(chart, lbls, vals) {
    chart.data.labels = lbls;
    chart.data.datasets[0].data = vals;
    chart.update('none');
  }
  upd(charts.sfd, lbl, V);
  upd(charts.bmd, lbl, M);
  upd(charts.def, lbl, def);
  drawStressHeatmap(data);
}

function drawStressHeatmap(data) {
  const absM = data.M.map(Math.abs);
  const maxM = Math.max(...absM, 1e-9);
  const n    = absM.length;
  const pts  = 12;

  const stops = Array.from({ length: pts }, (_, i) => {
    const pct = i / (pts - 1);
    const idx = Math.min(Math.floor(pct * n), n - 1);
    const t   = absM[idx] / maxM;
    const r   = Math.round(30  + t * (224 - 30));
    const g   = Math.round(120 - t * (120 - 75));
    const b   = Math.round(200 - t * (200 - 74));
    return `<stop offset="${(pct*100).toFixed(1)}%" stop-color="rgb(${r},${g},${b})"/>`;
  }).join('');

  const maxSigmaVal = (maxM / (window._lastZ || 1) / 1e6).toFixed(1);
  
  $('stressHeatmap').innerHTML = `
  <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <defs>
      <linearGradient id="hmG" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      <linearGradient id="scaleG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#1e6ac4"/>
        <stop offset="50%"  stop-color="#e8c84d"/>
        <stop offset="100%" stop-color="#e05555"/>
      </linearGradient>
    </defs>
 
    <!-- +y / -y labels: right-aligned to x=56, fully outside the heatmap rect -->
    <text x="56" y="16" text-anchor="end" font-size="8" fill="rgba(255,255,255,.45)"
          font-family="JetBrains Mono,monospace">+y (top)</text>
    <text x="56" y="82" text-anchor="end" font-size="8" fill="rgba(255,255,255,.45)"
          font-family="JetBrains Mono,monospace">−y (bot)</text>
 
    <!-- heatmap body — starts at x=60 to give labels room -->
    <rect x="60" y="6" width="254" height="78" rx="5" fill="url(#hmG)" opacity=".92"/>
 
    <!-- neutral axis -->
    <line x1="60" y1="45" x2="314" y2="45"
          stroke="rgba(255,255,255,.28)" stroke-width="1" stroke-dasharray="6 4"/>
    <text x="187" y="41" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.55)"
          font-family="JetBrains Mono,monospace">neutral axis  (σ = 0)</text>
 
    <!-- x-axis label -->
    <text x="187" y="98" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.4)"
          font-family="JetBrains Mono,monospace">Position along beam  x (m) →</text>
 
    <!-- stress scale bar -->
    <rect x="60" y="106" width="90" height="5" fill="url(#scaleG)" rx="2"/>
    <text x="60"  y="118" font-size="7.5" fill="rgba(255,255,255,.4)"
          font-family="JetBrains Mono,monospace">Low σ (MPa)</text>
    <text x="150" y="118" font-size="7.5" fill="rgba(255,255,255,.4)"
          font-family="JetBrains Mono,monospace" text-anchor="end">High σ</text>
 
    <!-- sigma_max annotation -->
    <text x="314" y="118" font-size="7.5" fill="rgba(255,255,255,.35)"
          font-family="JetBrains Mono,monospace" text-anchor="end">σ_max ≈ ${maxSigmaVal} MPa</text>
  </svg>`;
}

const DIAG = {
  W: 800, H: 320,
  PAD: 50,
  BY: 200,
  BH: 13,
  LOAD_TOP: 14,
  ARR_SPACING: 38,
  ARR_MIN: 3,
};

function drawBeamDiagram(data) {
  const svg = $('beamDiagram');
  const { W, H, PAD, BY, BH, LOAD_TOP } = DIAG;
  const L   = parseFloat($('beamLength').value) || 5;
  const bt  = beamTypeEl.value;
  const bx0 = PAD, bx1 = W - PAD, bw = bx1 - bx0;

  const bx = xm => bx0 + Math.max(0, Math.min(1, xm / L)) * bw;

  let html = `
  <defs>
    <clipPath id="beamClip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
    <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#3e4249"/>
      <stop offset="40%"  stop-color="#5a5f6a"/>
      <stop offset="100%" stop-color="#2a2d33"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g clip-path="url(#beamClip)">`;

  const beamTop = BY - BH / 2, beamBot = BY + BH / 2;

  html += `<rect x="${bx0}" y="${beamTop}" width="${bw}" height="${BH}" rx="3"
    fill="url(#beamGrad)" stroke="#444851" stroke-width="0.5"/>`;

  const supPositions = getSupportPositions(bt, L);
  if (bt === 'cantilever') {
    html += fixedWall(bx0, beamTop, beamBot, false);
  } else if (bt === 'fixed_fixed') {
    html += fixedWall(bx0, beamTop, beamBot, false);
    html += fixedWall(bx1, beamTop, beamBot, true);
  } else {
    supPositions.forEach((xm, si) => {
      const px = bx(xm);
      if (si === 0 && bt === 'propped_cantilever') {
        html += fixedWall(px, beamTop, beamBot, false);
      } else if (si === 0) {
        html += pinSupport(px, beamBot);
      } else {
        html += rollerSupport(px, beamBot);
      }
    });
  }

  const LABEL_STEP = 18;
  loads.forEach((ld, i) => {
    const pal = LOAD_PALETTE[i % LOAD_PALETTE.length];
    const mid = `L${i}`;
    if (ld.type === 'udl')    html += renderUDL(ld, bx, LOAD_TOP, BY, bx0, bx1, L, bw, i, LABEL_STEP, pal, mid);
    if (ld.type === 'vdl')    html += renderVDL(ld, bx, LOAD_TOP, BY, L, i, LABEL_STEP, pal, mid);
    if (ld.type === 'point')  html += renderPoint(ld, bx, LOAD_TOP, BY, i, LABEL_STEP, pal, mid);
    if (ld.type === 'moment') html += renderMoment(ld, bx, BY, i, LABEL_STEP, pal, mid);
  });


  if (swEnabled) {
    const W_N = getSelfWeightN();
    const midX = bx(L / 2);
    const arrowTop  = BY + BH / 2 + 6;  
    const arrowBot  = BY + BH / 2 + 36; 
    const col = '#e8c84d';
    const label = `W = ${(W_N/1000).toFixed(2)} kN`;
    const lw = label.length * 5.2 + 10;

    html += `<defs>
      <marker id="arrSW" viewBox="0 0 10 10" refX="5" refY="9"
              markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0 0 L5 9 L10 0" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>
      </marker>
    </defs>`;

    html += `<line x1="${midX}" y1="${arrowTop}" x2="${midX}" y2="${arrowBot}"
      stroke="${col}" stroke-width="2" opacity=".2" filter="url(#glow)"/>`;

    html += `<line x1="${midX}" y1="${arrowTop}" x2="${midX}" y2="${arrowBot}"
      stroke="${col}" stroke-width="1.6" marker-end="url(#arrSW)"/>`;

    html += `<rect x="${midX - lw/2}" y="${arrowBot + 3}" width="${lw}" height="13" rx="4"
      fill="#2a2200" stroke="${col}" stroke-width="0.6" opacity=".95"/>`;
    html += `<text x="${midX}" y="${arrowBot + 13}" text-anchor="middle" font-size="8.5"
      fill="${col}" font-family="JetBrains Mono,monospace">${label}</text>`;
  }

  if (data && data.reactions) {
    html += renderReactions(data.reactions, bt, L, bx, BY + BH / 2 + 2, supPositions);
  }

  html += `</g>`;

  html += `<text x="${bx0}" y="${H - 4}" font-size="9" fill="${C.muted}"
    font-family="JetBrains Mono,monospace" text-anchor="middle">0 m</text>`;
  html += `<text x="${bx1}" y="${H - 4}" font-size="9" fill="${C.muted}"
    font-family="JetBrains Mono,monospace" text-anchor="middle">${L} m</text>`;
  html += `<text x="${(bx0+bx1)/2}" y="${H - 4}" font-size="9" fill="${C.label}"
    font-family="JetBrains Mono,monospace" text-anchor="middle">${(L/2).toFixed(1)} m</text>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = html;
}

function getSupportPositions(bt, L) {
  if (bt === 'overhanging' || bt === 'continuous') {
    const raw = $('supportsInput').value.split(',')
      .map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (raw.length >= 2) return raw;
  }
  return [0, L];
}

function renderReactions(reactions, bt, L, bx, baseY, supPositions) {
  let html = '';
  const ARR_H = 22;
  const col   = '#e8c84d';

  html += `<defs><marker id="arrY" viewBox="0 0 10 10" refX="5" refY="1"
    markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    <path d="M0 10 L5 0 L10 10" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>
  </marker></defs>`;

  const drawArrow = (px, val, label) => {
    const lw = label.length * 5.2 + 8;
    html += `<line x1="${px}" y1="${baseY + ARR_H}" x2="${px}" y2="${baseY + 2}"
      stroke="${col}" stroke-width="1.5" marker-end="url(#arrY)" opacity=".85"/>`;
    html += `<rect x="${px - lw/2}" y="${baseY + ARR_H + 2}" width="${lw}" height="12" rx="3"
      fill="#2a2200" stroke="${col}" stroke-width="0.5" opacity=".9"/>`;
    html += `<text x="${px}" y="${baseY + ARR_H + 11}" text-anchor="middle" font-size="8"
      fill="${col}" font-family="JetBrains Mono,monospace">${label}</text>`;
  };

  if (bt === 'continuous') {
    const posMap = reactions.positions || {};
    Object.entries(posMap).forEach(([key, xPos]) => {
      const val = reactions[key];
      if (typeof val === 'number') {
        drawArrow(bx(xPos), val, `R=${(val/1e3).toFixed(1)}kN`);
      }
    });
  } else if (bt === 'overhanging') {
    const [xA, xB] = supPositions.length >= 2 ? supPositions : [0, L];
    if (reactions.R_A !== undefined) drawArrow(bx(xA), reactions.R_A, `RA=${(reactions.R_A/1e3).toFixed(1)}kN`);
    if (reactions.R_B !== undefined) drawArrow(bx(xB), reactions.R_B, `RB=${(reactions.R_B/1e3).toFixed(1)}kN`);
  } else {
    if (reactions.R_A !== undefined) drawArrow(bx(0), reactions.R_A, `RA=${(reactions.R_A/1e3).toFixed(1)}kN`);
    if (reactions.R_B !== undefined) drawArrow(bx(L), reactions.R_B, `RB=${(reactions.R_B/1e3).toFixed(1)}kN`);
  }

  return html;
}

function renderUDL(ld, bx, loadTop, beamY, bx0, bx1, L, bw, labelRow=0, labelStep=18, pal=LOAD_PALETTE[0], mid='L0') {
  const x0 = bx(ld.x_start), x1 = bx(ld.x_end);
  const spanPx = x1 - x0;
  if (spanPx < 2) return '';

  const topY = loadTop, botY = beamY - 2;
  const count = Math.max(DIAG.ARR_MIN, Math.round(spanPx / DIAG.ARR_SPACING));
  const step  = spanPx / (count - 1);

  let html = `<defs>
    <marker id="arr${mid}" viewBox="0 0 10 10" refX="5" refY="9"
            markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L5 9 L10 0" fill="none" stroke="${pal.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
    </marker>
  </defs>`;

  html += `<rect x="${x0}" y="${topY}" width="${spanPx}" height="${botY - topY}"
    fill="${pal.dim}" rx="2"/>`;
  html += `<line x1="${x0}" y1="${topY}" x2="${x1}" y2="${topY}"
    stroke="${pal.stroke}" stroke-width="1.5" stroke-linecap="round"
    stroke-dasharray="4 3" opacity=".9"/>`;

  for (let i = 0; i < count; i++) {
    const ax = x0 + i * step;
    html += `<line x1="${ax}" y1="${topY + 2}" x2="${ax}" y2="${botY}"
      stroke="${pal.stroke}" stroke-width="1.3" opacity=".85"
      marker-end="url(#arr${mid})"/>`;
  }

  const mx = (x0 + x1) / 2;
  const ly = topY + labelRow * labelStep;
  const labelText = `${ld.magnitude} kN/m`;
  const lw = labelText.length * 5.4 + 10;
  html += `<rect x="${mx - lw/2}" y="${ly}" width="${lw}" height="13" rx="4"
    fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="0.6" opacity=".97"/>`;
  html += `<text x="${mx}" y="${ly + 10}" text-anchor="middle" font-size="9"
    fill="${pal.stroke}" font-family="JetBrains Mono,monospace">${labelText}</text>`;

  return html;
}

function renderVDL(ld, bx, loadTop, beamY, L, labelRow=0, labelStep=18, pal=LOAD_PALETTE[3], mid='L0') {
  const x0   = bx(ld.x_start), x1 = bx(ld.x_end);
  const spanPx = x1 - x0;
  if (spanPx < 2) return '';

  const maxW  = Math.max(ld.w_end, ld.w_start, 0.001);
  const MAXH  = beamY - loadTop - 4;
  const botY  = beamY - 2;
  const hLeft  = MAXH * (ld.w_start / maxW);
  const hRight = MAXH * (ld.w_end   / maxW);

  const p0x = x0, p0y = botY - hLeft;
  const p1x = x1, p1y = botY - hRight;

  let html = `<defs>
    <marker id="arr${mid}" viewBox="0 0 10 10" refX="5" refY="9"
            markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L5 9 L10 0" fill="none" stroke="${pal.stroke}" stroke-width="1.8" stroke-linejoin="round"/>
    </marker>
  </defs>`;

  html += `<polygon points="${p0x},${p0y} ${p1x},${p1y} ${p1x},${botY} ${p0x},${botY}"
    fill="${pal.stroke}" opacity=".13"/>`;
  html += `<line x1="${p0x}" y1="${p0y}" x2="${p1x}" y2="${p1y}"
    stroke="${pal.stroke}" stroke-width="1.4" opacity=".8"/>`;

  const count = Math.max(DIAG.ARR_MIN, Math.round(spanPx / DIAG.ARR_SPACING));
  for (let i = 0; i < count; i++) {
    const t   = i / (count - 1);
    const ax  = x0 + t * spanPx;
    const h   = hLeft + t * (hRight - hLeft);
    if (h < 6) continue;
    html += `<line x1="${ax}" y1="${botY - h + 2}" x2="${ax}" y2="${botY}"
      stroke="${pal.stroke}" stroke-width="1.2" opacity=".8"
      marker-end="url(#arr${mid})"/>`;
  }

  const mx = (x0 + x1) / 2;
  const ly = loadTop + labelRow * labelStep;
  const labelText = `${ld.w_start}→${ld.w_end} kN/m`;
  const lw = labelText.length * 5.4 + 10;
  html += `<rect x="${mx - lw/2}" y="${ly}" width="${lw}" height="13" rx="4"
    fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="0.6" opacity=".97"/>`;
  html += `<text x="${mx}" y="${ly + 10}" text-anchor="middle" font-size="9"
    fill="${pal.stroke}" font-family="JetBrains Mono,monospace">${labelText}</text>`;

  return html;
}

function renderPoint(ld, bx, loadTop, beamY, labelRow=0, labelStep=18, pal=LOAD_PALETTE[4], mid='L0') {
  const px   = bx(ld.x);
  const botY = beamY - 2;
  const label = `${ld.magnitude} kN`;
  const pw = label.length * 5.6 + 10;
  const PILL_H = 14;
  const ly = loadTop + 4 + labelRow * labelStep;
  const arrowStartY = ly + PILL_H + 2;

  let html = `<defs>
    <marker id="arr${mid}" viewBox="0 0 10 10" refX="5" refY="9"
            markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L5 9 L10 0" fill="none" stroke="${pal.stroke}" stroke-width="2" stroke-linejoin="round"/>
    </marker>
  </defs>`;

  html += `<rect x="${px - pw/2}" y="${ly}" width="${pw}" height="${PILL_H}" rx="4"
    fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="0.6"/>`;
  html += `<text x="${px}" y="${ly + 10}" text-anchor="middle" font-size="9"
    fill="${pal.stroke}" font-family="JetBrains Mono,monospace">${label}</text>`;
  html += `<line x1="${px}" y1="${arrowStartY}" x2="${px}" y2="${botY}"
    stroke="${pal.stroke}" stroke-width="2.5" opacity=".22" filter="url(#glow)"/>`;
  html += `<line x1="${px}" y1="${arrowStartY}" x2="${px}" y2="${botY}"
    stroke="${pal.stroke}" stroke-width="2" marker-end="url(#arr${mid})"/>`;

  return html;
}

function renderMoment(ld, bx, beamY, labelRow=0, labelStep=18, pal=LOAD_PALETTE[2], mid='L0') {
  const px = bx(ld.x);
  const cy = beamY;
  const r  = 14;

  let html = `<defs>
    <marker id="arrMom${mid}" viewBox="0 0 10 10" refX="5" refY="5"
            markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="${pal.stroke}"/>
    </marker>
  </defs>`;

  html += `<path d="M ${px+r} ${cy} A ${r} ${r} 0 1 0 ${px} ${cy-r}"
    fill="none" stroke="${pal.stroke}" stroke-width="1.8"
    marker-end="url(#arrMom${mid})"/>`;

  const labelText = `${ld.magnitude} kN·m`;
  const lw = labelText.length * 5.4 + 10;
  const labelY = cy - r - 30 - labelRow * labelStep;
  html += `<rect x="${px - lw/2}" y="${labelY}" width="${lw}" height="14" rx="4"
    fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="0.6"/>`;
  html += `<text x="${px}" y="${labelY + 10}" text-anchor="middle" font-size="9"
    fill="${pal.stroke}" font-family="JetBrains Mono,monospace">${labelText}</text>`;

  return html;
}

function pinSupport(cx, y) {
  const h = 20, hw = 14;
  return `
  <polygon points="${cx},${y} ${cx-hw},${y+h} ${cx+hw},${y+h}"
    fill="none" stroke="${C.muted}" stroke-width="1.2" stroke-linejoin="round"/>
  <line x1="${cx-hw-4}" y1="${y+h+3}" x2="${cx+hw+4}" y2="${y+h+3}" stroke="${C.muted}" stroke-width="1"/>
  <line x1="${cx-hw-4}" y1="${y+h+3}" x2="${cx-hw-2}" y2="${y+h+7}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx-hw+2}" y1="${y+h+3}" x2="${cx-hw+4}" y2="${y+h+7}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx+hw-4}" y1="${y+h+3}" x2="${cx+hw-2}" y2="${y+h+7}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx+hw}"   y1="${y+h+3}" x2="${cx+hw+2}" y2="${y+h+7}" stroke="${C.muted}" stroke-width="0.8"/>`;
}

function rollerSupport(cx, y) {
  const r = 7;
  return `
  <circle cx="${cx}" cy="${y+r+2}" r="${r}" fill="none" stroke="${C.muted}" stroke-width="1.2"/>
  <line x1="${cx-r-5}" y1="${y+2*r+4}" x2="${cx+r+5}" y2="${y+2*r+4}" stroke="${C.muted}" stroke-width="1"/>
  <line x1="${cx-r-5}" y1="${y+2*r+4}" x2="${cx-r-3}" y2="${y+2*r+8}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx-r+1}" y1="${y+2*r+4}" x2="${cx-r+3}" y2="${y+2*r+8}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx+r-3}" y1="${y+2*r+4}" x2="${cx+r-1}" y2="${y+2*r+8}" stroke="${C.muted}" stroke-width="0.8"/>
  <line x1="${cx+r+1}" y1="${y+2*r+4}" x2="${cx+r+3}" y2="${y+2*r+8}" stroke="${C.muted}" stroke-width="0.8"/>`;
}

function fixedWall(x, beamTop, beamBot, rightSide) {
  const wx  = rightSide ? x : x - 8;
  const WW  = 8;
  const ext = 20;
  const ty  = beamTop - ext, by = beamBot + ext;

  let html = `<rect x="${wx}" y="${ty}" width="${WW}" height="${by - ty}"
    fill="#2a2d36" stroke="#444851" stroke-width="0.7"/>`;

  const face = rightSide ? wx : wx + WW;
  const DIR  = rightSide ? 1 : -1;
  for (let yy = ty + 4; yy < by; yy += 8)
    html += `<line x1="${face}" y1="${yy}" x2="${face + DIR*8}" y2="${yy+6}"
      stroke="#444851" stroke-width="0.8"/>`;

  return html;
}

initCharts();
loads.push({ type: 'udl', magnitude: 10, x_start: 0, x_end: 5 });
renderLoadList();
drawBeamDiagram();