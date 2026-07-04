from utils.loads import resultant_force_and_position, moment_loads_contribution


def solve_simply_supported(length: float, n: int, loads: list, EI: float, **kwargs) -> dict:
    F_total, x_bar = resultant_force_and_position(loads)
    M_ext = moment_loads_contribution(loads)
    R_B = (F_total * x_bar + M_ext) / length
    R_A = F_total - R_B

    return {"R_A": R_A, "R_B": R_B}