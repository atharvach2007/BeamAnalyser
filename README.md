# BeamAnalyser

**A structural beam analysis web application built as a Computer Programming Project by Atharva Chauhan.**

BeamAnalyser is a full-stack engineering tool that lets you model, load, and analyse structural beams entirely in the browser. You configure the beam geometry, cross-section, material, and loading conditions through an interactive dark-themed UI, hit *Analyse*, and get back shear force diagrams, bending moment diagrams, a deflection curve, a stress heatmap, and key structural metrics, all computed in real time by a Python/Flask backend.

---

## What it does

### Beam types & solution methods

BeamAnalyser supports six beam configurations, each solved using the appropriate structural mechanics method:

| Beam type | Solution method | Degree of indeterminacy |
|---|---|---|
| Simply supported | Direct equilibrium (ΣF = 0, ΣM = 0) | Statically determinate |
| Cantilever | Direct equilibrium, fixed end reactions | Statically determinate |
| Overhanging | Direct equilibrium with arbitrary support positions | Statically determinate |
| Propped cantilever | Compatibility / force method | 1× indeterminate |
| Fixed-fixed | Fixed-end forces via stiffness method | 2× indeterminate |
| Continuous | Three-moment equation (Clapeyron's theorem) | n−1× indeterminate |

### Load types

Four load types can be applied simultaneously in any combination, each rendered visually on the beam diagram with a unique colour:

- **UDL**, uniform distributed load (kN/m), shown as equally spaced arrows with a dashed top rail
- **VDL**, linearly varying distributed load (kN/m), shown as a tapered arrow block
- **Point load**, concentrated force (kN), shown as a bold downward arrow
- **Applied moment**, concentrated moment (kN·m), shown as a curved arc arrow

Multiple loads of the same type are distinguished by an 8-colour palette so they never visually merge on the diagram.

### Cross-sections

- Rectangular (width × height)
- Circular (diameter)
- I-section (flange width, total height, flange thickness, web thickness)

Second moment of area *I*, section modulus *Z*, and cross-sectional area *A* are computed automatically for each shape.

### Materials

- Structural steel (E = 200 GPa, σ_y = 250 MPa)
- Aluminium 6061 (E = 69 GPa, σ_y = 276 MPa)
- Custom, enter any E and σ_y values

### Output & results

After analysis the following are computed and displayed:

- **Shear force diagram (SFD)**, plotted via Chart.js with full x-axis labelling
- **Bending moment diagram (BMD)**, signed moment distribution along the beam
- **Deflection curve**, computed by numerical double integration of the moment-curvature relationship M = EI·y″
- **Stress heatmap**, SVG gradient showing bending stress intensity along the beam length
- **Safety factor**, σ_y / σ_max, colour-coded green (≥ 2.5), amber (≥ 1.5), or red (< 1.5)
- **Max bending stress** (MPa), **max deflection** (mm), **max shear force** (kN)
- **Reaction forces** rendered directly on the beam diagram after analysis

### How results are visualised

All four diagrams update from a single analysis call and share a consistent x-axis so you can trace a point on the beam straight across every plot:

- The **SFD** and **BMD** are drawn as filled, signed line charts on Chart.js, with the zero-line always visible and positive/negative regions shaded differently so sign changes (and therefore points of maximum moment or shear) are easy to spot at a glance.
- The **deflection curve** is plotted on its own scaled axis in mm, since deflections are orders of magnitude smaller than the beam length, with the undeformed beam shown as a reference line behind the deformed shape.
- The **stress heatmap** is rendered as an SVG gradient overlaid directly on the beam diagram itself rather than as a separate chart, so you see exactly where along the physical beam bending stress peaks, using a colour ramp from cool (low stress) to hot (near or over yield).
- The **safety factor** is shown as a single colour-coded readout (green/amber/red) alongside the numeric value, giving an immediate pass/fail impression before you even read the number.

---

## Technical overview

The frontend is a single HTML page with a two-column layout, a sticky sidebar for inputs and a main panel for results. The beam diagram is rendered as an inline SVG that updates live on every input change, before analysis is even run. Loads are drawn with per-load unique SVG marker definitions so arrow colours never bleed between loads. Plots use Chart.js 4 with a custom dark theme.

The backend is a Flask REST API with a single `POST /api/analyse` endpoint. Each beam type has its own solver module that returns a `reactions` dictionary. The `compute_diagrams` utility then numerically builds the SFD, BMD, and deflection arrays at *n* segments (default 1000) using those reactions and the raw load arrays.

The app is deployable to Vercel as a Python serverless function with no changes to the core solver logic.

---

## API reference

`POST /api/analyse`

**Request body:**
```json
{
  "beam_type": "simply_supported",
  "length": 5,
  "n_segments": 1000,
  "section": { "section_type": "rectangular", "width": 50, "height": 100 },
  "material": { "material": "structural_steel" },
  "loads": [
    { "type": "udl",   "magnitude": 10, "x_start": 0, "x_end": 5 },
    { "type": "vdl",   "w_start": 0, "w_end": 20, "x_start": 0, "x_end": 3 },
    { "type": "point", "magnitude": 25, "x": 2 },
    { "type": "moment","magnitude": 10, "x": 3.5 }
  ],
  "supports": []
}
```

**Response:**
```json
{
  "x": [...],
  "V": [...],
  "M": [...],
  "y": [...],
  "reactions": { "R_A": 12500.0, "R_B": 12500.0 },
  "results": {
    "max_shear_kN": 12.5,
    "max_moment_kNm": 31.25,
    "max_deflection_mm": 4.883,
    "max_bending_stress_MPa": 187.5,
    "safety_factor": 1.33
  }
}
```

`x`, `V`, `M` are arrays of length `n_segments`. `V` is in N, `M` in N·m, `y` in mm.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| Numerics | NumPy |
| Frontend | Vanilla JS (ES6), SVG |
| Charts | Chart.js 4 |
| Deployment | Vercel (Python serverless) |

---

## Disclaimer

> BeamAnalyser is built for **educational purposes** as part of a Computer Programming coursework project. The results it produces, including reaction forces, stress values, deflections, and safety factors, are based on simplified analytical and numerical models and have not been validated for professional structural engineering use. **Always verify any structural calculations with a qualified civil or structural engineer before making real-world decisions.**

---

*© 2026 Atharva Chauhan, Computer Programming Project*
