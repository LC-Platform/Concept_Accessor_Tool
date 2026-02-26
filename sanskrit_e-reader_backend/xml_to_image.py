def xml_to_image(xml_str, domain_name):
    import xml.etree.ElementTree as ET
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    import numpy as np
    import re, html, textwrap
    from io import BytesIO
    from matplotlib.path import Path

    # ---------- helper: parse tree ----------
    def parse_tree(node):
        label = node.attrib.get("name", "")
        return {"label": label, "children": [parse_tree(c) for c in node]}

    # ---------- helper: sanitize xml ----------
    def sanitize_xml(s: str) -> str:
        s = ''.join(ch for ch in s if ord(ch) >= 32 or ch in '\n\r\t')
        s = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', s)

        def esc(m):
            inner = m.group(1)
            return f'name="{inner.replace("<","&lt;").replace(">","&gt;")}"'
        s = re.sub(r'name="([^"]*?[<>][^"]*?)"', esc, s)
        return html.unescape(s)

    # ---------- helper: draw wrapped text and return height ----------
    def draw_wrapped_text(ax, x, y, text, max_width_chars,
                      font_size=12, line_height=0.30,
                      ha='center', va='center',
                      color='#000000', weight='bold',
                      zorder=7, draw=True):
        lines = textwrap.wrap(text, width=max_width_chars, break_long_words=True, break_on_hyphens=True) or [text]
        n = len(lines)
        total_h = (n - 1) * line_height

        if draw:
            start_y = y + total_h / 2
            for i, line in enumerate(lines):
                ax.text(x, start_y - i * line_height, line,
                fontsize=font_size, ha=ha, va='center',
                color=color, weight=weight, zorder=zorder)

        return n, total_h

    used_fallback = False
    try:
        root_elem = ET.fromstring(xml_str)
        tree = parse_tree(root_elem)
    except Exception:
        try:
            root_elem = ET.fromstring(sanitize_xml(xml_str))
            tree = parse_tree(root_elem)
        except Exception:
            used_fallback = True
            names = re.findall(r'name\s*=\s*"([^"]+)"', xml_str)
            if names:
                tree = {
                    "label": names[0],
                    "children": [{"label": n, "children": []} for n in names[1:]]
                }
            else:
                tree = {"label": domain_name, "children": []}

    root_label_full = tree.get("label", "")
    root_label = root_label_full.split(':', 1)[-1].strip()
    is_process = root_label_full.lower().startswith("process map") or \
                 "process map" in root_label_full.lower()

    try:
        # ============================================================
        # PROCESS MAP
        # ============================================================
        if is_process:
            sections = tree.get("children", [])
            child_counts = [
                len([s for s in n.get("children", [])
                     if "note:" not in s["label"].lower()])
                for n in sections
            ]
            max_children = max(child_counts) if child_counts else 1
            height = max(24, 12 + len(sections) * 4 + max_children * 0.8)

            fig, ax = plt.subplots(figsize=(18, height / 1.3), dpi=130)
            ax.set_facecolor('white')
            ax.axis('off')

            # Title (BIGGER with better visibility)
            title = root_label_full if ":" in root_label_full else f"Process Map: {root_label}"
            ax.text(0, height - 2.0, title, fontsize=48,
                    ha='center', va='center',
                    color='#000000', weight='bold',
                    fontfamily='sans-serif')

            # Main box - BRIGHTER COLORS
            main_y = height - 5.5
            ax.add_patch(patches.FancyBboxPatch(
                (-3.8, main_y - 1.1), 7.6, 2.2,
                boxstyle="round,pad=0.15", facecolor="#2E7D32",
                linewidth=3, edgecolor='#1B5E20', zorder=10))
            ax.text(0, main_y, root_label.lower(), fontsize=38,
                    ha='center', va='center',
                    color='white', weight='bold', zorder=11)

            # Layout parameters
            spine_x = 0
            section_w = 7.0
            section_h_base = 2.0
            section_gap = 4.0
            left_x, right_x = -9.0, 9.0
            child_w = 7.0
            child_base_h = 1.5
            child_gap = 2.0

            current_y = main_y - 3.0

            # Connect main to first section
            if sections:
                ax.plot([0, 0], [main_y - 1.1, current_y + section_h_base / 2],
                        color='#424242', linewidth=3, zorder=3)

            for idx, section in enumerate(sections):
                sec_y = current_y

                # Section text + height
                sec_label = section["label"]
                line_h = 0.50
                _, sec_text_height = draw_wrapped_text(
                     ax, spine_x, sec_y, sec_label,
                     max_width_chars=22, font_size=22,
                      line_height=line_h, color='#000000', zorder=9,
                    draw=False
                        )
                section_h = max(section_h_base, sec_text_height + 1.4)

                # Section box - BRIGHTER COLOR
                ax.add_patch(patches.FancyBboxPatch(
                    (spine_x - section_w / 2, sec_y - section_h / 2),
                    section_w, section_h,
                    boxstyle="round,pad=0.12", facecolor="#1976D2",
                    linewidth=2.5, edgecolor='#0D47A1', zorder=8))

                # Section text centered and larger
                draw_wrapped_text(
                    ax, spine_x, sec_y, sec_label,
                    max_width_chars=22,
                    font_size=22,
                    line_height=line_h,
                    color='#FFFFFF', zorder=9,
                    draw=True
                )

                # Children in two columns
                children = [
                    c for c in section.get("children", [])
                    if "note:" not in c["label"].lower()
                ]

                if children:
                    left_col = children[::2]
                    right_col = children[1::2]

                    # -------- left column --------
                    for i, child in enumerate(left_col):
                        cy = sec_y - section_h / 2 - (i + 1) * child_gap

                        if "step" in child["label"].lower():
                            bg, edge, txt = "#FF9800", "#E65100", "#FFFFFF"
                        else:
                            bg, edge, txt = "#FFC107", "#F57C00", "#000000"

                        # compute text height first
                        _, total_text_height = draw_wrapped_text(
                            ax, left_x, cy,
                            child["label"],
                            max_width_chars=22,
                            font_size=18,
                            line_height=0.48,
                            color=txt, zorder=7,
                            draw=False
                        )
                        box_height = max(child_base_h, total_text_height + 1.3)

                        # box
                        ax.add_patch(patches.FancyBboxPatch(
                            (left_x - child_w / 2, cy - box_height / 2),
                            child_w, box_height,
                            boxstyle="round,pad=0.15",
                            facecolor=bg, edgecolor=edge,
                            linewidth=2, zorder=6))
                        draw_wrapped_text(
                            ax, left_x, cy,
                             child["label"],
                            max_width_chars=22,
                            font_size=18,
                            line_height=0.48,
                            color=txt, zorder=7,
                            draw=True
                        )

                        # curved connector
                        bend_x = spine_x - section_w / 2 - 1.5
                        verts = [
                            (spine_x - section_w / 2, sec_y),
                            (bend_x, sec_y),
                            (bend_x, cy),
                            (left_x + child_w / 2, cy)
                        ]
                        codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                        path = Path(verts, codes)
                        ax.add_patch(patches.PathPatch(
                            path, facecolor='none',
                            edgecolor='#616161', linewidth=2.2,
                            zorder=4, alpha=0.85))

                    # -------- right column --------
                    for i, child in enumerate(right_col):
                        cy = sec_y - section_h / 2 - (i + 1) * child_gap

                        if "step" in child["label"].lower():
                            bg, edge, txt = "#FF9800", "#E65100", "#FFFFFF"
                        else:
                            bg, edge, txt = "#FFC107", "#F57C00", "#000000"

                        _, total_text_height = draw_wrapped_text(
                            ax, right_x, cy,
                            child["label"],
                            max_width_chars=22,
                            font_size=18,
                            line_height=0.48,
                            color=txt, zorder=7,
                            draw=False
                        )
                        box_height = max(child_base_h, total_text_height + 1.3)

                        ax.add_patch(patches.FancyBboxPatch(
                            (right_x - child_w / 2, cy - box_height / 2),
                            child_w, box_height,
                            boxstyle="round,pad=0.15",
                            facecolor=bg, edgecolor=edge,
                            linewidth=2, zorder=6))
                        draw_wrapped_text(
                        ax, right_x, cy,
                        child["label"],
                        max_width_chars=22,
                        font_size=18,
                        line_height=0.48,
                         color=txt, zorder=7,
                         draw=True
                        )
                        bend_x = spine_x + section_w / 2 + 1.5
                        verts = [
                            (spine_x + section_w / 2, sec_y),
                            (bend_x, sec_y),
                            (bend_x, cy),
                            (right_x - child_w / 2, cy)
                        ]
                        codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                        path = Path(verts, codes)
                        ax.add_patch(patches.PathPatch(
                            path, facecolor='none',
                            edgecolor='#616161', linewidth=2.2,
                            zorder=4, alpha=0.85))

                    # Note box if Types or Sub-processes
                    label_lower = section["label"].lower()
                    note = None
                    if "type" in label_lower:
                        note = "Types = Different KINDS of this process"
                    elif "sub" in label_lower and "process" in label_lower:
                        note = "Sub-processes = Sequential STAGES within the process"

                    if note:
                        max_rows = max(len(left_col), len(right_col))
                        note_y = sec_y - section_h / 2 - (max_rows + 0.5) * child_gap - 0.5
                        ax.add_patch(patches.FancyBboxPatch(
                            (-6.5, note_y - 0.45), 13, 0.9,
                            boxstyle="round,pad=0.10", facecolor="#FFEB3B",
                            linewidth=2, edgecolor='#F57F17',
                            linestyle='--', zorder=5))
                        ax.text(0, note_y, note, fontsize=15,
                                ha='center', va='center',
                                color='#000000', style='italic',
                                weight='bold', zorder=6)
                        current_y = note_y - 1.5
                    else:
                        max_rows = max(len(left_col), len(right_col))
                        current_y = sec_y - section_h / 2 - max_rows * child_gap - 0.8
                else:
                    current_y -= section_gap

                # Spine connector to next section
                if idx < len(sections) - 1:
                    next_y = current_y - section_gap
                    ax.plot([spine_x, spine_x],
                            [sec_y - section_h / 2, next_y + section_h_base / 2],
                            color='#424242', linewidth=3, zorder=3)
                    current_y = next_y

            ax.set_xlim(-15, 15)
            ax.set_ylim(current_y - 3, height)
            plt.tight_layout()
            buf = BytesIO()
            plt.savefig(buf, format='svg', bbox_inches='tight', pad_inches=0.3)
            plt.close()
            buf.seek(0)
            return buf.read()

        # ============================================================
        # CONCEPT / ENTITY MAP
        # ============================================================
        else:
            fig, ax = plt.subplots(figsize=(22, 22), dpi=130)  # Increased height
            ax.set_facecolor('#FFFFFF')
            ax.axis('off')

            # Title - SINGLE LINE with underline
            title_text = root_label_full if ":" in root_label_full else f"CONCEPT MAP: {root_label}"
            title_y = 18.5  # Higher position
            
            # Draw title text
            ax.text(0, title_y, title_text.upper(), fontsize=38,
                    ha='center', va='center',
                    color='#000000', weight='bold',
                    fontfamily='sans-serif', zorder=100)
            
            # Draw horizontal underline
            ax.plot([-12, 12], [title_y - 0.6, title_y - 0.6], 
                   color='#000000', linewidth=3, zorder=100)
            
            # Move main content down to avoid overlap
            main_center = (-2, 0)  # Centered vertically

            # main oval width depending on label length
            base_width = 8.5
            extra = max(0, len(root_label) - 14) * 0.18
            oval_width = base_width + extra
            oval_height = 5.0

            taxonomy_idx = -1
            taxonomy_labels = []

            for idx, node in enumerate(tree.get("children", [])):
                if "taxonomy" in node["label"].strip().lower():
                    taxonomy_idx = idx
                    taxonomy_labels = [c["label"] for c in node.get("children", [])]
                    taxonomy_labels.reverse()

            # taxonomy
            if taxonomy_labels:
                tax_x = -11.0
                tax_box_width = 5.5
                tax_box_height_base = 1.8
                tax_spacing = 1.8
                num_tax = len(taxonomy_labels)
                total_tax_height = num_tax * tax_box_height_base + (num_tax - 1) * tax_spacing
                start_tax_y = -total_tax_height / 2 + tax_box_height_base / 2

                ax.text(tax_x, start_tax_y + total_tax_height + 1.2, "TAXONOMY",
                        fontsize=22, ha='center', va='center',
                        color='white', weight='bold',
                        bbox=dict(boxstyle='round,pad=0.6',
                                  facecolor='#0D47A1',
                                  edgecolor='#01579B',
                                  linewidth=2.5))

                # BRIGHTER taxonomy colors
                colors = ["#B76FEB", "#C18DE7", "#AF82CE",
                          "#A36CCA", "#C89FE6", "#C086E9", "#AF7FD1"]

                last_tax_y = start_tax_y
                for i, label in enumerate(taxonomy_labels):
                    tax_y = start_tax_y + i * (tax_box_height_base + tax_spacing)
                    color_idx = min(i, len(colors) - 1)
                    box_color = colors[color_idx]
                    is_highlight = root_label.lower() in label.lower()
                    if is_highlight:
                        box_color = "#FF6F00"

                    # estimate text
                    _, total_text_height = draw_wrapped_text(
                        ax, tax_x, tax_y,
                        label,
                        max_width_chars=20,
                        font_size=22,
                        line_height=0.48,
                        color='#000000', zorder=5,  # CHANGED TO BLACK
                        draw=False
                    )
                    tax_box_height = max(tax_box_height_base, total_text_height + 0.9)

                    tax_rect = patches.FancyBboxPatch(
                        (tax_x - tax_box_width / 2, tax_y - tax_box_height / 2),
                        tax_box_width, tax_box_height,
                        boxstyle="round,pad=0.15",
                        facecolor=box_color,
                        linewidth=2.8 if is_highlight else 2.2,
                        edgecolor='#01579B', zorder=4)
                    ax.add_patch(tax_rect)
                    draw_wrapped_text(
                        ax, tax_x, tax_y,
                        label,
                        max_width_chars=20,
                        font_size=22,
                        line_height=0.48,
                        color='#000000', zorder=5,  # CHANGED TO BLACK
                        draw=True
                    )
                    if i < num_tax - 1:
                        next_tax_y = start_tax_y + (i + 1) * (tax_box_height_base + tax_spacing)
                        ax.plot([tax_x, tax_x],
                                [tax_y + tax_box_height / 2, next_tax_y - tax_box_height_base / 2],
                                color='#1565C0', linewidth=3.5, zorder=3)
                    last_tax_y = tax_y

                control_x = tax_x + tax_box_width / 2 + 2.0
                control_y = last_tax_y
                verts = [
                    (tax_x + tax_box_width / 2, last_tax_y),
                    (control_x, control_y),
                    (main_center[0] - oval_width / 2, main_center[1])
                ]
                codes = [Path.MOVETO, Path.CURVE3, Path.CURVE3]
                path = Path(verts, codes)
                patch = patches.PathPatch(path, facecolor='none',
                                          edgecolor='#1565C0',
                                          linewidth=3.5, zorder=3)
                ax.add_patch(patch)

            # Main label - compute first
            main_lines = textwrap.wrap(root_label, width=14, break_long_words=False) or [root_label]
            main_line_h = 0.50
            main_total_h = (len(main_lines) - 1) * main_line_h
            main_start_y = main_center[1] + main_total_h / 2

            # Increase oval height based on text
            oval_height = max(5.0, main_total_h + 1.8)
            
            # main oval - BRIGHTER COLOR
            oval = patches.Ellipse(main_center, oval_width, oval_height,
                       color='#C62828', zorder=10)
            ax.add_patch(oval)

            for i, mline in enumerate(main_lines):
                ax.text(main_center[0], main_start_y - i * main_line_h, mline,
                 fontsize=30, ha='center', va='center',
                    color='white', weight='bold', zorder=11)

            # other sections
            others = [
                node for idx, node in enumerate(tree.get("children", []))
                if idx != taxonomy_idx
            ]

            if others:
                num_sections = len(others)
                if num_sections == 2:
                    angles = [50, -50]
                elif num_sections == 3:
                    angles = [70, 0, -70]
                elif num_sections == 4:
                    angles = [80, 30, -30, -80]
                else:
                    angles = np.linspace(75, -75, num_sections)

                section_radius = 9.0
                section_width = 5.5

                for idx, (node, angle_deg) in enumerate(zip(others, angles)):
                    section_label = node["label"]
                    angle_rad = np.deg2rad(angle_deg)

                    sec_x = main_center[0] + section_radius * np.cos(angle_rad)
                    sec_y = main_center[1] + section_radius * np.sin(angle_rad)

                    # Section label size
                    _, total_text_height = draw_wrapped_text(
                        ax, sec_x, sec_y,
                        section_label.upper(),
                        max_width_chars=22,
                        font_size=20,
                        line_height=0.40,
                        color='white', zorder=9,
                        draw=False
                    )
                    section_height = max(2.0, total_text_height + 1.0)

                    sec_box = patches.FancyBboxPatch(
                        (sec_x - section_width / 2, sec_y - section_height / 2),
                        section_width, section_height,
                        boxstyle="round,pad=0.15", facecolor="#1565C0",
                        linewidth=2.8, edgecolor='#0D47A1', zorder=8)
                    ax.add_patch(sec_box)
                    draw_wrapped_text(
                        ax, sec_x, sec_y,
                        section_label.upper(),
                        max_width_chars=13,
                        font_size=20,
                        line_height=0.40,
                        color='white', zorder=9,
                        draw=True
                    )
                    # === EXTRA connector: Main oval → Reproduction section ONLY ===
                    if "reproduction" in section_label.lower():

                        start_x = main_center[0] + (oval_width / 2) * np.cos(angle_rad)
                        start_y = main_center[1] + (oval_height / 2) * np.sin(angle_rad)

                        end_x = sec_x
                        end_y = sec_y + section_height / 2

                        mid_x = (start_x + end_x) / 2
                        mid_y = (start_y + end_y) / 2 + 1.2  # gentle curve

                        verts = [
                                (start_x, start_y),
                                (mid_x, mid_y),
                                (end_x, end_y)
                            ]
                        codes = [Path.MOVETO, Path.CURVE3, Path.CURVE3]

                        ax.add_patch(patches.PathPatch(
                           Path(verts, codes),
                           facecolor='none',
                            edgecolor='#2E7D32',
                            linewidth=3.2,
                            linestyle='--',
                            alpha=0.95,
                            zorder=9   # above boxes
                        ))

                    # curved connector
                    conn_start_x = main_center[0] + (oval_width / 2 + 0.4) * np.cos(angle_rad)
                    conn_start_y = main_center[1] + (oval_height / 2 + 0.4) * np.sin(angle_rad)

                    mid_x = (conn_start_x + sec_x) / 2
                    mid_y = (conn_start_y + sec_y) / 2
                    dx, dy = sec_x - conn_start_x, sec_y - conn_start_y
                    perp_x, perp_y = -dy, dx
                    length = (perp_x ** 2 + perp_y ** 2) ** 0.5
                    if length > 0:
                        perp_x, perp_y = perp_x / length, perp_y / length
                    ctrl_x = mid_x + 1.5 * perp_x
                    ctrl_y = mid_y + 1.5 * perp_y

                    verts = [(conn_start_x, conn_start_y),
                             (ctrl_x, ctrl_y), (sec_x, sec_y)]
                    codes = [Path.MOVETO, Path.CURVE3, Path.CURVE3]
                    path = Path(verts, codes)
                    ax.add_patch(patches.PathPatch(
                        path, facecolor='none',
                        edgecolor='#424242',
                        linewidth=3.2, zorder=7))

                    # children
                    children = node.get("children", [])
                    child_width = 5.0
                    child_height_base = 1.5
                    child_spacing = 2.0

                    is_structure = "structure" in section_label.lower()

                    if is_structure:
                        # grow upward
                        for child_idx, child in enumerate(children):
                            child_label = child["label"]
                            child_x = sec_x
                            child_y = sec_y + section_height / 2 + child_spacing * (child_idx + 1)

                            # measure text
                            _, total_text_height = draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=20,
                                font_size=22,
                                line_height=0.48,
                                color="#000000", zorder=7,
                                draw=False
                            )
                            child_height = max(child_height_base, total_text_height + 0.9)

                            child_box = patches.FancyBboxPatch(
                                (child_x - child_width / 2, child_y - child_height / 2),
                                child_width, child_height,
                                boxstyle="round,pad=0.15",
                                facecolor="#4FF7DE",
                                linewidth=2.2,
                                edgecolor="#4FF7DE", zorder=6)
                            ax.add_patch(child_box)
                            draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=20,
                                font_size=22,
                                line_height=0.48,
                                color="#000000", zorder=7,
                                draw=True
                            )

                            # connector up
                            side_offset = 1.2 * np.sign(np.cos(angle_rad))
                            lane_x = sec_x + side_offset
                            verts = [
                                (sec_x, sec_y + section_height / 2),
                                (lane_x, sec_y + section_height / 2 + 0.3),
                                (lane_x, child_y - child_height / 2),
                                (child_x, child_y - child_height / 2)
                            ]
                            codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                            path = Path(verts, codes)
                            ax.add_patch(patches.PathPatch(
                                path, facecolor='none',
                                edgecolor='#616161',
                                linewidth=2.6, zorder=5, alpha=0.9))
                    elif "habitat" in section_label.lower():
                         # grow downward
                        for child_idx, child in enumerate(children):
                            child_label = child["label"]
                            child_x = sec_x
                            child_y = sec_y - section_height / 2 - child_spacing * (child_idx + 1)

                            _, total_text_height = draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=17,
                                font_size=22,
                                line_height=0.48,
                                color='#000000', zorder=7,
                                draw=False
                            )
                            child_height = max(child_height_base, total_text_height + 0.9)

                            child_box = patches.FancyBboxPatch(
                                (child_x - child_width / 2, child_y - child_height / 2),
                                child_width, child_height,
                                boxstyle="round,pad=0.15",
                                facecolor="#F7EC4F",
                                linewidth=2.2,
                                edgecolor='#F7EC4F', zorder=6)
                            ax.add_patch(child_box)
                            draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=17,
                                font_size=22,
                                line_height=0.48,
                                color='#000000', zorder=7,
                                draw=True
                            )

                            side_offset = 1.2 * np.sign(np.cos(angle_rad))
                            lane_x = sec_x + side_offset
                            verts = [
                                (sec_x, sec_y - section_height / 2),
                                (lane_x, sec_y - section_height / 2 - 0.3),
                                (lane_x, child_y + child_height / 2),
                                (child_x, child_y + child_height / 2)
                            ]
                            codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                            path = Path(verts, codes)
                            ax.add_patch(patches.PathPatch(
                                path, facecolor='none',
                                edgecolor='#616161',
                                linewidth=12.6, zorder=5, alpha=0.9))
                        
                    else:
                        # grow downward
                        for child_idx, child in enumerate(children):
                            child_label = child["label"]
                            child_x = sec_x
                            repro_spacing = child_spacing * 1.6
                            child_y = sec_y - section_height / 2 - repro_spacing * (child_idx + 1)
                            _, total_text_height = draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=17,
                                font_size=22,
                                line_height=0.48,
                                color='#000000', zorder=7,
                                draw=False
                            )
                            child_height = max(child_height_base, total_text_height + 0.9)
                    
                            child_box = patches.FancyBboxPatch(
                                (child_x - child_width / 2, child_y - child_height / 2),
                                child_width, child_height,
                                boxstyle="round,pad=0.15",
                                facecolor="#F7A94F",
                                linewidth=2.2,
                                edgecolor='#F7A94F', zorder=7)
                            ax.add_patch(child_box)
                            draw_wrapped_text(
                                ax, child_x, child_y,
                                child_label,
                                max_width_chars=17,
                                font_size=22,
                                line_height=0.48,
                                color='#000000', zorder=7,
                                draw=True
                            )

                            side_offset = 1.2 * np.sign(np.cos(angle_rad))
                            lane_x = sec_x + side_offset
                            verts = [
                                (sec_x, sec_y - section_height / 2),
                                (lane_x, sec_y - section_height / 2 - 0.3),
                                (lane_x, child_y + child_height / 2),
                                (child_x, child_y + child_height / 2)
                            ]
                            codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                            path = Path(verts, codes)
                            ax.add_patch(patches.PathPatch(
                                path, facecolor='none',
                                edgecolor='#616161',
                                linewidth=2.6, zorder=5, alpha=0.9))

            ax.set_xlim(-17, 17)
            ax.set_ylim(-18, 20)  # Expanded to show all content
            plt.tight_layout()
            buf = BytesIO()
            plt.savefig(buf, format='svg', bbox_inches='tight',
                        pad_inches=0.5, facecolor='#FFFFFF')
            plt.close()
            buf.seek(0)
            return buf.read()

    except Exception as e:
        print(f"xml_to_image error for {domain_name}: {e}")
        import traceback
        traceback.print_exc()
        return None

