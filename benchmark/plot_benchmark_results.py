import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

RESULTS_DIR = Path("./results")
data = np.load(RESULTS_DIR / "raw_errors.npz")

angle_pos = data["angle_loss_pos"]
fk_pos = data["fk_loss_pos"]

# Histogram
plt.figure(figsize=(8, 5))
plt.hist(angle_pos, bins=50, alpha=0.5, label="NN Angle Loss")
plt.hist(fk_pos, bins=50, alpha=0.5, label="NN FK Loss")
plt.xlabel("Position Error (m)")
plt.ylabel("Frequency")
plt.title("TCP Position Error Distribution")
plt.legend()
plt.tight_layout()
plt.savefig(RESULTS_DIR / "position_error_histogram.png", dpi=300)
plt.show()


# CDF
def cdf(errors):
    sorted_errors = np.sort(errors)
    cumulative = np.arange(1, len(sorted_errors) + 1) / len(sorted_errors)
    return sorted_errors, cumulative


angle_x, angle_y = cdf(angle_pos)
fk_x, fk_y = cdf(fk_pos)

plt.figure(figsize=(8, 5))
plt.plot(angle_x, angle_y, label="NN Angle Loss")
plt.plot(fk_x, fk_y, label="NN FK Loss")
plt.xlabel("Position Error (m)")
plt.ylabel("Fraction of Targets")
plt.title("TCP Position Error CDF")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig(RESULTS_DIR / "position_error_cdf.png", dpi=300)
plt.show()


plt.figure(figsize=(8, 5))
plt.hist(angle_pos, bins=50, alpha=0.5, label="NN Angle Loss")
plt.hist(fk_pos, bins=50, alpha=0.5, label="NN FK Loss")
plt.xlim(0, 0.5)
plt.xlabel("Position Error (m)")
plt.ylabel("Frequency")
plt.title("TCP Position Error Distribution")
plt.legend()
plt.tight_layout()
plt.savefig(RESULTS_DIR / "position_error_histogram_zoomed.png", dpi=300)
plt.show()
