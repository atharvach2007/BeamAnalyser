import numpy as np

try:
    _trapz = np.trapezoid
except AttributeError:
    _trapz = np.trapz

from utils.loads import distributed_load_array


def _fef_udl(w: float, L: float) -> tuple:
    R = w * L / 2
    M = w * L**2 / 12
    return R, M, R, -M


def _fef_point(P: float, a: float, L: float) -> tuple:
    b = L - a
    R_A =  P * b**2 * (3 * a + b) / L**3
    M_A =  P * a * b**2 / L**2
    R_B =  P * a**2 * (a + 3 * b) / L**3
    M_B = -P * a**2 * b / L**2
    return R_A, M_A, R_B, M_B


def _fef_vdl(w0: float, w1: float, L: float) -> tuple:
    R_Au, M_Au, R_Bu, M_Bu = _fef_udl(w0, L)

    dw = w1 - w0
    R_At =  3 * dw * L / 20
    M_At =  dw * L**2 / 30
    R_Bt =  7 * dw * L / 20
    M_Bt = -dw * L**2 / 20

    return R_Au + R_At, M_Au + M_At, R_Bu + R_Bt, M_Bu + M_Bt


def _fef_distributed_segment(ld: dict, L: float) -> tuple:
    N = 2000
    x  = np.linspace(0, L, N + 1)
    q  = np.zeros(N + 1)

    if ld["type"] == "udl":
        mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
        q[mask] = ld["w"]
    elif ld["type"] == "vdl":
        mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
        t    = (x[mask] - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
        q[mask] = ld["w_start"] + (ld["w_end"] - ld["w_start"]) * t

    xi = x / L
    N1 = 1 - 3*xi**2 + 2*xi**3
    N2 = L * xi * (1 - xi)**2
    N3 = 3*xi**2 - 2*xi**3
    N4 = L * xi**2 * (xi - 1)

    dx = L / N
    R_A =  _trapz(q * N1, x)
    M_A =  _trapz(q * N2, x)
    R_B =  _trapz(q * N3, x)
    M_B =  _trapz(q * N4, x)

    return R_A, M_A, R_B, M_B


def solve_fixed_fixed(length: float, n: int, loads: list, EI: float, **kwargs) -> dict:
    L = length
    R_A = M_A = R_B = M_B = 0.0

    for ld in loads:
        if ld["type"] == "udl":
            a, b = ld["x_start"], ld["x_end"]
            if abs(a) < 1e-9 and abs(b - L) < 1e-9:
                rA, mA, rB, mB = _fef_udl(ld["w"], L)
            else:
                rA, mA, rB, mB = _fef_distributed_segment(ld, L)
            R_A += rA; M_A += mA; R_B += rB; M_B += mB

        elif ld["type"] == "vdl":
            a, b = ld["x_start"], ld["x_end"]
            if abs(a) < 1e-9 and abs(b - L) < 1e-9:
                rA, mA, rB, mB = _fef_vdl(ld["w_start"], ld["w_end"], L)
            else:
                rA, mA, rB, mB = _fef_distributed_segment(ld, L)
            R_A += rA; M_A += mA; R_B += rB; M_B += mB

        elif ld["type"] == "point":
            a = ld["x"]
            rA, mA, rB, mB = _fef_point(ld["P"], a, L)
            R_A += rA; M_A += mA; R_B += rB; M_B += mB

        elif ld["type"] == "moment":
            Mo = ld["Mo"]
            a  = ld["x"]
            b  = L - a
            rA =  6 * Mo * a * b / L**3 * (-1)
            mA =  Mo * b * (2 * a - b) / L**2
            rB = -rA
            mB =  Mo * a * (2 * b - a) / L**2
            R_A += -rA; M_A += mA; R_B += -rB; M_B += mB

    return {"R_A": R_A, "M_A": M_A, "R_B": R_B, "M_B": M_B}