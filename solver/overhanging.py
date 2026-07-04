from utils.loads import resultant_force_and_position, moment_loads_contribution


def solve_overhanging(
    length: float,
    n: int,
    loads: list,
    EI: float,
    supports: list | None = None,
    **kwargs,
) -> dict:

    if not supports or len(supports) < 2:
        x_A, x_B = 0.0, length
    else:
        x_A, x_B = float(supports[0]), float(supports[1])

    F_total, x_bar = resultant_force_and_position(loads)
    M_ext = moment_loads_contribution(loads)

    span = x_B - x_A
    if abs(span) < 1e-12:
        raise ValueError("Support positions must be distinct.")

    R_B = (F_total * (x_bar - x_A) + M_ext) / span
    R_A = F_total - R_B

    return {"R_A": R_A, "R_B": R_B}