from utils.loads import resultant_force_and_position, moment_loads_contribution


def solve_cantilever(length: float, n: int, loads: list, EI: float, **kwargs) -> dict:
    F_total, x_bar = resultant_force_and_position(loads)
    M_ext = moment_loads_contribution(loads)

    R_A = F_total

    M_A = F_total * x_bar - M_ext

    return {"R_A": R_A, "M_A": M_A}