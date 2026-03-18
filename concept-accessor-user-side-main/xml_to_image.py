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
        children = [parse_tree(c) for c in node if c.attrib.get("name","").strip()]
        return {"label": label, "children": children}

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
                      font_size=18, line_height=0.40,
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
        # PROCESS MAP  –  two-level mind-map layout
        #
        # Level 1 (center → directly):  Definition, Purpose, Types/Subtypes
        # Level 2 (Purpose → children): everything else
        # ============================================================
        if is_process:
            sections = [s for s in tree.get("children", []) if s.get("label", "").strip()]

            # ── helpers ──────────────────────────────────────────────
            def _draw_box(ax, cx, cy, w, h, facecolor, edgecolor,
                          radius=0.18, lw=2.0, zorder=5):
                ax.add_patch(patches.FancyBboxPatch(
                    (cx - w / 2, cy - h / 2), w, h,
                    boxstyle=f"round,pad={radius}",
                    facecolor=facecolor, edgecolor=edgecolor,
                    linewidth=lw, zorder=zorder))

            def _draw_curve(ax, x0, y0, x1, y1, color, lw, zorder=3):
                mid_x = (x0 + x1) / 2
                mid_y = (y0 + y1) / 2
                dx, dy = x1 - x0, y1 - y0
                length = max((dx**2 + dy**2) ** 0.5, 0.001)
                px, py = -dy / length, dx / length
                cx_ = mid_x + 0.3 * px
                cy_ = mid_y + 0.3 * py
                verts = [(x0, y0), (cx_, cy_), (x1, y1)]
                codes = [Path.MOVETO, Path.CURVE3, Path.CURVE3]
                ax.add_patch(patches.PathPatch(
                    Path(verts, codes),
                    facecolor='none', edgecolor=color,
                    linewidth=lw, zorder=zorder))

            def _draw_elbow(ax, x0, y0, x1, y1, color, lw, zorder=3):
                mid_x = (x0 + x1) / 2
                verts = [(x0, y0), (mid_x, y0), (mid_x, y1), (x1, y1)]
                codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
                ax.add_patch(patches.PathPatch(
                    Path(verts, codes),
                    facecolor='none', edgecolor=color,
                    linewidth=lw, zorder=zorder))

            def _measure_h(text, max_chars, font_size, line_h):
                lines = textwrap.wrap(text, width=max_chars,
                                      break_long_words=True) or [text]
                return max(font_size * 0.035,
                           (len(lines) - 1) * line_h + font_size * 0.038)

            # ── colour palettes ───────────────────────────────────────
            # Level-1 branches (directly connected to center)
            L1_COLORS = {
                'definition': ('#6EC6F5', '#039BE5', '#E1F5FE'),  # blue
                'purpose':    ('#81C784', '#388E3C', '#E8F5E9'),  # green
                'types':      ('#CE93D8', '#8E24AA', '#F3E5F5'),  # purple
                'subtypes':   ('#CE93D8', '#8E24AA', '#F3E5F5'),  # purple
            }
            L1_DEFAULT = ('#FFB74D', '#EF6C00', '#FFF3E0')

            # Level-2 branches (connected to Purpose) - distinct colors
            L2_PALETTE = [
                ('#FF8A65', '#E64A19', '#FBE9E7'),  # deep orange
                ('#4DB6AC', '#00796B', '#E0F2F1'),  # teal
                ('#F06292', '#C2185B', '#FCE4EC'),  # pink
                ('#FFD54F', '#F57F17', '#FFFDE7'),  # yellow
                ('#7986CB', '#303F9F', '#E8EAF6'),  # indigo
                ('#A5D6A7', '#2E7D32', '#F1F8E9'),  # light green
                ('#90CAF9', '#1565C0', '#E3F2FD'),  # light blue
                ('#FFCC80', '#E65100', '#FFF8E1'),  # orange
            ]

            # ── categorise sections ───────────────────────────────────
            DIRECT_KEYWORDS = ('definition', 'purpose', 'type', 'subtype')

            direct_secs = []   # go straight from center
            purpose_secs = []  # go under Purpose
            purpose_node = None

            for sec in sections:
                lbl = sec['label'].strip().lower()
                if any(lbl.startswith(k) or k in lbl for k in DIRECT_KEYWORDS):
                    direct_secs.append(sec)
                    if 'purpose' in lbl:
                        purpose_node = sec   # keep reference for positioning
                else:
                    purpose_secs.append(sec)

            # ── figure ───────────────────────────────────────────────
            fig, ax = plt.subplots(figsize=(36, 26), dpi=130)
            ax.set_facecolor('#FFFFFF')
            ax.axis('off')
            XLIM, YLIM = (-15, 15), (-10, 10)

            # ── title (drawn after layout so x-centre is known) ──────
            _title_placeholder = True  # drawn below after autoscale

            # ── central node ─────────────────────────────────────────
            CX, CY = -2.2, 0.0   # offset so full layout (left+right branches) is centred
            center_w, center_h = 4.4, 2.2
            _draw_box(ax, CX, CY, center_w, center_h,
                      '#81C784', '#388E3C', radius=0.35, lw=2.8, zorder=12)
            draw_wrapped_text(ax, CX, CY, root_label,
                              max_width_chars=14, font_size=34,
                              line_height=0.42, color='#1B5E20',
                              weight='bold', zorder=13)

            # ── sizing constants ──────────────────────────────────────
            L1_W, L1_H_BASE, L1_FONT = 4.2, 1.8, 26
            L1_CHILD_W, L1_CHILD_H, L1_CHILD_FONT = 4.0, 1.6, 23

            L2_W, L2_H_BASE, L2_FONT = 4.0, 1.8, 25
            L2_CHILD_W, L2_CHILD_H, L2_CHILD_FONT = 3.8, 1.6, 23

            V_SP   = 0.35   # vertical gap between siblings (increased for larger fonts)
            LINE_W = 1.7

            # ── helper: stack children vertically centred on anchor_y ─
            def _stack_children(children, cx, anchor_y,
                                 child_w, child_h_base, child_font,
                                 v_sp=V_SP):
                valid_children = [c for c in children if c['label'].strip()]

                child_hs = [
                max(child_h_base,
                    _measure_h(c['label'], 16, child_font, 0.38) + 0.5)
                for c in valid_children
                ]
                total = sum(child_hs) + max(0, len(child_hs) - 1) * v_sp
                positions = []
                cy = anchor_y + total / 2
                for i, c in enumerate(valid_children):
                    ch = child_hs[i]
                    positions.append((c['label'], cx, cy - ch / 2, ch))
                    cy -= ch + v_sp
                return positions

            # ── helper: layout a list of branches on one side ─────────
            def _layout_branches(branch_list, sign,
                                  bx, branch_w, branch_h_base,
                                  child_x, child_w, child_h_base,
                                  branch_font, child_font,
                                  center_y=CY):
                """Returns list of dicts with position info."""
                def _branch_block_h(sec):
                    kids = sec.get('children', [])
                    if not kids:
                        return branch_h_base + 0.3
                    kids_h = sum(
                        max(child_h_base,
                            _measure_h(c['label'], 16, child_font, 0.38) + 0.5) + V_SP
                        for c in kids)
                    return max(branch_h_base, kids_h) + 0.3

                branch_list = [s for s in branch_list if s['label'].strip()]
                heights = [_branch_block_h(s) for s in branch_list]
                total_h = sum(heights) + max(0, len(heights) - 1) * 0.6
                y = center_y + total_h / 2
                result = []
                for i, sec in enumerate(branch_list):
                    h = heights[i]
                    by = y - h / 2
                    y -= h + 0.6
                    kids = sec.get('children', [])
                    child_pos = _stack_children(kids, child_x, by,
                                                child_w, child_h_base,
                                                child_font) if kids else []
                    result.append({'sec': sec, 'bx': bx, 'by': by,
                                   'children': child_pos})
                return result

            # ── helper: draw a branch + its leaf children ─────────────
            def _draw_branch(item, branch_w, branch_h_base, branch_font,
                              child_w, child_font,
                              face, edge, child_face,
                              from_x, from_y, lw_conn):
                sec  = item['sec']
                bx   = item['bx']
                by   = item['by']
                kids = item['children']
                sign = np.sign(bx - from_x) if bx != from_x else 1

                lines = textwrap.wrap(sec['label'], width=14,
                                      break_long_words=True) or [sec['label']]
                bh = max(branch_h_base, len(lines) * 0.52 + 0.50)

                _draw_box(ax, bx, by, branch_w, bh,
                          face, edge, radius=0.22, lw=2.0, zorder=10)
                draw_wrapped_text(ax, bx, by, sec['label'],
                                  max_width_chars=14, font_size=branch_font,
                                  line_height=0.48, color='#1A1A1A',
                                  weight='bold', zorder=11)

                # connector from parent → this branch
                _draw_curve(ax, from_x, from_y,
                            bx - np.sign(bx - from_x) * branch_w / 2, by,
                            color=edge, lw=lw_conn, zorder=4)

                # this branch → leaf children
                for (clabel, cxc, cyc, ch) in kids:
                    lines_c = textwrap.wrap(clabel, width=16,
                                            break_long_words=True) or [clabel]
                    ch_actual = max(ch, len(lines_c) * 0.46 + 0.50)
                    _draw_box(ax, cxc, cyc, child_w, ch_actual,
                              child_face, edge, radius=0.18, lw=1.5, zorder=8)
                    draw_wrapped_text(ax, cxc, cyc, clabel,
                                      max_width_chars=16,
                                      font_size=child_font, line_height=0.44,
                                      color='#1A1A1A', weight='normal', zorder=9)
                    _draw_elbow(ax,
                                bx + np.sign(cxc - bx) * branch_w / 2, by,
                                cxc - np.sign(cxc - bx) * child_w / 2, cyc,
                                color=edge, lw=LINE_W, zorder=4)

                return bh   # return actual box height drawn

            # ════════════════════════════════════════════════════════
            # LEVEL 1  – direct branches from center
            # Layout: Definition on left, Purpose in middle-right,
            #         Types on far right (or left if no room)
            # ════════════════════════════════════════════════════════

            # Separate out Definition / Purpose / Types for fixed placement
            def _is(label, keyword):
                return keyword in label.strip().lower()

            def_sec   = next((s for s in direct_secs if _is(s['label'], 'definition')), None)
            purp_sec  = next((s for s in direct_secs if _is(s['label'], 'purpose')), None)
            types_sec = next((s for s in direct_secs
                              if _is(s['label'], 'type') or _is(s['label'], 'subtype')), None)
            other_direct = [s for s in direct_secs
                            if s not in (def_sec, purp_sec, types_sec)]

            # ── place Definition on the LEFT of center ────────────────
            L1_gap = 1.2   # horizontal gap center-edge → branch-edge
            def_bx    = CX - center_w / 2 - L1_gap - L1_W / 2
            purp_bx   = CX + center_w / 2 + L1_gap + L1_W / 2
            types_bx  = purp_bx  # will be placed further right below

            drawn_purpose_pos = None   # will store (px, py) once Purpose is drawn

            # ── Definition ───────────────────────────────────────────
            if def_sec:
                fc, ec, chc = L1_COLORS.get('definition', L1_DEFAULT)
                child_x_def = def_bx - L1_W / 2 - 0.6 - L1_CHILD_W / 2
                def_layout = _layout_branches(
                    [def_sec], -1,
                    def_bx, L1_W, L1_H_BASE,
                    child_x_def, L1_CHILD_W, L1_CHILD_H,
                    L1_FONT, L1_CHILD_FONT, center_y=CY + 2.5)
                for item in def_layout:
                    _draw_branch(item, L1_W, L1_H_BASE, L1_FONT,
                                 L1_CHILD_W, L1_CHILD_FONT,
                                 fc, ec, chc,
                                 from_x=CX - center_w / 2,
                                 from_y=CY, lw_conn=LINE_W + 0.5)

            # ── Purpose ──────────────────────────────────────────────
            # Purpose sits to the RIGHT of center, vertically centred
            # It also serves as the hub for L2 branches, so we need its position
            PURPOSE_BY = CY  # vertical centre of Purpose box

            if purp_sec:
                fc, ec, chc = L1_COLORS.get('purpose', L1_DEFAULT)
                # Purpose has its own leaf children (from XML) shown to its right
                child_x_purp = purp_bx + L1_W / 2 + 0.5 + L1_CHILD_W / 2
                purp_layout = _layout_branches(
                    [purp_sec], +1,
                    purp_bx, L1_W, L1_H_BASE,
                    child_x_purp, L1_CHILD_W, L1_CHILD_H,
                    L1_FONT, L1_CHILD_FONT, center_y=PURPOSE_BY)
                for item in purp_layout:
                    bh = _draw_branch(item, L1_W, L1_H_BASE, L1_FONT,
                                      L1_CHILD_W, L1_CHILD_FONT,
                                      fc, ec, chc,
                                      from_x=CX + center_w / 2,
                                      from_y=CY, lw_conn=LINE_W + 0.5)
                    drawn_purpose_pos = (purp_bx, PURPOSE_BY)
            else:
                # No Purpose node in XML – create a virtual hub at purp_bx
                drawn_purpose_pos = (purp_bx, PURPOSE_BY)

            # ── Types ────────────────────────────────────────────────
            if types_sec:
                fc, ec, chc = L1_COLORS.get('types', L1_DEFAULT)
                # Place Types below center on the left side
                types_bx2 = CX - center_w / 2 - L1_gap - L1_W / 2
                types_by  = CY - 2.8
                child_x_types = types_bx2 - L1_W / 2 - 0.6 - L1_CHILD_W / 2
                types_item = {'sec': types_sec, 'bx': types_bx2, 'by': types_by,
                              'children': _stack_children(
                                  types_sec.get('children', []),
                                  child_x_types, types_by,
                                  L1_CHILD_W, L1_CHILD_H, L1_CHILD_FONT)}
                _draw_branch(types_item, L1_W, L1_H_BASE, L1_FONT,
                             L1_CHILD_W, L1_CHILD_FONT,
                             fc, ec, chc,
                             from_x=CX - center_w / 2,
                             from_y=CY, lw_conn=LINE_W + 0.5)

            # ── other direct sections (if any) ────────────────────────
            for i, sec in enumerate(other_direct):
                fc, ec, chc = L1_DEFAULT
                obx = CX - center_w / 2 - L1_gap - L1_W / 2
                oby = CY + 2.5 + (i + 1) * 2.0
                child_x_o = obx - L1_W / 2 - 0.6 - L1_CHILD_W / 2
                oitem = {'sec': sec, 'bx': obx, 'by': oby,
                         'children': _stack_children(
                             sec.get('children', []),
                             child_x_o, oby,
                             L1_CHILD_W, L1_CHILD_H, L1_CHILD_FONT)}
                _draw_branch(oitem, L1_W, L1_H_BASE, L1_FONT,
                             L1_CHILD_W, L1_CHILD_FONT,
                             fc, ec, chc,
                             from_x=CX - center_w / 2,
                             from_y=CY, lw_conn=LINE_W + 0.5)

            # ════════════════════════════════════════════════════════
            # LEVEL 2  – branches hanging off Purpose
            # Spread to the RIGHT of Purpose (and below/above)
            # ════════════════════════════════════════════════════════
            if purpose_secs and drawn_purpose_pos:
                px, py = drawn_purpose_pos

                # L2 branches go further right
                L2_bx       = px + L1_W / 2 + 1.2 + L2_W / 2
                L2_child_x  = L2_bx + L2_W / 2 + 0.55 + L2_CHILD_W / 2

                offset = max(1.5, len(purpose_secs) * 0.3)

                l2_layout = _layout_branches(
                purpose_secs, +1,
                L2_bx, L2_W, L2_H_BASE,
                L2_child_x, L2_CHILD_W, L2_CHILD_H,
                L2_FONT, L2_CHILD_FONT,
                center_y = py - offset
                )
                for i, item in enumerate(l2_layout):
                    fc, ec, chc = L2_PALETTE[i % len(L2_PALETTE)]
                    _draw_branch(item, L2_W, L2_H_BASE, L2_FONT,
                                 L2_CHILD_W, L2_CHILD_FONT,
                                 fc, ec, chc,
                                 from_x=px + L1_W / 2,
                                 from_y=py, lw_conn=LINE_W)

            ax.autoscale_view()
            xmin, xmax = ax.get_xlim()
            ymin, ymax = ax.get_ylim()
            # Draw title centred on content, above everything
            title_cx = (xmin + xmax) / 2
            ax.text(title_cx, ymax + 0.8, root_label,
                    fontsize=46, ha='center', va='bottom',
                    color='#000000', weight='bold', zorder=20,
                    bbox=dict(boxstyle='round,pad=0.45',
                              facecolor='#A5D6A7',
                              edgecolor='#388E3C', linewidth=2.5))
            pad_x = max(1.5, (xmax - xmin) * 0.06)
            pad_y = max(1.5, (ymax - ymin) * 0.06)
            ax.set_xlim(xmin - pad_x, xmax + pad_x)
            ax.set_ylim(ymin - pad_y, ymax + 3.5)  # extra top room for title
            plt.tight_layout(pad=1.0)
            buf = BytesIO()
            plt.savefig(buf, format='svg', bbox_inches='tight',
                        pad_inches=0.6, facecolor='#FFFFFF')
            plt.close()
            buf.seek(0)
            return buf.read()

        # ============================================================
        # CONCEPT / ENTITY MAP
        # ============================================================
        else:
            fig, ax = plt.subplots(figsize=(28, 26), dpi=130)  # Wider and taller to prevent cut-off
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
            main_center = (0, 0)  # Centered on page

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
                                font_size=28,
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

            ax.set_xlim(-16, 18)
            ax.set_ylim(-20, 21)  # Expanded to show all content including children
            plt.tight_layout(pad=1.0)
            buf = BytesIO()
            plt.savefig(buf, format='svg', bbox_inches='tight',
                        pad_inches=0.8, facecolor='#FFFFFF')
            plt.close()
            buf.seek(0)
            return buf.read()

    except Exception as e:
        print(f"xml_to_image error for {domain_name}: {e}")
        import traceback
        traceback.print_exc()
        return None
xml_string = '''<node name="Concept Map: chlorophyll-containing organisms">
  <node name="Taxonomy">
    <node name="Kingdom Protista1111"/>
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
    <node name="Vegetative fragmentation11"/>
    <node name="Asexual via biflagellate zoospores"/>
    <node name="Sexual by isogamous gamete fusion"/>
  </node>
  <node name="Habitat">
    <node name="Freshwater ponds and stream11s"/>
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
    <node name="Step 2: Water splitting11"/>
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
    <node name="Chloroplasts in p1ant cells"/>
  </node>
  <node name="Types">
    <node name="Oxygenic photosynthesis"/>
    <node name="Anoxygenic photosynthesis"/>
  </node>
</node>'''
# Generate SVG
svg_data = xml_to_image(xml_string, "YourDomain")
process = xml_to_image(process, "YourDomain")
# Save file
with open("fixed_output.svg", "wb") as f:
    f.write(svg_data)
with open("fixed_process.svg", "wb") as f:
    f.write(process)
print("Created: fixed_output.svg and fixed_process.svg")