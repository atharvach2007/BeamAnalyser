PRESETS = {
    "structural_steel": {"E": 200e9, "sigma_y": 250.0},
    "aluminium_6061":   {"E":  69e9, "sigma_y": 276.0},
    "concrete_c30":     {"E":  30e9, "sigma_y":  30.0},
    "timber":           {"E":  12e9, "sigma_y":  40.0},
}

# normalise keys that might come from the frontend
_ALIASES = {
    "structural steel": "structural_steel",
    "steel":            "structural_steel",
    "aluminium 6061":   "aluminium_6061",
    "aluminum 6061":    "aluminium_6061",
    "aluminum":         "aluminium_6061",
    "aluminium":        "aluminium_6061",
    "custom":           None,
}


def get_material_properties(cfg: dict) -> dict:
    name = str(cfg.get("material", "structural_steel")).lower().strip()
    key  = _ALIASES.get(name, name.replace(" ", "_"))

    if key and key in PRESETS:
        props = dict(PRESETS[key])
    else:
        E_GPa     = float(cfg.get("E", 200))
        sigma_MPa = float(cfg.get("sigma_y", 250))
        props = {"E": E_GPa * 1e9, "sigma_y": sigma_MPa}

    return props