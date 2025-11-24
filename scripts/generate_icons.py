from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    # Create a new image with a transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Define colors
    bg_color = "#10a37f" # ChatGPT green-ish teal
    arrow_color = "#ffffff"
    
    # Draw rounded rectangle (chat bubble / archive box)
    padding = size // 8
    rect_coords = [padding, padding, size - padding, size - padding]
    radius = size // 4
    
    # Draw the main shape
    draw.rounded_rectangle(rect_coords, radius=radius, fill=bg_color)
    
    # Draw "Archive" arrow (Down arrow)
    # Coordinates for arrow
    center_x = size // 2
    center_y = size // 2
    arrow_width = size // 3
    arrow_height = size // 3
    
    # Arrow shaft
    shaft_width = arrow_width // 3
    shaft_top = center_y - (arrow_height // 2)
    shaft_bottom = center_y + (arrow_height // 6)
    
    draw.rectangle(
        [center_x - shaft_width // 2, shaft_top, center_x + shaft_width // 2, shaft_bottom],
        fill=arrow_color
    )
    
    # Arrow head
    head_top = shaft_bottom
    head_bottom = center_y + (arrow_height // 2)
    head_left = center_x - (arrow_width // 2)
    head_right = center_x + (arrow_width // 2)
    
    draw.polygon(
        [(head_left, head_top), (head_right, head_top), (center_x, head_bottom)],
        fill=arrow_color
    )

    # Save the image
    img.save(output_path, 'PNG')
    print(f"Generated {output_path}")

# Ensure directory exists
icon_dir = 'src/icons/'
if not os.path.exists(icon_dir):
    os.makedirs(icon_dir)

# Sizes required by Chrome Extension
sizes = [16, 32, 48, 128]

for size in sizes:
    create_icon(size, os.path.join(icon_dir, f'icon{size}.png'))
