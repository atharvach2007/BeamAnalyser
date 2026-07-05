import sys, os, traceback
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask, render_template, request, jsonify
from solver.simply_supported import solve_simply_supported
from solver.cantilever import solve_cantilever
from solver.overhanging import solve_overhanging
from solver.propped_cantilever import solve_propped_cantilever
from solver.fixed_fixed import solve_fixed_fixed
from solver.continuous import solve_continuous
from utils.section import get_section_properties
from utils.material import get_material_properties
from utils.loads import parse_loads
from utils.diagrams import compute_diagrams

ROOT = os.path.join(os.path.dirname(__file__), '..')

app = Flask(
    __name__,
    template_folder=os.path.join(ROOT, 'templates'),
    static_folder=os.path.join(ROOT, 'static'),
)

SOLVERS = {
    "simply_supported":   solve_simply_supported,
    "cantilever":         solve_cantilever,
    "overhanging":        solve_overhanging,
    "propped_cantilever": solve_propped_cantilever,
    "fixed_fixed":        solve_fixed_fixed,
    "continuous":         solve_continuous,
}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analyse", methods=["POST"])
def analyse():
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Invalid JSON in request body"}), 400

        beam_type    = data.get("beam_type", "simply_supported")
        length       = float(data.get("length", 5))
        n_segments   = int(data.get("n_segments", 1000))
        section_cfg  = data.get("section", {})
        material_cfg = data.get("material", {})
        loads_raw    = data.get("loads", [])
        supports     = data.get("supports", [])

        if length <= 0:
            return jsonify({"error": "Beam length must be positive"}), 400
        if n_segments < 10:
            return jsonify({"error": "n_segments must be ≥ 10"}), 400
        if not loads_raw:
            return jsonify({"error": "At least one load must be defined"}), 400

        section  = get_section_properties(section_cfg)
        material = get_material_properties(material_cfg)
        loads    = parse_loads(loads_raw, length, n_segments)
        EI       = material["E"] * section["I"]

        if EI <= 0:
            return jsonify({"error": "EI must be positive — check section & material values"}), 400

        solver = SOLVERS.get(beam_type)
        if solver is None:
            return jsonify({"error": f"Unknown beam type: {beam_type!r}"}), 400

        solver_kwargs = dict(length=length, n=n_segments, loads=loads, EI=EI)
        if beam_type in ("overhanging", "continuous"):
            solver_kwargs["supports"] = supports

        reactions = solver(**solver_kwargs)

        x, V, M, y = compute_diagrams(
            length=length,
            n=n_segments,
            loads=loads,
            reactions=reactions,
            EI=EI,
            beam_type=beam_type,
        )

        max_M     = float(max(abs(M)))
        max_V     = float(max(abs(V)))
        max_def   = float(max(abs(y))) * 1e3
        sigma_max = max_M / section["Z"] / 1e6
        safety    = material["sigma_y"] / sigma_max if sigma_max > 1e-9 else float("inf")
        safety_disp = "∞" if safety > 9999 or safety == float("inf") else round(safety, 2)

        return jsonify({
            "x":         x.tolist(),
            "V":         V.tolist(),
            "M":         M.tolist(),
            "y":         (y * 1e3).tolist(),
            "reactions": _serialise_reactions(reactions),
            "results": {
                "max_shear_kN":           round(max_V / 1e3, 3),
                "max_moment_kNm":         round(max_M / 1e3, 3),
                "max_deflection_mm":      round(max_def, 3),
                "max_bending_stress_MPa": round(sigma_max, 3),
                "safety_factor":          safety_disp,
            },
        })

    except Exception as exc:
        tb = traceback.format_exc()
        print(tb, file=sys.stderr)
        return jsonify({"error": str(exc) or "Internal solver error"}), 500


def _serialise_reactions(r: dict) -> dict:
    out = {}
    for k, v in r.items():
        if isinstance(v, (int, float)):
            out[k] = float(v)
        elif k == "positions" and isinstance(v, dict):
            out["positions"] = {kk: float(vv) for kk, vv in v.items()}
        elif k == "support_moments" and isinstance(v, list):
            out["support_moments"] = [float(m) for m in v]
    return out


if __name__ == "__main__":
    app.run(debug=True)