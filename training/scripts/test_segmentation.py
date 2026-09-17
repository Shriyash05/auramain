import torch
import torchvision
from PIL import Image
import numpy as np

print("Checking torchvision segmentation weights...")
try:
    weights = torchvision.models.segmentation.LRASPP_MobileNet_V3_Large_Weights.DEFAULT
    model = torchvision.models.segmentation.lraspp_mobilenet_v3_large(weights=weights)
    model.eval()
    print("Successfully loaded LRASPP_MobileNet_V3_Large!")
except Exception as e:
    print("Could not load weights:", e)
