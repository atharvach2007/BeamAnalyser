import numpy as np

try:
    _trapz = np.trapezoid
except AttributeError:
    _trapz = np.trapz

from utils.loads import distributed_load_array


def _span_load_terms(loads: list, a: float, b: float) -> tuple:
    N  = 500
    x  = np.linspace(a, b, N + 1)
    L  = b - a
    q  = np.zeros(N + 1)

    for ld in loads:
        if ld["type"] == "udl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            q[mask] += ld["w"]
        elif ld["type"] == "vdl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            t    = (x[mask] - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
            q[mask] += ld["w_start"] + (ld["w_end"] - ld["w_start"]) * t
        elif ld["type"] == "point" and a <= ld["x"] <= b:
            idx = np.argmin(np.abs(x - ld["x"]))
            q[idx] += ld["P"] / (L / N)

    xi = x - a
    term_a = _trapz(q * xi       * (L**2 - xi**2) / L, x)
    term_b = _trapz(q * (L - xi) * (L**2 - (L - xi)**2) / L, x)

    return term_a, term_b


def solve_continuous(
    length: float,
    n: int,
    loads: list,
    EI: float,
    supports: list | None = None,
    **kwargs,
) -> dict:
    if not supports or len(supports) < 2:
        supports = [0.0, length / 2.0, length]

    supports = sorted([float(s) for s in supports])
    ns = len(supports)
    nspans = ns - 1

    M_ends = (0.0, 0.0)

    if nspans == 1:
        from solver.simply_supported import solve_simply_supported
        res = solve_simply_supported(length, n, loads, EI)
        pos = {"R_A": supports[0], "R_B": supports[1]}
        return {**res, "positions": pos, "support_moments": [0.0, 0.0]}

    n_int = ns - 2
    A_mat = np.zeros((n_int, n_int))
    b_vec = np.zeros(n_int)

    for i in range(n_int):
        L_left  = supports[i + 1] - supports[i]
        L_right = supports[i + 2] - supports[i + 1]

        term_aL, term_bL = _span_load_terms(loads, supports[i],     supports[i + 1])
        term_aR, term_bR = _span_load_terms(loads, supports[i + 1], supports[i + 2])

        A_mat[i, i] = 2 * (L_left + L_right)

        if i > 0:
            A_mat[i, i - 1] = L_left
        if i < n_int - 1:
            A_mat[i, i + 1] = L_right

        rhs = -(term_bL + term_aR)

        if i == 0:
            rhs -= M_ends[0] * L_left
        if i == n_int - 1:
            rhs -= M_ends[1] * L_right

        b_vec[i] = rhs

    M_int = np.linalg.solve(A_mat, b_vec)

    M_supports = np.zeros(ns)
    M_supports[0]  = M_ends[0]
    M_supports[-1] = M_ends[1]
    M_supports[1:-1] = M_int

    reactions = {}
    R_support = np.zeros(ns)

    for s in range(nspans):
        a, b   = supports[s], supports[s + 1]
        L_span = b - a
        Ma, Mb = M_supports[s], M_supports[s + 1]

        F_span = 0.0
        Fx_sum = 0.0
        for ld in loads:
            if ld["type"] == "udl":
                x0 = max(ld["x_start"], a)
                x1 = min(ld["x_end"], b)
                if x1 > x0:
                    F = ld["w"] * (x1 - x0)
                    F_span += F
                    Fx_sum += F * (x0 + x1) / 2
            elif ld["type"] == "vdl":
                x0 = max(ld["x_start"], a)
                x1 = min(ld["x_end"], b)
                if x1 > x0:
                    t0 = (x0 - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
                    t1 = (x1 - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
                    w0 = ld["w_start"] + t0 * (ld["w_end"] - ld["w_start"])
                    w1 = ld["w_start"] + t1 * (ld["w_end"] - ld["w_start"])
                    F  = (w0 + w1) / 2 * (x1 - x0)
                    xb = x0 + (x1 - x0) * (w0 + 2*w1) / (3*(w0 + w1)) if abs(w0+w1) > 1e-12 else (x0+x1)/2
                    F_span += F
                    Fx_sum += F * xb
            elif ld["type"] == "point" and a <= ld["x"] <= b:
                F_span += ld["P"]
                Fx_sum += ld["P"] * ld["x"]

        if abs(L_span) > 1e-12:
            R_right_span = (F_span * (Fx_sum / F_span - a) + (Ma - Mb)) / L_span if abs(F_span) > 1e-12 else (Ma - Mb) / L_span
            R_left_span  = F_span - R_right_span
        else:
            R_left_span = R_right_span = 0.0

        R_support[s]     += R_left_span
        R_support[s + 1] += R_right_span

    pos_map = {}
    for i in range(ns):
        key = f"R_{i}"
        reactions[key] = float(R_support[i])
        pos_map[key]   = supports[i]

    reactions["positions"]       = pos_map
    reactions["support_moments"] = M_supports.tolist()

    return reactions