# Test code
xml_string = '''<node name="Concept Map: chlorophyll-containing organisms">
  <node name="Taxonomy">
    <node name="Kingdom Protista"/>
    <node name="Division Chlorophyta"/>
    <node name="Class Chlorophyceae"/>
    <node name="Order Ulotrichales"/>
    <node name="Family Ulotrichaceae"/>
    <node name="Genus Ulothrix"/>
    <node name="Species Ulothrix zonata"/>
  </node>
  <node name="Structure">
    <node name="Filamentous unbranched chains"/>
    <node name="Girdle-shaped chloroplasts"/>
    <node name="Cell walls with cellulose"/>
    
  </node>
  <node name="Reproduction">
    <node name="Vegetative fragmentation"/>
    <node name="Asexual via biflagellate zoospores"/>
    <node name="Sexual by isogamous gamete fusion"/>
  </node>
  <node name="Habitat">
    <node name="Freshwater ponds and streams"/>
    <node name="Attached to rocks in cold water"/>
    <node name="Moist soil and tree trunks"/>
  </node>
</node>
'''

process = '''<node name="Process Map: Photosynthesis">
  <node name="Definition">
    <node name="Process by which green plants synthesize food using sunlight, CO2, and water"/>
  </node>
  <node name="Purpose">
    <node name="To produce glucose and oxygen for energy and growth"/>
  </node>
  <node name="Prerequisites">
    <node name="Presence of Sunlight"/>
    <node name="Presence of Carbon dioxide"/>
    <node name="Presence of Chlorophyll"/>
  </node>
  <node name="Steps">
    <node name="Step 1: Light absorption by chlorophyll"/>
    <node name="Step 2: Water splitting"/>
    <node name="Step 3: ATP formation"/>
    <node name="Step 4: Carbon fixation"/>
  </node>
  <node name="Result">
    <node name="Glucose production"/>
    <node name="Oxygen release"/>
  </node>
  <node name="Entities Involved">
    <node name="Chlorophyll"/>
    <node name="Water molecules"/>
    <node name="Sunlight"/>
  </node>
  <node name="Where does it occur?">
    <node name="Chloroplasts in plant cells"/>
  </node>
  <node name="Types">
    <node name="Oxygenic photosynthesis"/>
    <node name="Anoxygenic photosynthesis"/>
  </node>
</node>'''

# Generate SVG
svg_data = xml_to_image(xml_string, "YourDomain")
process_data = xml_to_image(process, "YourDomain")

# Save files
with open("fixed_output.svg", "wb") as f:
    f.write(svg_data)
with open("fixed_process.svg", "wb") as f:
    f.write(process_data)
    
print("✅ Created: fixed_output.svg and fixed_process.svg")
print("\nFixes applied:")
print("1. ✅ Taxonomy boxes now have BLACK text")
print("2. ✅ Title has horizontal underline")
print("3. ✅ Title is single line (no wrapping)")
print("4. ✅ ALL habitat boxes are now visible with proper z-order")