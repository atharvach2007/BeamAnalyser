import numpy as np
from utils.loads import distributed_load_array


def compute_diagrams(
    length: float,
    n: int,
    loads: list[dict],
    reactions: dict,
    EI: float,
    beam_type: str,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:

    x  = np.linspace(0, length, n + 1)
    dx = length / n
    q  = distributed_load_array(loads, x)           

    F_node = np.zeros(n + 1)

    for ld in loads:
        if ld["type"] == "point":
            idx = int(round(ld["x"] / length * n))
            idx = max(0, min(n, idx))
            F_node[idx] -= ld["P"]

    reaction_positions = _build_reaction_positions(beam_type, length, reactions)
    for key, pos in reaction_positions.items():
        val = reactions.get(key, 0.0)
        if not isinstance(val, (int, float)):
            continue
        idx = int(round(pos / length * n))
        idx = max(0, min(n, idx))
        F_node[idx] += float(val)

    V = np.zeros(n + 1)
    for i in range(1, n + 1):
        V[i] = V[i - 1] - q[i - 1] * dx + F_node[i - 1]

    M_fixed_start = float(reactions.get("M_A", 0.0))

    M = np.zeros(n + 1)
    M[0] = -M_fixed_start
    for i in range(1, n + 1):
        M[i] = M[i - 1] + V[i - 1] * dx

    for ld in loads:
        if ld["type"] == "moment":
            idx = int(round(ld["x"] / length * n))
            idx = max(0, min(n, idx))
            M[idx:] += ld["Mo"]

    M_B = float(reactions.get("M_B", 0.0))
    if abs(M_B) > 1e-9:
        M[n] = M_B

    theta = np.zeros(n + 1)
    for i in range(1, n + 1):
        theta[i] = theta[i - 1] + 0.5 * (M[i - 1] + M[i]) / EI * dx

    y = np.zeros(n + 1)
    for i in range(1, n + 1):
        y[i] = y[i - 1] + 0.5 * (theta[i - 1] + theta[i]) * dx

    y = _apply_deflection_bc(y, theta, x, beam_type, length, n, reactions)

    return x, V, M, y


def _build_reaction_positions(beam_type: str, length: float, reactions: dict) -> dict:
    if beam_type == "simply_supported":
        return {"R_A": 0.0, "R_B": length}

    elif beam_type == "cantilever":
        return {"R_A": 0.0}

    elif beam_type in ("overhanging", "propped_cantilever"):
        return {"R_A": 0.0, "R_B": length}

    elif beam_type == "fixed_fixed":
        return {"R_A": 0.0, "R_B": length}

    elif beam_type == "continuous":
        # The continuous solver stores actual positions under the "positions" key.
        # e.g. {"R_0": 0.0, "R_1": 2.5, "R_2": 5.0}
        pos_map = reactions.get("positions", {})
        if pos_map:
            return {k: float(v) for k, v in pos_map.items()
                    if k in reactions and isinstance(reactions.get(k), (int, float))}
        # fallback
        return {"R_A": 0.0, "R_B": length}

    return {}


def _apply_deflection_bc(y, theta, x, beam_type, length, n, reactions):
    if beam_type in ("simply_supported", "overhanging", "propped_cantilever", "fixed_fixed"):
        slope_corr = (y[0] - y[n]) / length
        y = y + slope_corr * x
        y = y - y[0]

    elif beam_type == "cantilever":
        y = y - y[0]

    elif beam_type == "continuous":
        pos_map = reactions.get("positions", {})
        if not pos_map:
            slope_corr = (y[0] - y[n]) / length
            y = y + slope_corr * x
            y = y - y[0]
            return y

        support_xs = sorted(set(float(v) for v in pos_map.values()))

        i0 = int(round(support_xs[0] / length * n))
        i0 = max(0, min(n, i0))
        y = y - y[i0]

        for k in range(len(support_xs) - 1):
            xa = support_xs[k]
            xb = support_xs[k + 1]
            ia = int(round(xa / length * n))
            ib = int(round(xb / length * n))
            ia = max(0, min(n, ia))
            ib = max(0, min(n, ib))
            if ib <= ia:
                continue
            span = xb - xa
            if abs(span) < 1e-12:
                continue
            slope = -y[ib] / span
            x_local = x[ia:ib + 1] - xa
            y[ia:ib + 1] = y[ia:ib + 1] + slope * x_local

    return y