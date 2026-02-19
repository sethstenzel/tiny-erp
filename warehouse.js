const { createApp } = Vue;

createApp({
  /* ══════════════════════════════════════════
     REACTIVE STATE
  ══════════════════════════════════════════ */
  data() {
    return {
      // Modal visibility
      m_count:     false,
      m_subs:      false,
      m_labels:    false,
      m_subSel:    false,
      m_shelfSel:  false,
      m_addShelf:  false,
      m_shelfAct:  false,
      m_addItem:   false,
      m_rmItems:   false,
      m_confDel:   false,
      m_zone:      false,
      m_pasteIsle: false,
      m_delEnt:    false,
      m_zoneAct:   false,
      m_zoneItems: false,

      // Form: Isle step 1
      f_isleRow:        '',
      f_isleName:       '',
      f_shelfCount:     1,
      f_isleColor:      '#4285f4',
      f_isleLabelColor: '#4285f4',
      f_shelfColor:     '#aaaaaa',
      f_isleFillColor:  '#ffffff',
      f_isleFillOpacity: 0,
      f_isleFacing:     'right',

      // Form: Isle step 2
      f_subStart: 1,
      f_subCount: 1,

      // Form: Isle step 3 – shelf labels
      f_shelfLabelsList: [], // [{label:'A'}, ...]

      // Form: Zone
      f_zoneLabel:      '',
      f_zoneColor:      '#ff0000',
      f_zoneNameColor:  '#444444',
      f_zoneFillOpacity: 18,

      // Form: misc
      f_addShelfName:  '',
      f_itemId:        '',
      f_itemType:      '',
      f_itemCategory:  '',
      f_itemNotes:     '',
      f_itemTags:      '',
      f_itemUrl:       '',
      f_pasteIsleName: '',

      // Validation error flags
      isleNameError:     false,
      addShelfNameError: false,
      itemIdError:       false,
      zoneLabelError:    false,
      pasteIsleNameError: false,

      // Modal content (dynamic)
      mc_subConfigTitle: 'Subsection Setup',
      mc_labelsTitle:    'Label Shelves',
      mc_subSelTitle:    'Select a Subsection',
      mc_subSelList:     [],
      mc_shelfSelTitle:  'Select a Shelf',
      mc_shelfSelList:   [],
      mc_shelfActTitle:  'Shelf Actions',
      mc_shelfActSub:    '',
      mc_addShelfSub:    '',
      mc_addItemSub:     '',
      mc_rmItemsTitle:   'Remove Items',
      mc_itemList:       [],
      mc_selItemIds:     [],
      mc_selCount:       0,
      mc_confDelMsg:     '',
      mc_showDelBtn:     true,
      mc_delEntTitle:    'Delete?',
      mc_delEntMsg:      '',
      mc_zoneActTitle:   'Zone',
      mc_zoneActSub:     '',
      mc_zoneItemsTitle: 'Zone Items',
      mc_zoneItemList:   [],
      mc_selZoneItemIds: [],
      mc_zoneSelCount:   0,
      mc_pasteIsleSub:   '',

      // Search
      searchQuery:      '',
      searchResults:    [],
      showSearchResults: false,

      // Status / info
      statusText:    'Click "Add Isle" then draw inside the warehouse.',
      isleCountText: 'Isles: 0',
      zoomText:      '100%',

      // Tabs
      tabs:         [],
      activeTabIdx: 0,
      renamingTabIdx: -1,

      // UI flags
      editActive:    false,
      addIsleActive: false,
      addZoneActive: false,
      showDelEntBtn: false,
      hasBg:         false,
      menuCollapsed: false,

      // Auth
      userData: { username: '', role: '' },
    };
  },

  /* ══════════════════════════════════════════
     COMPUTED
  ══════════════════════════════════════════ */
  computed: {
    isAdmin() { return this.userData.role === 'admin'; },
  },

  /* ══════════════════════════════════════════
     WATCHERS – live-update pending isle/zone when color pickers change
  ══════════════════════════════════════════ */
  watch: {
    f_isleColor(v) {
      if (!this._pi) return;
      this._pi.color = v;
      this._pi.element.style.borderColor = v;
    },
    f_isleLabelColor(v) {
      if (!this._pi) return;
      this._pi.labelColor = v;
      const lbl = this._pi.element.querySelector('.isle-label');
      if (lbl) lbl.style.color = v;
    },
    f_isleFillColor()   { this._applyPendingIsleFill(); },
    f_isleFillOpacity() { this._applyPendingIsleFill(); },
    f_zoneColor(v) {
      if (!this._pz) return;
      this._pz.color = v;
      this._pz.element.style.borderColor = v;
      this._applyZoneFill(this._pz.element, v, this.f_zoneFillOpacity);
    },
    f_zoneNameColor(v) {
      if (!this._pz) return;
      this._pz.labelColor = v;
      const lbl = this._pz.element.querySelector('.zone-label');
      if (lbl) lbl.style.color = v;
    },
    f_zoneFillOpacity(v) {
      if (!this._pz) return;
      this._pz.fillOpacity = v;
      this._applyZoneFill(this._pz.element, this._pz.color, v);
    },
  },

  /* ══════════════════════════════════════════
     LIFECYCLE
  ══════════════════════════════════════════ */
  async mounted() {
    await this._checkAuth();
    this._initNonReactive();
    this._initDOMRefs();
    this._initEventListeners();
    this._loadFromDB();
  },

  /* ══════════════════════════════════════════
     METHODS
  ══════════════════════════════════════════ */
  methods: {

    // ── Initialisation ──────────────────────────────────────────────────────

    _initNonReactive() {
      // All non-reactive state lives as instance vars with _ prefix
      this._isles = [];
      this._zones = [];
      this._isleCounter       = 0;
      this._subsectionCounter = 0;
      this._shelfCounter      = 0;
      this._itemCounter       = 0;
      this._zoneCounter       = 0;

      this._warehouses        = [];
      this._activeWhIdx       = 0;
      this._whTabCounter      = 0;

      // Drawing
      this._drawMode  = null;
      this._isDrawing = false;
      this._startX = 0; this._startY = 0;

      // Pan / zoom
      this._currentZoom = 1;
      this._panX = 0; this._panY = 0;
      this._isPanning = false;
      this._panLastX  = 0; this._panLastY = 0;

      // Warehouse resize
      this._isResizing      = false; this._resizeEdge = null;
      this._resizeStartMX   = 0; this._resizeStartMY = 0;
      this._resizeStartW    = 0; this._resizeStartH  = 0;
      this._resizeStartPanX = 0; this._resizeStartPanY = 0;

      // Entity resize
      this._isEntResize      = false;
      this._entResizeTarget  = null; this._entResizeType = null;
      this._entResizeEdge    = null;
      this._entResizeSMX = 0; this._entResizeSMY = 0;
      this._entResizeSX  = 0; this._entResizeSY  = 0;
      this._entResizeSW  = 0; this._entResizeSH  = 0;

      // Entity rotation
      this._isRotating     = false;
      this._rotEntity      = null; this._rotEntityType = null;
      this._rotStartAngle  = 0;
      this._rotCX = 0; this._rotCY = 0;
      this._rotStartMouseAngle = 0;

      // Isle drag
      this._isDragIsle   = false; this._dragIsle = null;
      this._isleSMX = 0; this._isleSMY = 0;
      this._isleSX  = 0; this._isleSY  = 0;
      this._isleDragMoved = false;

      // Zone drag
      this._isDragZone   = false; this._dragZone = null;
      this._zoneDragMoved = false;
      this._zoneSMX = 0; this._zoneSMY = 0;
      this._zoneSX  = 0; this._zoneSY  = 0;

      // Active selections
      this._pi   = null;  // pending isle
      this._pz   = null;  // pending zone
      this._ai   = null;  // active isle
      this._asub = null;  // active subsection
      this._ash  = null;  // active shelf
      this._azfi = null;  // active zone for items
      this._selIsle   = null;
      this._selZone   = null;
      this._copiedIsle = null;
      this._pendDelEnt = null;

      this._selItemIds     = new Set();
      this._selZoneItemIds = new Set();
      this._warehouseBg    = null;

      this._SNAP = 12;
      this._EDGES = ['nw','n','ne','e','se','s','sw','w'];
    },

    _initDOMRefs() {
      this._vp  = this.$refs.viewport;
      this._pzl = this.$refs.panZoomLayer;
      this._ww  = this.$refs.warehouseWrapper;
      this._wh  = this.$refs.warehouse;
      this._prev = this.$refs.drawPreview;
    },

    _initEventListeners() {
      // Scroll-wheel zoom
      this._vp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const vr = this._vp.getBoundingClientRect();
        this._zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - vr.left, e.clientY - vr.top);
      }, { passive: false });

      // Middle-mouse pan start
      this._vp.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
          this._isPanning = true; this._panLastX = e.clientX; this._panLastY = e.clientY;
          this._vp.classList.add('panning'); e.preventDefault();
        }
      });

      // Warehouse: edit-handle and draw-mode mousedown
      this._wh.addEventListener('mousedown', (e) => {
        // Edit handle
        const handle = e.target.closest('.edit-handle');
        if (handle && this._editMode && e.button === 0) {
          e.stopPropagation(); e.preventDefault();
          const type   = handle.dataset.type;
          const id     = parseInt(handle.dataset.id);
          const entity = type === 'isle' ? this._isles.find(i => i.id === id) : this._zones.find(z => z.id === id);
          if (!entity) return;
          if (handle.dataset.edge === 'rotate') {
            this._isRotating = true;
            this._rotEntity = entity; this._rotEntityType = type;
            this._rotStartAngle = entity.rotation || 0;
            const wr = this._wh.getBoundingClientRect();
            const bx = parseFloat(getComputedStyle(this._wh).borderLeftWidth) || 0;
            const by = parseFloat(getComputedStyle(this._wh).borderTopWidth)  || 0;
            this._rotCX = wr.left + (entity.position.x + entity.dimensions.width  / 2 + bx) * this._currentZoom;
            this._rotCY = wr.top  + (entity.position.y + entity.dimensions.height / 2 + by) * this._currentZoom;
            this._rotStartMouseAngle = Math.atan2(e.clientY - this._rotCY, e.clientX - this._rotCX) * 180 / Math.PI;
          } else {
            this._isEntResize = true;
            this._entResizeTarget = entity; this._entResizeType = type;
            this._entResizeEdge   = handle.dataset.edge;
            this._entResizeSMX = e.clientX; this._entResizeSMY = e.clientY;
            this._entResizeSX  = entity.position.x;    this._entResizeSY  = entity.position.y;
            this._entResizeSW  = entity.dimensions.width; this._entResizeSH = entity.dimensions.height;
          }
          return;
        }
        // Draw mode
        if (!this._drawMode || e.button !== 0 || e.target.closest('.isle') || e.target.closest('.zone')) return;
        this._isDrawing = true;
        const p = this._snapPt(...Object.values(this._relPos(e)));
        this._startX = p.x; this._startY = p.y;
        Object.assign(this._prev.style, { left:`${p.x}px`, top:`${p.y}px`, width:'0', height:'0', display:'block' });
        e.preventDefault();
      });

      // Global mousemove
      window.addEventListener('mousemove', (e) => { this._onMouseMove(e); });

      // Global mouseup
      window.addEventListener('mouseup', (e) => { this._onMouseUp(e); });

      // Keyboard
      document.addEventListener('keydown', (e) => { this._onKeyDown(e); });

      // Drag-and-drop background image
      this._vp.addEventListener('dragover', (e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault(); this._wh.classList.add('drag-over');
      });
      this._vp.addEventListener('dragleave', (e) => {
        if (!this._vp.contains(e.relatedTarget)) this._wh.classList.remove('drag-over');
      });
      this._vp.addEventListener('drop', (e) => {
        e.preventDefault(); this._wh.classList.remove('drag-over');
        const file = [...e.dataTransfer.files].find(f => /^image\/(png|jpeg)$/.test(f.type));
        if (!file) { this.statusText = 'Only PNG or JPG images supported.'; return; }
        const reader = new FileReader();
        reader.onload = (ev) => this._setWarehouseBg(ev.target.result);
        reader.readAsDataURL(file);
      });
      document.addEventListener('dragover', e => e.preventDefault());
      document.addEventListener('drop',     e => e.preventDefault());
    },

    // ── Auth ─────────────────────────────────────────────────────────────────

    async _checkAuth() {
      try {
        const resp = await fetch('/api/me');
        if (resp.status === 401) { window.location.href = '/login'; return; }
        this.userData = await resp.json();
      } catch {
        window.location.href = '/login';
      }
    },

    async logout() {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    },

    // ── DB / API ─────────────────────────────────────────────────────────────

    async _loadFromDB() {
      try {
        const [layoutResp, itemsResp] = await Promise.all([
          fetch('/api/layout'),
          fetch('/api/items'),
        ]);
        if (layoutResp.status === 401) { window.location.href = '/login'; return; }
        const layoutData = await layoutResp.json();
        const items      = await itemsResp.json();

        if (layoutData.warehouses && layoutData.warehouses.length > 0) {
          this._mergeItems(layoutData, items);
          this._importAllWarehouses(layoutData);
        } else {
          this._freshWarehouse();
        }
      } catch (err) {
        console.error('Load from DB failed:', err);
        this._freshWarehouse();
      }
    },

    _freshWarehouse() {
      this._whTabCounter = 1;
      this._activeWhIdx  = 0;
      this._warehouses.push({
        id: 1, name: 'Warehouse 1',
        width: 800, height: 500, background: null,
        counters: { isleCounter:0, subsectionCounter:0, shelfCounter:0, itemCounter:0, zoneCounter:0 },
        isles: [], zones: [],
      });
      // Render the warehouse square and set its inline dimensions before centering
      this._loadWarehouseDOM(this._warehouses[0]);
      this._syncTabs();
      // Persist the initial warehouse so subsequent loads find it in the DB (admin only)
      if (this.isAdmin) this._saveLayout();
      this.$nextTick(() => this._resetView());
    },

    _mergeItems(layoutData, items) {
      for (const wh of (layoutData.warehouses || [])) {
        for (const isle of (wh.isles || [])) {
          for (const sub of (isle.subsections || [])) {
            for (const shelf of (sub.shelves || [])) {
              shelf.items = items
                .filter(it => it.shelf_id === shelf.id && it.location_type === 'shelf')
                .map(it => ({
                  id: it.id, itemId: it.item_id,
                  type: it.item_type, category: it.category,
                  notes: it.notes, addedAt: it.added_at,
                  shelfId: it.shelf_id, subsectionId: it.subsection_id, isleId: it.isle_id,
                }));
            }
          }
        }
        for (const zone of (wh.zones || [])) {
          zone.items = items
            .filter(it => it.zone_id === zone.id && it.location_type === 'zone')
            .map(it => ({
              id: it.id, itemId: it.item_id,
              type: it.item_type, category: it.category,
              notes: it.notes, addedAt: it.added_at,
              zoneId: it.zone_id,
            }));
        }
      }
    },

    async _saveLayout() {
      this._serializeCurrentWarehouse();
      const data = {
        version: 2,
        activeWarehouseIdx: this._activeWhIdx,
        warehouses: this._warehouses.map(wh => ({
          ...wh,
          isles: (wh.isles || []).map(isle => ({
            ...isle,
            subsections: (isle.subsections || []).map(sub => ({
              ...sub,
              shelves: (sub.shelves || []).map(({ items, element, ...rest }) => rest),
            })),
          })),
          zones: (wh.zones || []).map(({ items, element, ...rest }) => rest),
        })),
      };
      try {
        await fetch('/api/layout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
      } catch (err) { console.error('Save layout failed:', err); }
    },

    async _addItemToDB(payload) {
      const resp = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      return result.id;
    },

    async _removeItemFromDB(dbId) {
      try {
        await fetch(`/api/items/${dbId}`, { method: 'DELETE' });
      } catch (err) { console.error('Delete item failed:', err); }
    },

    // ── Utilities ────────────────────────────────────────────────────────────

    _rndHex() {
      return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    },
    _hexRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    },
    _applyIsleFill(el, fillColor, fillOpacity) {
      el.style.background = fillOpacity > 0 ? this._hexRgba(fillColor, fillOpacity / 100) : 'transparent';
    },
    _applyZoneFill(el, borderColor, fillOpacity) {
      el.style.background = this._hexRgba(borderColor, fillOpacity / 100);
    },
    _applyPendingIsleFill() {
      if (!this._pi) return;
      const c = this.f_isleFillColor, o = this.f_isleFillOpacity;
      this._pi.fillColor   = c;
      this._pi.fillOpacity = o;
      this._applyIsleFill(this._pi.element, c, o);
    },
    _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
    _escH(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },
    _isleHeaderHtml(row, label, labelColor) {
      const badge = row ? `<span class="isle-row-badge">${this._escH(row)}</span>` : '';
      return `${badge}<span class="isle-label" style="color:${this._escH(labelColor)}">${this._escH(label)}</span>`;
    },
    _relPos(e) {
      const r  = this._wh.getBoundingClientRect();
      const bx = parseFloat(getComputedStyle(this._wh).borderLeftWidth) || 0;
      const by = parseFloat(getComputedStyle(this._wh).borderTopWidth)  || 0;
      const lx = (e.clientX - r.left) / this._currentZoom - bx;
      const ly = (e.clientY - r.top)  / this._currentZoom - by;
      return { x: this._clamp(lx, 0, this._wh.clientWidth), y: this._clamp(ly, 0, this._wh.clientHeight) };
    },

    // ── Snapping ─────────────────────────────────────────────────────────────

    _snapPt(x, y) {
      if (!this._isles.length && !this._zones.length) return { x, y };
      const vE = [], hE = [];
      for (const i of this._isles) { vE.push(i.position.x, i.position.x + i.dimensions.width);  hE.push(i.position.y, i.position.y + i.dimensions.height); }
      for (const z of this._zones) { vE.push(z.position.x, z.position.x + z.dimensions.width); hE.push(z.position.y, z.position.y + z.dimensions.height); }
      let sx = x, bdx = this._SNAP + 1;
      for (const ex of vE) { const d = Math.abs(x - ex); if (d < bdx) { bdx = d; sx = ex; } }
      let sy = y, bdy = this._SNAP + 1;
      for (const ey of hE) { const d = Math.abs(y - ey); if (d < bdy) { bdy = d; sy = ey; } }
      return { x: sx, y: sy };
    },

    _snapIsleMove(isle, nx, ny) {
      const w = isle.dimensions.width, h = isle.dimensions.height;
      const vE = [0, this._wh.clientWidth], hE = [0, this._wh.clientHeight];
      for (const o of this._isles) {
        if (o.id === isle.id) continue;
        vE.push(o.position.x, o.position.x + o.dimensions.width);
        hE.push(o.position.y, o.position.y + o.dimensions.height);
      }
      for (const z of this._zones) { vE.push(z.position.x, z.position.x + z.dimensions.width); hE.push(z.position.y, z.position.y + z.dimensions.height); }
      let bx = nx, bdx = this._SNAP + 1;
      for (const ve of vE) {
        const dl = Math.abs(nx - ve), dr = Math.abs(nx + w - ve);
        if (dl < bdx) { bdx = dl; bx = ve; } if (dr < bdx) { bdx = dr; bx = ve - w; }
      }
      let by = ny, bdy = this._SNAP + 1;
      for (const he of hE) {
        const dt = Math.abs(ny - he), db = Math.abs(ny + h - he);
        if (dt < bdy) { bdy = dt; by = he; } if (db < bdy) { bdy = db; by = he - h; }
      }
      return { x: bx, y: by };
    },

    _snapZoneMove(zone, nx, ny) {
      const w = zone.dimensions.width, h = zone.dimensions.height;
      const vE = [0, this._wh.clientWidth], hE = [0, this._wh.clientHeight];
      for (const z of this._zones) {
        if (z.id === zone.id) continue;
        vE.push(z.position.x, z.position.x + z.dimensions.width);
        hE.push(z.position.y, z.position.y + z.dimensions.height);
      }
      for (const i of this._isles) { vE.push(i.position.x, i.position.x + i.dimensions.width); hE.push(i.position.y, i.position.y + i.dimensions.height); }
      let bx = nx, bdx = this._SNAP + 1;
      for (const ve of vE) {
        const dl = Math.abs(nx - ve), dr = Math.abs(nx + w - ve);
        if (dl < bdx) { bdx = dl; bx = ve; } if (dr < bdx) { bdx = dr; bx = ve - w; }
      }
      let by = ny, bdy = this._SNAP + 1;
      for (const he of hE) {
        const dt = Math.abs(ny - he), db = Math.abs(ny + h - he);
        if (dt < bdy) { bdy = dt; by = he; } if (db < bdy) { bdy = db; by = he - h; }
      }
      return { x: bx, y: by };
    },

    // ── Pan / Zoom ────────────────────────────────────────────────────────────

    _applyTransform() {
      this._pzl.style.transform = `translate(${this._panX}px,${this._panY}px) scale(${this._currentZoom})`;
    },
    _zoomAt(factor, cx, cy) {
      const nz = Math.min(Math.max(this._currentZoom * factor, 0.02), 50);
      this._panX = cx - (cx - this._panX) * (nz / this._currentZoom);
      this._panY = cy - (cy - this._panY) * (nz / this._currentZoom);
      this._currentZoom = nz;
      this._applyTransform();
      this.zoomText = `${Math.round(this._currentZoom * 100)}%`;
    },
    zoomIn()    { const vr = this._vp.getBoundingClientRect(); this._zoomAt(1.25, vr.width/2, vr.height/2); },
    zoomOut()   { const vr = this._vp.getBoundingClientRect(); this._zoomAt(1/1.25, vr.width/2, vr.height/2); },
    resetView() {
      this._currentZoom = 1;
      const vr = this._vp.getBoundingClientRect();
      // Guard: if viewport hasn't been laid out yet, defer and retry
      if (vr.width === 0 || vr.height === 0) {
        requestAnimationFrame(() => this.resetView());
        return;
      }
      this._panX = (vr.width  - this._wh.offsetWidth)  / 2;
      this._panY = (vr.height - this._wh.offsetHeight) / 2;
      this._applyTransform();
      this.zoomText = '100%';
    },
    _resetView() { this.resetView(); },

    // ── Warehouse resize handles ──────────────────────────────────────────────

    startWarehouseResize(edge, e) {
      this._isResizing    = true;
      this._resizeEdge    = edge;
      this._resizeStartMX = e.clientX; this._resizeStartMY = e.clientY;
      this._resizeStartW  = this._wh.clientWidth; this._resizeStartH = this._wh.clientHeight;
      this._resizeStartPanX = this._panX; this._resizeStartPanY = this._panY;
    },

    // ── Edit mode ────────────────────────────────────────────────────────────

    _edgePositions(entity) {
      const { x, y } = entity.position, { width: w, height: h } = entity.dimensions;
      const cx = x + w/2, cy = y + h/2;
      const angle = ((entity.rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const rp = (lx, ly) => ({ cx: cx + lx*cos - ly*sin, cy: cy + lx*sin + ly*cos });
      return {
        nw: rp(-w/2,-h/2),  n: rp(0,-h/2),   ne: rp(w/2,-h/2),
        e:  rp(w/2,0),     se: rp(w/2,h/2),   s:  rp(0,h/2),
        sw: rp(-w/2,h/2),   w: rp(-w/2,0),
        rotate: rp(0, -(h/2 + 25)),
      };
    },

    _createHandles(entity, type) {
      const pos = this._edgePositions(entity);
      for (const edge of [...this._EDGES, 'rotate']) {
        const el = document.createElement('div');
        el.className = 'edit-handle';
        el.dataset.edge = edge; el.dataset.type = type; el.dataset.id = entity.id;
        el.style.left = pos[edge].cx + 'px'; el.style.top = pos[edge].cy + 'px';
        this._wh.appendChild(el);
      }
    },
    _updateHandles(entity, type) {
      const pos = this._edgePositions(entity);
      this._wh.querySelectorAll(`.edit-handle[data-type="${type}"][data-id="${entity.id}"]`).forEach(el => {
        const p = pos[el.dataset.edge];
        if (p) { el.style.left = p.cx + 'px'; el.style.top = p.cy + 'px'; }
      });
    },
    _createAllHandles() {
      this._removeAllHandles();
      this._isles.forEach(e => this._createHandles(e, 'isle'));
      this._zones.forEach(e => this._createHandles(e, 'zone'));
    },
    _removeAllHandles() {
      this._wh.querySelectorAll('.edit-handle').forEach(el => el.remove());
    },

    activateEditMode() {
      if (this._editMode) { this._cancelEditMode(); return; }
      if (this._drawMode) this._cancelDrawMode();
      this._editMode = true; this.editActive = true;
      this.statusText = 'Drag to move · Blue handles to resize · Click to select · Del to delete.';
      this._createAllHandles();
    },
    _cancelEditMode() {
      this._editMode = false; this.editActive = false;
      this._isEntResize = false; this._entResizeTarget = null;
      this._isleDragMoved = false;
      this._selectIsle(null); this._selectZone(null);
      this.showDelEntBtn = false;
      this.statusText = 'Click "Add Isle" then draw inside the warehouse.';
      this._removeAllHandles();
    },

    _selectIsle(isle) {
      if (this._selIsle && this._selIsle.element) this._selIsle.element.classList.remove('isle-selected');
      this._selIsle = isle;
      if (isle && isle.element) isle.element.classList.add('isle-selected');
      this._updateDelBtn();
    },
    _selectZone(zone) {
      if (this._selZone && this._selZone.element) this._selZone.element.classList.remove('zone-selected');
      this._selZone = zone;
      if (zone && zone.element) zone.element.classList.add('zone-selected');
      this._updateDelBtn();
    },
    _updateDelBtn() {
      this.showDelEntBtn = this._editMode && !!(this._selIsle || this._selZone);
    },

    // ── Draw mode ────────────────────────────────────────────────────────────

    activateDrawMode() {
      if (this._drawMode === 'isle') { this._cancelDrawMode(); return; }
      if (this._drawMode) this._cancelDrawMode();
      if (this._editMode) this._cancelEditMode();
      this._drawMode = 'isle'; this.addIsleActive = true;
      this._wh.classList.add('drawing-mode');
      this.statusText = 'Click & drag to draw an isle.';
    },
    activateZoneMode() {
      if (this._drawMode === 'zone') { this._cancelDrawMode(); return; }
      if (this._drawMode) this._cancelDrawMode();
      if (this._editMode) this._cancelEditMode();
      this._drawMode = 'zone'; this.addZoneActive = true;
      this._wh.classList.add('drawing-mode');
      this.statusText = 'Click & drag to draw a zone.';
    },
    _cancelDrawMode() {
      this._drawMode = null; this._isDrawing = false;
      this.addIsleActive = false; this.addZoneActive = false;
      this._wh.classList.remove('drawing-mode');
      this._prev.style.display = 'none';
      this.statusText = 'Click "Add Isle" then draw inside the warehouse.';
    },

    // ── Mouse events ─────────────────────────────────────────────────────────

    _onMouseMove(e) {
      if (this._isPanning) {
        this._panX += e.clientX - this._panLastX; this._panY += e.clientY - this._panLastY;
        this._panLastX = e.clientX; this._panLastY = e.clientY;
        this._applyTransform();
      }
      if (this._isResizing) {
        const dx = (e.clientX - this._resizeStartMX) / this._currentZoom;
        const dy = (e.clientY - this._resizeStartMY) / this._currentZoom;
        let nw = this._resizeStartW, nh = this._resizeStartH;
        let npx = this._resizeStartPanX, npy = this._resizeStartPanY;
        const edge = this._resizeEdge;
        if (edge.includes('e')) nw = Math.max(150, nw + dx);
        if (edge.includes('w')) { nw = Math.max(150, nw - dx); npx = this._resizeStartPanX + (this._resizeStartW - nw) * this._currentZoom; }
        if (edge.includes('s')) nh = Math.max(100, nh + dy);
        if (edge.includes('n')) { nh = Math.max(100, nh - dy); npy = this._resizeStartPanY + (this._resizeStartH - nh) * this._currentZoom; }
        this._wh.style.width = nw + 'px'; this._wh.style.height = nh + 'px';
        this._panX = npx; this._panY = npy; this._applyTransform();
      }
      if (this._isEntResize && this._entResizeTarget) {
        const dx = (e.clientX - this._entResizeSMX) / this._currentZoom;
        const dy = (e.clientY - this._entResizeSMY) / this._currentZoom;
        const MIN = 30; const edge = this._entResizeEdge;
        let nx = this._entResizeSX, ny = this._entResizeSY, nw = this._entResizeSW, nh = this._entResizeSH;
        if (edge.includes('e')) nw = Math.max(MIN, nw + dx);
        if (edge.includes('w')) { nw = Math.max(MIN, nw - dx); nx = this._entResizeSX + this._entResizeSW - nw; }
        if (edge.includes('s')) nh = Math.max(MIN, nh + dy);
        if (edge.includes('n')) { nh = Math.max(MIN, nh - dy); ny = this._entResizeSY + this._entResizeSH - nh; }
        if (this._entResizeType === 'isle') {
          nx = Math.max(0, nx); ny = Math.max(0, ny);
          nw = Math.min(nw, this._wh.clientWidth  - nx);
          nh = Math.min(nh, this._wh.clientHeight - ny);
        }
        const t = this._entResizeTarget;
        t.position.x = nx; t.position.y = ny; t.dimensions.width = nw; t.dimensions.height = nh;
        const el = t.element;
        el.style.left = nx+'px'; el.style.top  = ny+'px'; el.style.width = nw+'px'; el.style.height = nh+'px';
        this._updateHandles(t, this._entResizeType);
      }
      if (this._isRotating && this._rotEntity) {
        const ma = Math.atan2(e.clientY - this._rotCY, e.clientX - this._rotCX) * 180 / Math.PI;
        let nr = this._rotStartAngle + (ma - this._rotStartMouseAngle);
        if (e.shiftKey) nr = Math.round(nr / 15) * 15;
        this._rotEntity.rotation = nr;
        this._rotEntity.element.style.transform = `rotate(${nr}deg)`;
        this._updateHandles(this._rotEntity, this._rotEntityType);
      }
      if (this._isDragIsle && this._dragIsle) {
        const dx = (e.clientX - this._isleSMX) / this._currentZoom;
        const dy = (e.clientY - this._isleSMY) / this._currentZoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._isleDragMoved = true;
        const nx = this._clamp(this._isleSX + dx, 0, this._wh.clientWidth  - this._dragIsle.dimensions.width);
        const ny = this._clamp(this._isleSY + dy, 0, this._wh.clientHeight - this._dragIsle.dimensions.height);
        const sn = this._snapIsleMove(this._dragIsle, nx, ny);
        this._dragIsle.position.x = sn.x; this._dragIsle.position.y = sn.y;
        this._dragIsle.element.style.left = sn.x + 'px'; this._dragIsle.element.style.top = sn.y + 'px';
        if (this._editMode) this._updateHandles(this._dragIsle, 'isle');
      }
      if (this._isDragZone && this._dragZone) {
        const dx = (e.clientX - this._zoneSMX) / this._currentZoom;
        const dy = (e.clientY - this._zoneSMY) / this._currentZoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._zoneDragMoved = true;
        const sn = this._snapZoneMove(this._dragZone, this._zoneSX + dx, this._zoneSY + dy);
        this._dragZone.position.x = sn.x; this._dragZone.position.y = sn.y;
        this._dragZone.element.style.left = sn.x + 'px'; this._dragZone.element.style.top = sn.y + 'px';
        if (this._editMode) this._updateHandles(this._dragZone, 'zone');
      }
      if (this._isDrawing) {
        const raw = this._relPos(e);
        const p = this._snapPt(raw.x, raw.y);
        const x = Math.min(p.x, this._startX), y = Math.min(p.y, this._startY);
        Object.assign(this._prev.style, {
          left:`${x}px`, top:`${y}px`,
          width:`${Math.abs(p.x-this._startX)}px`, height:`${Math.abs(p.y-this._startY)}px`,
        });
      }
    },

    _onMouseUp(e) {
      if (e.button === 1) { this._isPanning = false; this._vp.classList.remove('panning'); }
      if (this._isResizing)   { this._isResizing = false; this._resizeEdge = null; this._saveLayout(); }
      if (this._isEntResize)  { this._isEntResize = false; this._entResizeTarget = null; this._saveLayout(); }
      if (this._isRotating)   { this._isRotating  = false; this._rotEntity = null; this._saveLayout(); }
      if (this._isDragIsle)   { this._isDragIsle  = false; this._dragIsle  = null; this._saveLayout(); }
      if (this._isDragZone)   { this._isDragZone  = false; this._dragZone  = null; this._saveLayout(); }
      if (!this._isDrawing) return;
      this._isDrawing = false; this._prev.style.display = 'none';
      const raw = this._relPos(e);
      const p = this._snapPt(raw.x, raw.y);
      const x = Math.min(p.x, this._startX), y = Math.min(p.y, this._startY);
      const w = Math.abs(p.x - this._startX), h = Math.abs(p.y - this._startY);
      if (w < 10 || h < 10) return;
      const mode = this._drawMode;
      this._cancelDrawMode();
      if (mode === 'zone') this._beginZoneCreation(x, y, w, h);
      else                 this._beginIsleCreation(x, y, w, h);
    },

    _onKeyDown(e) {
      if (e.key === 'Escape') { this._cancelDrawMode(); this._cancelEditMode(); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (this._editMode && this._selIsle) { this._copyIsle(); e.preventDefault(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (this._editMode && this._copiedIsle) { this._openPasteModal(); e.preventDefault(); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this._editMode) {
        if (this._selIsle || this._selZone) { this.deleteSelectedEntity(); e.preventDefault(); }
      }
    },

    // ── Zone creation ────────────────────────────────────────────────────────

    _beginZoneCreation(x, y, w, h) {
      const color = this._rndHex();
      const id = ++this._zoneCounter;
      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, { left:`${x}px`, top:`${y}px`, width:`${w}px`, height:`${h}px`, borderColor: color });
      el.dataset.zoneId = id;
      this._applyZoneFill(el, color, 18);
      const lblEl = document.createElement('div');
      lblEl.className = 'zone-label';
      lblEl.textContent = '…';
      el.appendChild(lblEl);
      this._wh.appendChild(el);
      this._pz = { id, label:'', color, fillOpacity:18, labelColor:'#444444', rotation:0,
                   position:{x,y}, dimensions:{width:w,height:h}, items:[], element:el,
                   createdAt: new Date().toISOString() };
      this.f_zoneLabel = ''; this.f_zoneColor = color;
      this.f_zoneNameColor = '#444444'; this.f_zoneFillOpacity = 18;
      this.zoneLabelError = false;
      this.m_zone = true;
      this.$nextTick(() => this.$refs.zoneLabelInput?.focus());
    },

    confirmZone() {
      const label = this.f_zoneLabel.trim();
      if (!label) { this.zoneLabelError = true; return; }
      this.zoneLabelError = false;
      this._pz.label      = label;
      this._pz.color      = this.f_zoneColor;
      this._pz.fillOpacity = this.f_zoneFillOpacity;
      this._pz.labelColor  = this.f_zoneNameColor;
      this._pz.element.style.borderColor = this.f_zoneColor;
      this._applyZoneFill(this._pz.element, this.f_zoneColor, this.f_zoneFillOpacity);
      const lblEl = this._pz.element.querySelector('.zone-label');
      lblEl.textContent = label; lblEl.style.color = this.f_zoneNameColor;
      this._zones.push(this._pz);
      this._attachZoneHandlers(this._pz);
      this.statusText = `Zone "${label}" added.`;
      this._pz = null; this.m_zone = false;
      this._saveLayout();
    },

    cancelZoneCreation() {
      if (this._pz) { this._pz.element.remove(); this._pz = null; this._zoneCounter--; }
      this.m_zone = false;
    },

    _attachZoneHandlers(zone) {
      zone.element.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || !this._editMode) return;
        e.stopPropagation(); e.preventDefault();
        this._selectZone(zone); this._selectIsle(null);
        this._isDragZone = true; this._dragZone = zone;
        this._zoneDragMoved = false;
        this._zoneSMX = e.clientX; this._zoneSMY = e.clientY;
        this._zoneSX = zone.position.x; this._zoneSY = zone.position.y;
      });
      zone.element.addEventListener('click', (e) => {
        if (this._editMode) return;
        e.stopPropagation();
        this._openZoneActions(zone);
      });
    },

    // ── Isle creation step 1 ─────────────────────────────────────────────────

    _beginIsleCreation(x, y, w, h) {
      const color = this._rndHex();
      const id = ++this._isleCounter;
      const el = document.createElement('div');
      el.className = 'isle';
      Object.assign(el.style, { left:`${x}px`, top:`${y}px`, width:`${w}px`, height:`${h}px`, borderColor:color });
      el.dataset.isleId = id;
      el.innerHTML = `<div class="isle-header"><span class="isle-label" style="color:${color}">…</span></div>`;
      this._wh.appendChild(el);
      this._pi = { id, label:'', row:'', color, shelfColor:'#aaaaaa',
                   fillColor:'#ffffff', fillOpacity:0, labelColor:color, rotation:0,
                   position:{x,y}, dimensions:{width:w,height:h}, element:el,
                   shelfCount:1, shelfLabels:[], subsectionStart:1, subsectionCount:1,
                   facing:'right', subsections:[], createdAt: new Date().toISOString() };
      this.f_isleRow = ''; this.f_isleName = '';
      this.f_shelfCount = 1; this.f_isleColor = color;
      this.f_isleLabelColor = color; this.f_shelfColor = '#aaaaaa';
      this.f_isleFillColor  = '#ffffff'; this.f_isleFillOpacity = 0;
      this.f_isleFacing = 'right';
      this.isleNameError = false;
      this.m_count = true;
      this.$nextTick(() => this.$refs.isleNameInput?.focus());
    },

    confirmStep1() {
      const name = this.f_isleName.trim();
      if (!name) { this.isleNameError = true; return; }
      this.isleNameError = false;
      this._pi.label      = name;
      this._pi.row        = this.f_isleRow.trim();
      this._pi.shelfCount = Math.min(Math.max(this.f_shelfCount || 1, 1), 26);
      this._pi.facing     = this.f_isleFacing;
      this._pi.shelfColor  = this.f_shelfColor;
      this._pi.fillColor   = this.f_isleFillColor;
      this._pi.fillOpacity = this.f_isleFillOpacity;
      this._pi.labelColor  = this.f_isleLabelColor;
      const hdr = this._pi.element.querySelector('.isle-header');
      if (hdr) hdr.innerHTML = this._isleHeaderHtml(this._pi.row, name, this._pi.labelColor);
      this.mc_subConfigTitle = `Subsection Setup — ${name}`;
      this.f_subStart = 1; this.f_subCount = 1;
      this.m_count = false; this.m_subs = true;
    },
    goBackToStep1() { this.m_subs = false; this.m_count = true; },

    // ── Isle creation step 2 ─────────────────────────────────────────────────

    confirmStep2() {
      this._pi.subsectionStart = Math.max(this.f_subStart || 1, 1);
      this._pi.subsectionCount = Math.max(this.f_subCount || 1, 1);
      this.f_shelfLabelsList = [];
      for (let i = 1; i <= this._pi.shelfCount; i++) {
        this.f_shelfLabelsList.push({ label: String.fromCharCode(64 + i) });
      }
      this.mc_labelsTitle = `Label Shelves — ${this._pi.label}`;
      this.m_subs = false; this.m_labels = true;
    },
    goBackToStep2() { this.m_labels = false; this.m_subs = true; },

    cancelIsleCreation() {
      if (this._pi) { this._pi.element.remove(); this._pi = null; this._isleCounter--; }
      this.m_count = false; this.m_subs = false; this.m_labels = false;
    },

    // ── Isle creation step 3 ─────────────────────────────────────────────────

    confirmStep3() {
      const shelfLabels = this.f_shelfLabelsList.map((s, i) => s.label.trim() || String.fromCharCode(65 + i));
      this._pi.shelfLabels = shelfLabels;
      const { subsectionStart, subsectionCount, element: isleEl, id: isleId, facing, shelfColor } = this._pi;

      const body = document.createElement('div');
      body.className = 'isle-body';

      for (let s = 0; s < subsectionCount; s++) {
        const num   = subsectionStart + s;
        const subEl = document.createElement('div');
        subEl.className = `subsection facing-${facing}`;
        subEl.dataset.subsectionNum = num;
        const numEl = document.createElement('div');
        numEl.className = 'sub-number'; numEl.textContent = num;
        subEl.appendChild(numEl);

        const shelvesDiv = document.createElement('div');
        shelvesDiv.className = 'sub-shelves';
        const wallEl = document.createElement('div');
        wallEl.className = 'wall-indicator';

        const subId = ++this._subsectionCounter;
        const shelves = shelfLabels.map((lbl, j) => ({
          id: ++this._shelfCounter, isleId, subsectionId: subId,
          shelfNumber: j+1, label: lbl, items: [], element: null,
        }));

        const makeSlot = (shelf) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot'; slot.textContent = shelf.label;
          slot.style.borderColor = shelfColor; shelf.element = slot; return slot;
        };

        if (facing === 'left') {
          [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
          shelvesDiv.appendChild(wallEl);
        } else {
          shelvesDiv.appendChild(wallEl);
          shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: subId, isleId, number: num, element: subEl, shelves };
        this._pi.subsections.push(subObj);

        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this._drawMode || this._editMode || this._isleDragMoved) return;
          this._ai   = this._isles.find(i => i.id === isleId);
          this._asub = subObj;
          this._openShelfSelect(subObj);
        });

        body.appendChild(subEl);
      }

      isleEl.appendChild(body);
      this._applyIsleFill(isleEl, this._pi.fillColor, this._pi.fillOpacity);
      this._isles.push(this._pi);
      this._attachIsleHandlers(this._pi);
      this.isleCountText = `Isles: ${this._isles.length}`;
      this.statusText = `${this._pi.label} added.`;
      this._pi = null; this.m_labels = false;
      this._saveLayout();
    },

    _attachIsleHandlers(isle) {
      isle.element.addEventListener('mousedown', (e) => {
        if (!this._editMode || e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();
        this._selectIsle(isle); this._selectZone(null);
        this._isDragIsle = true; this._dragIsle = isle;
        this._isleDragMoved = false;
        this._isleSMX = e.clientX; this._isleSMY = e.clientY;
        this._isleSX  = isle.position.x; this._isleSY  = isle.position.y;
      });
      isle.element.addEventListener('click', () => {
        if (this._drawMode || this._editMode || this._isleDragMoved) return;
        this._ai = isle;
        if (isle.subsections.length === 1) {
          this._asub = isle.subsections[0];
          this._openShelfSelect(this._asub);
        } else {
          this._openSubsectionSelect(isle);
        }
      });
    },

    // ── Subsection / Shelf select ─────────────────────────────────────────────

    _openSubsectionSelect(isle) {
      this.mc_subSelTitle = `${isle.label} — Select a Subsection`;
      this.mc_subSelList  = isle.subsections.map(sub => ({
        ...sub,
        totalItems: sub.shelves.reduce((n, sh) => n + sh.items.length, 0),
      }));
      this.m_subSel = true;
    },

    selectSubsectionFromList(sub) {
      this._asub = sub;
      this.m_subSel = false;
      this._openShelfSelect(sub);
    },

    backToSubsectionSelect() {
      this.m_shelfSel = false;
      if (this._ai && this._ai.subsections.length === 1) this.closeAllModals();
      else if (this._ai) this._openSubsectionSelect(this._ai);
    },

    _openShelfSelect(sub) {
      this.mc_shelfSelTitle = `${this._ai.label} › Sub ${sub.number} — Select a Shelf`;
      this.mc_shelfSelList  = sub.shelves;
      this.m_shelfSel = true;
    },

    selectShelfFromList(shelf) {
      this._ash = shelf;
      this.m_shelfSel = false;
      this.mc_shelfActTitle = `${this._ai.label} › Sub ${this._asub.number} › ${shelf.label}`;
      this.mc_shelfActSub   = `${shelf.items.length} item${shelf.items.length !== 1 ? 's' : ''} on this shelf`;
      this.m_shelfAct = true;
    },

    backToShelfSelect() { this.m_shelfAct = false; this._openShelfSelect(this._asub); },

    // ── Add shelf ────────────────────────────────────────────────────────────

    openAddShelf() {
      this.m_shelfSel = false;
      this.mc_addShelfSub = `${this._ai.label} › Sub ${this._asub.number}`;
      this.f_addShelfName = ''; this.addShelfNameError = false;
      this.m_addShelf = true;
      this.$nextTick(() => this.$refs.addShelfInput?.focus());
    },
    backToShelfSelectFromAdd() { this.m_addShelf = false; this._openShelfSelect(this._asub); },

    confirmAddShelf() {
      const label = this.f_addShelfName.trim();
      if (!label) { this.addShelfNameError = true; return; }
      this.addShelfNameError = false;
      const shelf = {
        id: ++this._shelfCounter, isleId: this._ai.id, subsectionId: this._asub.id,
        shelfNumber: this._asub.shelves.length + 1, label, items: [], element: null,
      };
      const slot = document.createElement('div');
      slot.className = 'shelf-slot'; slot.textContent = label;
      slot.style.borderColor = this._ai.shelfColor; shelf.element = slot;
      const shelvesDiv = this._asub.element.querySelector('.sub-shelves');
      if (this._ai.facing === 'left') shelvesDiv.insertBefore(slot, shelvesDiv.lastElementChild);
      else shelvesDiv.appendChild(slot);
      this._asub.shelves.push(shelf);
      this.m_addShelf = false;
      this._openShelfSelect(this._asub);
      this._saveLayout();
    },

    deleteShelf() {
      const n = this._ash.items.length;
      if (n > 0) {
        this.mc_confDelMsg = `Shelf "${this._ash.label}" still has ${n} item(s). Remove all items before deleting.`;
        this.mc_showDelBtn = false;
      } else {
        this.mc_confDelMsg = `Permanently delete shelf "${this._ash.label}"? This cannot be undone.`;
        this.mc_showDelBtn = true;
      }
      this.m_confDel = true;
    },

    confirmDeleteShelf() {
      this.m_confDel = false;
      this._asub.shelves = this._asub.shelves.filter(s => s.id !== this._ash.id);
      if (this._ash.element) this._ash.element.remove();
      this._ash = null; this.m_shelfAct = false;
      if (this._asub.shelves.length === 0) this.closeAllModals();
      else this._openShelfSelect(this._asub);
      this._saveLayout();
    },

    // ── Add item ─────────────────────────────────────────────────────────────

    openAddItem() {
      this.m_shelfAct = false;
      this.mc_addItemSub = `${this._ai.label} › Sub ${this._asub.number} › ${this._ash.label}`;
      this.f_itemId = ''; this.f_itemType = ''; this.f_itemCategory = '';
      this.f_itemNotes = ''; this.f_itemTags = ''; this.f_itemUrl = '';
      this.itemIdError = false;
      this.m_addItem = true;
      this.$nextTick(() => this.$refs.itemIdInput?.focus());
    },

    backFromAddItem() {
      this.m_addItem = false;
      if (this._azfi) this._openZoneActions(this._azfi);
      else { this._selItemIds.clear(); this.mc_selItemIds = []; this.selectShelfFromList(this._ash); }
    },

    backToShelfActions() {
      this.m_addItem = false; this.m_rmItems = false;
      this._selItemIds.clear(); this.mc_selItemIds = []; this.mc_selCount = 0;
      this.selectShelfFromList(this._ash);
    },

    async confirmAddItem() {
      const itemId = this.f_itemId.trim();
      if (!itemId) { this.itemIdError = true; return; }
      this.itemIdError = false;
      const now = new Date().toISOString();

      if (this._azfi) {
        // Zone item
        const payload = {
          item_id: itemId, item_type: this.f_itemType.trim(),
          category: this.f_itemCategory.trim(), notes: this.f_itemNotes.trim(),
          url: this.f_itemUrl.trim(), tags: this.f_itemTags.trim(),
          added_at: now, location_type: 'zone',
          warehouse_id: this._warehouses[this._activeWhIdx]?.id,
          warehouse_name: this._warehouses[this._activeWhIdx]?.name || '',
          zone_id: this._azfi.id, zone_label: this._azfi.label,
        };
        const dbId = await this._addItemToDB(payload);
        this._azfi.items.push({
          id: dbId, itemId, type: payload.item_type, category: payload.category,
          notes: payload.notes, addedAt: now, zoneId: this._azfi.id,
        });
        this.m_addItem = false;
        this._openZoneActions(this._azfi);
      } else {
        // Shelf item
        const wh = this._warehouses[this._activeWhIdx];
        const payload = {
          item_id: itemId, item_type: this.f_itemType.trim(),
          category: this.f_itemCategory.trim(), notes: this.f_itemNotes.trim(),
          url: this.f_itemUrl.trim(), tags: this.f_itemTags.trim(),
          added_at: now, location_type: 'shelf',
          warehouse_id: wh?.id, warehouse_name: wh?.name || '',
          isle_id: this._ai.id, isle_label: this._ai.label, isle_row: this._ai.row || '',
          subsection_id: this._asub.id, subsection_number: this._asub.number,
          shelf_id: this._ash.id, shelf_label: this._ash.label,
        };
        const dbId = await this._addItemToDB(payload);
        this._ash.items.push({
          id: dbId, itemId, type: payload.item_type, category: payload.category,
          notes: payload.notes, addedAt: now,
          shelfId: this._ash.id, subsectionId: this._asub.id, isleId: this._ai.id,
        });
        this.m_addItem = false;
        this.selectShelfFromList(this._ash);
      }
    },

    // ── Remove items ──────────────────────────────────────────────────────────

    openRemoveItems() {
      this.m_shelfAct = false;
      this._selItemIds.clear(); this.mc_selItemIds = []; this.mc_selCount = 0;
      this.mc_rmItemsTitle = `${this._ai.label} › Sub ${this._asub.number} › ${this._ash.label}`;
      this.mc_itemList = this._ash.items;
      this.m_rmItems = true;
    },

    toggleItemSel(id, multi) {
      if (!multi) {
        if (this._selItemIds.size === 1 && this._selItemIds.has(id)) this._selItemIds.clear();
        else { this._selItemIds.clear(); this._selItemIds.add(id); }
      } else {
        if (this._selItemIds.has(id)) this._selItemIds.delete(id);
        else this._selItemIds.add(id);
      }
      this.mc_selItemIds = [...this._selItemIds];
      this.mc_selCount   = this._selItemIds.size;
    },

    async confirmRemoveItems() {
      if (!this._selItemIds.size) return;
      const toDelete = this._ash.items.filter(i => this._selItemIds.has(i.id));
      await Promise.all(toDelete.map(i => this._removeItemFromDB(i.id)));
      this._ash.items = this._ash.items.filter(i => !this._selItemIds.has(i.id));
      this._selItemIds.clear(); this.mc_selItemIds = []; this.mc_selCount = 0;
      this.m_rmItems = false;
      this.selectShelfFromList(this._ash);
    },

    // ── Zone actions / items ──────────────────────────────────────────────────

    _openZoneActions(zone) {
      this._azfi = zone;
      this.mc_zoneActTitle = `Zone: ${zone.label}`;
      const n = zone.items.length;
      this.mc_zoneActSub = `${n} item${n !== 1 ? 's' : ''} in this zone`;
      this.m_zoneAct = true;
    },

    openAddZoneItem() {
      this.m_zoneAct = false;
      this.mc_addItemSub = `Zone: ${this._azfi.label}`;
      this.f_itemId = ''; this.f_itemType = ''; this.f_itemCategory = '';
      this.f_itemNotes = ''; this.f_itemTags = ''; this.f_itemUrl = '';
      this.itemIdError = false;
      this.m_addItem = true;
      this.$nextTick(() => this.$refs.itemIdInput?.focus());
    },

    openZoneItemList() {
      this.m_zoneAct = false;
      this._selZoneItemIds.clear(); this.mc_selZoneItemIds = []; this.mc_zoneSelCount = 0;
      this.mc_zoneItemsTitle = `Zone: ${this._azfi.label}`;
      this.mc_zoneItemList   = this._azfi.items;
      this.m_zoneItems = true;
    },

    backToZoneActions() {
      this.m_zoneItems = false;
      this._selZoneItemIds.clear(); this.mc_selZoneItemIds = []; this.mc_zoneSelCount = 0;
      if (this._azfi) this._openZoneActions(this._azfi);
    },

    toggleZoneItemSel(id, multi) {
      if (!multi) {
        if (this._selZoneItemIds.size === 1 && this._selZoneItemIds.has(id)) this._selZoneItemIds.clear();
        else { this._selZoneItemIds.clear(); this._selZoneItemIds.add(id); }
      } else {
        if (this._selZoneItemIds.has(id)) this._selZoneItemIds.delete(id);
        else this._selZoneItemIds.add(id);
      }
      this.mc_selZoneItemIds = [...this._selZoneItemIds];
      this.mc_zoneSelCount   = this._selZoneItemIds.size;
    },

    async confirmRemoveZoneItems() {
      if (!this._selZoneItemIds.size) return;
      const toDelete = this._azfi.items.filter(i => this._selZoneItemIds.has(i.id));
      await Promise.all(toDelete.map(i => this._removeItemFromDB(i.id)));
      this._azfi.items = this._azfi.items.filter(i => !this._selZoneItemIds.has(i.id));
      this._selZoneItemIds.clear(); this.mc_selZoneItemIds = []; this.mc_zoneSelCount = 0;
      this.m_zoneItems = false;
      this._openZoneActions(this._azfi);
    },

    // ── Delete entity ─────────────────────────────────────────────────────────

    deleteSelectedEntity() {
      if (!this._editMode) return;
      const entity = this._selIsle || this._selZone;
      const type   = this._selIsle ? 'isle' : this._selZone ? 'zone' : null;
      if (!entity) return;
      this._pendDelEnt = { entity, type };
      if (type === 'isle') {
        const total = entity.subsections.reduce((n, s) => n + s.shelves.reduce((m, sh) => m + sh.items.length, 0), 0);
        this.mc_delEntTitle = `Delete Isle "${entity.label}"?`;
        this.mc_delEntMsg   = total > 0
          ? `This isle contains ${total} item(s). They will all be permanently removed.`
          : `Isle "${entity.label}" will be permanently removed.`;
      } else {
        const n = entity.items?.length || 0;
        this.mc_delEntTitle = `Delete Zone "${entity.label}"?`;
        this.mc_delEntMsg   = n > 0
          ? `This zone contains ${n} item(s). They will all be permanently removed.`
          : `Zone "${entity.label}" will be permanently removed.`;
      }
      this.m_delEnt = true;
    },

    async confirmDeleteEntity() {
      this.m_delEnt = false;
      if (!this._pendDelEnt) return;
      const { entity, type } = this._pendDelEnt;
      this._pendDelEnt = null;

      // Delete items from DB
      if (type === 'isle') {
        for (const sub of entity.subsections)
          for (const shelf of sub.shelves)
            for (const item of shelf.items)
              await this._removeItemFromDB(item.id);
      } else {
        for (const item of (entity.items || []))
          await this._removeItemFromDB(item.id);
      }

      this._wh.querySelectorAll(`.edit-handle[data-type="${type}"][data-id="${entity.id}"]`).forEach(el => el.remove());
      entity.element.remove();

      if (type === 'isle') {
        const idx = this._isles.indexOf(entity);
        if (idx !== -1) this._isles.splice(idx, 1);
        if (this._selIsle === entity) this._selectIsle(null);
        this.isleCountText = `Isles: ${this._isles.length}`;
        this.statusText    = `Isle "${entity.label}" deleted.`;
      } else {
        const idx = this._zones.indexOf(entity);
        if (idx !== -1) this._zones.splice(idx, 1);
        if (this._selZone === entity) this._selectZone(null);
        this.statusText = `Zone "${entity.label}" deleted.`;
      }
      this._saveLayout();
    },

    // ── Copy / Paste isle ─────────────────────────────────────────────────────

    _copyIsle() {
      if (!this._selIsle) return;
      const isle = this._selIsle;
      this._copiedIsle = {
        row: isle.row || '', color: isle.color, shelfColor: isle.shelfColor,
        fillColor: isle.fillColor || '#ffffff', fillOpacity: isle.fillOpacity ?? 0,
        labelColor: isle.labelColor || isle.color, rotation: isle.rotation || 0,
        facing: isle.facing, dimensions: { ...isle.dimensions },
        shelfLabels: [...isle.shelfLabels],
        subsectionStart: isle.subsectionStart, subsectionCount: isle.subsectionCount,
        position: { ...isle.position },
        subsections: isle.subsections.map(sub => ({
          number: sub.number,
          shelves: sub.shelves.map(sh => ({ shelfNumber: sh.shelfNumber, label: sh.label })),
        })),
        sourceLabel: isle.label,
      };
      this.statusText = `Copied "${isle.label}". Press Ctrl+V to paste.`;
    },

    _openPasteModal() {
      if (!this._copiedIsle) return;
      this.f_pasteIsleName    = this._copiedIsle.sourceLabel + ' (copy)';
      this.mc_pasteIsleSub    = `Copying "${this._copiedIsle.sourceLabel}" — structure, colors, and facing. Items will not be copied.`;
      this.pasteIsleNameError = false;
      this.m_pasteIsle = true;
      this.$nextTick(() => { const el = this.$refs.pasteIsleInput; el?.focus(); el?.select(); });
    },

    pasteIsle() {
      const name = this.f_pasteIsleName.trim();
      if (!name) { this.pasteIsleNameError = true; return; }
      this.pasteIsleNameError = false;
      const src = this._copiedIsle;
      const id  = ++this._isleCounter;
      const x   = Math.min(src.position.x + 30, Math.max(0, this._wh.clientWidth  - src.dimensions.width));
      const y   = Math.min(src.position.y + 30, Math.max(0, this._wh.clientHeight - src.dimensions.height));

      const el = document.createElement('div');
      el.className = 'isle';
      Object.assign(el.style, {
        left:`${x}px`, top:`${y}px`, width:`${src.dimensions.width}px`, height:`${src.dimensions.height}px`,
        borderColor: src.color, transform:`rotate(${src.rotation}deg)`,
      });
      el.dataset.isleId = id;
      el.innerHTML = `<div class="isle-header">${this._isleHeaderHtml(src.row || '', name, src.labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'isle-body';

      const isle = {
        id, label: name, row: src.row || '',
        color: src.color, shelfColor: src.shelfColor,
        fillColor: src.fillColor, fillOpacity: src.fillOpacity,
        labelColor: src.labelColor, rotation: src.rotation, facing: src.facing,
        position: { x, y }, dimensions: { ...src.dimensions }, element: el,
        shelfCount: src.shelfLabels.length, shelfLabels: [...src.shelfLabels],
        subsectionStart: src.subsectionStart, subsectionCount: src.subsectionCount,
        subsections: [], createdAt: new Date().toISOString(),
      };

      src.subsections.forEach(srcSub => {
        const subId = ++this._subsectionCounter;
        const subEl = document.createElement('div');
        subEl.className = `subsection facing-${src.facing}`;
        subEl.dataset.subsectionNum = srcSub.number;
        const numEl = document.createElement('div');
        numEl.className = 'sub-number'; numEl.textContent = srcSub.number;
        subEl.appendChild(numEl);
        const shelvesDiv = document.createElement('div'); shelvesDiv.className = 'sub-shelves';
        const wallEl = document.createElement('div');     wallEl.className = 'wall-indicator';
        const shelves = srcSub.shelves.map(ss => ({
          id: ++this._shelfCounter, isleId: id, subsectionId: subId,
          shelfNumber: ss.shelfNumber, label: ss.label, items: [], element: null,
        }));
        const makeSlot = (sh) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot'; slot.textContent = sh.label;
          slot.style.borderColor = src.shelfColor; sh.element = slot; return slot;
        };
        if (src.facing === 'left') { [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh))); shelvesDiv.appendChild(wallEl); }
        else                       { shelvesDiv.appendChild(wallEl); shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh))); }
        subEl.appendChild(shelvesDiv);
        const subObj = { id: subId, isleId: id, number: srcSub.number, element: subEl, shelves };
        isle.subsections.push(subObj);
        subEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (this._drawMode || this._editMode || this._isleDragMoved) return;
          this._ai = this._isles.find(i => i.id === id); this._asub = subObj;
          this._openShelfSelect(subObj);
        });
        body.appendChild(subEl);
      });

      el.appendChild(body);
      this._applyIsleFill(el, src.fillColor, src.fillOpacity);
      this._wh.appendChild(el);
      this._isles.push(isle);
      this._attachIsleHandlers(isle);
      if (this._editMode) this._createHandles(isle, 'isle');

      this.isleCountText = `Isles: ${this._isles.length}`;
      this.statusText = `Isle "${name}" pasted.`;
      this.m_pasteIsle = false;
      this._saveLayout();
    },

    // ── Background image ──────────────────────────────────────────────────────

    triggerBgImport() { this.$refs.bgFileInput.click(); },
    handleBgFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      const reader = new FileReader();
      reader.onload = (ev) => this._setWarehouseBg(ev.target.result);
      reader.readAsDataURL(file);
    },
    _setWarehouseBg(dataUrl) {
      this._warehouseBg = dataUrl;
      Object.assign(this._wh.style, {
        backgroundImage: `url(${dataUrl})`, backgroundSize:'cover',
        backgroundPosition:'center', backgroundRepeat:'no-repeat',
      });
      this.hasBg = true; this.statusText = 'Background image set.';
      this._saveLayout();
    },
    clearBackground() {
      this._warehouseBg = null;
      this._wh.style.backgroundImage = '';
      this.hasBg = false; this.statusText = 'Background cleared.';
      this._saveLayout();
    },

    // ── Modal helpers ─────────────────────────────────────────────────────────

    closeAllModals() {
      this.m_count = this.m_subs = this.m_labels = this.m_subSel = this.m_shelfSel = false;
      this.m_addShelf = this.m_shelfAct = this.m_addItem = this.m_rmItems = this.m_confDel = false;
      this.m_zone = this.m_pasteIsle = this.m_delEnt = this.m_zoneAct = this.m_zoneItems = false;
      this._ai = null; this._asub = null; this._ash = null; this._azfi = null;
      this._selItemIds.clear(); this._selZoneItemIds.clear();
      this.mc_selItemIds = []; this.mc_selZoneItemIds = [];
      this.mc_selCount = 0; this.mc_zoneSelCount = 0;
    },

    // ── Search ────────────────────────────────────────────────────────────────

    onSearchInput() {
      if (!this.searchQuery.trim()) this.clearSearch();
    },

    runSearch() {
      const query = this.searchQuery.trim();
      if (!query) return;
      this._clearHighlights();
      const q = query.toLowerCase();

      const matches = [];
      for (const isle of this._isles)
        for (const sub of isle.subsections)
          for (const shelf of sub.shelves)
            for (const item of shelf.items)
              if (item.itemId.toLowerCase().includes(q))
                matches.push({ type:'isle', isle, sub, shelf, item });

      const zoneMatches = [];
      for (const zone of this._zones)
        for (const item of zone.items)
          if (item.itemId.toLowerCase().includes(q))
            zoneMatches.push({ type:'zone', zone, item });

      const seenIsles = new Set(), seenSubs = new Set(), seenShelves = new Set(), seenZones = new Set();
      matches.forEach(({ isle, sub, shelf }) => {
        if (!seenIsles.has(isle.id))   { isle.element.classList.add('isle-highlight');   seenIsles.add(isle.id); }
        if (!seenSubs.has(sub.id))     { sub.element.classList.add('sub-highlight');      seenSubs.add(sub.id); }
        if (shelf.element && !seenShelves.has(shelf.id)) { shelf.element.classList.add('shelf-highlight'); seenShelves.add(shelf.id); }
      });
      zoneMatches.forEach(({ zone }) => {
        if (!seenZones.has(zone.id)) { zone.element.classList.add('zone-highlight'); seenZones.add(zone.id); }
      });

      const esc = this._escH.bind(this);
      const results = [];

      matches.forEach(({ isle, sub, shelf, item }) => {
        const html = [
          `<span class="lbl">I:</span>${esc(isle.label)}`,
          `<span class="sep">|</span><span class="lbl">SUB:</span>${sub.number}`,
          `<span class="sep">|</span><span class="lbl">SH:</span>${esc(shelf.label)}`,
          `<span class="sep">|</span><span class="lbl">ID:</span>${esc(item.itemId)}`,
          item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${esc(item.type)}`   : '',
          item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${esc(item.category)}` : '',
        ].filter(Boolean).join('');
        results.push({ html, cardStyle:'', scrollTarget: isle.element });
      });

      zoneMatches.forEach(({ zone, item }) => {
        const html = [
          `<span class="lbl">Z:</span>${esc(zone.label)}`,
          `<span class="sep">|</span><span class="lbl">ID:</span>${esc(item.itemId)}`,
          item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${esc(item.type)}`   : '',
          item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${esc(item.category)}` : '',
        ].filter(Boolean).join('');
        results.push({ html, cardStyle:'border-left-color:#8b5cf6', scrollTarget: zone.element });
      });

      this.searchResults    = results;
      this.showSearchResults = true;
    },

    scrollToResult(result) {
      result.scrollTarget?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    },

    clearSearch() {
      this.searchQuery = '';
      this.searchResults = [];
      this.showSearchResults = false;
      this._clearHighlights();
    },

    _clearHighlights() {
      this._wh.querySelectorAll('.isle-highlight,.sub-highlight,.shelf-highlight,.zone-highlight')
        .forEach(el => el.classList.remove('isle-highlight','sub-highlight','shelf-highlight','zone-highlight'));
    },

    // ── Multi-warehouse / Tabs ────────────────────────────────────────────────

    _syncTabs() {
      this.tabs = this._warehouses.map(wh => ({ id: wh.id, name: wh.name }));
      this.activeTabIdx = this._activeWhIdx;
    },

    _serializeCurrentWarehouse() {
      const wh = this._warehouses[this._activeWhIdx];
      if (!wh) return;
      wh.width      = parseFloat(this._wh.style.width)  || this._wh.clientWidth;
      wh.height     = parseFloat(this._wh.style.height) || this._wh.clientHeight;
      wh.background = this._warehouseBg;
      wh.counters   = {
        isleCounter:       this._isleCounter,
        subsectionCounter: this._subsectionCounter,
        shelfCounter:      this._shelfCounter,
        itemCounter:       this._itemCounter,
        zoneCounter:       this._zoneCounter,
      };
      wh.isles = this._isles.map(isle => ({
        id: isle.id, label: isle.label, row: isle.row || '', color: isle.color, shelfColor: isle.shelfColor,
        fillColor: isle.fillColor || '#ffffff', fillOpacity: isle.fillOpacity ?? 0,
        labelColor: isle.labelColor || isle.color, rotation: isle.rotation || 0, facing: isle.facing,
        position: { ...isle.position }, dimensions: { ...isle.dimensions },
        shelfCount: isle.shelfCount, shelfLabels: [...isle.shelfLabels],
        subsectionStart: isle.subsectionStart, subsectionCount: isle.subsectionCount,
        createdAt: isle.createdAt,
        subsections: isle.subsections.map(sub => ({
          id: sub.id, number: sub.number,
          shelves: sub.shelves.map(sh => ({
            id: sh.id, shelfNumber: sh.shelfNumber, label: sh.label,
            items: sh.items.map(item => ({ ...item })),
          })),
        })),
      }));
      wh.zones = this._zones.map(zone => ({
        id: zone.id, label: zone.label, color: zone.color,
        fillOpacity: zone.fillOpacity ?? 18, labelColor: zone.labelColor || '#444444',
        rotation: zone.rotation || 0,
        position: { ...zone.position }, dimensions: { ...zone.dimensions },
        items: (zone.items || []).map(item => ({ ...item })),
        createdAt: zone.createdAt,
      }));
    },

    switchTab(idx) {
      if (idx === this._activeWhIdx) return;
      this._serializeCurrentWarehouse();
      this._activeWhIdx = idx;
      this._loadWarehouseDOM(this._warehouses[idx]);
      this._syncTabs();
    },

    addTab() {
      this._serializeCurrentWarehouse();
      const id = ++this._whTabCounter;
      this._warehouses.push({
        id, name: `Warehouse ${this._warehouses.length + 1}`,
        width: 800, height: 500, background: null,
        counters: {}, isles: [], zones: [],
      });
      this._activeWhIdx = this._warehouses.length - 1;
      this._loadWarehouseDOM(this._warehouses[this._activeWhIdx]);
      this._syncTabs();
      this._saveLayout();
    },

    removeTab(idx) {
      if (this._warehouses.length <= 1) return;
      this._serializeCurrentWarehouse();
      this._warehouses.splice(idx, 1);
      if (idx < this._activeWhIdx) {
        this._activeWhIdx--;
        this._syncTabs();
      } else if (idx === this._activeWhIdx) {
        this._activeWhIdx = Math.min(idx, this._warehouses.length - 1);
        this._loadWarehouseDOM(this._warehouses[this._activeWhIdx]);
        this._syncTabs();
      } else {
        this._syncTabs();
      }
      this._saveLayout();
    },

    startRenameTab(idx, e) {
      this.renamingTabIdx = idx;
      this.$nextTick(() => {
        const inputs = this.$refs.tabNameInput;
        const input  = Array.isArray(inputs) ? inputs[0] : inputs;
        if (input) { input.focus(); input.select(); }
      });
    },

    commitRenameTab(idx, e) {
      const newName = e.target.value.trim() || this._warehouses[idx].name;
      this._warehouses[idx].name = newName;
      this.renamingTabIdx = -1;
      this._syncTabs();
      this._saveLayout();
    },

    cancelRenameTab(idx) {
      this.renamingTabIdx = -1;
      this._syncTabs();
    },

    _loadWarehouseDOM(wh) {
      this._importLayout({
        warehouse: { width: wh.width || 800, height: wh.height || 500, background: wh.background || null },
        counters:  wh.counters || {},
        isles:     wh.isles   || [],
        zones:     wh.zones   || [],
      });
      this.statusText = `${wh.name} — ${this._isles.length} isle(s), ${this._zones.length} zone(s).`;
    },

    // ── Import / Rebuild ──────────────────────────────────────────────────────

    _importAllWarehouses(data) {
      this._warehouses.length = 0;
      this._whTabCounter = 0;
      (data.warehouses || []).forEach(wh => {
        const id = wh.id || ++this._whTabCounter;
        if (id > this._whTabCounter) this._whTabCounter = id;
        this._warehouses.push({
          id, name: wh.name || `Warehouse ${this._warehouses.length + 1}`,
          width: wh.width || 800, height: wh.height || 500,
          background: wh.background || null, counters: wh.counters || {},
          isles: wh.isles || [], zones: wh.zones || [],
        });
      });
      if (!this._warehouses.length) {
        this._warehouses.push({ id: ++this._whTabCounter, name: 'Warehouse 1',
          width:800, height:500, background:null, counters:{}, isles:[], zones:[] });
      }
      this._activeWhIdx = Math.min(data.activeWarehouseIdx || 0, this._warehouses.length - 1);
      this._loadWarehouseDOM(this._warehouses[this._activeWhIdx]);
      this._syncTabs();
      this.$nextTick(() => this._resetView());
    },

    _importLayout(data) {
      if (this._drawMode) this._cancelDrawMode();
      if (this._editMode) this._cancelEditMode();
      this.closeAllModals();

      this._isles.forEach(i => i.element.remove());
      this._isles.length = 0;
      this._zones.forEach(z => z.element.remove());
      this._zones.length = 0;
      this._removeAllHandles();

      this._wh.style.width  = data.warehouse.width  + 'px';
      this._wh.style.height = data.warehouse.height + 'px';

      if (data.warehouse.background) this._setWarehouseBgSilent(data.warehouse.background);
      else this._clearBgSilent();

      const c = data.counters || {};
      this._isleCounter       = c.isleCounter       || 0;
      this._subsectionCounter = c.subsectionCounter  || 0;
      this._shelfCounter      = c.shelfCounter       || 0;
      this._itemCounter       = c.itemCounter        || 0;
      this._zoneCounter       = c.zoneCounter        || 0;

      (data.isles || []).forEach(d => this._rebuildIsle(d));
      (data.zones || []).forEach(d => this._rebuildZone(d));

      this.isleCountText = `Isles: ${this._isles.length}`;
      // Use rAF to defer until after the browser has computed layout,
      // ensuring getBoundingClientRect() on the viewport returns correct dimensions.
      requestAnimationFrame(() => this._resetView());
    },

    _setWarehouseBgSilent(dataUrl) {
      this._warehouseBg = dataUrl;
      Object.assign(this._wh.style, {
        backgroundImage: `url(${dataUrl})`, backgroundSize:'cover',
        backgroundPosition:'center', backgroundRepeat:'no-repeat',
      });
      this.hasBg = true;
    },
    _clearBgSilent() {
      this._warehouseBg = null;
      this._wh.style.backgroundImage = '';
      this.hasBg = false;
    },

    _rebuildIsle(d) {
      const row = d.row || '', sc = d.shelfColor || '#aaaaaa';
      const fillColor   = d.fillColor   || '#ffffff';
      const fillOpacity = d.fillOpacity ?? 0;
      const labelColor  = d.labelColor  || d.color;
      const rotation    = d.rotation    || 0;

      const el = document.createElement('div');
      el.className = 'isle';
      Object.assign(el.style, {
        left:`${d.position.x}px`, top:`${d.position.y}px`,
        width:`${d.dimensions.width}px`, height:`${d.dimensions.height}px`,
        borderColor: d.color, transform:`rotate(${rotation}deg)`,
      });
      el.dataset.isleId = d.id;
      el.innerHTML = `<div class="isle-header">${this._isleHeaderHtml(row, d.label, labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'isle-body';

      const isle = {
        id: d.id, label: d.label, row, color: d.color, shelfColor: sc,
        fillColor, fillOpacity, labelColor, rotation, facing: d.facing,
        position: { ...d.position }, dimensions: { ...d.dimensions }, element: el,
        shelfCount: (d.shelfLabels || []).length, shelfLabels: [...(d.shelfLabels || [])],
        subsectionStart: d.subsectionStart, subsectionCount: d.subsectionCount,
        subsections: [], createdAt: d.createdAt,
      };

      (d.subsections || []).forEach(sd => {
        const subEl = document.createElement('div');
        subEl.className = `subsection facing-${d.facing}`;
        subEl.dataset.subsectionNum = sd.number;
        const numEl = document.createElement('div');
        numEl.className = 'sub-number'; numEl.textContent = sd.number;
        subEl.appendChild(numEl);

        const shelvesDiv = document.createElement('div'); shelvesDiv.className = 'sub-shelves';
        const wallEl     = document.createElement('div'); wallEl.className = 'wall-indicator';

        const shelves = (sd.shelves || []).map(shd => ({
          id: shd.id, isleId: d.id, subsectionId: sd.id,
          shelfNumber: shd.shelfNumber, label: shd.label,
          items: (shd.items || []).map(item => ({ ...item })), element: null,
        }));

        const makeSlot = (sh) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot'; slot.textContent = sh.label;
          slot.style.borderColor = sc; sh.element = slot; return slot;
        };

        if (d.facing === 'left') {
          [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
          shelvesDiv.appendChild(wallEl);
        } else {
          shelvesDiv.appendChild(wallEl);
          shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: sd.id, isleId: d.id, number: sd.number, element: subEl, shelves };
        isle.subsections.push(subObj);

        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this._drawMode || this._editMode || this._isleDragMoved) return;
          this._ai   = this._isles.find(i => i.id === d.id);
          this._asub = subObj;
          this._openShelfSelect(subObj);
        });
        body.appendChild(subEl);
      });

      el.appendChild(body);
      this._applyIsleFill(el, fillColor, fillOpacity);
      this._wh.appendChild(el);
      this._isles.push(isle);
      this._attachIsleHandlers(isle);
    },

    _rebuildZone(d) {
      const fillOpacity = d.fillOpacity ?? 18;
      const labelColor  = d.labelColor  || '#444444';
      const rotation    = d.rotation    || 0;
      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, {
        left:`${d.position.x}px`, top:`${d.position.y}px`,
        width:`${d.dimensions.width}px`, height:`${d.dimensions.height}px`,
        borderColor: d.color, transform:`rotate(${rotation}deg)`,
      });
      this._applyZoneFill(el, d.color, fillOpacity);
      el.dataset.zoneId = d.id;
      const lblEl = document.createElement('div');
      lblEl.className = 'zone-label'; lblEl.textContent = d.label; lblEl.style.color = labelColor;
      el.appendChild(lblEl);
      this._wh.appendChild(el);
      const zone = {
        id: d.id, label: d.label, color: d.color, fillOpacity, labelColor, rotation,
        position: { ...d.position }, dimensions: { ...d.dimensions },
        items: (d.items || []).map(i => ({ ...i })), element: el, createdAt: d.createdAt,
      };
      this._zones.push(zone);
      this._attachZoneHandlers(zone);
    },
  },
}).mount('#app');
