import numpy as np

try:
    _trapz = np.trapezoid
except AttributeError:
    _trapz = np.trapz

from utils.loads import distributed_load_array


def _cantilever_deflection(x: np.ndarray, loads: list, EI: float) -> np.ndarray:
    n   = len(x) - 1
    dx  = x[1] - x[0]
    L   = x[-1]

    q = distributed_load_array(loads, x)

    M = np.zeros(n + 1)
    for i, xi in enumerate(x):
        mask = x >= xi
        xs = x[mask]
        qs = q[mask]
        M[i] = _trapz(qs * (xs - xi), xs)
        for ld in loads:
            if ld["type"] == "point" and ld["x"] > xi:
                M[i] += ld["P"] * (ld["x"] - xi)

    kappa = M / EI                    
    theta = np.zeros(n + 1)
    for i in range(1, n + 1):
        theta[i] = theta[i - 1] + 0.5 * (kappa[i - 1] + kappa[i]) * dx

    y = np.zeros(n + 1)
    for i in range(1, n + 1):
        y[i] = y[i - 1] + 0.5 * (theta[i - 1] + theta[i]) * dx

    return -y      


def _unit_load_cantilever_deflection_at_tip(L: float, EI: float) -> float:

    return L**3 / (3 * EI)


def solve_propped_cantilever(length: float, n: int, loads: list, EI: float, **kwargs) -> dict:

    x = np.linspace(0, length, n + 1)

    y_released = _cantilever_deflection(x, loads, EI)
    delta_B0   = y_released[-1]       

    f_BB = _unit_load_cantilever_deflection_at_tip(length, EI)

    R_B = delta_B0 / f_BB

    from utils.loads import resultant_force_and_position, moment_loads_contribution
    F_total, x_bar = resultant_force_and_position(loads)
    M_ext = moment_loads_contribution(loads)

    R_A = F_total - R_B
    M_A = F_total * x_bar - R_B * length - M_ext

    return {"R_A": R_A, "R_B": R_B, "M_A": M_A}