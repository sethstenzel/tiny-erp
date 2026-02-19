    /* ══════════════════════════════════════════
       STATE
    ══════════════════════════════════════════ */
    const isles = [];
    let isleCounter       = 0;
    let subsectionCounter = 0;
    let shelfCounter      = 0;
    let itemCounter       = 0;

    const zones = [];
    let zoneCounter = 0;
    let pendingZone = null;
    let activeZoneForItems = null;
    let selectedZoneItemIds = new Set();

    // Zone drag state
    let isDraggingZone = false, draggingZone = null, zoneDragMoved = false;
    let zoneStartMX = 0, zoneStartMY = 0, zoneStartX = 0, zoneStartY = 0;

    // Entity (isle/zone) resize state
    let isEntityResizing = false;
    let entityResizeTarget = null, entityResizeTargetType = null, entityResizeEdge = null;
    let entityResizeStartMX = 0, entityResizeStartMY = 0;
    let entityResizeStartX  = 0, entityResizeStartY  = 0;
    let entityResizeStartW  = 0, entityResizeStartH  = 0;

    // Entity (isle/zone) rotation state
    let isRotating = false;
    let rotatingEntity = null, rotatingEntityType = null;
    let rotateStartAngle = 0;
    let rotateCenterX = 0, rotateCenterY = 0;
    let rotateStartMouseAngle = 0;

    let currentZoom = 1;
    let panX = 0, panY = 0;
    let isPanning = false, panLastX = 0, panLastY = 0;

    let editMode = false;

    // Warehouse resize state
    let isResizing = false, resizeEdge = null;
    let resizeStartMX = 0, resizeStartMY = 0;
    let resizeStartW  = 0, resizeStartH  = 0;
    let resizeStartPanX = 0, resizeStartPanY = 0;

    // Isle drag state
    let isDraggingIsle = false, draggingIsle = null;
    let isleStartMX = 0, isleStartMY = 0;
    let isleStartX  = 0, isleStartY  = 0;
    let isleDragMoved = false;

    let drawMode  = null;
    let isDrawing = false;
    let startX = 0, startY = 0;

    // Copy/paste state
    let selectedIsle = null; // isle highlighted in edit mode for Ctrl+C / delete
    let copiedIsle   = null; // serialized snapshot of the last Ctrl+C'd isle
    let selectedZone = null; // zone highlighted in edit mode for delete

    // Multi-warehouse state
    const warehouses = [];
    let activeWarehouseIdx = 0;
    let warehouseTabCounter = 0;

    let pendingFacing    = 'right'; // 'left' | 'right'
    let pendingIsle      = null;   // isle being constructed through the 3-step modal flow
    let activeIsle       = null;
    let activeSubsection = null;
    let activeShelf      = null;
    let selectedItemIds  = new Set();

    /* ══════════════════════════════════════════
       DOM
    ══════════════════════════════════════════ */
    const viewport        = document.getElementById('viewport');
    const panZoomLayer    = document.getElementById('pan-zoom-layer');
    const warehouseWrapper = document.getElementById('warehouse-wrapper');
    const warehouse       = document.getElementById('warehouse');
    const preview   = document.getElementById('draw-preview');
    const statusEl  = document.getElementById('status');
    const countEl   = document.getElementById('isle-count');

    /* ══════════════════════════════════════════
       UTILITIES
    ══════════════════════════════════════════ */
    function randomColor() { return `hsl(${Math.floor(Math.random()*360)},70%,42%)`; }
    function randomHexColor() {
      return '#' + Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0');
    }
    function hexToRgba(hex, alpha) {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    function randomZoneColors() {
      const h = Math.floor(Math.random()*360);
      return { bg: `hsla(${h},60%,72%,0.22)`, border: `hsl(${h},55%,42%)` };
    }
    function applyIsleFill(el, fillColor, fillOpacity) {
      el.style.background = fillOpacity > 0 ? hexToRgba(fillColor, fillOpacity / 100) : 'transparent';
    }
    function applyZoneFill(el, borderColor, fillOpacity) {
      el.style.background = hexToRgba(borderColor, fillOpacity / 100);
    }

    function triggerBgImport() { document.getElementById('bg-file-input').click(); }
    function handleBgFile(input) {
      const file = input.files[0];
      if (!file) return;
      input.value = '';
      const reader = new FileReader();
      reader.onload = (ev) => setWarehouseBackground(ev.target.result);
      reader.readAsDataURL(file);
    }

    function onIsleColorChange(v) {
      if (!pendingIsle) return;
      pendingIsle.color = v;
      pendingIsle.element.style.borderColor = v;
    }
    function onIsleLabelColorChange(v) {
      if (!pendingIsle) return;
      pendingIsle.labelColor = v;
      const lbl = pendingIsle.element.querySelector('.isle-label');
      if (lbl) lbl.style.color = v;
    }
    function onIsleFillChange() {
      if (!pendingIsle) return;
      const color   = document.getElementById('isle-fill-color').value;
      const opacity = parseInt(document.getElementById('isle-fill-opacity').value, 10);
      document.getElementById('isle-fill-opacity-label').textContent = opacity + '%';
      pendingIsle.fillColor   = color;
      pendingIsle.fillOpacity = opacity;
      applyIsleFill(pendingIsle.element, color, opacity);
    }
    function onZoneColorChange(v) {
      if (!pendingZone) return;
      pendingZone.color = v;
      pendingZone.element.style.borderColor = v;
      const opacity = parseInt(document.getElementById('zone-fill-opacity').value, 10);
      applyZoneFill(pendingZone.element, v, opacity);
    }
    function onZoneNameColorChange(v) {
      if (!pendingZone) return;
      pendingZone.labelColor = v;
      const lbl = pendingZone.element.querySelector('.zone-label');
      if (lbl) lbl.style.color = v;
    }
    function onZoneFillOpacityChange() {
      if (!pendingZone) return;
      const opacity = parseInt(document.getElementById('zone-fill-opacity').value, 10);
      document.getElementById('zone-fill-opacity-label').textContent = opacity + '%';
      pendingZone.fillOpacity = opacity;
      applyZoneFill(pendingZone.element, pendingZone.color, opacity);
    }
    function clamp(v,lo,hi) { return Math.max(lo,Math.min(hi,v)); }
    function getRelativePos(e) {
      const r  = warehouse.getBoundingClientRect();
      const bx = parseFloat(getComputedStyle(warehouse).borderLeftWidth)||0;
      const by = parseFloat(getComputedStyle(warehouse).borderTopWidth) ||0;
      // Divide by currentZoom to convert from viewport px to logical (CSS) px
      const lx = (e.clientX - r.left) / currentZoom - bx;
      const ly = (e.clientY - r.top ) / currentZoom - by;
      return { x: clamp(lx, 0, warehouse.clientWidth),
               y: clamp(ly, 0, warehouse.clientHeight) };
    }
    function show(id) { document.getElementById(id).classList.remove('hidden'); }
    function hide(id) { document.getElementById(id).classList.add('hidden'); }
    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function buildIsleHeaderHtml(row, label, labelColor) {
      const badge = row ? `<span class="isle-row-badge">${escHtml(row)}</span>` : '';
      return `${badge}<span class="isle-label" style="color:${escHtml(labelColor)}">${escHtml(label)}</span>`;
    }
    function closeAllModals() {
      ['modal-count','modal-subsections','modal-labels',
       'modal-subsection-select','modal-shelf-select','modal-add-shelf',
       'modal-shelf-actions','modal-add-item','modal-remove-items',
       'modal-confirm-delete','modal-zone','modal-confirm-import',
       'modal-paste-isle','modal-delete-entity',
       'modal-zone-actions','modal-zone-items'].forEach(hide);
      activeIsle=null; activeSubsection=null; activeShelf=null;
      activeZoneForItems=null;
      selectedItemIds.clear(); selectedZoneItemIds.clear();
    }

    function toggleMenu() {
      const menu = document.getElementById('floating-menu');
      const tab  = document.getElementById('menu-toggle-tab');
      const collapsed = menu.classList.toggle('collapsed');
      // ‹ = expand (menu is hidden, pull it back), › = collapse (menu is open, fold it away)
      tab.innerHTML = collapsed ? '&#x2039;' : '&#x203A;';
    }

    function setFacing(v) {
      pendingFacing = v;
      document.querySelectorAll('.facing-opt').forEach(b =>
        b.classList.toggle('selected', b.dataset.value === v));
    }

    /* ══════════════════════════════════════════
       SNAP HELPER
    ══════════════════════════════════════════ */
    const SNAP_THRESHOLD = 12;

    function snapPoint(x, y) {
      if (isles.length === 0 && zones.length === 0) return { x, y };
      const vEdges = [], hEdges = [];
      for (const isle of isles) {
        vEdges.push(isle.position.x, isle.position.x + isle.dimensions.width);
        hEdges.push(isle.position.y, isle.position.y + isle.dimensions.height);
      }
      for (const zone of zones) {
        vEdges.push(zone.position.x, zone.position.x + zone.dimensions.width);
        hEdges.push(zone.position.y, zone.position.y + zone.dimensions.height);
      }
      let snapX = x, bestDX = SNAP_THRESHOLD + 1;
      for (const ex of vEdges) { const d = Math.abs(x - ex); if (d < bestDX) { bestDX = d; snapX = ex; } }
      let snapY = y, bestDY = SNAP_THRESHOLD + 1;
      for (const ey of hEdges) { const d = Math.abs(y - ey); if (d < bestDY) { bestDY = d; snapY = ey; } }
      return { x: snapX, y: snapY };
    }

    /* ══════════════════════════════════════════
       ZONES
    ══════════════════════════════════════════ */
    function snapZoneMove(zone, newX, newY) {
      const w = zone.dimensions.width, h = zone.dimensions.height;
      const vEdges = [0, warehouse.clientWidth], hEdges = [0, warehouse.clientHeight];
      for (const z of zones) {
        if (z.id === zone.id) continue;
        vEdges.push(z.position.x, z.position.x + z.dimensions.width);
        hEdges.push(z.position.y, z.position.y + z.dimensions.height);
      }
      for (const isle of isles) {
        vEdges.push(isle.position.x, isle.position.x + isle.dimensions.width);
        hEdges.push(isle.position.y, isle.position.y + isle.dimensions.height);
      }
      let bestX = newX, bestDX = SNAP_THRESHOLD + 1;
      for (const ve of vEdges) {
        const dl = Math.abs(newX - ve), dr = Math.abs(newX + w - ve);
        if (dl < bestDX) { bestDX = dl; bestX = ve; }
        if (dr < bestDX) { bestDX = dr; bestX = ve - w; }
      }
      let bestY = newY, bestDY = SNAP_THRESHOLD + 1;
      for (const he of hEdges) {
        const dt = Math.abs(newY - he), db = Math.abs(newY + h - he);
        if (dt < bestDY) { bestDY = dt; bestY = he; }
        if (db < bestDY) { bestDY = db; bestY = he - h; }
      }
      return { x: bestX, y: bestY };
    }

    function beginZoneCreation(x, y, w, h) {
      const color = randomHexColor();
      const id = ++zoneCounter;
      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, {
        left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`,
        borderColor: color, background: hexToRgba(color, 0.18),
      });
      el.dataset.zoneId = id;
      const labelEl = document.createElement('div');
      labelEl.className = 'zone-label';
      labelEl.textContent = '…';
      el.appendChild(labelEl);
      warehouse.appendChild(el);
      pendingZone = { id, label:'', color, fillOpacity:18, labelColor:'#444444', rotation:0,
                      position:{x,y}, dimensions:{width:w,height:h},
                      items:[], element:el, createdAt:new Date().toISOString() };
      document.getElementById('zone-label-input').value = '';
      document.getElementById('zone-label-input').style.borderColor = '';
      document.getElementById('zone-color-input').value = color;
      document.getElementById('zone-name-color-input').value = '#444444';
      document.getElementById('zone-fill-opacity').value = 18;
      document.getElementById('zone-fill-opacity-label').textContent = '18%';
      show('modal-zone');
      document.getElementById('zone-label-input').focus();
    }

    function confirmZone() {
      const inp = document.getElementById('zone-label-input');
      const label = inp.value.trim();
      if (!label) { inp.style.borderColor = '#e53935'; inp.focus(); return; }
      inp.style.borderColor = '';
      const color      = document.getElementById('zone-color-input').value;
      const fillOpacity = parseInt(document.getElementById('zone-fill-opacity').value, 10);
      const labelColor  = document.getElementById('zone-name-color-input').value || '#444444';
      pendingZone.label       = label;
      pendingZone.color       = color;
      pendingZone.fillOpacity = fillOpacity;
      pendingZone.labelColor  = labelColor;
      pendingZone.element.style.borderColor = color;
      applyZoneFill(pendingZone.element, color, fillOpacity);
      const zoneLblEl = pendingZone.element.querySelector('.zone-label');
      zoneLblEl.textContent = label;
      zoneLblEl.style.color = labelColor;
      zones.push(pendingZone);
      attachZoneHandlers(pendingZone);
      statusEl.textContent = `Zone "${label}" added.`;
      pendingZone = null;
      hide('modal-zone');
    }

    function cancelZoneCreation() {
      if (pendingZone) { pendingZone.element.remove(); pendingZone = null; zoneCounter--; }
      hide('modal-zone');
    }

    function attachZoneHandlers(zone) {
      zone.element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (!editMode) return;
        e.stopPropagation(); e.preventDefault();
        selectZone(zone);
        selectIsle(null);
        isDraggingZone = true;
        draggingZone   = zone;
        zoneDragMoved  = false;
        zoneStartMX    = e.clientX;
        zoneStartMY    = e.clientY;
        zoneStartX     = zone.position.x;
        zoneStartY     = zone.position.y;
      });
      zone.element.addEventListener('click', (e) => {
        if (editMode) return;
        e.stopPropagation();
        openZoneActions(zone);
      });
    }

    /* ══════════════════════════════════════════
       PAN / ZOOM
    ══════════════════════════════════════════ */
    function applyTransform() {
      panZoomLayer.style.transform = `translate(${panX}px,${panY}px) scale(${currentZoom})`;
    }
    function updateZoomDisplay() {
      document.getElementById('zoom-display').textContent = `${Math.round(currentZoom * 100)}%`;
    }
    function zoomAt(factor, cx, cy) {
      const nz = Math.min(Math.max(currentZoom * factor, 0.02), 50);
      panX = cx - (cx - panX) * (nz / currentZoom);
      panY = cy - (cy - panY) * (nz / currentZoom);
      currentZoom = nz;
      applyTransform(); updateZoomDisplay();
    }
    function zoomIn()  { const vr=viewport.getBoundingClientRect(); zoomAt(1.25, vr.width/2, vr.height/2); }
    function zoomOut() { const vr=viewport.getBoundingClientRect(); zoomAt(1/1.25, vr.width/2, vr.height/2); }
    function resetView() {
      currentZoom = 1;
      const vr = viewport.getBoundingClientRect();
      panX = (vr.width  - warehouse.offsetWidth)  / 2;
      panY = (vr.height - warehouse.offsetHeight) / 2;
      applyTransform(); updateZoomDisplay();
    }
    window.addEventListener('load', () => {
      warehouseTabCounter = 1;
      warehouses.push({
        id: 1, name: 'Warehouse 1',
        width: 800, height: 500, background: null,
        counters: { isleCounter: 0, subsectionCounter: 0, shelfCounter: 0, itemCounter: 0, zoneCounter: 0 },
        isles: [], zones: [],
      });
      renderTabs();
      resetView();
    });

    // Scroll-wheel zoom centred on cursor
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const vr = viewport.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 1/1.1, e.clientX - vr.left, e.clientY - vr.top);
    }, { passive: false });

    // Middle-mouse pan
    viewport.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        isPanning = true; panLastX = e.clientX; panLastY = e.clientY;
        viewport.classList.add('panning'); e.preventDefault();
      }
    });

    /* ══════════════════════════════════════════
       EDIT WAREHOUSE MODE
    ══════════════════════════════════════════ */
    const HANDLE_EDGES = ['nw','n','ne','e','se','s','sw','w'];

    function edgePositions(x, y, w, h, rotation) {
      const cx = x + w / 2, cy = y + h / 2;
      const angle = ((rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      function rp(lx, ly) {
        return { cx: cx + lx * cos - ly * sin, cy: cy + lx * sin + ly * cos };
      }
      return {
        nw: rp(-w/2, -h/2),  n: rp(0,    -h/2),  ne: rp(w/2,  -h/2),
        e:  rp(w/2,  0),     se: rp(w/2,  h/2),  s:  rp(0,     h/2),
        sw: rp(-w/2, h/2),   w:  rp(-w/2, 0),
        rotate: rp(0, -(h / 2 + 25)),
      };
    }

    function createHandlesForEntity(entity, type) {
      const pos = edgePositions(entity.position.x, entity.position.y,
                                entity.dimensions.width, entity.dimensions.height,
                                entity.rotation || 0);
      for (const edge of [...HANDLE_EDGES, 'rotate']) {
        const el = document.createElement('div');
        el.className    = 'edit-handle';
        el.dataset.edge = edge;
        el.dataset.type = type;
        el.dataset.id   = entity.id;
        el.style.left   = pos[edge].cx + 'px';
        el.style.top    = pos[edge].cy + 'px';
        warehouse.appendChild(el);
      }
    }

    function updateHandlesForEntity(entity, type) {
      const pos = edgePositions(entity.position.x, entity.position.y,
                                entity.dimensions.width, entity.dimensions.height,
                                entity.rotation || 0);
      document.querySelectorAll(`.edit-handle[data-type="${type}"][data-id="${entity.id}"]`)
        .forEach(el => {
          const p = pos[el.dataset.edge];
          if (p) { el.style.left = p.cx + 'px'; el.style.top = p.cy + 'px'; }
        });
    }

    function createEditHandles() {
      removeEditHandles();
      isles.forEach(e => createHandlesForEntity(e, 'isle'));
      zones.forEach(e => createHandlesForEntity(e, 'zone'));
    }

    function removeEditHandles() {
      document.querySelectorAll('.edit-handle').forEach(el => el.remove());
    }

    function activateEditMode() {
      if (editMode) { cancelEditMode(); return; }
      if (drawMode) cancelDrawMode();
      editMode = true;
      warehouseWrapper.classList.add('edit-mode');
      document.getElementById('btn-edit-warehouse').classList.add('active');
      statusEl.innerHTML = 'Drag to move · Blue handles to resize · Click to select · Del to delete.';
      createEditHandles();
    }
    function cancelEditMode() {
      editMode = false;
      isEntityResizing = false; entityResizeTarget = null;
      isleDragMoved = false;
      selectIsle(null);
      selectZone(null);
      warehouseWrapper.classList.remove('edit-mode');
      document.getElementById('btn-edit-warehouse').classList.remove('active');
      document.getElementById('btn-delete-entity').style.display = 'none';
      statusEl.innerHTML = 'Click "Add Isle" then<br>draw inside the warehouse.';
      removeEditHandles();
    }

    function selectIsle(isle) {
      if (selectedIsle && selectedIsle.element) {
        selectedIsle.element.classList.remove('isle-selected');
      }
      selectedIsle = isle;
      if (isle && isle.element) isle.element.classList.add('isle-selected');
      updateDeleteBtn();
    }

    function selectZone(zone) {
      if (selectedZone && selectedZone.element) {
        selectedZone.element.classList.remove('zone-selected');
      }
      selectedZone = zone;
      if (zone && zone.element) zone.element.classList.add('zone-selected');
      updateDeleteBtn();
    }

    function updateDeleteBtn() {
      const btn = document.getElementById('btn-delete-entity');
      if (btn) btn.style.display = (editMode && (selectedIsle || selectedZone)) ? '' : 'none';
    }

    let pendingDeleteEntity = null; // { entity, type }

    function deleteSelectedEntity() {
      if (!editMode) return;
      const entity = selectedIsle || selectedZone;
      const type   = selectedIsle ? 'isle' : selectedZone ? 'zone' : null;
      if (!entity) return;

      pendingDeleteEntity = { entity, type };

      if (type === 'isle') {
        const totalItems = entity.subsections.reduce((n, sub) => n + sub.shelves.reduce((m, sh) => m + sh.items.length, 0), 0);
        document.getElementById('delete-entity-title').textContent = `Delete Isle "${entity.label}"?`;
        document.getElementById('delete-entity-msg').textContent =
          totalItems > 0
            ? `This isle contains ${totalItems} item(s). They will all be permanently removed.`
            : `Isle "${entity.label}" will be permanently removed.`;
      } else {
        const zoneItemCount = entity.items ? entity.items.length : 0;
        document.getElementById('delete-entity-title').textContent = `Delete Zone "${entity.label}"?`;
        document.getElementById('delete-entity-msg').textContent =
          zoneItemCount > 0
            ? `This zone contains ${zoneItemCount} item(s). They will all be permanently removed.`
            : `Zone "${entity.label}" will be permanently removed.`;
      }
      show('modal-delete-entity');
    }

    function confirmDeleteEntity() {
      hide('modal-delete-entity');
      if (!pendingDeleteEntity) return;
      const { entity, type } = pendingDeleteEntity;
      pendingDeleteEntity = null;

      // Remove DOM element and edit handles
      document.querySelectorAll(`.edit-handle[data-type="${type}"][data-id="${entity.id}"]`)
        .forEach(el => el.remove());
      entity.element.remove();

      if (type === 'isle') {
        const idx = isles.indexOf(entity);
        if (idx !== -1) isles.splice(idx, 1);
        if (selectedIsle === entity) selectIsle(null);
        countEl.textContent = `Isles: ${isles.length}`;
        statusEl.textContent = `Isle "${entity.label}" deleted.`;
      } else {
        const idx = zones.indexOf(entity);
        if (idx !== -1) zones.splice(idx, 1);
        if (selectedZone === entity) selectZone(null);
        statusEl.textContent = `Zone "${entity.label}" deleted.`;
      }
    }

    function snapIsleMove(isle, newX, newY) {
      const w = isle.dimensions.width, h = isle.dimensions.height;
      const vEdges = [0, warehouse.clientWidth],  hEdges = [0, warehouse.clientHeight];
      for (const o of isles) {
        if (o.id === isle.id) continue;
        vEdges.push(o.position.x, o.position.x + o.dimensions.width);
        hEdges.push(o.position.y, o.position.y + o.dimensions.height);
      }
      for (const z of zones) {
        vEdges.push(z.position.x, z.position.x + z.dimensions.width);
        hEdges.push(z.position.y, z.position.y + z.dimensions.height);
      }
      let bestX = newX, bestDX = SNAP_THRESHOLD + 1;
      for (const ve of vEdges) {
        const dl = Math.abs(newX     - ve), dr = Math.abs(newX + w - ve);
        if (dl < bestDX) { bestDX = dl; bestX = ve;     }
        if (dr < bestDX) { bestDX = dr; bestX = ve - w; }
      }
      let bestY = newY, bestDY = SNAP_THRESHOLD + 1;
      for (const he of hEdges) {
        const dt = Math.abs(newY     - he), db = Math.abs(newY + h - he);
        if (dt < bestDY) { bestDY = dt; bestY = he;     }
        if (db < bestDY) { bestDY = db; bestY = he - h; }
      }
      return { x: bestX, y: bestY };
    }

    // Attach resize handle events
    document.querySelectorAll('.rh').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();
        isResizing      = true;
        resizeEdge      = handle.dataset.edge;
        resizeStartMX   = e.clientX;
        resizeStartMY   = e.clientY;
        resizeStartW    = warehouse.clientWidth;
        resizeStartH    = warehouse.clientHeight;
        resizeStartPanX = panX;
        resizeStartPanY = panY;
      });
    });

    /* ══════════════════════════════════════════
       DRAW MODE
    ══════════════════════════════════════════ */
    function activateDrawMode() {
      if (drawMode === 'isle') { cancelDrawMode(); return; }
      if (drawMode) cancelDrawMode();
      if (editMode) cancelEditMode();
      drawMode = 'isle';
      warehouse.classList.add('drawing-mode');
      document.getElementById('btn-add-isle').classList.add('active');
      statusEl.textContent = 'Click & drag to draw an isle.';
    }
    function activateZoneMode() {
      if (drawMode === 'zone') { cancelDrawMode(); return; }
      if (drawMode) cancelDrawMode();
      if (editMode) cancelEditMode();
      drawMode = 'zone';
      warehouse.classList.add('drawing-mode');
      document.getElementById('btn-add-zone').classList.add('active');
      statusEl.textContent = 'Click & drag to draw a zone.';
    }
    function cancelDrawMode() {
      drawMode=null; isDrawing=false;
      warehouse.classList.remove('drawing-mode');
      document.getElementById('btn-add-isle').classList.remove('active');
      document.getElementById('btn-add-zone').classList.remove('active');
      preview.style.display='none';
      statusEl.innerHTML='Click "Add Isle" then<br>draw inside the warehouse.';
    }

    // Handle mousedown for entity (isle/zone) resize or rotate in edit mode
    warehouse.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.edit-handle');
      if (!handle || !editMode || e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      const type   = handle.dataset.type;
      const id     = parseInt(handle.dataset.id);
      const entity = type === 'isle' ? isles.find(i => i.id===id) : zones.find(z => z.id===id);
      if (!entity) return;

      if (handle.dataset.edge === 'rotate') {
        // Start rotation
        isRotating         = true;
        rotatingEntity     = entity;
        rotatingEntityType = type;
        rotateStartAngle   = entity.rotation || 0;
        const wRect = warehouse.getBoundingClientRect();
        const bx = parseFloat(getComputedStyle(warehouse).borderLeftWidth) || 0;
        const by = parseFloat(getComputedStyle(warehouse).borderTopWidth)  || 0;
        rotateCenterX = wRect.left + (entity.position.x + entity.dimensions.width  / 2 + bx) * currentZoom;
        rotateCenterY = wRect.top  + (entity.position.y + entity.dimensions.height / 2 + by) * currentZoom;
        rotateStartMouseAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * 180 / Math.PI;
      } else {
        // Start resize
        isEntityResizing       = true;
        entityResizeTarget     = entity;
        entityResizeTargetType = type;
        entityResizeEdge       = handle.dataset.edge;
        entityResizeStartMX    = e.clientX;
        entityResizeStartMY    = e.clientY;
        entityResizeStartX     = entity.position.x;
        entityResizeStartY     = entity.position.y;
        entityResizeStartW     = entity.dimensions.width;
        entityResizeStartH     = entity.dimensions.height;
      }
    });

    warehouse.addEventListener('mousedown', (e) => {
      if (!drawMode || e.button!==0 || e.target.closest('.isle') || e.target.closest('.zone')) return;
      isDrawing=true;
      const p=snapPoint(...Object.values(getRelativePos(e))); startX=p.x; startY=p.y;
      Object.assign(preview.style,{left:`${startX}px`,top:`${startY}px`,width:'0px',height:'0px',display:'block'});
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      // Pan
      if (isPanning) {
        panX += e.clientX - panLastX; panY += e.clientY - panLastY;
        panLastX = e.clientX; panLastY = e.clientY;
        applyTransform();
      }
      // Warehouse resize
      if (isResizing) {
        const dxVP = e.clientX - resizeStartMX;
        const dyVP = e.clientY - resizeStartMY;
        const dxL  = dxVP / currentZoom, dyL = dyVP / currentZoom;
        let newW = resizeStartW, newH = resizeStartH;
        let newPanX = resizeStartPanX, newPanY = resizeStartPanY;
        if (resizeEdge.includes('e')) newW  = Math.max(150, resizeStartW + dxL);
        if (resizeEdge.includes('w')) { newW = Math.max(150, resizeStartW - dxL); newPanX = resizeStartPanX + (resizeStartW - newW) * currentZoom; }
        if (resizeEdge.includes('s')) newH  = Math.max(100, resizeStartH + dyL);
        if (resizeEdge.includes('n')) { newH = Math.max(100, resizeStartH - dyL); newPanY = resizeStartPanY + (resizeStartH - newH) * currentZoom; }
        warehouse.style.width  = newW + 'px';
        warehouse.style.height = newH + 'px';
        panX = newPanX; panY = newPanY;
        applyTransform();
      }
      // Entity (isle/zone) resize
      if (isEntityResizing && entityResizeTarget) {
        const dxL = (e.clientX - entityResizeStartMX) / currentZoom;
        const dyL = (e.clientY - entityResizeStartMY) / currentZoom;
        const MIN = 30;
        let newX = entityResizeStartX, newY = entityResizeStartY;
        let newW = entityResizeStartW, newH = entityResizeStartH;
        const edge = entityResizeEdge;
        if (edge.includes('e')) newW = Math.max(MIN, entityResizeStartW + dxL);
        if (edge.includes('w')) { newW = Math.max(MIN, entityResizeStartW - dxL); newX = entityResizeStartX + entityResizeStartW - newW; }
        if (edge.includes('s')) newH = Math.max(MIN, entityResizeStartH + dyL);
        if (edge.includes('n')) { newH = Math.max(MIN, entityResizeStartH - dyL); newY = entityResizeStartY + entityResizeStartH - newH; }
        // Clamp within warehouse for isles; zones may extend outside
        if (entityResizeTargetType === 'isle') {
          newX = Math.max(0, newX);
          newY = Math.max(0, newY);
          newW = Math.min(newW, warehouse.clientWidth  - newX);
          newH = Math.min(newH, warehouse.clientHeight - newY);
        }
        entityResizeTarget.position.x          = newX;
        entityResizeTarget.position.y          = newY;
        entityResizeTarget.dimensions.width    = newW;
        entityResizeTarget.dimensions.height   = newH;
        const el = entityResizeTarget.element;
        el.style.left = newX+'px'; el.style.top  = newY+'px';
        el.style.width= newW+'px'; el.style.height=newH+'px';
        updateHandlesForEntity(entityResizeTarget, entityResizeTargetType);
      }
      // Entity rotation
      if (isRotating && rotatingEntity) {
        const currentMouseAngle = Math.atan2(e.clientY - rotateCenterY, e.clientX - rotateCenterX) * 180 / Math.PI;
        let newRotation = rotateStartAngle + (currentMouseAngle - rotateStartMouseAngle);
        if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        rotatingEntity.rotation = newRotation;
        rotatingEntity.element.style.transform = `rotate(${newRotation}deg)`;
        updateHandlesForEntity(rotatingEntity, rotatingEntityType);
      }
      // Isle drag
      if (isDraggingIsle && draggingIsle) {
        const dxL = (e.clientX - isleStartMX) / currentZoom;
        const dyL = (e.clientY - isleStartMY) / currentZoom;
        if (Math.abs(dxL) > 2 || Math.abs(dyL) > 2) isleDragMoved = true;
        let newX = clamp(isleStartX + dxL, 0, warehouse.clientWidth  - draggingIsle.dimensions.width);
        let newY = clamp(isleStartY + dyL, 0, warehouse.clientHeight - draggingIsle.dimensions.height);
        const snapped = snapIsleMove(draggingIsle, newX, newY);
        draggingIsle.position.x = snapped.x;
        draggingIsle.position.y = snapped.y;
        draggingIsle.element.style.left = snapped.x + 'px';
        draggingIsle.element.style.top  = snapped.y + 'px';
        if (editMode) updateHandlesForEntity(draggingIsle, 'isle');
      }
      // Zone drag (no warehouse-bounds clamping — zones may be placed outside)
      if (isDraggingZone && draggingZone) {
        const dxL = (e.clientX - zoneStartMX) / currentZoom;
        const dyL = (e.clientY - zoneStartMY) / currentZoom;
        if (Math.abs(dxL) > 2 || Math.abs(dyL) > 2) zoneDragMoved = true;
        let newX = zoneStartX + dxL;
        let newY = zoneStartY + dyL;
        const snapped = snapZoneMove(draggingZone, newX, newY);
        draggingZone.position.x = snapped.x;
        draggingZone.position.y = snapped.y;
        draggingZone.element.style.left = snapped.x + 'px';
        draggingZone.element.style.top  = snapped.y + 'px';
        if (editMode) updateHandlesForEntity(draggingZone, 'zone');
      }
      // Draw preview
      if (!isDrawing) return;
      const raw=getRelativePos(e);
      const p=snapPoint(raw.x,raw.y);
      const x=Math.min(p.x,startX), y=Math.min(p.y,startY);
      Object.assign(preview.style,{left:`${x}px`,top:`${y}px`,width:`${Math.abs(p.x-startX)}px`,height:`${Math.abs(p.y-startY)}px`});
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) { isPanning = false; viewport.classList.remove('panning'); }
      if (isResizing)       { isResizing = false; resizeEdge = null; }
      if (isEntityResizing) { isEntityResizing = false; entityResizeTarget = null; }
      if (isRotating)       { isRotating = false; rotatingEntity = null; }
      if (isDraggingIsle)   { isDraggingIsle = false; draggingIsle = null; }
      if (isDraggingZone)   { isDraggingZone = false; draggingZone = null; }
      if (!isDrawing) return;
      isDrawing=false; preview.style.display='none';
      const raw=getRelativePos(e);
      const p=snapPoint(raw.x,raw.y);
      const x=Math.min(p.x,startX), y=Math.min(p.y,startY);
      const w=Math.abs(p.x-startX), h=Math.abs(p.y-startY);
      if (w<10||h<10) return;
      const mode=drawMode;
      cancelDrawMode();
      if (mode==='zone') beginZoneCreation(x,y,w,h);
      else               beginIsleCreation(x,y,w,h);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { cancelDrawMode(); cancelEditMode(); return; }
      // Don't intercept shortcuts when typing in an input / textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (editMode && selectedIsle) { copySelectedIsle(); e.preventDefault(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (editMode && copiedIsle) { openPasteModal(); e.preventDefault(); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && editMode) {
        if (selectedIsle || selectedZone) { deleteSelectedEntity(); e.preventDefault(); }
      }
    });

    /* ══════════════════════════════════════════
       ISLE CREATION — STEP 1: name + shelves/subsection
    ══════════════════════════════════════════ */
    function beginIsleCreation(x,y,w,h) {
      const color = randomHexColor();
      const id    = ++isleCounter;

      // Draw placeholder isle on canvas
      const el = document.createElement('div');
      el.className='isle';
      Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,borderColor:color});
      el.dataset.isleId=id;
      el.innerHTML=`<div class="isle-header"><span class="isle-label" style="color:${color}">…</span></div>`;
      warehouse.appendChild(el);

      pendingIsle = { id, label:'', row:'', color, shelfColor:'#aaaaaa',
                      fillColor:'#ffffff', fillOpacity:0, labelColor:color, rotation:0,
                      position:{x,y}, dimensions:{width:w,height:h}, element:el,
                      shelfCount:1, shelfLabels:[], subsectionStart:1, subsectionCount:1,
                      facing:'right', subsections:[], createdAt:new Date().toISOString() };

      document.getElementById('isle-row-input').value='';
      document.getElementById('isle-name-input').value='';
      document.getElementById('isle-name-input').style.borderColor='';
      document.getElementById('shelf-count-input').value=1;
      document.getElementById('isle-color-input').value=color;
      document.getElementById('isle-label-color-input').value=color;
      document.getElementById('shelf-color-input').value='#aaaaaa';
      document.getElementById('isle-fill-color').value='#ffffff';
      document.getElementById('isle-fill-opacity').value=0;
      document.getElementById('isle-fill-opacity-label').textContent='0%';
      setFacing('right');
      show('modal-count');
      document.getElementById('isle-name-input').focus();
    }

    function confirmStep1() {
      const nameEl = document.getElementById('isle-name-input');
      const name   = nameEl.value.trim();
      if (!name) { nameEl.style.borderColor='#e53935'; nameEl.focus(); return; }
      nameEl.style.borderColor='';

      const count = Math.min(Math.max(parseInt(document.getElementById('shelf-count-input').value,10)||1,1),26);
      pendingIsle.label      = name;
      pendingIsle.shelfCount = count;
      pendingIsle.facing     = pendingFacing;
      pendingIsle.shelfColor  = document.getElementById('shelf-color-input').value || '#aaaaaa';
      pendingIsle.fillColor   = document.getElementById('isle-fill-color').value || '#ffffff';
      pendingIsle.fillOpacity = parseInt(document.getElementById('isle-fill-opacity').value, 10) || 0;
      pendingIsle.row         = document.getElementById('isle-row-input').value.trim();
      pendingIsle.labelColor  = document.getElementById('isle-label-color-input').value || pendingIsle.color;
      const isleHeader = pendingIsle.element.querySelector('.isle-header');
      if (isleHeader) isleHeader.innerHTML = buildIsleHeaderHtml(pendingIsle.row, name, pendingIsle.labelColor);

      hide('modal-count');
      document.getElementById('subsection-config-title').textContent = `Subsection Setup — ${name}`;
      document.getElementById('subsection-start-input').value=1;
      document.getElementById('subsection-count-input').value=1;
      show('modal-subsections');
      document.getElementById('subsection-count-input').focus();
    }

    function goBackToStep1() { hide('modal-subsections'); show('modal-count'); }

    /* ══════════════════════════════════════════
       ISLE CREATION — STEP 2: subsection config
    ══════════════════════════════════════════ */
    function confirmStep2() {
      const start = Math.max(parseInt(document.getElementById('subsection-start-input').value,10)||1,1);
      const count = Math.max(parseInt(document.getElementById('subsection-count-input').value,10)||1,1);
      pendingIsle.subsectionStart = start;
      pendingIsle.subsectionCount = count;

      hide('modal-subsections');

      // Build shelf label inputs
      const list = document.getElementById('shelf-list');
      list.innerHTML='';
      for (let i=1; i<=pendingIsle.shelfCount; i++) {
        const letter = String.fromCharCode(64+i);
        const row = document.createElement('div');
        row.className='shelf-row';
        row.innerHTML=`<span class="shelf-num">Shelf ${i}</span><input type="text" value="${letter}" />`;
        list.appendChild(row);
      }
      document.getElementById('modal-labels-title').textContent=`Label Shelves — ${pendingIsle.label}`;
      show('modal-labels');
      list.querySelector('input')?.focus();
    }

    function goBackToStep2() { hide('modal-labels'); show('modal-subsections'); }

    function cancelIsleCreation() {
      if (pendingIsle) { pendingIsle.element.remove(); pendingIsle=null; isleCounter--; }
      ['modal-count','modal-subsections','modal-labels'].forEach(hide);
    }

    /* ══════════════════════════════════════════
       ISLE CREATION — STEP 3: finalize
    ══════════════════════════════════════════ */
    function confirmStep3() {
      const shelfLabels = [...document.querySelectorAll('#shelf-list input')]
        .map((inp,idx) => inp.value.trim() || String.fromCharCode(65+idx));
      pendingIsle.shelfLabels = shelfLabels;

      const { subsectionStart, subsectionCount, shelfCount, element:isleEl, id:isleId } = pendingIsle;

      // Build isle body with subsection rects
      const body = document.createElement('div');
      body.className='isle-body';

      const facing     = pendingIsle.facing;
      const shelfColor = pendingIsle.shelfColor || '#aaaaaa';

      for (let s=0; s<subsectionCount; s++) {
        const num   = subsectionStart + s;

        const subEl = document.createElement('div');
        subEl.className = `subsection facing-${facing}`;
        subEl.dataset.subsectionNum = num;

        // Subsection number label
        const subNumEl = document.createElement('div');
        subNumEl.className = 'sub-number';
        subNumEl.textContent = num;
        subEl.appendChild(subNumEl);

        // Shelf slots row with wall indicator
        const shelvesDiv = document.createElement('div');
        shelvesDiv.className = 'sub-shelves';

        const wallEl = document.createElement('div');
        wallEl.className = 'wall-indicator';

        const subId   = ++subsectionCounter;
        const shelves = shelfLabels.map((lbl, j) => ({
          id:           ++shelfCounter,
          isleId,
          subsectionId: subId,
          shelfNumber:  j+1,
          label:        lbl,
          items:        [],
          element:      null,
        }));

        const makeSlot = (shelf) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot';
          slot.textContent = shelf.label;
          slot.style.borderColor = shelfColor;
          shelf.element = slot;
          return slot;
        };

        if (facing === 'left') {
          // Wall on right; shelves reversed so first shelf (A) is rightmost
          [...shelves].reverse().forEach(shelf => shelvesDiv.appendChild(makeSlot(shelf)));
          shelvesDiv.appendChild(wallEl);
        } else {
          // Wall on left; shelves in normal order so first shelf (A) is leftmost
          shelvesDiv.appendChild(wallEl);
          shelves.forEach(shelf => shelvesDiv.appendChild(makeSlot(shelf)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id:subId, isleId, number:num, element:subEl, shelves };
        pendingIsle.subsections.push(subObj);

        // Clicking a subsection rect goes directly to shelf select
        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (drawMode || editMode || isleDragMoved) return;
          activeIsle       = isles.find(i=>i.id===isleId);
          activeSubsection = subObj;
          openShelfSelect(subObj);
        });

        body.appendChild(subEl);
      }

      isleEl.appendChild(body);
      applyIsleFill(isleEl, pendingIsle.fillColor || '#ffffff', pendingIsle.fillOpacity || 0);
      isles.push(pendingIsle);
      attachIsleClickHandler(pendingIsle);

      console.log('Isle created:', pendingIsle);
      countEl.textContent=`Isles: ${isles.length}`;
      statusEl.textContent=`${pendingIsle.label} added. Draw another or press Esc.`;
      pendingIsle=null;
      hide('modal-labels');
    }

    /* Isle click/drag handler */
    function attachIsleClickHandler(isle) {
      isle.element.addEventListener('mousedown', (e) => {
        if (!editMode || e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();
        selectIsle(isle);
        selectZone(null);
        isDraggingIsle = true;
        draggingIsle   = isle;
        isleDragMoved  = false;
        isleStartMX    = e.clientX;
        isleStartMY    = e.clientY;
        isleStartX     = isle.position.x;
        isleStartY     = isle.position.y;
      });
      isle.element.addEventListener('click', () => {
        if (drawMode || editMode || isleDragMoved) return;
        activeIsle = isle;
        if (isle.subsections.length===1) {
          activeSubsection = isle.subsections[0];
          openShelfSelect(activeSubsection);
        } else {
          openSubsectionSelect(isle);
        }
      });
    }

    /* ══════════════════════════════════════════
       SUBSECTION SELECT
    ══════════════════════════════════════════ */
    function openSubsectionSelect(isle) {
      document.getElementById('subsection-select-title').textContent = `${isle.label} — Select a Subsection`;
      const list = document.getElementById('subsection-select-list');
      list.innerHTML='';
      isle.subsections.forEach(sub => {
        const totalItems = sub.shelves.reduce((n,sh)=>n+sh.items.length,0);
        const row = document.createElement('div');
        row.className='select-row';
        row.innerHTML=`<span class="row-name">Subsection ${sub.number}</span>
                       <span class="row-meta">${sub.shelves.length} shelves · ${totalItems} items</span>`;
        row.addEventListener('click', ()=>{ activeSubsection=sub; hide('modal-subsection-select'); openShelfSelect(sub); });
        list.appendChild(row);
      });
      show('modal-subsection-select');
    }

    function backToSubsectionSelect() {
      hide('modal-shelf-select');
      if (activeIsle.subsections.length===1) closeAllModals();
      else openSubsectionSelect(activeIsle);
    }

    /* ══════════════════════════════════════════
       SHELF SELECT
    ══════════════════════════════════════════ */
    function openShelfSelect(sub) {
      document.getElementById('shelf-select-title').textContent =
        `${activeIsle.label} › Sub ${sub.number} — Select a Shelf`;
      const list = document.getElementById('shelf-select-list');
      list.innerHTML='';
      sub.shelves.forEach(shelf => {
        const row = document.createElement('div');
        row.className='select-row';
        row.innerHTML=`<span class="row-name">${shelf.label}</span>
                       <span class="row-meta">${shelf.items.length} item${shelf.items.length!==1?'s':''}</span>`;
        row.addEventListener('click', ()=>selectShelf(shelf));
        list.appendChild(row);
      });
      show('modal-shelf-select');
    }

    function selectShelf(shelf) {
      activeShelf = shelf;
      hide('modal-shelf-select');
      document.getElementById('shelf-actions-title').textContent =
        `${activeIsle.label} › Sub ${activeSubsection.number} › ${shelf.label}`;
      document.getElementById('shelf-actions-subtitle').textContent =
        `${shelf.items.length} item${shelf.items.length!==1?'s':''} on this shelf`;
      show('modal-shelf-actions');
    }

    function backToShelfSelect() { hide('modal-shelf-actions'); openShelfSelect(activeSubsection); }

    /* ══════════════════════════════════════════
       ADD SHELF
    ══════════════════════════════════════════ */
    function openAddShelf() {
      hide('modal-shelf-select');
      document.getElementById('add-shelf-subtitle').textContent =
        `${activeIsle.label} › Sub ${activeSubsection.number}`;
      const inp = document.getElementById('add-shelf-name-input');
      inp.value = ''; inp.style.borderColor = '';
      show('modal-add-shelf');
      inp.focus();
    }

    function backToShelfSelectFromAdd() {
      hide('modal-add-shelf');
      openShelfSelect(activeSubsection);
    }

    function confirmAddShelf() {
      const inp = document.getElementById('add-shelf-name-input');
      const label = inp.value.trim();
      inp.style.borderColor = '';
      if (!label) { inp.style.borderColor = '#e53935'; inp.focus(); return; }

      const shelf = {
        id:           ++shelfCounter,
        isleId:       activeIsle.id,
        subsectionId: activeSubsection.id,
        shelfNumber:  activeSubsection.shelves.length + 1,
        label,
        items:        [],
        element:      null,
      };

      const slot = document.createElement('div');
      slot.className = 'shelf-slot';
      slot.textContent = shelf.label;
      slot.style.borderColor = activeIsle.shelfColor;
      shelf.element = slot;

      // Insert respecting facing: left-facing has wall as last child; others have wall as first child
      const shelvesDiv = activeSubsection.element.querySelector('.sub-shelves');
      if (activeIsle.facing === 'left') {
        shelvesDiv.insertBefore(slot, shelvesDiv.lastElementChild);
      } else {
        shelvesDiv.appendChild(slot);
      }

      activeSubsection.shelves.push(shelf);
      hide('modal-add-shelf');
      openShelfSelect(activeSubsection);
    }

    function deleteShelf() {
      const itemCount = activeShelf.items.length;
      if (itemCount > 0) {
        document.getElementById('confirm-delete-msg').textContent =
          `Shelf "${activeShelf.label}" still has ${itemCount} item(s) on it. Remove all items before deleting.`;
        document.getElementById('modal-confirm-delete')
          .querySelector('.btn-danger').style.display = 'none';
        show('modal-confirm-delete');
        return;
      }
      document.getElementById('confirm-delete-msg').textContent =
        `Permanently delete shelf "${activeShelf.label}"? This cannot be undone.`;
      document.getElementById('modal-confirm-delete')
        .querySelector('.btn-danger').style.display = '';
      show('modal-confirm-delete');
    }

    function confirmDeleteShelf() {
      hide('modal-confirm-delete');
      activeSubsection.shelves = activeSubsection.shelves.filter(s => s.id !== activeShelf.id);
      if (activeShelf.element) activeShelf.element.remove();
      activeShelf = null;
      hide('modal-shelf-actions');
      if (activeSubsection.shelves.length === 0) closeAllModals();
      else openShelfSelect(activeSubsection);
    }

    /* ══════════════════════════════════════════
       ADD ITEM
    ══════════════════════════════════════════ */
    function openAddItem() {
      hide('modal-shelf-actions');
      document.getElementById('add-item-subtitle').textContent =
        `${activeIsle.label} › Sub ${activeSubsection.number} › ${activeShelf.label}`;
      ['item-id-input','item-type-input','item-category-input','item-notes-input']
        .forEach(id=>{ const el=document.getElementById(id); el.value=''; el.style.borderColor=''; });
      show('modal-add-item');
      document.getElementById('item-id-input').focus();
    }

    function backFromAddItem() {
      hide('modal-add-item');
      if (activeZoneForItems) {
        openZoneActions(activeZoneForItems);
      } else {
        hide('modal-remove-items');
        selectedItemIds.clear();
        selectShelf(activeShelf);
      }
    }

    function backToShelfActions() {
      hide('modal-add-item'); hide('modal-remove-items');
      selectedItemIds.clear();
      selectShelf(activeShelf);
    }

    function confirmAddItem() {
      const idEl   = document.getElementById('item-id-input');
      const itemId = idEl.value.trim();
      idEl.style.borderColor='';
      if (!itemId) { idEl.style.borderColor='#e53935'; idEl.focus(); return; }

      if (activeZoneForItems) {
        const item = {
          id:      ++itemCounter,
          itemId,
          type:     document.getElementById('item-type-input').value.trim(),
          category: document.getElementById('item-category-input').value.trim(),
          notes:    document.getElementById('item-notes-input').value.trim(),
          zoneId:  activeZoneForItems.id,
          addedAt: new Date().toISOString(),
        };
        activeZoneForItems.items.push(item);
        hide('modal-add-item');
        openZoneActions(activeZoneForItems);
      } else {
        const item = {
          id:           ++itemCounter,
          itemId,
          type:         document.getElementById('item-type-input').value.trim(),
          category:     document.getElementById('item-category-input').value.trim(),
          notes:        document.getElementById('item-notes-input').value.trim(),
          shelfId:      activeShelf.id,
          subsectionId: activeSubsection.id,
          isleId:       activeIsle.id,
          addedAt:      new Date().toISOString(),
        };
        activeShelf.items.push(item);
        hide('modal-add-item');
        selectShelf(activeShelf);
      }
    }

    /* ══════════════════════════════════════════
       ZONE ITEM MANAGEMENT
    ══════════════════════════════════════════ */
    function openZoneActions(zone) {
      activeZoneForItems = zone;
      document.getElementById('zone-actions-title').textContent = `Zone: ${escHtml(zone.label)}`;
      const n = zone.items.length;
      document.getElementById('zone-actions-subtitle').textContent =
        `${n} item${n !== 1 ? 's' : ''} in this zone`;
      show('modal-zone-actions');
    }

    function openAddZoneItem() {
      hide('modal-zone-actions');
      document.getElementById('add-item-subtitle').textContent =
        `Zone: ${escHtml(activeZoneForItems.label)}`;
      ['item-id-input','item-type-input','item-category-input','item-notes-input']
        .forEach(id => { const el = document.getElementById(id); el.value = ''; el.style.borderColor = ''; });
      show('modal-add-item');
      document.getElementById('item-id-input').focus();
    }

    function backToZoneActions() {
      hide('modal-zone-items');
      selectedZoneItemIds.clear();
      if (activeZoneForItems) openZoneActions(activeZoneForItems);
    }

    function openZoneItemList() {
      hide('modal-zone-actions');
      selectedZoneItemIds.clear();
      renderZoneItemList();
      document.getElementById('zone-items-title').textContent =
        `Zone: ${escHtml(activeZoneForItems.label)}`;
      updateZoneSelectedCount();
      show('modal-zone-items');
    }

    function renderZoneItemList() {
      const list = document.getElementById('zone-item-list');
      list.innerHTML = '';
      if (!activeZoneForItems || activeZoneForItems.items.length === 0) {
        list.innerHTML = '<p class="no-items-msg">No items in this zone.</p>';
        return;
      }
      activeZoneForItems.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row' + (selectedZoneItemIds.has(item.id) ? ' selected' : '');
        row.dataset.itemId = item.id;
        row.innerHTML = `
          <span class="item-id-label">${escHtml(item.itemId)}</span>
          <span class="item-meta">${[item.type, item.category].filter(Boolean).map(escHtml).join(' · ')}</span>
          ${item.notes ? `<span class="item-meta" style="font-style:italic">${escHtml(item.notes)}</span>` : ''}`;
        row.addEventListener('click', (e) => toggleZoneItemSelection(item.id, e.ctrlKey || e.metaKey));
        list.appendChild(row);
      });
    }

    function toggleZoneItemSelection(itemId, multi) {
      if (!multi) {
        if (selectedZoneItemIds.size === 1 && selectedZoneItemIds.has(itemId)) selectedZoneItemIds.clear();
        else { selectedZoneItemIds.clear(); selectedZoneItemIds.add(itemId); }
      } else {
        if (selectedZoneItemIds.has(itemId)) selectedZoneItemIds.delete(itemId);
        else selectedZoneItemIds.add(itemId);
      }
      renderZoneItemList(); updateZoneSelectedCount();
    }

    function updateZoneSelectedCount() {
      const n = selectedZoneItemIds.size;
      document.getElementById('zone-selected-count').textContent = `${n} selected`;
      document.getElementById('btn-zone-remove-confirm').disabled = (n === 0);
    }

    function confirmRemoveZoneItems() {
      if (selectedZoneItemIds.size === 0) return;
      activeZoneForItems.items = activeZoneForItems.items.filter(i => !selectedZoneItemIds.has(i.id));
      selectedZoneItemIds.clear();
      hide('modal-zone-items');
      openZoneActions(activeZoneForItems);
    }

    /* ══════════════════════════════════════════
       REMOVE ITEMS
    ══════════════════════════════════════════ */
    function openRemoveItems() {
      hide('modal-shelf-actions');
      selectedItemIds.clear();
      renderItemList();
      document.getElementById('remove-items-title').textContent =
        `${activeIsle.label} › Sub ${activeSubsection.number} › ${activeShelf.label}`;
      updateSelectedCount();
      show('modal-remove-items');
    }

    function renderItemList() {
      const list = document.getElementById('item-list');
      list.innerHTML='';
      if (activeShelf.items.length===0) {
        list.innerHTML='<p class="no-items-msg">No items on this shelf.</p>'; return;
      }
      activeShelf.items.forEach(item => {
        const row = document.createElement('div');
        row.className='item-row'+(selectedItemIds.has(item.id)?' selected':'');
        row.dataset.itemId=item.id;
        row.innerHTML=`
          <span class="item-id-label">${item.itemId}</span>
          <span class="item-meta">${[item.type,item.category].filter(Boolean).join(' · ')}</span>
          ${item.notes?`<span class="item-meta" style="font-style:italic">${item.notes}</span>`:''}`;
        row.addEventListener('click',(e)=>toggleItemSelection(item.id,e.ctrlKey||e.metaKey));
        list.appendChild(row);
      });
    }

    function toggleItemSelection(itemId, multi) {
      if (!multi) {
        if (selectedItemIds.size===1&&selectedItemIds.has(itemId)) selectedItemIds.clear();
        else { selectedItemIds.clear(); selectedItemIds.add(itemId); }
      } else {
        if (selectedItemIds.has(itemId)) selectedItemIds.delete(itemId);
        else selectedItemIds.add(itemId);
      }
      renderItemList(); updateSelectedCount();
    }

    function updateSelectedCount() {
      const n=selectedItemIds.size;
      document.getElementById('selected-count').textContent=`${n} selected`;
      document.getElementById('btn-remove-confirm').disabled=(n===0);
    }

    function confirmRemoveItems() {
      if (selectedItemIds.size===0) return;
      activeShelf.items=activeShelf.items.filter(i=>!selectedItemIds.has(i.id));
      selectedItemIds.clear();
      hide('modal-remove-items');
      selectShelf(activeShelf);
    }

    /* ══════════════════════════════════════════
       SEARCH
    ══════════════════════════════════════════ */
    function onSearchInput() {
      if (!document.getElementById('search-input').value.trim()) clearSearch();
    }

    function runSearch() {
      const query = document.getElementById('search-input').value.trim();
      if (!query) return;
      clearHighlights();

      const q = query.toLowerCase();
      const matches=[];
      for (const isle of isles)
        for (const sub of isle.subsections)
          for (const shelf of sub.shelves)
            for (const item of shelf.items)
              if (item.itemId.toLowerCase().includes(q))
                matches.push({type:'isle',isle,sub,shelf,item});

      const zoneMatches=[];
      for (const zone of zones)
        for (const item of zone.items)
          if (item.itemId.toLowerCase().includes(q))
            zoneMatches.push({type:'zone',zone,item});

      const resultsEl = document.getElementById('search-results');
      const clearBtn  = document.getElementById('btn-clear');
      resultsEl.innerHTML=''; resultsEl.classList.remove('hidden'); clearBtn.style.display='';

      if (matches.length===0 && zoneMatches.length===0) {
        resultsEl.innerHTML=`<div class="search-result-card not-found">No item found matching "<strong>${escHtml(query)}</strong>"</div>`;
        return;
      }

      // Highlight isle/sub/shelf
      const seenIsles=new Set(), seenSubs=new Set(), seenShelves=new Set();
      matches.forEach(({isle,sub,shelf})=>{
        if (!seenIsles.has(isle.id))   { isle.element.classList.add('isle-highlight');   seenIsles.add(isle.id); }
        if (!seenSubs.has(sub.id))     { sub.element.classList.add('sub-highlight');      seenSubs.add(sub.id); }
        if (shelf.element && !seenShelves.has(shelf.id)) { shelf.element.classList.add('shelf-highlight'); seenShelves.add(shelf.id); }
      });

      // Highlight zones
      const seenZones=new Set();
      zoneMatches.forEach(({zone})=>{
        if (!seenZones.has(zone.id)) { zone.element.classList.add('zone-highlight'); seenZones.add(zone.id); }
      });

      // Render isle result cards
      matches.forEach(({isle,sub,shelf,item})=>{
        const card=document.createElement('div');
        card.className='search-result-card';
        const parts=[
          `<span class="lbl">I:</span>${escHtml(isle.label)}`,
          `<span class="sep">|</span><span class="lbl">SUB:</span>${sub.number}`,
          `<span class="sep">|</span><span class="lbl">SH:</span>${escHtml(shelf.label)}`,
          `<span class="sep">|</span><span class="lbl">ID:</span>${escHtml(item.itemId)}`,
          item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${escHtml(item.type)}`       : '',
          item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${escHtml(item.category)}` : '',
        ].filter(Boolean).join('');
        card.innerHTML=`<div class="result-line">${parts}</div>`;
        card.style.cursor='pointer';
        card.addEventListener('click',()=>isle.element.scrollIntoView({behavior:'smooth',block:'nearest'}));
        resultsEl.appendChild(card);
      });

      // Render zone result cards
      zoneMatches.forEach(({zone,item})=>{
        const card=document.createElement('div');
        card.className='search-result-card';
        card.style.borderLeftColor='#8b5cf6';
        const parts=[
          `<span class="lbl">Z:</span>${escHtml(zone.label)}`,
          `<span class="sep">|</span><span class="lbl">ID:</span>${escHtml(item.itemId)}`,
          item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${escHtml(item.type)}`       : '',
          item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${escHtml(item.category)}` : '',
        ].filter(Boolean).join('');
        card.innerHTML=`<div class="result-line">${parts}</div>`;
        card.style.cursor='pointer';
        card.addEventListener('click',()=>zone.element.scrollIntoView({behavior:'smooth',block:'nearest'}));
        resultsEl.appendChild(card);
      });
    }

    function clearSearch() {
      document.getElementById('search-input').value='';
      document.getElementById('search-results').classList.add('hidden');
      document.getElementById('search-results').innerHTML='';
      document.getElementById('btn-clear').style.display='none';
      clearHighlights();
    }

    function clearHighlights() {
      document.querySelectorAll('.isle-highlight') .forEach(el=>el.classList.remove('isle-highlight'));
      document.querySelectorAll('.sub-highlight')  .forEach(el=>el.classList.remove('sub-highlight'));
      document.querySelectorAll('.shelf-highlight').forEach(el=>el.classList.remove('shelf-highlight'));
      document.querySelectorAll('.zone-highlight') .forEach(el=>el.classList.remove('zone-highlight'));
    }

    /* ══════════════════════════════════════════
       COPY / PASTE ISLE
    ══════════════════════════════════════════ */
    function copySelectedIsle() {
      if (!selectedIsle) return;
      // Snapshot all data needed to reconstruct — items excluded intentionally
      copiedIsle = {
        row:             selectedIsle.row || '',
        color:           selectedIsle.color,
        shelfColor:      selectedIsle.shelfColor,
        fillColor:       selectedIsle.fillColor   || '#ffffff',
        fillOpacity:     selectedIsle.fillOpacity != null ? selectedIsle.fillOpacity : 0,
        labelColor:      selectedIsle.labelColor  || selectedIsle.color,
        rotation:        selectedIsle.rotation    || 0,
        facing:          selectedIsle.facing,
        dimensions:      { ...selectedIsle.dimensions },
        shelfLabels:     [...selectedIsle.shelfLabels],
        subsectionStart: selectedIsle.subsectionStart,
        subsectionCount: selectedIsle.subsectionCount,
        position:        { ...selectedIsle.position },
        subsections:     selectedIsle.subsections.map(sub => ({
          number: sub.number,
          shelves: sub.shelves.map(sh => ({
            shelfNumber: sh.shelfNumber,
            label:       sh.label,
          })),
        })),
        sourceLabel: selectedIsle.label,
      };
      statusEl.textContent = `Copied "${selectedIsle.label}". Press Ctrl+V to paste.`;
    }

    function openPasteModal() {
      if (!copiedIsle) return;
      const inp = document.getElementById('paste-isle-name');
      inp.value = copiedIsle.sourceLabel + ' (copy)';
      inp.style.borderColor = '';
      document.getElementById('paste-isle-subtitle').textContent =
        `Copying "${copiedIsle.sourceLabel}" — structure, colors, and facing. Items will not be copied.`;
      show('modal-paste-isle');
      inp.focus(); inp.select();
    }

    function cancelPaste() { hide('modal-paste-isle'); }

    function pasteIsle() {
      const nameEl = document.getElementById('paste-isle-name');
      const name   = nameEl.value.trim();
      if (!name) { nameEl.style.borderColor = '#e53935'; nameEl.focus(); return; }
      nameEl.style.borderColor = '';

      const src = copiedIsle;
      const id  = ++isleCounter;
      const x   = Math.min(src.position.x + 30, Math.max(0, warehouse.clientWidth  - src.dimensions.width));
      const y   = Math.min(src.position.y + 30, Math.max(0, warehouse.clientHeight - src.dimensions.height));

      const el = document.createElement('div');
      el.className = 'isle';
      Object.assign(el.style, {
        left: `${x}px`, top: `${y}px`,
        width: `${src.dimensions.width}px`, height: `${src.dimensions.height}px`,
        borderColor: src.color,
        transform: `rotate(${src.rotation}deg)`,
      });
      el.dataset.isleId = id;
      el.innerHTML = `<div class="isle-header">${buildIsleHeaderHtml(src.row || '', name, src.labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'isle-body';

      const isle = {
        id, label: name, row: src.row || '',
        color: src.color, shelfColor: src.shelfColor,
        fillColor: src.fillColor, fillOpacity: src.fillOpacity,
        labelColor: src.labelColor, rotation: src.rotation,
        facing: src.facing,
        position: { x, y }, dimensions: { ...src.dimensions },
        element: el,
        shelfCount: src.shelfLabels.length, shelfLabels: [...src.shelfLabels],
        subsectionStart: src.subsectionStart, subsectionCount: src.subsectionCount,
        subsections: [], createdAt: new Date().toISOString(),
      };

      src.subsections.forEach(srcSub => {
        const subId  = ++subsectionCounter;
        const subEl  = document.createElement('div');
        subEl.className = `subsection facing-${src.facing}`;
        subEl.dataset.subsectionNum = srcSub.number;

        const subNumEl = document.createElement('div');
        subNumEl.className = 'sub-number';
        subNumEl.textContent = srcSub.number;
        subEl.appendChild(subNumEl);

        const shelvesDiv = document.createElement('div');
        shelvesDiv.className = 'sub-shelves';
        const wallEl = document.createElement('div');
        wallEl.className = 'wall-indicator';

        const shelves = srcSub.shelves.map(srcSh => ({
          id: ++shelfCounter, isleId: id, subsectionId: subId,
          shelfNumber: srcSh.shelfNumber, label: srcSh.label,
          items: [], element: null,
        }));

        const makeSlot = (shelf) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot';
          slot.textContent = shelf.label;
          slot.style.borderColor = src.shelfColor;
          shelf.element = slot;
          return slot;
        };

        if (src.facing === 'left') {
          [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
          shelvesDiv.appendChild(wallEl);
        } else {
          shelvesDiv.appendChild(wallEl);
          shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: subId, isleId: id, number: srcSub.number, element: subEl, shelves };
        isle.subsections.push(subObj);

        subEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (drawMode || editMode || isleDragMoved) return;
          activeIsle       = isles.find(i => i.id === id);
          activeSubsection = subObj;
          openShelfSelect(subObj);
        });

        body.appendChild(subEl);
      });

      el.appendChild(body);
      applyIsleFill(el, src.fillColor, src.fillOpacity);
      warehouse.appendChild(el);
      isles.push(isle);
      attachIsleClickHandler(isle);
      if (editMode) createHandlesForEntity(isle, 'isle');

      countEl.textContent = `Isles: ${isles.length}`;
      statusEl.textContent = `Isle "${name}" pasted.`;
      hide('modal-paste-isle');
    }

    /* ══════════════════════════════════════════
       BACKGROUND IMAGE
    ══════════════════════════════════════════ */
    let warehouseBg = null; // base64 data URL or null

    function setWarehouseBackground(dataUrl) {
      warehouseBg = dataUrl;
      Object.assign(warehouse.style, {
        backgroundImage:    `url(${dataUrl})`,
        backgroundSize:     'cover',
        backgroundPosition: 'center',
        backgroundRepeat:   'no-repeat',
      });
      document.getElementById('btn-clear-bg').style.display = '';
      statusEl.textContent = 'Background image set.';
    }

    function clearBackground() {
      warehouseBg = null;
      warehouse.style.backgroundImage = '';
      document.getElementById('btn-clear-bg').style.display = 'none';
      statusEl.textContent = 'Background cleared.';
    }

    /* ══════════════════════════════════════════
       MULTI-WAREHOUSE MANAGEMENT
    ══════════════════════════════════════════ */
    function serializeCurrentWarehouse() {
      const wh = warehouses[activeWarehouseIdx];
      if (!wh) return;
      wh.width      = parseFloat(warehouse.style.width)  || warehouse.clientWidth;
      wh.height     = parseFloat(warehouse.style.height) || warehouse.clientHeight;
      wh.background = warehouseBg;
      wh.counters   = { isleCounter, subsectionCounter, shelfCounter, itemCounter, zoneCounter };
      wh.isles = isles.map(isle => ({
        id: isle.id, label: isle.label, row: isle.row || '', color: isle.color, shelfColor: isle.shelfColor,
        fillColor: isle.fillColor || '#ffffff',
        fillOpacity: isle.fillOpacity != null ? isle.fillOpacity : 0,
        labelColor: isle.labelColor || isle.color,
        rotation: isle.rotation || 0,
        facing: isle.facing,
        position: { ...isle.position }, dimensions: { ...isle.dimensions },
        shelfCount: isle.shelfCount, shelfLabels: [...isle.shelfLabels],
        subsectionStart: isle.subsectionStart, subsectionCount: isle.subsectionCount,
        createdAt: isle.createdAt,
        subsections: isle.subsections.map(sub => ({
          id: sub.id, number: sub.number,
          shelves: sub.shelves.map(shelf => ({
            id: shelf.id, shelfNumber: shelf.shelfNumber, label: shelf.label,
            items: shelf.items.map(item => ({ ...item })),
          })),
        })),
      }));
      wh.zones = zones.map(zone => ({
        id: zone.id, label: zone.label, color: zone.color,
        fillOpacity: zone.fillOpacity != null ? zone.fillOpacity : 18,
        labelColor: zone.labelColor || '#444444',
        rotation: zone.rotation || 0,
        position: { ...zone.position }, dimensions: { ...zone.dimensions },
        items: (zone.items || []).map(item => ({ ...item })),
        createdAt: zone.createdAt,
      }));
    }

    function loadWarehouseDOM(wh) {
      importLayout({
        warehouse: { width: wh.width || 800, height: wh.height || 500, background: wh.background || null },
        counters:  wh.counters || {},
        isles:     wh.isles   || [],
        zones:     wh.zones   || [],
      });
      statusEl.textContent = `${escHtml(wh.name)} — ${isles.length} isle(s), ${zones.length} zone(s).`;
    }

    function switchToWarehouse(idx) {
      if (idx === activeWarehouseIdx) return;
      serializeCurrentWarehouse();
      activeWarehouseIdx = idx;
      loadWarehouseDOM(warehouses[idx]);
      renderTabs();
    }

    function addWarehouse() {
      serializeCurrentWarehouse();
      const id = ++warehouseTabCounter;
      warehouses.push({
        id, name: `Warehouse ${warehouses.length + 1}`,
        width: 800, height: 500, background: null,
        counters: { isleCounter: 0, subsectionCounter: 0, shelfCounter: 0, itemCounter: 0, zoneCounter: 0 },
        isles: [], zones: [],
      });
      activeWarehouseIdx = warehouses.length - 1;
      loadWarehouseDOM(warehouses[activeWarehouseIdx]);
      renderTabs();
    }

    function removeWarehouse(idx) {
      if (warehouses.length <= 1) return;
      serializeCurrentWarehouse();
      warehouses.splice(idx, 1);
      if (idx < activeWarehouseIdx) {
        activeWarehouseIdx--;
        renderTabs();
      } else if (idx === activeWarehouseIdx) {
        activeWarehouseIdx = Math.min(idx, warehouses.length - 1);
        loadWarehouseDOM(warehouses[activeWarehouseIdx]);
        renderTabs();
      } else {
        renderTabs();
      }
    }

    function renderTabs() {
      const bar = document.getElementById('tab-bar');
      bar.innerHTML = '';
      warehouses.forEach((wh, idx) => {
        const tab = document.createElement('div');
        tab.className = 'tab' + (idx === activeWarehouseIdx ? ' active' : '');
        tab.title = 'Double-click to rename';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = wh.name;
        tab.appendChild(nameSpan);

        if (warehouses.length > 1) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'tab-close';
          closeBtn.innerHTML = '&#x2715;';
          closeBtn.title = 'Close this warehouse';
          closeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeWarehouse(idx); });
          tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', () => { if (idx !== activeWarehouseIdx) switchToWarehouse(idx); });
        tab.addEventListener('dblclick', (e) => { e.stopPropagation(); renameWarehouseStart(idx, tab, nameSpan); });
        bar.appendChild(tab);
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'btn-add-tab';
      addBtn.title = 'Add new warehouse';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', addWarehouse);
      bar.appendChild(addBtn);
    }

    function renameWarehouseStart(idx, tab, nameSpan) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tab-name-input';
      input.value = warehouses[idx].name;
      tab.replaceChild(input, nameSpan);
      input.focus(); input.select();

      const commit = () => {
        const newName = input.value.trim() || warehouses[idx].name;
        warehouses[idx].name = newName;
        renderTabs();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.removeEventListener('blur', commit); renderTabs(); }
      });
    }

    // Drag-and-drop an image onto the viewport to set warehouse background
    viewport.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      warehouse.classList.add('drag-over');
    });
    viewport.addEventListener('dragleave', (e) => {
      if (!viewport.contains(e.relatedTarget)) warehouse.classList.remove('drag-over');
    });
    viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      warehouse.classList.remove('drag-over');
      const file = [...e.dataTransfer.files].find(f => /^image\/(png|jpeg)$/.test(f.type));
      if (!file) { statusEl.textContent = 'Only PNG or JPG images are supported.'; return; }
      const reader = new FileReader();
      reader.onload = (ev) => setWarehouseBackground(ev.target.result);
      reader.readAsDataURL(file);
    });
    // Prevent browser navigation when files are dropped outside the viewport
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop',     (e) => e.preventDefault());

    /* ══════════════════════════════════════════
       EXPORT / IMPORT
    ══════════════════════════════════════════ */
    function exportLayout() {
      serializeCurrentWarehouse();
      const data = {
        version:            2,
        exportedAt:         new Date().toISOString(),
        activeWarehouseIdx: activeWarehouseIdx,
        warehouses:         warehouses.map(wh => ({ ...wh })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `warehouse-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusEl.textContent = 'Layout saved.';
    }

    let pendingImportData = null;

    function triggerImport() {
      document.getElementById('import-file-input').click();
    }

    function handleImportFile(input) {
      const file = input.files[0];
      if (!file) return;
      input.value = '';
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.version === 2 && Array.isArray(data.warehouses)) {
            // v2: multi-warehouse format
            pendingImportData = data;
          } else if (data.warehouse && Array.isArray(data.isles)) {
            // v1: single warehouse — wrap into v2 structure
            pendingImportData = {
              version: 2,
              activeWarehouseIdx: 0,
              warehouses: [{
                id: 1, name: 'Warehouse 1',
                width:      data.warehouse.width      || 800,
                height:     data.warehouse.height     || 500,
                background: data.warehouse.background || null,
                counters:   data.counters             || {},
                isles:      data.isles                || [],
                zones:      data.zones                || [],
              }],
            };
          } else {
            throw new Error('Invalid layout file.');
          }
          const isEmpty = warehouses.length === 1 && isles.length === 0 && zones.length === 0;
          if (isEmpty) confirmImport();
          else show('modal-confirm-import');
        } catch (err) {
          statusEl.textContent = `Import failed: ${err.message}`;
        }
      };
      reader.readAsText(file);
    }

    function confirmImport() {
      hide('modal-confirm-import');
      if (!pendingImportData) return;
      importAllWarehouses(pendingImportData);
      pendingImportData = null;
    }

    function importAllWarehouses(data) {
      // data is always v2 format at this point
      warehouses.length = 0;
      warehouseTabCounter = 0;
      (data.warehouses || []).forEach(wh => {
        const id = wh.id || ++warehouseTabCounter;
        if (id > warehouseTabCounter) warehouseTabCounter = id;
        warehouses.push({
          id,
          name:       wh.name       || `Warehouse ${warehouses.length + 1}`,
          width:      wh.width      || 800,
          height:     wh.height     || 500,
          background: wh.background || null,
          counters:   wh.counters   || {},
          isles:      wh.isles      || [],
          zones:      wh.zones      || [],
        });
      });
      if (warehouses.length === 0) {
        warehouses.push({ id: ++warehouseTabCounter, name: 'Warehouse 1',
          width: 800, height: 500, background: null,
          counters: {}, isles: [], zones: [] });
      }
      activeWarehouseIdx = Math.min(data.activeWarehouseIdx || 0, warehouses.length - 1);
      loadWarehouseDOM(warehouses[activeWarehouseIdx]);
      renderTabs();
    }

    function rebuildIsleFromData(isleData) {
      const { id, label, color, shelfColor, facing, position, dimensions,
              shelfLabels, subsectionStart, subsectionCount, createdAt } = isleData;
      const row         = isleData.row         || '';
      const sc          = shelfColor || '#aaaaaa';
      const fillColor   = isleData.fillColor   || '#ffffff';
      const fillOpacity = isleData.fillOpacity != null ? isleData.fillOpacity : 0;
      const labelColor  = isleData.labelColor  || color;
      const rotation    = isleData.rotation    || 0;

      const el = document.createElement('div');
      el.className = 'isle';
      Object.assign(el.style, {
        left: `${position.x}px`, top: `${position.y}px`,
        width: `${dimensions.width}px`, height: `${dimensions.height}px`,
        borderColor: color,
        transform: `rotate(${rotation}deg)`,
      });
      el.dataset.isleId = id;
      el.innerHTML = `<div class="isle-header">${buildIsleHeaderHtml(row, label, labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'isle-body';

      const isle = {
        id, label, row, color, shelfColor: sc, fillColor, fillOpacity, labelColor, rotation, facing,
        position: { ...position }, dimensions: { ...dimensions },
        element: el, shelfCount: shelfLabels.length, shelfLabels: [...shelfLabels],
        subsectionStart, subsectionCount, subsections: [], createdAt,
      };

      (isleData.subsections || []).forEach(subData => {
        const subEl = document.createElement('div');
        subEl.className = `subsection facing-${facing}`;
        subEl.dataset.subsectionNum = subData.number;

        const subNumEl = document.createElement('div');
        subNumEl.className = 'sub-number';
        subNumEl.textContent = subData.number;
        subEl.appendChild(subNumEl);

        const shelvesDiv = document.createElement('div');
        shelvesDiv.className = 'sub-shelves';

        const wallEl = document.createElement('div');
        wallEl.className = 'wall-indicator';

        const shelves = (subData.shelves || []).map(shelfData => ({
          id:           shelfData.id,
          isleId:       id,
          subsectionId: subData.id,
          shelfNumber:  shelfData.shelfNumber,
          label:        shelfData.label,
          items:        (shelfData.items || []).map(item => ({ ...item })),
          element:      null,
        }));

        const makeSlot = (shelf) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot';
          slot.textContent = shelf.label;
          slot.style.borderColor = sc;
          shelf.element = slot;
          return slot;
        };

        if (facing === 'left') {
          [...shelves].reverse().forEach(shelf => shelvesDiv.appendChild(makeSlot(shelf)));
          shelvesDiv.appendChild(wallEl);
        } else {
          shelvesDiv.appendChild(wallEl);
          shelves.forEach(shelf => shelvesDiv.appendChild(makeSlot(shelf)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: subData.id, isleId: id, number: subData.number, element: subEl, shelves };
        isle.subsections.push(subObj);

        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (drawMode || editMode || isleDragMoved) return;
          activeIsle       = isles.find(i => i.id === id);
          activeSubsection = subObj;
          openShelfSelect(subObj);
        });

        body.appendChild(subEl);
      });

      el.appendChild(body);
      applyIsleFill(el, fillColor, fillOpacity);
      warehouse.appendChild(el);
      isles.push(isle);
      attachIsleClickHandler(isle);
    }

    function rebuildZoneFromData(zoneData) {
      const { id, label, color, position, dimensions, createdAt } = zoneData;
      const fillOpacity = zoneData.fillOpacity != null ? zoneData.fillOpacity : 18;
      const labelColor  = zoneData.labelColor  || '#444444';
      const rotation    = zoneData.rotation    || 0;
      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, {
        left: `${position.x}px`, top: `${position.y}px`,
        width: `${dimensions.width}px`, height: `${dimensions.height}px`,
        borderColor: color,
        transform: `rotate(${rotation}deg)`,
      });
      applyZoneFill(el, color, fillOpacity);
      el.dataset.zoneId = id;
      const labelEl = document.createElement('div');
      labelEl.className = 'zone-label';
      labelEl.textContent = label;
      labelEl.style.color = labelColor;
      el.appendChild(labelEl);
      warehouse.appendChild(el);
      const items = (zoneData.items || []).map(item => ({ ...item }));
      const zone = { id, label, color, fillOpacity, labelColor, rotation,
                     position: { ...position }, dimensions: { ...dimensions },
                     items, element: el, createdAt };
      zones.push(zone);
      attachZoneHandlers(zone);
    }

    function importLayout(data) {
      if (drawMode) cancelDrawMode();
      if (editMode) cancelEditMode();
      closeAllModals();

      isles.forEach(isle => isle.element.remove());
      isles.length = 0;
      zones.forEach(zone => zone.element.remove());
      zones.length = 0;
      removeEditHandles();

      warehouse.style.width  = data.warehouse.width  + 'px';
      warehouse.style.height = data.warehouse.height + 'px';

      if (data.warehouse.background) {
        setWarehouseBackground(data.warehouse.background);
      } else {
        clearBackground();
      }

      const c = data.counters || {};
      isleCounter       = c.isleCounter       || 0;
      subsectionCounter = c.subsectionCounter || 0;
      shelfCounter      = c.shelfCounter      || 0;
      itemCounter       = c.itemCounter       || 0;
      zoneCounter       = c.zoneCounter       || 0;

      (data.isles || []).forEach(rebuildIsleFromData);
      (data.zones || []).forEach(rebuildZoneFromData);

      countEl.textContent = `Isles: ${isles.length}`;
      statusEl.textContent = `Loaded: ${isles.length} isle(s), ${zones.length} zone(s).`;
      resetView();
    }

    window.isles = isles;