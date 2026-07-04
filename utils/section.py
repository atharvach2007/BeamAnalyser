import math


def get_section_properties(cfg: dict) -> dict:
    stype = cfg.get("section_type", "rectangular").lower().replace("-", "_").replace(" ", "_")

    if stype == "rectangular":
        b = float(cfg.get("width",  50)) * 1e-3   # mm → m
        h = float(cfg.get("height", 100)) * 1e-3
        A  = b * h
        I  = b * h**3 / 12.0
        c  = h / 2.0
        Z  = I / c

    elif stype == "circular":
        d  = float(cfg.get("diameter", cfg.get("width", 100))) * 1e-3
        r  = d / 2.0
        A  = math.pi * r**2
        I  = math.pi * r**4 / 4.0
        c  = r
        Z  = I / c

    elif stype in ("i_section", "isection", "i"):
        bf = float(cfg.get("width",         100)) * 1e-3
        h  = float(cfg.get("height",        200)) * 1e-3
        tf = float(cfg.get("flange_thick",   10)) * 1e-3
        tw = float(cfg.get("web_thick",       6)) * 1e-3

        hw = h - 2 * tf
        A_flange = 2 * bf * tf
        A_web    = hw * tw
        A = A_flange + A_web
        I_web    = tw * hw**3 / 12.0
        I_flange = 2 * (bf * tf**3 / 12.0 + bf * tf * ((h - tf) / 2.0)**2)
        I = I_web + I_flange
        c = h / 2.0
        Z = I / c

    else:
        raise ValueError(f"Unknown section type: {stype!r}")

    return {"A": A, "I": I, "c": c, "Z": Z, "section_type": stype}