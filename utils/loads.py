import numpy as np


def parse_loads(loads_raw: list, length: float, n: int) -> list[dict]:
    parsed = []
    for raw in loads_raw:
        t = raw.get("type", "").lower()

        if t == "udl":
            parsed.append({
                "type":    "udl",
                "w":       float(raw.get("magnitude", 0)) * 1e3,   # kN/m → N/m
                "x_start": float(raw.get("x_start", 0)),
                "x_end":   float(raw.get("x_end", length)),
            })

        elif t == "vdl":
            parsed.append({
                "type":    "vdl",
                "w_start": float(raw.get("w_start", 0)) * 1e3,
                "w_end":   float(raw.get("w_end", 0)) * 1e3,
                "x_start": float(raw.get("x_start", 0)),
                "x_end":   float(raw.get("x_end", length)),
            })

        elif t in ("point", "concentrated"):
            parsed.append({
                "type": "point",
                "P":    float(raw.get("magnitude", 0)) * 1e3,      # kN → N
                "x":    float(raw.get("x", 0)),
            })

        elif t == "moment":
            parsed.append({
                "type": "moment",
                "Mo":   float(raw.get("magnitude", 0)) * 1e3,      # kN·m → N·m
                "x":    float(raw.get("x", 0)),
            })

    return parsed


def distributed_load_array(loads: list[dict], x: np.ndarray) -> np.ndarray:
    q = np.zeros_like(x)
    for ld in loads:
        if ld["type"] == "udl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            q[mask] += ld["w"]
        elif ld["type"] == "vdl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            t = (x[mask] - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
            q[mask] += ld["w_start"] + (ld["w_end"] - ld["w_start"]) * t
    return q


def resultant_force_and_position(loads: list[dict], x_start=0.0, x_end=None):
    F_total = 0.0
    Fx_sum  = 0.0

    for ld in loads:
        if ld["type"] == "udl":
            a, b = ld["x_start"], ld["x_end"]
            F = ld["w"] * (b - a)
            x_bar = (a + b) / 2.0
            F_total += F
            Fx_sum  += F * x_bar

        elif ld["type"] == "vdl":
            a, b = ld["x_start"], ld["x_end"]
            L  = b - a
            w0, w1 = ld["w_start"], ld["w_end"]
            # trapezoid resultant
            F = (w0 + w1) / 2.0 * L
            if abs(w0 + w1) > 1e-12:
                x_bar = a + L * (w0 + 2 * w1) / (3 * (w0 + w1))
            else:
                x_bar = (a + b) / 2.0
            F_total += F
            Fx_sum  += F * x_bar

        elif ld["type"] == "point":
            F_total += ld["P"]
            Fx_sum  += ld["P"] * ld["x"]

    x_bar_total = Fx_sum / F_total if abs(F_total) > 1e-12 else 0.0
    return F_total, x_bar_total


def moment_loads_contribution(loads: list[dict]) -> float:
    return sum(ld["Mo"] for ld in loads if ld["type"] == "moment")
import numpy as np


def parse_loads(loads_raw: list, length: float, n: int) -> list[dict]:
    parsed = []
    for raw in loads_raw:
        t = raw.get("type", "").lower()

        if t == "udl":
            parsed.append({
                "type":    "udl",
                "w":       float(raw.get("magnitude", 0)) * 1e3,   # kN/m → N/m
                "x_start": float(raw.get("x_start", 0)),
                "x_end":   float(raw.get("x_end", length)),
            })

        elif t == "vdl":
            parsed.append({
                "type":    "vdl",
                "w_start": float(raw.get("w_start", 0)) * 1e3,
                "w_end":   float(raw.get("w_end", 0)) * 1e3,
                "x_start": float(raw.get("x_start", 0)),
                "x_end":   float(raw.get("x_end", length)),
            })

        elif t in ("point", "concentrated"):
            parsed.append({
                "type": "point",
                "P":    float(raw.get("magnitude", 0)) * 1e3,      # kN → N
                "x":    float(raw.get("x", 0)),
            })

        elif t == "moment":
            parsed.append({
                "type": "moment",
                "Mo":   float(raw.get("magnitude", 0)) * 1e3,      # kN·m → N·m
                "x":    float(raw.get("x", 0)),
            })

    return parsed



def distributed_load_array(loads: list[dict], x: np.ndarray) -> np.ndarray:
    q = np.zeros_like(x)
    for ld in loads:
        if ld["type"] == "udl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            q[mask] += ld["w"]
        elif ld["type"] == "vdl":
            mask = (x >= ld["x_start"]) & (x <= ld["x_end"])
            t = (x[mask] - ld["x_start"]) / max(ld["x_end"] - ld["x_start"], 1e-12)
            q[mask] += ld["w_start"] + (ld["w_end"] - ld["w_start"]) * t
    return q


def resultant_force_and_position(loads: list[dict], x_start=0.0, x_end=None):
    F_total = 0.0
    Fx_sum  = 0.0

    for ld in loads:
        if ld["type"] == "udl":
            a, b = ld["x_start"], ld["x_end"]
            F = ld["w"] * (b - a)
            x_bar = (a + b) / 2.0
            F_total += F
            Fx_sum  += F * x_bar

        elif ld["type"] == "vdl":
            a, b = ld["x_start"], ld["x_end"]
            L  = b - a
            w0, w1 = ld["w_start"], ld["w_end"]
            # trapezoid resultant
            F = (w0 + w1) / 2.0 * L
            if abs(w0 + w1) > 1e-12:
                x_bar = a + L * (w0 + 2 * w1) / (3 * (w0 + w1))
            else:
                x_bar = (a + b) / 2.0
            F_total += F
            Fx_sum  += F * x_bar

        elif ld["type"] == "point":
            F_total += ld["P"]
            Fx_sum  += ld["P"] * ld["x"]

    x_bar_total = Fx_sum / F_total if abs(F_total) > 1e-12 else 0.0
    return F_total, x_bar_total


def moment_loads_contribution(loads: list[dict]) -> float:
    return sum(ld["Mo"] for ld in loads if ld["type"] == "moment")