import base64
import io
from PIL import Image, ImageStat

def validate_and_encode_result(result_img: Image.Image, format: str = "JPEG", quality: int = 90) -> str:
    """
    Validates output image quality and encodes it into a base64 data URI.
    Checks:
    - Non-empty, valid dimensions
    - Not completely solid/blank (checks color variance across channels)
    """
    if result_img is None:
        raise ValueError("Generated image is None")

    width, height = result_img.size
    if width < 64 or height < 64:
        raise ValueError(f"Generated image dimensions are invalid: {width}x{height}")

    # Check for blank / solid color failure mode
    stat = ImageStat.Stat(result_img)
    # Variance should be > 1.0 for a realistic photorealistic generation
    variances = stat.var
    if all(v < 1.0 for v in variances):
        raise ValueError("Generated image is blank or has near-zero variance (generation artifact)")

    # Encode to output buffer in memory
    buffer = io.BytesIO()
    save_format = format.upper()
    if save_format not in ("JPEG", "WEBP", "PNG"):
        save_format = "JPEG"

    if save_format == "JPEG" and result_img.mode in ("RGBA", "P"):
        rgb_img = Image.new("RGB", result_img.size, (255, 255, 255))
        if result_img.mode == "RGBA":
            rgb_img.paste(result_img, mask=result_img.split()[3])
        else:
            rgb_img.paste(result_img)
        rgb_img.save(buffer, format=save_format, quality=quality, optimize=True)
    else:
        result_img.save(buffer, format=save_format, quality=quality, optimize=True)

    buffer.seek(0)
    b64_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
    mime = f"image/{save_format.lower()}"
    return f"data:{mime};base64,{b64_data}"
