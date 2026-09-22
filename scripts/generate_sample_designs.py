import os
import math
from PIL import Image, ImageDraw, ImageFont
import ezdxf

# Ensure output directories exist
os.makedirs("samples", exist_ok=True)
os.makedirs("apps/web/public/samples", exist_ok=True)

# -------------------------------------------------------------
# 1. Generate High-Res Architectural 2D Plan (2400x1600 JPG)
# -------------------------------------------------------------
def generate_2bhk_plan():
    W, H = 2400, 1600
    img = Image.new("RGB", (W, H), color=(253, 252, 249)) # Warm architectural paper
    draw = ImageDraw.Draw(img)

    # Margins and scale
    ox, oy = 200, 160 # Top-left origin
    # Plan bounding box: 1900 x 1150
    pw, ph = 1900, 1150

    # Grid background (subtle light gray)
    grid_spacing = 50
    for x in range(ox - 100, ox + pw + 100, grid_spacing):
        draw.line([(x, oy - 80), (x, oy + ph + 80)], fill=(240, 238, 232), width=1)
    for y in range(oy - 80, oy + ph + 80, grid_spacing):
        draw.line([(ox - 100, y), (ox + pw + 100, y)], fill=(240, 238, 232), width=1)

    # Wall thickness
    wt = 16 # px (~0.2m / 8 inches)
    it = 10 # interior partition (~0.12m / 4.5 inches)

    # Perimeter bounds
    # Rooms layout coordinates:
    # Left column: Master Bed (top), Ensuite & Walk-in (middle), Bed 2 (bottom)
    # Center column: Foyer/Corridor (top), Living & Dining (center)
    # Right column: Kitchen & Utility (top-right), Balcony (bottom-right)
    
    col1_w = 650
    col2_w = 800
    col3_w = 450

    row1_h = 420
    row2_h = 360
    row3_h = 370

    # Draw Outer Perimeter Walls (Double line + solid fill)
    outer_rect = [ox, oy, ox + pw, oy + ph]
    inner_rect = [ox + wt, oy + wt, ox + pw - wt, oy + ph - wt]

    wall_fill = (38, 38, 42) # Deep graphite wall hatch
    wall_edge = (15, 15, 18)

    # Outer wall borders
    draw.rectangle([ox, oy, ox + pw, oy + wt], fill=wall_fill, outline=wall_edge, width=2) # Top
    draw.rectangle([ox, oy + ph - wt, ox + pw, oy + ph], fill=wall_fill, outline=wall_edge, width=2) # Bottom
    draw.rectangle([ox, oy, ox + wt, oy + ph], fill=wall_fill, outline=wall_edge, width=2) # Left
    draw.rectangle([ox + pw - wt, oy, ox + pw, oy + ph], fill=wall_fill, outline=wall_edge, width=2) # Right

    # Interior Vertical Walls
    # Col 1 separator (between Bed 1/Bed 2 and Living/Corridor)
    c1_x = ox + col1_w
    draw.rectangle([c1_x - it//2, oy + wt, c1_x + it//2, oy + ph - wt], fill=wall_fill, outline=wall_edge, width=1)

    # Col 2 separator (between Living and Kitchen/Balcony)
    c2_x = ox + col1_w + col2_w
    draw.rectangle([c2_x - it//2, oy + wt, c2_x + it//2, oy + ph - wt], fill=wall_fill, outline=wall_edge, width=1)

    # Interior Horizontal Walls
    # Row 1 separator: Master Bed bottom wall (left), Kitchen bottom wall (right)
    r1_y = oy + row1_h
    draw.rectangle([ox + wt, r1_y - it//2, c1_x, r1_y + it//2], fill=wall_fill, outline=wall_edge, width=1)
    draw.rectangle([c2_x, r1_y - it//2, ox + pw - wt, r1_y + it//2], fill=wall_fill, outline=wall_edge, width=1)

    # Row 2 separator: Ensuite bottom wall (left)
    r2_y = oy + row1_h + row2_h
    draw.rectangle([ox + wt, r2_y - it//2, c1_x, r2_y + it//2], fill=wall_fill, outline=wall_edge, width=1)

    # Balcony division (right side bottom)
    draw.rectangle([c2_x, r2_y - it//2, ox + pw - wt, r2_y + it//2], fill=wall_fill, outline=wall_edge, width=1)

    # Cut Door Openings (overdraw with floor color)
    floor_color = (253, 252, 249)
    door_openings = [
        # (x1, y1, x2, y2, orientation)
        (c1_x - it//2 - 2, oy + 80, c1_x + it//2 + 2, oy + 170, "master_door"),
        (c1_x - it//2 - 2, r1_y + 40, c1_x + it//2 + 2, r1_y + 120, "ensuite_door"),
        (c1_x - it//2 - 2, r2_y + 60, c1_x + it//2 + 2, r2_y + 150, "bed2_door"),
        (c2_x - it//2 - 2, oy + 100, c2_x + it//2 + 2, oy + 200, "kitchen_door"),
        (c2_x - it//2 - 2, r2_y + 80, c2_x + it//2 + 2, r2_y + 240, "balcony_sliding"),
        (c1_x + 100, oy - 2, c1_x + 220, oy + wt + 2, "main_entrance"),
    ]

    for d in door_openings:
        draw.rectangle([d[0], d[1], d[2], d[3]], fill=floor_color)

    # Draw Door Swings (arc + leaf line)
    # Master Bed door swing
    draw.line([(c1_x - it//2, oy + 80), (c1_x - 85, oy + 80)], fill=(180, 50, 40), width=2)
    draw.arc([c1_x - 85 - 85, oy + 80 - 85, c1_x - it//2, oy + 80 + 85], start=0, end=90, fill=(180, 50, 40), width=1)

    # Bed 2 door swing
    draw.line([(c1_x - it//2, r2_y + 150), (c1_x - 85, r2_y + 150)], fill=(180, 50, 40), width=2)
    draw.arc([c1_x - 85 - 85, r2_y + 150 - 85, c1_x - it//2, r2_y + 150 + 85], start=270, end=360, fill=(180, 50, 40), width=1)

    # Main entrance swing
    draw.line([(c1_x + 100, oy + wt), (c1_x + 100, oy + wt + 100)], fill=(180, 50, 40), width=3)
    draw.arc([c1_x + 100 - 100, oy + wt, c1_x + 100 + 100, oy + wt + 200], start=270, end=360, fill=(180, 50, 40), width=1)

    # Windows on Exterior Walls (Cyan glass lines with sill)
    windows = [
        # Left wall (Master Bed window)
        (ox - 2, oy + 120, ox + wt + 2, oy + 320),
        # Left wall (Bed 2 window)
        (ox - 2, r2_y + 100, ox + wt + 2, r2_y + 280),
        # Right wall (Kitchen window)
        (ox + pw - wt - 2, oy + 120, ox + pw + 2, oy + 300),
        # Bottom wall (Living room wide picture window)
        (ox + col1_w + 150, oy + ph - wt - 2, ox + col1_w + 650, oy + ph + 2),
    ]

    for w in windows:
        draw.rectangle([w[0], w[1], w[2], w[3]], fill=floor_color)
        if w[1] == w[3] or abs(w[3] - w[1]) > abs(w[2] - w[0]): # Vertical window
            mid = (w[0] + w[2]) // 2
            draw.line([(mid - 2, w[1]), (mid - 2, w[3])], fill=(0, 150, 210), width=2)
            draw.line([(mid + 2, w[1]), (mid + 2, w[3])], fill=(0, 150, 210), width=2)
            draw.rectangle([w[0], w[1], w[2], w[1] + 4], fill=wall_fill)
            draw.rectangle([w[0], w[3] - 4, w[2], w[3]], fill=wall_fill)
        else: # Horizontal window
            mid = (w[1] + w[3]) // 2
            draw.line([(w[0], mid - 2), (w[2], mid - 2)], fill=(0, 150, 210), width=2)
            draw.line([(w[0], mid + 2), (w[2], mid + 2)], fill=(0, 150, 210), width=2)
            draw.rectangle([w[0], w[1], w[0] + 4, w[3]], fill=wall_fill)
            draw.rectangle([w[2] - 4, w[1], w[2], w[3]], fill=wall_fill)

    # Architectural Furniture & Fixtures (Subtle outlines)
    # Master Bed
    mb_x, mb_y = ox + 150, oy + 80
    draw.rectangle([mb_x, mb_y, mb_x + 320, mb_y + 280], outline=(140, 135, 125), width=2)
    draw.rectangle([mb_x + 20, mb_y + 15, mb_x + 140, mb_y + 80], outline=(160, 155, 145), width=1) # Pillow 1
    draw.rectangle([mb_x + 180, mb_y + 15, mb_x + 300, mb_y + 80], outline=(160, 155, 145), width=1) # Pillow 2

    # Living Room Sofa & Coffee Table
    sofa_x, sofa_y = ox + col1_w + 180, oy + 520
    draw.rectangle([sofa_x, sofa_y, sofa_x + 420, sofa_y + 150], outline=(140, 135, 125), width=2)
    # Cushions
    for i in range(3):
        draw.rectangle([sofa_x + i * 140 + 10, sofa_y + 10, sofa_x + (i + 1) * 140 - 10, sofa_y + 140], outline=(160, 155, 145), width=1)
    # Coffee table
    draw.rectangle([sofa_x + 80, sofa_y + 200, sofa_x + 340, sofa_y + 300], outline=(140, 135, 125), width=2)

    # Dining Table with 4 Chairs
    dt_x, dt_y = ox + col1_w + 480, oy + 120
    draw.rectangle([dt_x, dt_y, dt_x + 220, dt_y + 160], outline=(140, 135, 125), width=2)

    # Kitchen Counter (L-shaped)
    kc_x, kc_y = c2_x + it, oy + wt
    draw.rectangle([kc_x, kc_y, kc_x + 110, kc_y + 380], outline=(130, 130, 130), width=2) # Side counter
    draw.rectangle([kc_x + 110, kc_y, ox + pw - wt, kc_y + 100], outline=(130, 130, 130), width=2) # Top counter
    # Sink
    draw.rectangle([ox + pw - wt - 180, kc_y + 20, ox + pw - wt - 50, kc_y + 80], outline=(100, 160, 200), width=2)

    # Ensuite Bath Fixtures (Shower tray & WC)
    sh_x, sh_y = ox + wt + 10, r1_y + 20
    draw.rectangle([sh_x, sh_y, sh_x + 160, sh_y + 160], outline=(100, 160, 200), width=2)
    draw.line([(sh_x, sh_y), (sh_x + 160, sh_y + 160)], fill=(160, 200, 220), width=1)
    draw.line([(sh_x, sh_y + 160), (sh_x + 160, sh_y)], fill=(160, 200, 220), width=1)

    # Room Labels & Dimensions (using standard drawing text)
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
        font_dim = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except Exception:
        font_large = font_dim = font_title = font_sub = ImageFont.load_default()

    labels = [
        ("MASTER SUITE", "14'-0\" x 12'-0\"", ox + 220, oy + 320),
        ("ENSUITE BATH", "8'-0\" x 6'-6\"", ox + 220, r1_y + 180),
        ("BEDROOM 2", "12'-6\" x 11'-0\"", ox + 220, r2_y + 180),
        ("LIVING & DINING", "22'-0\" x 16'-0\"", ox + col1_w + 260, oy + 420),
        ("KITCHEN", "11'-0\" x 9'-0\"", c2_x + 140, oy + 260),
        ("BALCONY TERRACE", "12'-0\" x 5'-0\"", c2_x + 120, r2_y + 150),
        ("ENTRY FOYER", "6'-0\" x 7'-6\"", ox + col1_w + 110, oy + 120),
    ]

    for title, dim, lx, ly in labels:
        draw.text((lx, ly), title, fill=(40, 40, 45), font=font_large)
        draw.text((lx, ly + 32), dim, fill=(110, 110, 115), font=font_dim)

    # Exterior Architectural Dimension Lines
    dim_color = (180, 50, 40)
    # Top overall dimension (37'-3")
    td_y = oy - 50
    draw.line([(ox, td_y), (ox + pw, td_y)], fill=dim_color, width=2)
    draw.line([(ox, td_y - 12), (ox, td_y + 12)], fill=dim_color, width=2)
    draw.line([(ox + pw, td_y - 12), (ox + pw, td_y + 12)], fill=dim_color, width=2)
    draw.text((ox + pw // 2 - 40, td_y - 30), "37'-3\"", fill=dim_color, font=font_large)

    # Left overall dimension (24'-6")
    ld_x = ox - 60
    draw.line([(ld_x, oy), (ld_x, oy + ph)], fill=dim_color, width=2)
    draw.line([(ld_x - 12, oy), (ld_x + 12, oy)], fill=dim_color, width=2)
    draw.line([(ld_x - 12, oy + ph), (ld_x + 12, oy + ph)], fill=dim_color, width=2)
    draw.text((ld_x - 90, oy + ph // 2 - 15), "24'-6\"", fill=dim_color, font=font_large)

    # Title Block Header
    draw.rectangle([100, 30, W - 100, 110], outline=(40, 40, 45), width=2)
    draw.text((120, 45), "ATELIEROS ARCHITECTURAL STUDIO - WORKING DRAWING PLAN", fill=(20, 20, 25), font=font_title)
    draw.text((120, 85), "SCALE: 1:50  |  CEILING HEIGHT: 11'-6\" (3.50m)  |  IBC & NBC COMPLIANT  |  2BHK LUXURY APARTMENT", fill=(100, 100, 105), font=font_sub)

    # North Arrow
    nx, ny = W - 180, 70
    draw.polygon([(nx, ny - 30), (nx - 14, ny + 15), (nx, ny + 5)], fill=(30, 30, 35))
    draw.polygon([(nx, ny - 30), (nx + 14, ny + 15), (nx, ny + 5)], outline=(30, 30, 35), fill=(255, 255, 255))
    draw.text((nx - 6, ny - 50), "N", fill=(20, 20, 25), font=font_large)

    # Save to samples/ and apps/web/public/samples/
    p1 = "samples/2bhk-luxury-apartment-plan.jpg"
    p2 = "apps/web/public/samples/2bhk-luxury-apartment-plan.jpg"
    img.save(p1, quality=95)
    img.save(p2, quality=95)
    print(f"Saved: {p1} and {p2}")

# -------------------------------------------------------------
# 2. Generate Technical CAD Working Drawing (Thin lines)
# -------------------------------------------------------------
def generate_cad_working_drawing():
    W, H = 2000, 1400
    img = Image.new("RGB", (W, H), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    ox, oy = 180, 150
    pw, ph = 1600, 1000

    # Grid reference axes (Red dashed lines)
    for x in [ox, ox + 500, ox + 1100, ox + pw]:
        draw.line([(x, oy - 40), (x, oy + ph + 40)], fill=(220, 120, 120), width=1)
    for y in [oy, oy + 400, oy + 700, oy + ph]:
        draw.line([(ox - 40, y), (ox + pw + 40, y)], fill=(220, 120, 120), width=1)

    # Thin CAD Wall Lines (1.5px - 2px black lines)
    # Perimeter
    draw.rectangle([ox, oy, ox + pw, oy + ph], outline=(0, 0, 0), width=3)
    # Internal wall double lines (offset by 12px)
    draw.rectangle([ox + 12, oy + 12, ox + pw - 12, oy + ph - 12], outline=(0, 0, 0), width=2)

    # Partitions
    # Partition 1: x = ox + 500
    p1_x = ox + 500
    draw.line([(p1_x, oy + 12), (p1_x, oy + ph - 12)], fill=(0, 0, 0), width=2)
    draw.line([(p1_x + 10, oy + 12), (p1_x + 10, oy + ph - 12)], fill=(0, 0, 0), width=2)

    # Partition 2: x = ox + 1100
    p2_x = ox + 1100
    draw.line([(p2_x, oy + 12), (p2_x, oy + ph - 12)], fill=(0, 0, 0), width=2)
    draw.line([(p2_x + 10, oy + 12), (p2_x + 10, oy + ph - 12)], fill=(0, 0, 0), width=2)

    # Horizontal Partition 3: y = oy + 450 (across left section)
    h1_y = oy + 450
    draw.line([(ox + 12, h1_y), (p1_x, h1_y)], fill=(0, 0, 0), width=2)
    draw.line([(ox + 12, h1_y + 10), (p1_x, h1_y + 10)], fill=(0, 0, 0), width=2)

    # Door openings (masked with white)
    for door_box in [
        (p1_x - 2, oy + 80, p1_x + 12, oy + 180),
        (p1_x - 2, h1_y + 80, p1_x + 12, h1_y + 180),
        (p2_x - 2, oy + 120, p2_x + 12, oy + 220),
    ]:
        draw.rectangle(door_box, fill=(255, 255, 255))
        # Door swing in red
        draw.arc([door_box[0] - 80, door_box[1], door_box[0] + 80, door_box[1] + 160], start=0, end=90, fill=(200, 0, 0), width=1)

    # Dimensions in Cyan / Blue (typical AutoCAD DIM style)
    cyan = (0, 130, 200)
    draw.line([(ox, oy - 25), (ox + pw, oy - 25)], fill=cyan, width=1)
    draw.line([(ox, oy - 35), (ox, oy - 15)], fill=cyan, width=1)
    draw.line([(ox + pw, oy - 35), (ox + pw, oy - 15)], fill=cyan, width=1)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)
    except Exception:
        font = font_title = ImageFont.load_default()

    draw.text((ox + pw // 2 - 35, oy - 48), "37'-3\"", fill=cyan, font=font)
    draw.text((ox + 120, oy + 200), "MASTER SUITE (14'x12')", fill=(0, 0, 0), font=font)
    draw.text((ox + 120, h1_y + 200), "STUDY / BED 2 (12'x11')", fill=(0, 0, 0), font=font)
    draw.text((p1_x + 160, oy + 350), "LIVING & DINING (20'x15')", fill=(0, 0, 0), font=font)
    draw.text((p2_x + 100, oy + 350), "KITCHEN & SERVICE (12'x10')", fill=(0, 0, 0), font=font)

    # Drawing border & title block
    draw.rectangle([50, 40, W - 50, H - 40], outline=(0, 0, 0), width=2)
    draw.rectangle([W - 550, H - 180, W - 60, H - 50], outline=(0, 0, 0), width=2)
    draw.text((W - 530, H - 165), "ATELIEROS CAD MODEL-1", fill=(0, 0, 0), font=font_title)
    draw.text((W - 530, H - 120), "DRAWING: ARCH-WD-01\nSCALE: 1:50 | LEVEL 01", fill=(80, 80, 80), font=font)

    p1 = "samples/cad-working-drawing-thinlines.jpg"
    p2 = "apps/web/public/samples/cad-working-drawing-thinlines.jpg"
    img.save(p1, quality=95)
    img.save(p2, quality=95)
    print(f"Saved: {p1} and {p2}")

# -------------------------------------------------------------
# 3. Generate Valid AutoCAD DXF File
# -------------------------------------------------------------
def generate_sample_dxf():
    doc = ezdxf.new("R2010")
    # Setup layers
    doc.layers.add("WALLS", color=7)       # White/Black
    doc.layers.add("DOORS", color=1)       # Red
    doc.layers.add("WINDOWS", color=4)     # Cyan
    doc.layers.add("DIMENSIONS", color=3)  # Green

    msp = doc.modelspace()

    # Outer wall polygon in meters (12m x 9m)
    walls = [
        # Perimeter
        ((0.0, 0.0), (12.0, 0.0)),
        ((12.0, 0.0), (12.0, 9.0)),
        ((12.0, 9.0), (0.0, 9.0)),
        ((0.0, 9.0), (0.0, 0.0)),
        # Interior Partitions
        ((4.5, 0.0), (4.5, 9.0)), # Vertical dividing wall
        ((8.5, 0.0), (8.5, 5.5)), # Kitchen wall
        ((0.0, 4.5), (4.5, 4.5)), # Master Bed / Bed 2 wall
    ]

    for start, end in walls:
        msp.add_line(start, end, dxfattribs={"layer": "WALLS"})

    # Doors
    doors = [
        ((4.5, 1.2), (4.5, 2.1)), # Master door
        ((4.5, 5.5), (4.5, 6.4)), # Bed 2 door
        ((8.5, 1.5), (8.5, 2.4)), # Kitchen door
        ((6.0, 0.0), (7.0, 0.0)), # Main entrance
    ]
    for start, end in doors:
        msp.add_line(start, end, dxfattribs={"layer": "DOORS"})

    # Windows
    windows = [
        ((0.0, 1.5), (0.0, 3.5)), # Master window
        ((0.0, 6.0), (0.0, 8.0)), # Bed 2 window
        ((12.0, 2.0), (12.0, 4.5)), # Kitchen window
        ((5.5, 9.0), (8.5, 9.0)), # Living room terrace window
    ]
    for start, end in windows:
        msp.add_line(start, end, dxfattribs={"layer": "WINDOWS"})

    p1 = "samples/architectural-floorplan.dxf"
    p2 = "apps/web/public/samples/architectural-floorplan.dxf"
    doc.saveas(p1)
    doc.saveas(p2)
    print(f"Saved: {p1} and {p2}")

if __name__ == "__main__":
    generate_2bhk_plan()
    generate_cad_working_drawing()
    generate_sample_dxf()
    print("All 3 architectural 2D design samples generated successfully!")
