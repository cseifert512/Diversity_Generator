"""
Image processing utilities using OpenCV.
"""

import cv2
import numpy as np
from typing import Tuple, List, Optional
from PIL import Image
import io


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load an image from bytes into OpenCV format (BGR)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def load_image_from_path(path: str) -> np.ndarray:
    """Load an image from file path."""
    return cv2.imread(path, cv2.IMREAD_COLOR)


def bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert BGR (OpenCV default) to RGB."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def bgr_to_hsv(image: np.ndarray) -> np.ndarray:
    """Convert BGR to HSV color space."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2HSV)


def resize_image(image: np.ndarray, max_size: int = 1024) -> np.ndarray:
    """
    Resize image maintaining aspect ratio.
    Useful for normalizing input sizes for analysis.
    """
    h, w = image.shape[:2]
    
    if max(h, w) <= max_size:
        return image
    
    if h > w:
        new_h = max_size
        new_w = int(w * (max_size / h))
    else:
        new_w = max_size
        new_h = int(h * (max_size / w))
    
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def create_mask_by_color_range(
    hsv_image: np.ndarray,
    lower: Tuple[int, int, int],
    upper: Tuple[int, int, int]
) -> np.ndarray:
    """Create a binary mask for pixels within the HSV color range."""
    lower_np = np.array(lower, dtype=np.uint8)
    upper_np = np.array(upper, dtype=np.uint8)
    return cv2.inRange(hsv_image, lower_np, upper_np)


def find_contours(mask: np.ndarray) -> List[np.ndarray]:
    """Find contours in a binary mask."""
    contours, _ = cv2.findContours(
        mask, 
        cv2.RETR_EXTERNAL, 
        cv2.CHAIN_APPROX_SIMPLE
    )
    return contours


def get_contour_properties(contour: np.ndarray) -> dict:
    """
    Extract geometric properties from a contour.
    Returns area, perimeter, bounding box, centroid, etc.
    """
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    
    # Bounding rectangle
    x, y, w, h = cv2.boundingRect(contour)
    
    # Centroid
    M = cv2.moments(contour)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
    else:
        cx, cy = x + w // 2, y + h // 2
    
    # Aspect ratio
    aspect_ratio = float(w) / h if h > 0 else 1.0
    
    # Extent (ratio of contour area to bounding rectangle area)
    rect_area = w * h
    extent = float(area) / rect_area if rect_area > 0 else 0
    
    # Solidity (ratio of contour area to convex hull area)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = float(area) / hull_area if hull_area > 0 else 0
    
    # Compactness (circularity measure)
    compactness = (4 * np.pi * area) / (perimeter ** 2) if perimeter > 0 else 0
    
    return {
        "area": area,
        "perimeter": perimeter,
        "bounding_box": {"x": x, "y": y, "width": w, "height": h},
        "centroid": {"x": cx, "y": cy},
        "aspect_ratio": aspect_ratio,
        "extent": extent,
        "solidity": solidity,
        "compactness": compactness
    }


def detect_walls(image: np.ndarray, threshold: int = 50) -> np.ndarray:
    """
    Detect walls in a floor plan image.
    Assumes walls are dark (black) lines.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Threshold to get dark areas (walls)
    _, wall_mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY_INV)
    
    # Clean up with morphological operations
    kernel = np.ones((3, 3), np.uint8)
    wall_mask = cv2.morphologyEx(wall_mask, cv2.MORPH_CLOSE, kernel)
    
    return wall_mask


def skeletonize_walls(wall_mask: np.ndarray) -> np.ndarray:
    """
    Create a skeleton of the wall structure.
    Useful for circulation analysis.
    """
    from skimage.morphology import skeletonize
    
    # Convert to binary (0 or 1)
    binary = (wall_mask > 0).astype(np.uint8)
    
    # Skeletonize
    skeleton = skeletonize(binary)
    
    return (skeleton * 255).astype(np.uint8)


def compute_image_hash(image: np.ndarray, hash_size: int = 8) -> str:
    """
    Compute a perceptual hash of the image.
    Useful for detecting near-duplicate plans.
    """
    # Resize to hash_size
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    
    # Convert to grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Compute difference hash
    diff = gray[:, 1:] > gray[:, :-1]
    
    # Convert to hex string
    hash_value = sum([2**i for i, v in enumerate(diff.flatten()) if v])
    
    return format(hash_value, f'0{hash_size * hash_size // 4}x')


def encode_image_to_base64(image: np.ndarray) -> str:
    """Encode an OpenCV image to base64 string."""
    import base64
    
    # Convert to RGB for PIL
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    
    # Save to bytes
    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.read()).decode('utf-8')


def extract_edges(image_data: bytes, low_threshold: int = 50, high_threshold: int = 150) -> bytes:
    """
    Extract edges from a floor plan image using Canny edge detection.
    
    This removes color information and keeps only the structural lines,
    which is useful for passing to a rendering model without color bleed-through.
    
    Args:
        image_data: Raw image bytes (PNG/JPEG)
        low_threshold: Lower threshold for Canny edge detection
        high_threshold: Upper threshold for Canny edge detection
        
    Returns:
        PNG image bytes of the edge-detected image (white lines on black background)
    """
    # Decode image from bytes
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply Canny edge detection
    edges = cv2.Canny(blurred, low_threshold, high_threshold)
    
    # Dilate slightly for thicker, more visible walls
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Encode back to PNG bytes
    _, buffer = cv2.imencode('.png', edges)
    return buffer.tobytes()


def extract_edges_with_fill(image_data: bytes, low_threshold: int = 50, high_threshold: int = 150) -> bytes:
    """
    Extract edges and create a clean architectural line drawing.
    
    Similar to extract_edges but inverts to black lines on white background
    and applies additional cleanup for cleaner rendering input.
    
    Args:
        image_data: Raw image bytes (PNG/JPEG)
        low_threshold: Lower threshold for Canny edge detection
        high_threshold: Upper threshold for Canny edge detection
        
    Returns:
        PNG image bytes with black lines on white background
    """
    # Decode image from bytes
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply bilateral filter to smooth while keeping edges
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # Apply Canny edge detection
    edges = cv2.Canny(filtered, low_threshold, high_threshold)
    
    # Dilate for thicker walls
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Close small gaps
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    # Invert to get black lines on white background
    inverted = cv2.bitwise_not(edges)
    
    # Encode back to PNG bytes
    _, buffer = cv2.imencode('.png', inverted)
    return buffer.tobytes()


