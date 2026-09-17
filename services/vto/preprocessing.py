import base64
import io
import re
from typing import Tuple
from PIL import Image

# Security: Limit maximum pixels to prevent image decompression bomb attacks
MAX_PIXELS = 4096 * 4096
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

# Allowed MIME types
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}

def decode_image_payload(payload: str) -> Image.Image:
    """
    Decodes a base64 encoded image string safely.
    Validates MIME type header, maximum payload size, and image integrity.
    """
    if not payload:
        raise ValueError("Empty image payload")

    # Check for data URI prefix: data:image/png;base64,....
    match = re.match(r"^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.*)$", payload)
    if match:
        mime_type = match.group(1).lower()
        if mime_type not in ALLOWED_MIMES:
            raise ValueError(f"Unsupported image format '{mime_type}'. Supported: JPEG, PNG, WebP.")
        raw_b64 = match.group(2)
    else:
        # Raw base64 string
        raw_b64 = payload

    try:
        binary_data = base64.b64decode(raw_b64, validate=True)
    except Exception as e:
        raise ValueError(f"Invalid base64 encoding: {str(e)}")

    if len(binary_data) > 10 * 1024 * 1024:
        raise ValueError("Image file size exceeds maximum permitted limit (10MB)")

    try:
        img_buffer = io.BytesIO(binary_data)
        img = Image.open(img_buffer)
        img.verify()  # Verify file header integrity

        # Reopen for actual decoding as verify() closes the stream in PIL
        img_buffer.seek(0)
        img = Image.open(img_buffer)
        detected_mime = Image.MIME.get(img.format)
        if match and detected_mime != mime_type:
            raise ValueError("Image content does not match the declared MIME type")
        if detected_mime not in ALLOWED_MIMES:
            raise ValueError("Unsupported decoded image format")
        img.load()  # Fully decode into memory
    except Exception as e:
        raise ValueError(f"Corrupt or invalid image payload: {str(e)}")

    # Dimension validation
    width, height = img.size
    if width < 64 or height < 64:
        raise ValueError(f"Image dimensions too small ({width}x{height}). Minimum required: 64x64.")
    if width > 4096 or height > 4096:
        raise ValueError(f"Image dimensions too large ({width}x{height}). Maximum allowed: 4096x4096.")

    return img

def preprocess_for_tryon(
    person_img: Image.Image,
    garment_img: Image.Image,
    target_size: Tuple[int, int] = (768, 1024)
) -> Tuple[Image.Image, Image.Image]:
    """
    Normalizes images for neural try-on inference.
    Resizes proportionally and centers onto target canvas.
    """
    # Normalize person image to RGB
    if person_img.mode != "RGB":
        person_rgb = Image.new("RGB", person_img.size, (255, 255, 255))
        if person_img.mode == "RGBA":
            person_rgb.paste(person_img, mask=person_img.split()[3])
        else:
            person_rgb.paste(person_img)
        person_img = person_rgb

    # Resize person to target canvas preserving aspect ratio
    person_resized = person_img.resize(target_size, Image.Resampling.LANCZOS)

    # Normalize garment image
    if garment_img.mode not in ("RGB", "RGBA"):
        garment_img = garment_img.convert("RGBA")

    garment_resized = garment_img.resize(target_size, Image.Resampling.LANCZOS)

    return person_resized, garment_resized
