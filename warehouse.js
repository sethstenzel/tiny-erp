const { createApp } = Vue;

// ── Frontend error reporting ──────────────────────────────────────────────────
function _sendVueError(message, info, stack, source) {
  try {
    fetch('/api/log-vue-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(message || ''),
        info:    String(info    || ''),
        stack:   String(stack   || ''),
        source:  String(source  || ''),
        url:     window.location.href,
      }),
    }).catch(() => {}); // swallow network errors to avoid loops
  } catch (_) {}
}

window.addEventListener('error', (e) => {
  _sendVueError(e.message, '', e.error?.stack || '', `${e.filename}:${e.lineno}:${e.colno}`);
});

window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  _sendVueError(r?.message || String(r ?? 'Unhandled rejection'), '', r?.stack || '', 'unhandledrejection');
});

const _vueApp = createApp({
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
      m_confDel:    false,
      m_confDelSub: false,
      m_confDelItem: false,
      m_reorderTabs: false,
      reorderList:   [],
      reorderSelIdx: -1,
      m_bulkAdd:     false,
      m_zoneBulkAdd: false,
      m_viewItems:   false,
      m_itemDetail:  false,
      m_editItem:    false,
      mc_activeItem: null,
      f_editItemId:       '',
      f_editItemType:     '',
      f_editItemCategory: '',
      f_editItemTags:     '',
      f_editItemUrl:      '',
      f_editItemNotes:    '',
      editItemError:      '',
      f_bulkText:       '',
      bulkAddError:     '',
      f_zoneBulkText:   '',
      zoneBulkAddError: '',
      m_zone:      false,
      m_pastePalletRack: false,
      m_pasteZone: false,
      m_warn:      false,
      warnModal:   { title: '', message: '' },
      m_delEnt:    false,
      m_zoneAct:   false,
      m_zoneItems: false,
      m_moveDest:  false,
      relocateMode: false,

      // Connectivity
      isOffline:     false,
      m_offlineModal: false,

      // Inspector panel (floating menu)
      insp_show:        false,
      insp_type:        '',      // 'pallet-rack' | 'zone'
      insp_name:        '',
      insp_row:         '',
      insp_color:       '#4285f4',
      insp_labelColor:  '#4285f4',
      insp_fillColor:   '#ffffff',
      insp_fillOpacity: 0,
      insp_hideLabel:   false,
      insp_hideHeader:  false,
      insp_itemFree:    false,
      insp_nameError:   false,
      insp_shelfOrder:  'right',

      // Form: Pallet Rack step 1
      f_palletRackRow:        '',
      f_palletRackName:       '',
      f_shelfCount:     1,
      f_palletRackColor:      '#4285f4',
      f_palletRackLabelColor: '#4285f4',
      f_shelfColor:     '#aaaaaa',
      f_palletRackFillColor:  '#ffffff',
      f_palletRackFillOpacity: 0,
      f_palletRackFacing:     'right',

      // Form: Pallet Rack step 2
      f_subStart: 1,
      f_subCount: 1,

      // Form: Pallet Rack step 3 – shelf labels
      f_shelfLabelsList: [], // [{label:'A'}, ...]

      // Form: Zone
      f_zoneLabel:       '',
      f_zoneColor:       '#ff0000',
      f_zoneNameColor:   '#444444',
      f_zoneFillOpacity: 18,
      f_zoneHideLabel:   false,
      f_zoneItemFree:    false,

      // Form: misc
      f_addShelfName:  '',
      f_itemId:        '',
      f_itemType:      '',
      f_itemCategory:  '',
      f_itemNotes:     '',
      f_itemTags:      '',
      f_itemUrl:       '',
      f_pastePalletRackName:  '',
      f_pasteZoneName:  '',
      f_subName:        '',
      f_shelfActName:   '',

      // Validation error flags
      palletRackNameError:      false,
      addShelfNameError:  false,
      itemIdError:        false,
      addItemLocErr:      '',
      zoneLabelError:     false,
      pastePalletRackNameError: false,
      pasteZoneNameError: false,
      subNameError:       false,
      shelfActNameError:  false,

      // Name lock state
      subNameLocked:   true,
      shelfNameLocked: true,

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
      mc_confDelSubMsg:  '',
      mc_confDelItemMsg: '',
      mc_delEntTitle:    'Delete?',
      mc_delEntMsg:      '',
      mc_zoneActTitle:   'Zone',
      mc_zoneActSub:     '',
      mc_zoneItemsTitle: 'Zone Items',
      mc_zoneItemList:   [],
      mc_selZoneItemIds: [],
      mc_zoneSelCount:   0,
      mc_pastePalletRackSub:   '',
      mc_pasteZoneSub:   '',

      // Move items
      mv_step:       'pallet-rack',   // 'pallet-rack' | 'sub' | 'shelf'
      mv_srcLabel:   '',
      mv_palletRacks: [],
      mv_subs:    [],
      mv_shelves: [],

      // Search
      searchQuery:      '',
      searchResults:    [],
      showSearchResults: false,

      // Console log strip
      consoleLogs: [],

      // Nav dropdowns
      navPROpen:      false,
      navZonesOpen:   false,
      navPalletRacks: [],
      navZones:       [],

      // Status / info
      statusText:    'Click "Add Pallet Rack" then draw inside the warehouse.',
      palletRackCountText: 'Pallet Racks: 0',
      zoomText:      '100%',

      // Tabs
      tabs:         [],
      activeTabIdx: 0,
      renamingTabIdx: -1,

      // UI flags
      editActive:    false,
      addPalletRackActive: false,
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
     WATCHERS – live-update pending pallet rack/zone when color pickers change
  ══════════════════════════════════════════ */
  watch: {
    f_palletRackColor(v) {
      if (!this._pi) return;
      this._pi.color = v;
      this._pi.element.style.borderColor = v;
    },
    f_palletRackLabelColor(v) {
      if (!this._pi) return;
      this._pi.labelColor = v;
      const lbl = this._pi.element.querySelector('.pallet-rack-label');
      if (lbl) lbl.style.color = v;
    },
    f_palletRackFillColor()   { this._applyPendingIsleFill(); },
    f_palletRackFillOpacity() { this._applyPendingIsleFill(); },
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

    // Inspector panel — live DOM updates when color/opacity fields change
    insp_color(v) {
      if (!this._inspEntity) return;
      this._inspEntity.color = v;
      this._inspEntity.element.style.borderColor = v;
      if (this.insp_type === 'zone') {
        this._applyZoneFill(this._inspEntity.element, v, this._inspEntity.fillOpacity);
      }
    },
    insp_labelColor(v) {
      if (!this._inspEntity) return;
      this._inspEntity.labelColor = v;
      const sel = this.insp_type === 'pallet-rack' ? '.pallet-rack-label' : '.zone-label';
      const lbl = this._inspEntity.element.querySelector(sel);
      if (lbl) lbl.style.color = v;
    },
    insp_fillColor(v) {
      if (!this._inspEntity || this.insp_type !== 'pallet-rack') return;
      this._inspEntity.fillColor = v;
      this._applyPalletRackFill(this._inspEntity.element, v, this._inspEntity.fillOpacity);
    },
    insp_fillOpacity(v) {
      if (!this._inspEntity) return;
      this._inspEntity.fillOpacity = v;
      if (this.insp_type === 'pallet-rack') {
        this._applyPalletRackFill(this._inspEntity.element, this._inspEntity.fillColor || '#ffffff', v);
      } else {
        this._applyZoneFill(this._inspEntity.element, this._inspEntity.color, v);
      }
    },
    insp_hideLabel(v) {
      if (!this._inspEntity) return;
      this._inspEntity.hideLabel = v;
      const lbl = this._inspEntity.element.querySelector('.zone-label');
      if (lbl) lbl.style.display = v ? 'none' : '';
    },
    insp_hideHeader(v) {
      if (!this._inspEntity) return;
      this._inspEntity.hideHeader = v;
      const hdr = this._inspEntity.element.querySelector('.pallet-rack-header');
      if (hdr) hdr.style.display = v ? 'none' : '';
      this._saveLayout();
    },
    insp_itemFree(v) {
      if (!this._inspEntity) return;
      this._inspEntity.itemFree = v;
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
    await this._loadFromDB();
    this._startLayoutPoll();
    this._startPing();
  },

  /* ══════════════════════════════════════════
     METHODS
  ══════════════════════════════════════════ */
  methods: {

    // ── Initialisation ──────────────────────────────────────────────────────

    _initNonReactive() {
      // All non-reactive state lives as instance vars with _ prefix
      this._palletRacks = [];
      this._zones = [];
      this._palletRackCounter       = 0;
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

      // Pallet rack drag
      this._isDragPalletRack   = false; this._dragPalletRack = null;
      this._palletRackSMX = 0; this._palletRackSMY = 0;
      this._palletRackSX  = 0; this._palletRackSY  = 0;
      this._palletRackDragMoved = false;

      // Zone drag
      this._isDragZone   = false; this._dragZone = null;
      this._zoneDragMoved = false;
      this._zoneSMX = 0; this._zoneSMY = 0;
      this._zoneSX  = 0; this._zoneSY  = 0;

      // Active selections
      this._pi   = null;  // pending pallet rack
      this._pz   = null;  // pending zone
      this._ai   = null;  // active pallet rack
      this._asub = null;  // active subsection
      this._ash  = null;  // active shelf
      this._azfi = null;  // active zone for items
      this._selPalletRack   = null;
      this._selZone   = null;
      this._selPalletRacks  = [];   // multi-selection arrays
      this._selZones  = [];
      this._copiedPalletRack = null;
      this._copiedZone = null;

      // Multi-drag
      this._isDragMulti = false;
      this._dragMultiSMX = 0; this._dragMultiSMY = 0;
      this._multiDragStartPositions = [];

      // Rubber-band selection
      this._isRubberBand = false;
      this._rbStartX = 0; this._rbStartY = 0;
      this._pendDelEnt = null;

      this._selItemIds     = new Set();
      this._selZoneItemIds = new Set();

      // Move items
      this._itemsToMove = [];
      this._mvSrcPalletRack = null; this._mvSrcSub = null; this._mvSrcShelf = null;
      this._mvDestPalletRack = null; this._mvDestSub = null;

      // Single-item relocate (Move button in item detail)
      this._relocateItem       = null;
      this._relocateSrcShelf   = null;
      this._relocateSrcZone    = null;
      this._relocateSrcWhIdx   = -1;
      this._activeItemDetailZone = null;

      // Edit pallet rack properties
      this._editingPalletRack = null;

      // Inspector panel
      this._inspEntity = null;

      this._warehouseBg    = null;

      this._SNAP = 12;
      this._EDGES = ['nw','n','ne','e','se','s','sw','w'];

      // Touch / pinch-zoom
      this._isPinching      = false;
      this._touchPinchDist  = 0;
      this._touchPinchMidX  = 0;
      this._touchPinchMidY  = 0;

      // Touch double-tap detection for entity activation (normal mode)
      this._tapStartX   = 0;
      this._tapStartY   = 0;
      this._tapStartEl  = null;
      this._lastTapTime = 0;
      this._lastTapEl   = null;

      // Touch double-tap detection for inspector (edit mode)
      this._editTapEl       = null;
      this._editTapX        = 0;
      this._editTapY        = 0;
      this._lastEditTapEl   = null;
      this._lastEditTapTime = 0;

      // Live polling
      this._pollSeq      = 0;
      this._pollPending  = 0;  // non-zero = a newer seq is waiting to be applied
      this._pollTimer    = null;
      this._silentImport = false;

      // Keep-alive / connectivity
      this._pingTimer     = null;
      this._offlineSince  = null;  // Date.now() of first consecutive ping failure

      // Cross-warehouse scroll target (set before switchTab, consumed by _resetView)
      this._pendingScrollEl = null;


      // Session view-state persistence (pan/zoom across page navigations)
      // Read BEFORE any _resetView() can overwrite sessionStorage.
      this._sessionView = null;
      try {
        const s = sessionStorage.getItem('wh_view');
        if (s) this._sessionView = JSON.parse(s);
      } catch (e) {}
      this._sessionRestoreApplied = false;
      this._sessionRestoreTimer   = null;
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
          const entity = type === 'pallet-rack' ? this._palletRacks.find(i => i.id === id) : this._zones.find(z => z.id === id);
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
        // Edit mode: rubber-band selection on empty warehouse space
        if (this._editMode && e.button === 0 && !e.target.closest('.pallet-rack') && !e.target.closest('.zone') && !handle) {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) { this._clearAllSelection(); this._closeInspector(); }
          this._isRubberBand = true;
          const rp = this._relPos(e);
          this._rbStartX = rp.x; this._rbStartY = rp.y;
          Object.assign(this._prev.style, { left:`${rp.x}px`, top:`${rp.y}px`, width:'0', height:'0', display:'block' });
          this._prev.classList.add('rubber-band');
          e.preventDefault();
          return;
        }
        // Draw mode
        if (!this._drawMode || e.button !== 0 || e.target.closest('.pallet-rack') || e.target.closest('.zone')) return;
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

      this._initTouchEventListeners();
    },

    _initTouchEventListeners() {
      const vp = this._vp;

      // ── touchstart ──────────────────────────────────────────────────────────
      vp.addEventListener('touchstart', (e) => {
        // Two-finger pinch-to-zoom
        if (e.touches.length === 2) {
          e.preventDefault();
          this._isPinching = true;
          this._isPanning  = false;
          this._tapStartEl = null;
          this._vp.classList.remove('panning');
          const t0 = e.touches[0], t1 = e.touches[1];
          this._touchPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          const vr = vp.getBoundingClientRect();
          this._touchPinchMidX = (t0.clientX + t1.clientX) / 2 - vr.left;
          this._touchPinchMidY = (t0.clientY + t1.clientY) / 2 - vr.top;
          return;
        }

        if (e.touches.length !== 1) return;
        const t = e.touches[0];

        // Edit handle (resize / rotate)
        const handle = e.target.closest('.edit-handle');
        if (handle && this._editMode) {
          e.preventDefault(); e.stopPropagation();
          const type   = handle.dataset.type;
          const id     = parseInt(handle.dataset.id);
          const entity = type === 'pallet-rack'
            ? this._palletRacks.find(i => i.id === id)
            : this._zones.find(z => z.id === id);
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
            this._rotStartMouseAngle = Math.atan2(t.clientY - this._rotCY, t.clientX - this._rotCX) * 180 / Math.PI;
          } else {
            this._isEntResize = true;
            this._entResizeTarget = entity; this._entResizeType = type;
            this._entResizeEdge   = handle.dataset.edge;
            this._entResizeSMX = t.clientX; this._entResizeSMY = t.clientY;
            this._entResizeSX  = entity.position.x;    this._entResizeSY  = entity.position.y;
            this._entResizeSW  = entity.dimensions.width; this._entResizeSH = entity.dimensions.height;
          }
          return;
        }

        // Edit mode: entity drag (pallet rack)
        const palletRackEl = e.target.closest('.pallet-rack');
        if (this._editMode && palletRackEl) {
          e.preventDefault();
          const palletRack = this._palletRacks.find(i => i.element === palletRackEl);
          if (!palletRack) return;
          if (!this._selPalletRacks.includes(palletRack)) {
            this._clearAllSelection();
            this._addPalletRackToSelection(palletRack);
          }
          const totalSel = this._selPalletRacks.length + this._selZones.length;
          if (totalSel > 1) {
            this._isDragMulti = true;
            this._dragMultiSMX = t.clientX; this._dragMultiSMY = t.clientY;
            this._multiDragStartPositions = [
              ...this._selPalletRacks.map(i => ({ entity: i, type: 'pallet-rack', sx: i.position.x, sy: i.position.y })),
              ...this._selZones.map(z => ({ entity: z, type: 'zone', sx: z.position.x, sy: z.position.y })),
            ];
            this._palletRackDragMoved = false;
          } else {
            this._isDragPalletRack = true; this._dragPalletRack = palletRack;
            this._palletRackDragMoved = false;
            this._palletRackSMX = t.clientX; this._palletRackSMY = t.clientY;
            this._palletRackSX  = palletRack.position.x; this._palletRackSY = palletRack.position.y;
          }
          // Track for double-tap inspector opening
          this._editTapEl = palletRackEl;
          this._editTapX  = t.clientX;
          this._editTapY  = t.clientY;
          return;
        }

        // Edit mode: entity drag (zone)
        const zoneEl = e.target.closest('.zone');
        if (this._editMode && zoneEl) {
          e.preventDefault();
          const zone = this._zones.find(z => z.element === zoneEl);
          if (!zone) return;
          if (!this._selZones.includes(zone)) {
            this._clearAllSelection();
            this._addZoneToSelection(zone);
          }
          const totalSel = this._selPalletRacks.length + this._selZones.length;
          if (totalSel > 1) {
            this._isDragMulti = true;
            this._dragMultiSMX = t.clientX; this._dragMultiSMY = t.clientY;
            this._multiDragStartPositions = [
              ...this._selPalletRacks.map(i => ({ entity: i, type: 'pallet-rack', sx: i.position.x, sy: i.position.y })),
              ...this._selZones.map(z => ({ entity: z, type: 'zone', sx: z.position.x, sy: z.position.y })),
            ];
            this._zoneDragMoved = false;
          } else {
            this._isDragZone = true; this._dragZone = zone;
            this._zoneDragMoved = false;
            this._zoneSMX = t.clientX; this._zoneSMY = t.clientY;
            this._zoneSX = zone.position.x; this._zoneSY = zone.position.y;
          }
          // Track for double-tap inspector opening
          this._editTapEl = zoneEl;
          this._editTapX  = t.clientX;
          this._editTapY  = t.clientY;
          return;
        }

        // Draw mode: finger on empty warehouse space
        if (this._drawMode && !e.target.closest('.pallet-rack') && !e.target.closest('.zone')) {
          const wb = this._wh.getBoundingClientRect();
          if (t.clientX >= wb.left && t.clientX <= wb.right && t.clientY >= wb.top && t.clientY <= wb.bottom) {
            e.preventDefault();
            const fakeE = { clientX: t.clientX, clientY: t.clientY };
            this._isDrawing = true;
            const p = this._snapPt(...Object.values(this._relPos(fakeE)));
            this._startX = p.x; this._startY = p.y;
            Object.assign(this._prev.style, { left:`${p.x}px`, top:`${p.y}px`, width:'0', height:'0', display:'block' });
            return;
          }
        }

        // Edit mode: rubber-band selection on empty warehouse space
        if (this._editMode && !e.target.closest('.pallet-rack') && !e.target.closest('.zone')) {
          const wb = this._wh.getBoundingClientRect();
          if (t.clientX >= wb.left && t.clientX <= wb.right && t.clientY >= wb.top && t.clientY <= wb.bottom) {
            e.preventDefault();
            this._clearAllSelection(); this._closeInspector();
            this._isRubberBand = true;
            const fakeE = { clientX: t.clientX, clientY: t.clientY };
            const rp = this._relPos(fakeE);
            this._rbStartX = rp.x; this._rbStartY = rp.y;
            Object.assign(this._prev.style, { left:`${rp.x}px`, top:`${rp.y}px`, width:'0', height:'0', display:'block' });
            this._prev.classList.add('rubber-band');
            return;
          }
        }

        // Normal mode entity touch: record for double-tap; defer panning until finger moves
        if (!this._editMode && !this._drawMode &&
            (e.target.closest('.pallet-rack') || e.target.closest('.zone'))) {
          e.preventDefault();
          this._tapStartEl = e.target.closest('.pallet-rack') || e.target.closest('.zone');
          this._tapStartX  = t.clientX;
          this._tapStartY  = t.clientY;
          return; // panning starts in touchmove only if finger actually moves
        }

        // Default: single-finger pan on empty space
        this._tapStartEl = null;
        this._tapStartX  = t.clientX;
        this._tapStartY  = t.clientY;
        e.preventDefault();
        this._isPanning = true;
        this._panLastX = t.clientX; this._panLastY = t.clientY;
        this._vp.classList.add('panning');
      }, { passive: false });

      // ── touchmove ───────────────────────────────────────────────────────────
      window.addEventListener('touchmove', (e) => {
        // Pinch-zoom
        if (this._isPinching && e.touches.length === 2) {
          e.preventDefault();
          const t0 = e.touches[0], t1 = e.touches[1];
          const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
          const vr = this._vp.getBoundingClientRect();
          const newMidX = (t0.clientX + t1.clientX) / 2 - vr.left;
          const newMidY = (t0.clientY + t1.clientY) / 2 - vr.top;
          // Translate pan so old midpoint content appears at new midpoint
          this._panX += newMidX - this._touchPinchMidX;
          this._panY += newMidY - this._touchPinchMidY;
          // Scale centered on new midpoint
          if (this._touchPinchDist > 0) {
            this._zoomAt(newDist / this._touchPinchDist, newMidX, newMidY);
          } else {
            this._applyTransform();
          }
          this._touchPinchDist = newDist;
          this._touchPinchMidX = newMidX;
          this._touchPinchMidY = newMidY;
          return;
        }

        if (e.touches.length === 1) {
          const t = e.touches[0];
          // Edit-mode tap: cancel inspector double-tap if finger dragged
          if (this._editTapEl &&
              Math.hypot(t.clientX - this._editTapX, t.clientY - this._editTapY) >= 15) {
            this._editTapEl     = null;
            this._lastEditTapEl = null;
          }

          // Normal-mode entity tap pending: convert to pan only once finger moves enough
          if (this._tapStartEl) {
            if (Math.hypot(t.clientX - this._tapStartX, t.clientY - this._tapStartY) >= 15) {
              this._tapStartEl = null;
              this._lastTapEl  = null; // movement cancels the double-tap chain
              this._isPanning  = true;
              this._panLastX   = t.clientX; this._panLastY = t.clientY;
              this._vp.classList.add('panning');
              e.preventDefault();
            }
            return; // don't forward to _onMouseMove while a tap may still be in progress
          }
          const fakeE = { clientX: t.clientX, clientY: t.clientY, button: 0, shiftKey: false, ctrlKey: false, metaKey: false };
          this._onMouseMove(fakeE);
          if (this._isPanning || this._isDrawing || this._isEntResize || this._isRotating ||
              this._isDragPalletRack || this._isDragZone || this._isDragMulti || this._isRubberBand) {
            e.preventDefault();
          }
        }
      }, { passive: false });

      // ── touchend / touchcancel ───────────────────────────────────────────────
      const endTouch = (e) => {
        if (this._isPinching) {
          this._isPinching = false;
          this._tapStartEl = null;
          // If one finger remains, transition to pan
          if (e.touches.length === 1) {
            const t = e.touches[0];
            this._isPanning = true;
            this._panLastX = t.clientX; this._panLastY = t.clientY;
          }
          return;
        }

        if (e.touches.length === 0) {
          if (this._isPanning) { this._isPanning = false; this._vp.classList.remove('panning'); }
          const ct = e.changedTouches[0];
          if (ct) {
            const fakeE = { clientX: ct.clientX, clientY: ct.clientY, button: 0, shiftKey: false, ctrlKey: false, metaKey: false };

            // Edit-mode double-tap: open inspector on second tap, drag cleanup always runs
            if (this._editTapEl &&
                Math.hypot(ct.clientX - this._editTapX, ct.clientY - this._editTapY) < 15) {
              const now = Date.now();
              const el = this._editTapEl;
              this._editTapEl = null;
              if (this._lastEditTapEl === el && now - this._lastEditTapTime < 350) {
                this._lastEditTapEl = null; this._lastEditTapTime = 0;
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              } else {
                this._lastEditTapEl = el; this._lastEditTapTime = now;
              }
              this._onMouseUp(fakeE); // always clean up drag state
              return;
            }
            this._editTapEl = null;

            // Normal-mode double-tap entity detection
            if (this._tapStartEl &&
                Math.hypot(ct.clientX - this._tapStartX, ct.clientY - this._tapStartY) < 15) {
              const now = Date.now();
              const el = this._tapStartEl;
              this._tapStartEl = null;
              if (this._lastTapEl === el && now - this._lastTapTime < 350) {
                // Second tap within 350 ms on the same entity → activate it
                this._lastTapEl = null; this._lastTapTime = 0;
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              } else {
                // First tap — record for possible second tap
                this._lastTapEl = el; this._lastTapTime = now;
              }
              return;
            }
            // Non-entity tap or significant movement: reset double-tap chain
            this._tapStartEl = null;
            this._lastTapEl  = null;
            this._onMouseUp(fakeE);
          }
        }
      };
      window.addEventListener('touchend',    endTouch, { passive: false });
      window.addEventListener('touchcancel', endTouch, { passive: false });
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
        this._pollSeq = layoutData._seq ?? 0;

        if (layoutData.warehouses && layoutData.warehouses.length > 0) {
          this._mergeItems(layoutData, items);
          this._importAllWarehouses(layoutData);
        } else {
          // DB returned no layout — genuinely first run, safe to persist a blank warehouse
          this._freshWarehouse(true);
        }
      } catch (err) {
        // Network or parse error (e.g. rapid refresh aborting the request).
        // Show a blank UI so the app is usable, but DO NOT save — the real
        // layout is still in the DB and must not be overwritten with empty data.
        console.error('Load from DB failed:', err);
        _sendVueError(err?.message || String(err), 'loadFromDB', err?.stack || '', 'warehouse.js:_loadFromDB');
        this._freshWarehouse(false);
      }
    },

    _freshWarehouse(persist = false) {
      this._whTabCounter = 1;
      this._activeWhIdx  = 0;
      this._warehouses.push({
        id: 1, name: 'Warehouse 1',
        width: 800, height: 500, background: null,
        counters: { palletRackCounter:0, subsectionCounter:0, shelfCounter:0, itemCounter:0, zoneCounter:0 },
        palletRacks: [], zones: [],
      });
      // Render the warehouse square and set its inline dimensions before centering
      this._loadWarehouseDOM(this._warehouses[0]);
      this._syncTabs();
      // Only persist when we know the DB was genuinely empty (first-run).
      // Never persist when called as a fallback from a failed network request.
      if (persist && this.isAdmin) this._saveLayout();
      this.$nextTick(() => this._resetView());
    },

    _mergeItems(layoutData, items) {
      for (const wh of (layoutData.warehouses || [])) {
        for (const palletRack of (wh.palletRacks || wh.isles || [])) {
          for (const sub of (palletRack.subsections || [])) {
            for (const shelf of (sub.shelves || [])) {
              shelf.items = items
                .filter(it => it.shelf_id === shelf.id && it.location_type === 'shelf')
                .map(it => ({
                  id: it.id, itemId: it.item_id,
                  type: it.item_type, category: it.category,
                  tags: it.tags || '', url: it.url || '',
                  notes: it.notes, addedAt: it.added_at,
                  shelfId: it.shelf_id, subsectionId: it.subsection_id, palletRackId: it.pallet_rack_id,
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
          palletRacks: (wh.palletRacks || wh.isles || []).map(palletRack => ({
            ...palletRack,
            subsections: (palletRack.subsections || []).map(sub => ({
              ...sub,
              shelves: (sub.shelves || []).map(({ items, element, ...rest }) => rest),
            })),
          })),
          zones: (wh.zones || []).map(({ items, element, ...rest }) => rest),
        })),
      };
      try {
        const resp = await fetch('/api/layout', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        });
        if (resp.ok) this._syncPollSeq(await resp.json());
      } catch (err) {
        console.error('Save layout failed:', err);
        _sendVueError(err?.message || String(err), 'saveLayout', err?.stack || '', 'warehouse.js:_saveLayout');
      }
    },

    async _addItemToDB(payload) {
      try {
        const resp = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const result = await resp.json();
        this._syncPollSeq(result);
        return result.id;
      } catch (err) {
        console.error('Add item to DB failed:', err);
        _sendVueError(err?.message || String(err), `addItemToDB: ${payload.item_id}`, err?.stack || '', 'warehouse.js:_addItemToDB');
        throw err;
      }
    },

    async _removeItemFromDB(dbId) {
      try {
        const resp = await fetch(`/api/items/${dbId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        this._syncPollSeq(await resp.json());
      } catch (err) {
        console.error('Delete item failed:', err);
        _sendVueError(err?.message || String(err), `removeItemFromDB: id=${dbId}`, err?.stack || '', 'warehouse.js:_removeItemFromDB');
      }
    },

    // ── Console log ──────────────────────────────────────────────────────────

    _log(text, type = 'info') {
      const now  = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.consoleLogs.push({ text, type, time });
      if (this.consoleLogs.length > 200) this.consoleLogs.shift();
      this.$nextTick(() => {
        const el = this.$refs.consoleEl;
        if (el) el.scrollTop = el.scrollHeight;
      });
    },

    // ── Utilities ────────────────────────────────────────────────────────────

    _rndHex() {
      return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    },
    _hexRgba(hex, alpha) {
      const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    },
    _applyPalletRackFill(el, fillColor, fillOpacity) {
      el.style.background = fillOpacity > 0 ? this._hexRgba(fillColor, fillOpacity / 100) : 'transparent';
    },
    _applyZoneFill(el, borderColor, fillOpacity) {
      el.style.background = this._hexRgba(borderColor, fillOpacity / 100);
    },
    _applyPendingIsleFill() {
      if (!this._pi) return;
      const c = this.f_palletRackFillColor, o = this.f_palletRackFillOpacity;
      this._pi.fillColor   = c;
      this._pi.fillOpacity = o;
      this._applyPalletRackFill(this._pi.element, c, o);
    },
    _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
    _escH(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },
    _palletRackHeaderHtml(row, label, labelColor) {
      const badge = row ? `<span class="pallet-rack-row-badge">${this._escH(row)}</span>` : '';
      return `${badge}<span class="pallet-rack-label" style="color:${this._escH(labelColor)}">${this._escH(label)}</span>`;
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
      if (!this._palletRacks.length && !this._zones.length) return { x, y };
      const vE = [], hE = [];
      for (const i of this._palletRacks) { vE.push(i.position.x, i.position.x + i.dimensions.width);  hE.push(i.position.y, i.position.y + i.dimensions.height); }
      for (const z of this._zones) { vE.push(z.position.x, z.position.x + z.dimensions.width); hE.push(z.position.y, z.position.y + z.dimensions.height); }
      let sx = x, bdx = this._SNAP + 1;
      for (const ex of vE) { const d = Math.abs(x - ex); if (d < bdx) { bdx = d; sx = ex; } }
      let sy = y, bdy = this._SNAP + 1;
      for (const ey of hE) { const d = Math.abs(y - ey); if (d < bdy) { bdy = d; sy = ey; } }
      return { x: sx, y: sy };
    },

    _snapIsleMove(palletRack, nx, ny) {
      const w = palletRack.dimensions.width, h = palletRack.dimensions.height;
      const vE = [0, this._wh.clientWidth], hE = [0, this._wh.clientHeight];
      for (const o of this._palletRacks) {
        if (o.id === palletRack.id) continue;
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
      for (const i of this._palletRacks) { vE.push(i.position.x, i.position.x + i.dimensions.width); hE.push(i.position.y, i.position.y + i.dimensions.height); }
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
      // Round pan to integer pixels so content always sits on a whole-pixel boundary.
      // Fractional translate values cause text to render on a sub-pixel grid → blur.
      const x = Math.round(this._panX);
      const y = Math.round(this._panY);
      this._pzl.style.transform = `translate(${x}px,${y}px) scale(${this._currentZoom})`;
      // Persist view state to sessionStorage so it survives navigation to/from search page.
      // Only save after initialization is complete (flag prevents overwriting the
      // original session data before we've had a chance to restore it).
      if (this._sessionRestoreApplied) {
        try {
          sessionStorage.setItem('wh_view', JSON.stringify({
            panX: this._panX, panY: this._panY, zoom: this._currentZoom,
          }));
        } catch (e) {}
      }
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
      const vr = this._vp.getBoundingClientRect();
      // Guard: if viewport hasn't been laid out yet, defer and retry
      if (vr.width === 0 || vr.height === 0) {
        requestAnimationFrame(() => this.resetView());
        return;
      }
      const pad    = 40;
      const scaleX = (vr.width  - pad * 2) / this._wh.offsetWidth;
      const scaleY = (vr.height - pad * 2) / this._wh.offsetHeight;
      const scale  = Math.min(scaleX, scaleY, 1);
      this._currentZoom = scale;
      this._panX = (vr.width  - this._wh.offsetWidth  * scale) / 2;
      this._panY = (vr.height - this._wh.offsetHeight * scale) / 2;
      this._applyTransform();
      this.zoomText = `${Math.round(scale * 100)}%`;
    },
    _panToElement(el) {
      const elRect = el.getBoundingClientRect();
      const vpRect = this._vp.getBoundingClientRect();
      this._panX = Math.round(this._panX + (vpRect.left + vpRect.width  / 2) - (elRect.left + elRect.width  / 2));
      this._panY = Math.round(this._panY + (vpRect.top  + vpRect.height / 2) - (elRect.top  + elRect.height / 2));
      this._applyTransform();
    },
    // Like _panToElement but also zooms in so the element's height fills ≥50% of the viewport.
    _zoomPanToElement(el) {
      const elRect = el.getBoundingClientRect();
      const vpRect = this._vp.getBoundingClientRect();
      // Logical (canvas-space) height of the element at current zoom
      const logicalH = elRect.height / this._currentZoom;
      // Zoom needed so element height = 25% of viewport height
      const minZoom = (vpRect.height * 0.25) / logicalH;
      // Only zoom in, never zoom out; cap at 5× to avoid extreme close-ups
      const newZoom = Math.min(Math.max(this._currentZoom, minZoom), 5);
      // Element's centre in canvas coordinates (zoom-independent)
      const elCX = (elRect.left + elRect.width  / 2 - vpRect.left - this._panX) / this._currentZoom;
      const elCY = (elRect.top  + elRect.height / 2 - vpRect.top  - this._panY) / this._currentZoom;
      // Recalculate pan so element centre lands at viewport centre under new zoom
      this._panX = Math.round(vpRect.width  / 2 - elCX * newZoom);
      this._panY = Math.round(vpRect.height / 2 - elCY * newZoom);
      this._currentZoom = newZoom;
      this._applyTransform();
      this.zoomText = `${Math.round(newZoom * 100)}%`;
    },

    _resetView() {
      this.resetView();
      // After the LAST _resetView() call during initialization, restore the saved
      // session view if one exists. clearTimeout + setTimeout(0) debounces so that
      // even if _resetView() fires multiple times (from $nextTick + rAF), only
      // the final invocation triggers the restore.
      if (!this._sessionRestoreApplied) {
        clearTimeout(this._sessionRestoreTimer);
        this._sessionRestoreTimer = setTimeout(() => {
          if (this._sessionRestoreApplied) return;
          this._sessionRestoreApplied = true;
          if (this._sessionView) {
            const { panX, panY, zoom } = this._sessionView;
            this._panX = panX;
            this._panY = panY;
            this._currentZoom = zoom;
            this._applyTransform();
            this.zoomText = `${Math.round(zoom * 100)}%`;
          }
        }, 0);
      }
      // After a tab-switch reset, pan to any pending cross-warehouse search target.
      // Uses rAF so the pan is calculated against the already-reset transform.
      if (this._pendingScrollEl) {
        const target = this._pendingScrollEl;
        this._pendingScrollEl = null;
        requestAnimationFrame(() => {
          let el = null, entity = null;
          if (target.zoneId !== undefined) {
            const zone = this._zones.find(z => z.id === target.zoneId);
            if (zone) { if (!target.navJump) zone.element.classList.add('zone-highlight'); el = zone.element; entity = zone; }
          } else {
            const pr = this._palletRacks.find(p => p.id === target.palletRackId);
            if (pr) {
              pr.element.classList.add('pallet-rack-highlight');
              if (target.navJump) {
                el = pr.element; entity = pr;
              } else {
                const sub = pr.subsections.find(s => s.id === target.subId);
                if (sub) {
                  sub.element.classList.add('sub-highlight');
                  const shelf = sub.shelves.find(s => s.id === target.shelfId);
                  if (shelf && shelf.element) shelf.element.classList.add('shelf-highlight');
                  el = sub.element;
                }
              }
            }
          }
          if (el) {
            if (target.navJump && entity) {
              this._jumpToElement(el, entity.position.x, entity.position.y, entity.dimensions.width, entity.dimensions.height);
            } else {
              this._zoomPanToElement(el);
            }
            this._scheduleHighlightClear();
          }
        });
      }
    },

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
      this._palletRacks.forEach(e => this._createHandles(e, 'pallet-rack'));
      this._zones.forEach(e => this._createHandles(e, 'zone'));
    },
    _removeAllHandles() {
      this._wh.querySelectorAll('.edit-handle').forEach(el => el.remove());
    },

    activateEditMode() {
      if (this._editMode) { this._cancelEditMode(); return; }
      if (this._drawMode) this._cancelDrawMode();
      this._editMode = true; this.editActive = true;
      this.statusText = 'Drag to move · Blue handles to resize · Click to select · Shift/Ctrl+click multi-select · Del to delete.';
      this._createAllHandles();
    },
    _cancelEditMode() {
      this._editMode = false; this.editActive = false;
      this._isEntResize = false; this._entResizeTarget = null;
      this._palletRackDragMoved = false;
      this._isDragMulti = false; this._multiDragStartPositions = [];
      this._isRubberBand = false;
      this._clearAllSelection();
      this._closeInspector();
      this.showDelEntBtn = false;
      this.statusText = 'Click "Add Pallet Rack" then draw inside the warehouse.';
      this._removeAllHandles();
      this._checkPollPending();
    },

    _selectPalletRack(palletRack) {
      this._clearAllSelection();
      if (palletRack) this._addPalletRackToSelection(palletRack);
    },
    _selectZone(zone) {
      this._clearAllSelection();
      if (zone) this._addZoneToSelection(zone);
    },
    _clearAllSelection() {
      this._selPalletRacks.forEach(i => i.element?.classList.remove('pallet-rack-selected'));
      this._selZones.forEach(z => z.element?.classList.remove('zone-selected'));
      this._selPalletRacks = []; this._selZones = [];
      this._selPalletRack = null; this._selZone = null;
      this._updateDelBtn();
    },
    _addPalletRackToSelection(palletRack) {
      if (!palletRack || this._selPalletRacks.includes(palletRack)) return;
      this._selPalletRacks.push(palletRack);
      palletRack.element?.classList.add('pallet-rack-selected');
      this._selPalletRack = palletRack;
      this._updateDelBtn();
    },
    _addZoneToSelection(zone) {
      if (!zone || this._selZones.includes(zone)) return;
      this._selZones.push(zone);
      zone.element?.classList.add('zone-selected');
      this._selZone = zone;
      this._updateDelBtn();
    },
    _toggleSelectPalletRack(palletRack) {
      const idx = this._selPalletRacks.indexOf(palletRack);
      if (idx !== -1) {
        this._selPalletRacks.splice(idx, 1);
        palletRack.element?.classList.remove('pallet-rack-selected');
        this._selPalletRack = this._selPalletRacks[this._selPalletRacks.length - 1] || null;
      } else {
        this._selPalletRacks.push(palletRack);
        palletRack.element?.classList.add('pallet-rack-selected');
        this._selPalletRack = palletRack;
      }
      this._updateDelBtn();
    },
    _toggleSelectZone(zone) {
      const idx = this._selZones.indexOf(zone);
      if (idx !== -1) {
        this._selZones.splice(idx, 1);
        zone.element?.classList.remove('zone-selected');
        this._selZone = this._selZones[this._selZones.length - 1] || null;
      } else {
        this._selZones.push(zone);
        zone.element?.classList.add('zone-selected');
        this._selZone = zone;
      }
      this._updateDelBtn();
    },
    _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },
    _updateDelBtn() {
      this.showDelEntBtn = this._editMode && !!(this._selPalletRacks.length || this._selZones.length);
    },

    // ── Draw mode ────────────────────────────────────────────────────────────

    activateDrawMode() {
      if (this._drawMode === 'pallet-rack') { this._cancelDrawMode(); return; }
      if (this._drawMode) this._cancelDrawMode();
      if (this._editMode) this._cancelEditMode();
      this._drawMode = 'pallet-rack'; this.addPalletRackActive = true;
      this._wh.classList.add('drawing-mode');
      this.statusText = 'Click & drag to draw a pallet rack.';
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
      this.addPalletRackActive = false; this.addZoneActive = false;
      this._wh.classList.remove('drawing-mode');
      this._prev.style.display = 'none';
      this.statusText = 'Click "Add Pallet Rack" then draw inside the warehouse.';
      this._checkPollPending();
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
        if (this._entResizeType === 'pallet-rack') {
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
      if (this._isDragMulti) {
        const dx = (e.clientX - this._dragMultiSMX) / this._currentZoom;
        const dy = (e.clientY - this._dragMultiSMY) / this._currentZoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._palletRackDragMoved = true, this._zoneDragMoved = true;
        for (const { entity, type, sx, sy } of this._multiDragStartPositions) {
          const nx = sx + dx, ny = sy + dy;
          entity.position.x = nx; entity.position.y = ny;
          entity.element.style.left = nx + 'px'; entity.element.style.top = ny + 'px';
          if (this._editMode) this._updateHandles(entity, type);
        }
      }
      if (this._isDragPalletRack && this._dragPalletRack) {
        const dx = (e.clientX - this._palletRackSMX) / this._currentZoom;
        const dy = (e.clientY - this._palletRackSMY) / this._currentZoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._palletRackDragMoved = true;
        const rx = this._palletRackSX + dx, ry = this._palletRackSY + dy;
        const sn = (e.ctrlKey || e.metaKey) ? { x: rx, y: ry } : this._snapIsleMove(this._dragPalletRack, rx, ry);
        this._dragPalletRack.position.x = sn.x; this._dragPalletRack.position.y = sn.y;
        this._dragPalletRack.element.style.left = sn.x + 'px'; this._dragPalletRack.element.style.top = sn.y + 'px';
        if (this._editMode) this._updateHandles(this._dragPalletRack, 'pallet-rack');
      }
      if (this._isDragZone && this._dragZone) {
        const dx = (e.clientX - this._zoneSMX) / this._currentZoom;
        const dy = (e.clientY - this._zoneSMY) / this._currentZoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._zoneDragMoved = true;
        const rx = this._zoneSX + dx, ry = this._zoneSY + dy;
        const sn = (e.ctrlKey || e.metaKey) ? { x: rx, y: ry } : this._snapZoneMove(this._dragZone, rx, ry);
        this._dragZone.position.x = sn.x; this._dragZone.position.y = sn.y;
        this._dragZone.element.style.left = sn.x + 'px'; this._dragZone.element.style.top = sn.y + 'px';
        if (this._editMode) this._updateHandles(this._dragZone, 'zone');
      }
      if (this._isRubberBand) {
        const raw = this._relPos(e);
        const x = Math.min(raw.x, this._rbStartX), y = Math.min(raw.y, this._rbStartY);
        Object.assign(this._prev.style, {
          left:`${x}px`, top:`${y}px`,
          width:`${Math.abs(raw.x - this._rbStartX)}px`, height:`${Math.abs(raw.y - this._rbStartY)}px`,
        });
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
      if (this._isDragMulti)  { this._isDragMulti = false; this._multiDragStartPositions = []; this._saveLayout(); }
      if (this._isDragPalletRack)   { this._isDragPalletRack  = false; this._dragPalletRack  = null; this._saveLayout(); }
      if (this._isDragZone)   { this._isDragZone  = false; this._dragZone  = null; this._saveLayout(); }
      if (this._isRubberBand) {
        this._isRubberBand = false;
        const rbX = parseFloat(this._prev.style.left)  || 0;
        const rbY = parseFloat(this._prev.style.top)   || 0;
        const rbW = parseFloat(this._prev.style.width) || 0;
        const rbH = parseFloat(this._prev.style.height)|| 0;
        this._prev.style.display = 'none';
        this._prev.classList.remove('rubber-band');
        if (rbW > 5 || rbH > 5) {
          for (const palletRack of this._palletRacks) {
            if (this._rectsOverlap(palletRack.position.x, palletRack.position.y, palletRack.dimensions.width, palletRack.dimensions.height, rbX, rbY, rbW, rbH))
              this._addPalletRackToSelection(palletRack);
          }
          for (const zone of this._zones) {
            if (this._rectsOverlap(zone.position.x, zone.position.y, zone.dimensions.width, zone.dimensions.height, rbX, rbY, rbW, rbH))
              this._addZoneToSelection(zone);
          }
          const n = this._selPalletRacks.length + this._selZones.length;
          if (n > 1) this.statusText = `${n} entities selected · Drag to move · Del to delete.`;
        }
      }
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
      if (e.key === 'Escape') {
        if (this.relocateMode) { this.cancelRelocate(); return; }
        this._cancelDrawMode(); this._cancelEditMode(); return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (this._editMode && this._selPalletRack) { this._copyPalletRack(); e.preventDefault(); }
        else if (this._editMode && this._selZone) { this._copyZone(); e.preventDefault(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (this._editMode && this._copiedPalletRack) { this._openPastePalletRackModal(); e.preventDefault(); }
        else if (this._editMode && this._copiedZone) { this._openPasteZoneModal(); e.preventDefault(); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this._editMode) {
        if (this._selPalletRack || this._selZone) { this.deleteSelectedEntity(); e.preventDefault(); }
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
                   hideLabel:false, itemFree:false,
                   position:{x,y}, dimensions:{width:w,height:h}, items:[], element:el,
                   createdAt: new Date().toISOString() };
      this.f_zoneLabel = ''; this.f_zoneColor = color;
      this.f_zoneNameColor = '#444444'; this.f_zoneFillOpacity = 18;
      this.f_zoneHideLabel = false; this.f_zoneItemFree = false;
      this.zoneLabelError = false;
      this.m_zone = true;
      this.$nextTick(() => this.$refs.zoneLabelInput?.focus());
    },

    confirmZone() {
      const label = this.f_zoneLabel.trim();
      if (!label) { this.zoneLabelError = true; return; }
      this.zoneLabelError = false;
      this._pz.label       = label;
      this._pz.color       = this.f_zoneColor;
      this._pz.fillOpacity = this.f_zoneFillOpacity;
      this._pz.labelColor  = this.f_zoneNameColor;
      this._pz.hideLabel   = this.f_zoneHideLabel;
      this._pz.itemFree    = this.f_zoneItemFree;
      this._pz.element.style.borderColor = this.f_zoneColor;
      this._applyZoneFill(this._pz.element, this.f_zoneColor, this.f_zoneFillOpacity);
      const lblEl = this._pz.element.querySelector('.zone-label');
      lblEl.textContent = label; lblEl.style.color = this.f_zoneNameColor;
      if (this.f_zoneHideLabel) lblEl.style.display = 'none';
      this._zones.push(this._pz);
      this._attachZoneHandlers(this._pz);
      this._refreshNavLists();
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
        const multiKey = e.shiftKey || e.ctrlKey || e.metaKey;
        if (multiKey) {
          this._toggleSelectZone(zone);
        } else if (!this._selZones.includes(zone)) {
          this._clearAllSelection();
          this._addZoneToSelection(zone);
        }
        const totalSel = this._selPalletRacks.length + this._selZones.length;
        if (totalSel > 1) {
          this._isDragMulti = true;
          this._dragMultiSMX = e.clientX; this._dragMultiSMY = e.clientY;
          this._multiDragStartPositions = [
            ...this._selPalletRacks.map(i => ({ entity: i, type: 'pallet-rack', sx: i.position.x, sy: i.position.y })),
            ...this._selZones.map(z => ({ entity: z, type: 'zone', sx: z.position.x, sy: z.position.y })),
          ];
          this._zoneDragMoved = false;
        } else {
          this._isDragZone = true; this._dragZone = zone;
          this._zoneDragMoved = false;
          this._zoneSMX = e.clientX; this._zoneSMY = e.clientY;
          this._zoneSX = zone.position.x; this._zoneSY = zone.position.y;
        }
      });
      zone.element.addEventListener('click', (e) => {
        if (this._editMode) {
          if (!this._zoneDragMoved) this._openInspector(zone, 'zone');
          return;
        }
        if (this.relocateMode) {
          e.stopPropagation();
          if (zone.itemFree) {
            this._log(`Zone "${zone.label}" does not accept items — choose a different destination.`, 'warn');
            return;
          }
          this._executeRelocateToZone(zone);
          return;
        }
        if (zone.itemFree) return;
        e.stopPropagation();
        this._openZoneActions(zone);
      });
    },

    // ── Isle creation step 1 ─────────────────────────────────────────────────

    _beginIsleCreation(x, y, w, h) {
      const color = this._rndHex();
      const id = ++this._palletRackCounter;
      const el = document.createElement('div');
      el.className = 'pallet-rack';
      Object.assign(el.style, { left:`${x}px`, top:`${y}px`, width:`${w}px`, height:`${h}px`, borderColor:color });
      el.dataset.palletRackId = id;
      el.innerHTML = `<div class="pallet-rack-header"><span class="pallet-rack-label" style="color:${color}">…</span></div>`;
      this._wh.appendChild(el);
      this._pi = { id, label:'', row:'', color, shelfColor:'#aaaaaa',
                   fillColor:'#ffffff', fillOpacity:0, labelColor:color, rotation:0,
                   position:{x,y}, dimensions:{width:w,height:h}, element:el,
                   shelfCount:1, shelfLabels:[], subsectionStart:1, subsectionCount:1,
                   facing:'right', subsections:[], createdAt: new Date().toISOString() };
      this.f_palletRackRow = ''; this.f_palletRackName = '';
      this.f_shelfCount = 1; this.f_palletRackColor = color;
      this.f_palletRackLabelColor = color; this.f_shelfColor = '#aaaaaa';
      this.f_palletRackFillColor  = '#ffffff'; this.f_palletRackFillOpacity = 0;
      this.f_palletRackFacing = 'right';
      this.palletRackNameError = false;
      this.m_count = true;
      this.$nextTick(() => this.$refs.palletRackNameInput?.focus());
    },

    confirmStep1() {
      const name = this.f_palletRackName.trim();
      if (!name) { this.palletRackNameError = true; return; }
      this.palletRackNameError = false;
      this._pi.label      = name;
      this._pi.row        = this.f_palletRackRow.trim();
      this._pi.shelfCount = Math.min(Math.max(this.f_shelfCount || 1, 1), 26);
      this._pi.facing     = this.f_palletRackFacing;
      this._pi.shelfColor  = this.f_shelfColor;
      this._pi.fillColor   = this.f_palletRackFillColor;
      this._pi.fillOpacity = this.f_palletRackFillOpacity;
      this._pi.labelColor  = this.f_palletRackLabelColor;
      const hdr = this._pi.element.querySelector('.pallet-rack-header');
      if (hdr) hdr.innerHTML = this._palletRackHeaderHtml(this._pi.row, name, this._pi.labelColor);
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

    cancelPalletRackCreation() {
      if (this._pi) { this._pi.element.remove(); this._pi = null; this._palletRackCounter--; }
      this.m_count = false; this.m_subs = false; this.m_labels = false;
    },

    // ── Isle creation step 3 ─────────────────────────────────────────────────

    confirmStep3() {
      const shelfLabels = this.f_shelfLabelsList.map((s, i) => s.label.trim() || String.fromCharCode(65 + i));
      this._pi.shelfLabels = shelfLabels;
      const { subsectionStart, subsectionCount, element: palletRackEl, id: palletRackId, facing, shelfColor } = this._pi;

      const body = document.createElement('div');
      body.className = 'pallet-rack-body';

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

        const subId = ++this._subsectionCounter;
        const shelves = shelfLabels.map((lbl, j) => ({
          id: ++this._shelfCounter, palletRackId: palletRackId, subsectionId: subId,
          shelfNumber: j+1, label: lbl, items: [], element: null,
        }));

        const makeSlot = (shelf) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot'; slot.textContent = shelf.label;
          slot.style.borderColor = shelfColor; shelf.element = slot; return slot;
        };

        if (facing === 'left') {
          [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        } else {
          shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: subId, palletRackId: palletRackId, number: num, name: '', element: subEl, shelves };
        this._pi.subsections.push(subObj);

        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this._drawMode || this._editMode || this._palletRackDragMoved) return;
          this._ai   = this._palletRacks.find(i => i.id === palletRackId);
          this._asub = subObj;
          this._openShelfSelect(subObj);
        });

        body.appendChild(subEl);
      }

      palletRackEl.appendChild(body);
      this._applyPalletRackFill(palletRackEl, this._pi.fillColor, this._pi.fillOpacity);
      this._palletRacks.push(this._pi);
      this._attachPalletRackHandlers(this._pi);
      this.palletRackCountText = `Pallet Racks: ${this._palletRacks.length}`;
      this._refreshNavLists();
      this.statusText = `${this._pi.label} added.`;
      this._pi = null; this.m_labels = false;
      this._saveLayout();
    },

    _attachPalletRackHandlers(palletRack) {
      palletRack.element.addEventListener('mousedown', (e) => {
        if (!this._editMode || e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();
        const multiKey = e.shiftKey || e.ctrlKey || e.metaKey;
        if (multiKey) {
          this._toggleSelectPalletRack(palletRack);
        } else if (!this._selPalletRacks.includes(palletRack)) {
          this._clearAllSelection();
          this._addPalletRackToSelection(palletRack);
        }
        const totalSel = this._selPalletRacks.length + this._selZones.length;
        if (totalSel > 1) {
          this._isDragMulti = true;
          this._dragMultiSMX = e.clientX; this._dragMultiSMY = e.clientY;
          this._multiDragStartPositions = [
            ...this._selPalletRacks.map(i => ({ entity: i, type: 'pallet-rack', sx: i.position.x, sy: i.position.y })),
            ...this._selZones.map(z => ({ entity: z, type: 'zone', sx: z.position.x, sy: z.position.y })),
          ];
          this._palletRackDragMoved = false;
        } else {
          this._isDragPalletRack = true; this._dragPalletRack = palletRack;
          this._palletRackDragMoved = false;
          this._palletRackSMX = e.clientX; this._palletRackSMY = e.clientY;
          this._palletRackSX  = palletRack.position.x; this._palletRackSY  = palletRack.position.y;
        }
      });
      palletRack.element.addEventListener('click', () => {
        if (this._drawMode) return;
        if (this._editMode) {
          if (!this._palletRackDragMoved) this._openInspector(palletRack, 'pallet-rack');
          return;
        }
        this._ai = palletRack;
        if (palletRack.subsections.length === 1) {
          this._asub = palletRack.subsections[0];
          this._openShelfSelect(this._asub);
        } else {
          this._openSubsectionSelect(palletRack);
        }
      });
    },

    // ── Subsection / Shelf select ─────────────────────────────────────────────

    _openSubsectionSelect(palletRack) {
      this.mc_subSelTitle = `${palletRack.label} — Select a Subsection`;
      this.mc_subSelList  = palletRack.subsections.map(sub => ({
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

    unlockSubName() {
      this.subNameLocked = false;
      this.$nextTick(() => this.$refs.subNameInput?.focus());
    },

    saveSubName() {
      const name = this.f_subName.trim();
      const sub  = this._asub;
      if (!sub) return;
      sub.name = name;
      // Update or remove the name label element in the DOM
      let nameEl = sub.element.querySelector('.sub-name-label');
      if (name) {
        if (!nameEl) {
          nameEl = document.createElement('div');
          nameEl.className = 'sub-name-label';
          const numEl = sub.element.querySelector('.sub-number');
          if (numEl) numEl.after(nameEl);
          else sub.element.prepend(nameEl);
        }
        nameEl.textContent = name;
      } else if (nameEl) {
        nameEl.remove();
      }
      const subLabel = name || `Sub ${sub.number}`;
      this.mc_shelfSelTitle = this._ai
        ? `${this._ai.label} › ${subLabel} — Select a Shelf`
        : `${subLabel} — Select a Shelf`;
      this.subNameLocked = true;
      this._saveLayout();
      this.statusText = 'Subsection name saved.';
    },

    _openShelfSelect(sub) {
      const subLabel = sub.name || `Sub ${sub.number}`;
      this.mc_shelfSelTitle = `${this._ai.label} › ${subLabel} — Select a Shelf`;
      this.mc_shelfSelList  = sub.shelves;
      this.f_subName        = sub.name || '';
      this.subNameLocked    = true;
      this.subNameError     = false;
      this.m_shelfSel = true;
    },

    selectShelfFromList(shelf) {
      if (this.relocateMode) {
        this.m_shelfSel = false;
        this._executeRelocateToShelf(shelf);
        return;
      }
      this._ash = shelf;
      this.m_shelfSel = false;
      const subLabel = this._asub.name || `Sub ${this._asub.number}`;
      this.mc_shelfActTitle  = `${this._ai.label} › ${subLabel} › ${shelf.label}`;
      this.mc_shelfActSub    = `${shelf.items.length} item${shelf.items.length !== 1 ? 's' : ''} on this shelf`;
      this.f_shelfActName    = shelf.label;
      this.shelfNameLocked   = true;
      this.shelfActNameError = false;
      this.m_shelfAct = true;
    },

    backToShelfSelect() { this.m_shelfAct = false; this._openShelfSelect(this._asub); },

    unlockShelfName() {
      this.shelfNameLocked = false;
      this.$nextTick(() => this.$refs.shelfNameInput?.focus());
    },

    saveShelfName() {
      const label = this.f_shelfActName.trim();
      if (!label) { this.shelfActNameError = true; return; }
      this.shelfActNameError = false;
      const shelf = this._ash;
      if (!shelf) return;
      shelf.label = label;
      if (shelf.element) shelf.element.textContent = label;
      const subLabel = this._asub.name || `Sub ${this._asub.number}`;
      this.mc_shelfActTitle = `${this._ai.label} › ${subLabel} › ${label}`;
      this.shelfNameLocked = true;
      this._saveLayout();
      this.statusText = 'Shelf label saved.';
    },

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
        id: ++this._shelfCounter, palletRackId: this._ai.id, subsectionId: this._asub.id,
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

    // ── Delete subsection ─────────────────────────────────────────────────────

    openDeleteSub() {
      const totalItems = this._asub.shelves.reduce((n, sh) => n + sh.items.length, 0);
      const subLabel = this._asub.name || `Sub ${this._asub.number}`;
      if (totalItems > 0) {
        this.mc_confDelSubMsg = `"${subLabel}" contains ${totalItems} item(s) across its shelves. All items will be permanently deleted. This cannot be undone.`;
      } else {
        this.mc_confDelSubMsg = `Permanently delete "${subLabel}"? This cannot be undone.`;
      }
      this.m_confDelSub = true;
    },

    async confirmDeleteSub() {
      this.m_confDelSub = false;
      const sub = this._asub;
      for (const shelf of sub.shelves)
        for (const item of shelf.items)
          await this._removeItemFromDB(item.id);
      sub.element.remove();
      this._ai.subsections = this._ai.subsections.filter(s => s.id !== sub.id);
      this._asub = null; this._ash = null;
      const remaining = this._ai.subsections.length;
      if (remaining === 0) {
        this.closeAllModals();
      } else if (remaining === 1) {
        this._asub = this._ai.subsections[0];
        this._openShelfSelect(this._asub);
      } else {
        this._openSubsectionSelect(this._ai);
      }
      this._saveLayout();
      this.statusText = `Subsection "${sub.name || `Sub ${sub.number}`}" deleted.`;
    },

    // ── Add item ─────────────────────────────────────────────────────────────

    openAddItem() {
      this.m_shelfAct = false;
      this.mc_addItemSub = `${this._ai.label} › Sub ${this._asub.number} › ${this._ash.label}`;
      this.f_itemId = ''; this.f_itemType = ''; this.f_itemCategory = '';
      this.f_itemNotes = ''; this.f_itemTags = ''; this.f_itemUrl = '';
      this.itemIdError = false; this.addItemLocErr = '';
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
      const itemId = this.f_itemId.trim().replace(/^0+(?=.)/, '').toUpperCase();
      if (!itemId || itemId.length < 3) { this.itemIdError = true; return; }
      this.itemIdError = false;
      const now = new Date().toISOString();

      // Guard: ensure the destination still exists (may have been deleted by another user)
      if (this._azfi) {
        if (!this._zones.find(z => z.id === this._azfi.id)) {
          this.addItemLocErr = `Zone "${this._azfi.label}" has been deleted. Please close and choose another location.`;
          return;
        }
      } else {
        const prExists  = this._ai   && this._palletRacks.find(p => p.id === this._ai.id);
        const subExists = prExists   && this._asub && prExists.subsections.find(s => s.id === this._asub.id);
        const shExists  = subExists  && this._ash  && subExists.shelves.find(s => s.id === this._ash.id);
        if (!shExists) {
          this.addItemLocErr = `Shelf "${this._ash?.label ?? ''}" has been deleted. Please close and choose another location.`;
          return;
        }
      }
      this.addItemLocErr = '';

      if (this._azfi) {
        // Zone item
        const payload = {
          item_id: itemId, item_type: this.f_itemType.trim().toUpperCase(),
          category: this.f_itemCategory.trim().toUpperCase(), notes: this.f_itemNotes.trim(),
          url: this.f_itemUrl.trim(), tags: this.f_itemTags.trim().toUpperCase(),
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
          item_id: itemId, item_type: this.f_itemType.trim().toUpperCase(),
          category: this.f_itemCategory.trim().toUpperCase(), notes: this.f_itemNotes.trim(),
          url: this.f_itemUrl.trim(), tags: this.f_itemTags.trim().toUpperCase(),
          added_at: now, location_type: 'shelf',
          warehouse_id: wh?.id, warehouse_name: wh?.name || '',
          pallet_rack_id: this._ai.id, pallet_rack_label: this._ai.label, pallet_rack_row: this._ai.row || '',
          subsection_id: this._asub.id, subsection_number: this._asub.number, subsection_name: this._asub.name || '',
          shelf_id: this._ash.id, shelf_label: this._ash.label,
        };
        const dbId = await this._addItemToDB(payload);
        this._ash.items.push({
          id: dbId, itemId, type: payload.item_type, category: payload.category,
          tags: payload.tags || '', url: payload.url || '',
          notes: payload.notes, addedAt: now,
          shelfId: this._ash.id, subsectionId: this._asub.id, palletRackId: this._ai.id,
        });
        this.m_addItem = false;
        this.selectShelfFromList(this._ash);
      }
    },

    // ── Bulk add items ────────────────────────────────────────────────────────

    openBulkAdd() {
      this.m_shelfAct = false;
      this.mc_addItemSub = `${this._ai.label} › ${this._asub.name || `Sub ${this._asub.number}`} › ${this._ash.label}`;
      this.f_bulkText = '';
      this.bulkAddError = '';
      this.m_bulkAdd = true;
      this.$nextTick(() => this.$refs.bulkAddInput?.focus());
    },

    openZoneBulkAdd() {
      this.m_zoneAct = false;
      this.f_zoneBulkText = '';
      this.zoneBulkAddError = '';
      this.m_zoneBulkAdd = true;
      this.$nextTick(() => this.$refs.zoneBulkAddInput?.focus());
    },

    openViewItems() {
      this.m_shelfAct = false;
      this.mc_itemList = this._ash.items;
      this.m_viewItems = true;
    },

    openItemDetail(item) {
      this._activeItemShelf      = this._ash;
      this._activeItemDetailZone = null;
      this.mc_activeItem = item;
      this.m_itemDetail  = true;
    },

    openItemDetailFromSearch(item, shelf) {
      this._activeItemShelf      = shelf;
      this._activeItemDetailZone = null;
      this.mc_activeItem = item;
      this.m_itemDetail  = true;
    },

    openItemDetailFromZone(item) {
      this._activeItemShelf      = null;
      this._activeItemDetailZone = this._azfi;
      this.mc_activeItem = item;
      this.m_itemDetail  = true;
    },

    deleteViewItem() {
      const item = this.mc_activeItem;
      if (!item) return;
      this.mc_confDelItemMsg = `Permanently delete item "${item.itemId}"? This cannot be undone.`;
      this.m_confDelItem = true;
    },

    async confirmDeleteViewItem() {
      this.m_confDelItem = false;
      const item  = this.mc_activeItem;
      const shelf = this._activeItemShelf;
      const zone  = this._activeItemDetailZone;
      if (!item || (!shelf && !zone)) return;
      await this._removeItemFromDB(item.id);
      if (shelf) {
        shelf.items = shelf.items.filter(i => i.id !== item.id);
        this.mc_itemList = shelf.items;
        if (this._ash === shelf)
          this.mc_shelfActSub = `${shelf.items.length} item${shelf.items.length !== 1 ? 's' : ''} on this shelf`;
      } else {
        zone.items = zone.items.filter(i => i.id !== item.id);
        this.mc_zoneItemList = zone.items;
      }
      this.mc_activeItem = null;
      this.m_itemDetail  = false;
    },

    // ── Edit item details ─────────────────────────────────────────────────────

    openEditItem() {
      const item = this.mc_activeItem;
      if (!item) return;
      this.f_editItemId       = item.itemId   || '';
      this.f_editItemType     = item.type     || '';
      this.f_editItemCategory = item.category || '';
      this.f_editItemTags     = item.tags     || '';
      this.f_editItemUrl      = item.url      || '';
      this.f_editItemNotes    = item.notes    || '';
      this.editItemError      = '';
      this.m_itemDetail       = false;
      this.m_editItem         = true;
    },

    closeEditItem() {
      this.m_editItem   = false;
      this.m_itemDetail = true;
    },

    async saveEditItem() {
      const item = this.mc_activeItem;
      if (!item) return;
      const itemId = this.f_editItemId.trim().replace(/^0+(?=.)/, '').toUpperCase();
      if (!itemId || itemId.length < 3) { this.editItemError = 'Item ID must be at least 3 characters.'; return; }
      this.editItemError = '';
      try {
        const resp = await fetch(`/api/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id:   itemId,
            item_type: this.f_editItemType.trim().toUpperCase(),
            category:  this.f_editItemCategory.trim().toUpperCase(),
            tags:      this.f_editItemTags.trim().toUpperCase(),
            url:       this.f_editItemUrl.trim(),
            notes:     this.f_editItemNotes.trim(),
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        this._syncPollSeq(await resp.json());
        item.itemId   = itemId;
        item.type     = this.f_editItemType.trim().toUpperCase();
        item.category = this.f_editItemCategory.trim().toUpperCase();
        item.tags     = this.f_editItemTags.trim().toUpperCase();
        item.url      = this.f_editItemUrl.trim();
        item.notes    = this.f_editItemNotes.trim();
        this.m_editItem   = false;
        this.m_itemDetail = true;
      } catch (err) {
        this.editItemError = 'Save failed. Please try again.';
        _sendVueError(err?.message || String(err), `saveEditItem: id=${item.id}`, err?.stack || '', 'warehouse.js:saveEditItem');
      }
    },

    // ── Relocate item (Move button in item detail) ────────────────────────────

    startRelocateItem() {
      const item = this.mc_activeItem;
      if (!item) return;
      this._relocateItem     = item;
      this._relocateSrcShelf = this._activeItemShelf || null;
      this._relocateSrcZone  = this._activeItemDetailZone || null;
      this._relocateSrcWhIdx = this._activeWhIdx;
      this.mc_activeItem     = null;
      this.m_itemDetail      = false;
      this.relocateMode      = true;
      const src = this._relocateSrcZone
        ? `Zone "${this._relocateSrcZone.label}"`
        : this._relocateSrcShelf
          ? `${this._ai?.label ?? '?'} › ${this._asub ? (this._asub.name || `Sub ${this._asub.number}`) : '?'} › ${this._relocateSrcShelf.label}`
          : 'current location';
      this._log(`Moving "${item.itemId}" from ${src} — click a zone or pallet rack to pick destination. (ESC to cancel)`, 'info');
    },

    cancelRelocate() {
      this._relocateItem     = null;
      this._relocateSrcShelf = null;
      this._relocateSrcZone  = null;
      this._relocateSrcWhIdx = -1;
      this.relocateMode      = false;
      this._log('Move cancelled.', 'warn');
    },

    async _executeRelocateToShelf(shelf) {
      const item = this._relocateItem;
      if (!item) return;
      const wh = this._warehouses[this._activeWhIdx];
      await this._moveItemToDB(item.id, {
        location_type:     'shelf',
        warehouse_id:      wh?.id ?? null,
        warehouse_name:    wh?.name ?? '',
        pallet_rack_id:    this._ai.id,
        pallet_rack_label: this._ai.label,
        pallet_rack_row:   this._ai.row || '',
        subsection_id:     this._asub.id,
        subsection_number: this._asub.number,
        subsection_name:   this._asub.name || '',
        shelf_id:          shelf.id,
        shelf_label:       shelf.label,
        zone_id:           null,
        zone_label:        '',
      });
      this._applyRelocateSourceRemoval(item);
      shelf.items.push({ ...item, palletRackId: this._ai.id, subsectionId: this._asub.id, shelfId: shelf.id, zoneId: null, zoneLabel: '' });
      const subLabel = this._asub.name || `Sub ${this._asub.number}`;
      this._log(`Moved "${item.itemId}" → ${this._ai.label} › ${subLabel} › ${shelf.label}`, 'success');
      this._finishRelocate();
    },

    async _executeRelocateToZone(zone) {
      const item = this._relocateItem;
      if (!item) return;
      const wh = this._warehouses[this._activeWhIdx];
      await this._moveItemToDB(item.id, {
        location_type:     'zone',
        warehouse_id:      wh?.id ?? null,
        warehouse_name:    wh?.name ?? '',
        pallet_rack_id:    null,
        pallet_rack_label: '',
        pallet_rack_row:   '',
        subsection_id:     null,
        subsection_number: null,
        subsection_name:   '',
        shelf_id:          null,
        shelf_label:       '',
        zone_id:           zone.id,
        zone_label:        zone.label,
      });
      this._applyRelocateSourceRemoval(item);
      zone.items.push({ ...item, zoneId: zone.id, zoneLabel: zone.label, palletRackId: null, subsectionId: null, shelfId: null });
      this._log(`Moved "${item.itemId}" → Zone "${zone.label}"`, 'success');
      this._finishRelocate();
    },

    _applyRelocateSourceRemoval(item) {
      if (this._relocateSrcShelf) {
        this._relocateSrcShelf.items = this._relocateSrcShelf.items.filter(i => i.id !== item.id);
      } else if (this._relocateSrcZone) {
        this._relocateSrcZone.items = this._relocateSrcZone.items.filter(i => i.id !== item.id);
      }
      // Cross-warehouse: update the serialized snapshot of the source warehouse so
      // switching back to it doesn't resurrect the item from stale serialized data.
      if (this._relocateSrcWhIdx !== this._activeWhIdx) {
        const srcWh = this._warehouses[this._relocateSrcWhIdx];
        if (srcWh && this._relocateSrcShelf) {
          for (const pr of srcWh.palletRacks || [])
            for (const sub of pr.subsections || [])
              for (const sh of sub.shelves || [])
                if (sh.id === this._relocateSrcShelf.id)
                  sh.items = sh.items.filter(i => i.id !== item.id);
        } else if (srcWh && this._relocateSrcZone) {
          const z = (srcWh.zones || []).find(z => z.id === this._relocateSrcZone.id);
          if (z) z.items = z.items.filter(i => i.id !== item.id);
        }
      }
    },

    _finishRelocate() {
      this._relocateItem     = null;
      this._relocateSrcShelf = null;
      this._relocateSrcZone  = null;
      this._relocateSrcWhIdx = -1;
      this.relocateMode      = false;
      this.closeAllModals();
    },

    async confirmBulkAdd() {
      // Guard: ensure the shelf still exists before bulk-adding
      const prExists  = this._ai   && this._palletRacks.find(p => p.id === this._ai.id);
      const subExists = prExists   && this._asub && prExists.subsections.find(s => s.id === this._asub.id);
      const shExists  = subExists  && this._ash  && subExists.shelves.find(s => s.id === this._ash.id);
      if (!shExists) {
        this.bulkAddError = `Shelf "${this._ash?.label ?? ''}" has been deleted. Please close and choose another location.`;
        return;
      }
      const lines = this.f_bulkText.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { this.bulkAddError = 'No items entered.'; return; }
      const parsed = [];
      const errors = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(';');
        const itemId = (parts[0] || '').trim().replace(/^0+(?=.)/, '').toUpperCase();
        if (!itemId) { errors.push(`Line ${i + 1}: Item ID is required.`); continue; }
        if (itemId.length < 3) { errors.push(`Line ${i + 1}: Item ID must be at least 3 characters.`); continue; }
        parsed.push({
          item_id:   itemId,
          item_type: (parts[1] || '').trim(),
          category:  (parts[2] || '').trim(),
          tags:      (parts[3] || '').trim(),
          url:       (parts[4] || '').trim(),
          notes:     (parts[5] || '').trim(),
        });
      }
      if (errors.length) { this.bulkAddError = errors.join('\n'); return; }
      const now = new Date().toISOString();
      const wh  = this._warehouses[this._activeWhIdx];
      for (const item of parsed) {
        const payload = {
          ...item,
          added_at: now, location_type: 'shelf',
          warehouse_id: wh?.id, warehouse_name: wh?.name || '',
          pallet_rack_id: this._ai.id, pallet_rack_label: this._ai.label, pallet_rack_row: this._ai.row || '',
          subsection_id: this._asub.id, subsection_number: this._asub.number, subsection_name: this._asub.name || '',
          shelf_id: this._ash.id, shelf_label: this._ash.label,
        };
        const dbId = await this._addItemToDB(payload);
        this._ash.items.push({
          id: dbId, itemId: item.item_id, type: item.item_type, category: item.category,
          tags: item.tags || '', url: item.url || '',
          notes: item.notes, addedAt: now,
          shelfId: this._ash.id, subsectionId: this._asub.id, palletRackId: this._ai.id,
        });
      }
      this.m_bulkAdd = false;
      this.statusText = `Added ${parsed.length} item(s) to ${this._ash.label}.`;
      this.selectShelfFromList(this._ash);
    },

    async confirmZoneBulkAdd() {
      // Guard: ensure the zone still exists
      if (!this._azfi || !this._zones.find(z => z.id === this._azfi.id)) {
        this.zoneBulkAddError = `Zone "${this._azfi?.label ?? ''}" has been deleted. Please close and choose another location.`;
        return;
      }
      const lines = this.f_zoneBulkText.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { this.zoneBulkAddError = 'No items entered.'; return; }
      const parsed = [];
      const errors = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(';');
        const itemId = (parts[0] || '').trim().replace(/^0+(?=.)/, '').toUpperCase();
        if (!itemId) { errors.push(`Line ${i + 1}: Item ID is required.`); continue; }
        if (itemId.length < 3) { errors.push(`Line ${i + 1}: Item ID must be at least 3 characters.`); continue; }
        parsed.push({
          item_id:   itemId,
          item_type: (parts[1] || '').trim(),
          category:  (parts[2] || '').trim(),
          tags:      (parts[3] || '').trim(),
          url:       (parts[4] || '').trim(),
          notes:     (parts[5] || '').trim(),
        });
      }
      if (errors.length) { this.zoneBulkAddError = errors.join('\n'); return; }
      const now = new Date().toISOString();
      const wh  = this._warehouses[this._activeWhIdx];
      for (const item of parsed) {
        const payload = {
          ...item,
          added_at: now, location_type: 'zone',
          warehouse_id: wh?.id, warehouse_name: wh?.name || '',
          zone_id: this._azfi.id, zone_label: this._azfi.label,
        };
        const dbId = await this._addItemToDB(payload);
        this._azfi.items.push({
          id: dbId, itemId: item.item_id, type: item.item_type, category: item.category,
          tags: item.tags || '', url: item.url || '',
          notes: item.notes, addedAt: now, zoneId: this._azfi.id,
        });
      }
      this.m_zoneBulkAdd = false;
      this.statusText = `Added ${parsed.length} item(s) to zone "${this._azfi.label}".`;
      this._openZoneActions(this._azfi);
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

    // ── Move items ────────────────────────────────────────────────────────────

    openMoveItems() {
      if (!this._selItemIds.size) return;
      this._itemsToMove = this._ash.items.filter(i => this._selItemIds.has(i.id));
      this._mvSrcPalletRack  = this._ai;
      this._mvSrcSub   = this._asub;
      this._mvSrcShelf = this._ash;
      const n = this._itemsToMove.length;
      this.mv_srcLabel = `${this._ai.label} › Sub ${this._asub.number} › ${this._ash.label}`;
      this.mv_step       = 'pallet-rack';
      this.mv_palletRacks = this._palletRacks.slice();
      this.m_rmItems = false;
      this.m_moveDest = true;
    },

    mvPickPalletRack(palletRack) {
      this._mvDestPalletRack = palletRack;
      this.mv_subs  = palletRack.subsections;
      this.mv_step  = 'sub';
    },

    mvPickSub(sub) {
      this._mvDestSub  = sub;
      this.mv_shelves  = sub.shelves;
      this.mv_step     = 'shelf';
    },

    async mvPickShelf(shelf) {
      if (shelf.id === this._mvSrcShelf.id) return; // same shelf — no-op
      const wh = this._warehouses[this._activeWhIdx];
      for (const item of this._itemsToMove) {
        await this._moveItemToDB(item.id, {
          location_type:    'shelf',
          warehouse_id:     wh?.id ?? null,
          warehouse_name:   wh?.name ?? '',
          pallet_rack_id:   this._mvDestPalletRack.id,
          pallet_rack_label: this._mvDestPalletRack.label,
          pallet_rack_row:  this._mvDestPalletRack.row || '',
          subsection_id:    this._mvDestSub.id,
          subsection_number: this._mvDestSub.number,
          subsection_name:  this._mvDestSub.name || '',
          shelf_id:         shelf.id,
          shelf_label:      shelf.label,
          zone_id:          null,
          zone_label:       '',
        });
        // Update in-memory: remove from source, add to destination
        this._mvSrcShelf.items = this._mvSrcShelf.items.filter(i => i.id !== item.id);
        shelf.items.push({
          ...item,
          palletRackId: this._mvDestPalletRack.id, subsectionId: this._mvDestSub.id, shelfId: shelf.id,
        });
      }
      const moved = this._itemsToMove.length;
      this._itemsToMove = [];
      this._selItemIds.clear(); this.mc_selItemIds = []; this.mc_selCount = 0;
      this.m_moveDest = false;
      this.statusText = `Moved ${moved} item${moved !== 1 ? 's' : ''} to ${this._mvDestPalletRack.label} › Sub ${this._mvDestSub.number} › ${shelf.label}.`;
      // Return to source shelf actions
      this._ai = this._mvSrcPalletRack; this._asub = this._mvSrcSub; this._ash = this._mvSrcShelf;
      this.selectShelfFromList(this._mvSrcShelf);
    },

    mv_isSrcShelf(shelf) {
      return this._mvSrcShelf && shelf.id === this._mvSrcShelf.id;  // unchanged — shelf is generic
    },

    mvBack() {
      if (this.mv_step === 'shelf')     { this.mv_step = 'sub'; }
      else if (this.mv_step === 'sub')  { this.mv_step = 'pallet-rack'; }
      else { this.m_moveDest = false; this._itemsToMove = []; this.m_rmItems = true; }
    },

    async _moveItemToDB(itemDbId, locationData) {
      const resp = await fetch(`/api/items/${itemDbId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });
      if (resp.ok) this._syncPollSeq(await resp.json());
    },

    // ── Live polling ──────────────────────────────────────────────────────────

    _startLayoutPoll() {
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._pollTimer = setInterval(() => this._pollLayoutVersion(), 5000);
    },

    _startPing() {
      if (this._pingTimer) clearInterval(this._pingTimer);
      this._pingTimer = setInterval(() => this._doPing(), 5000);
    },

    async _doPing() {
      try {
        const ctrl    = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 5000);
        const resp    = await fetch('/api/ping', { signal: ctrl.signal });
        clearTimeout(timeout);
        if (resp.ok) {
          if (this.isOffline) {
            this.isOffline      = false;
            this.m_offlineModal = false;
            this._offlineSince  = null;
            this._log('Connection to server restored.', 'success');
          } else {
            this._offlineSince = null;
          }
        } else {
          this._handlePingFailure();
        }
      } catch (_) {
        this._handlePingFailure();
      }
    },

    _handlePingFailure() {
      const now = Date.now();
      if (this._offlineSince === null) {
        this._offlineSince = now;
      } else if (!this.isOffline && (now - this._offlineSince) >= 15000) {
        this.isOffline      = true;
        this.m_offlineModal = true;
        this._log('Connection to server lost.', 'error');
      }
    },

    async _pollLayoutVersion() {
      try {
        const resp = await fetch('/api/layout-version');
        if (!resp.ok) return;
        const { seq } = await resp.json();
        if (seq !== this._pollSeq) this._reloadIfIdle(seq);
      } catch (_) {}
    },

    _syncPollSeq(json) {
      if (json && json.seq != null) this._pollSeq = json.seq;
    },

    _isUserBusy() {
      // Only block reloads when the user is actively creating/modifying/deleting.
      // Read-only viewing modals (shelfAct, viewItems, addItem, subSel, shelfSel,
      // zoneAct, zoneItems) are transparent to silent reloads — _reAnchorModalRefs
      // refreshes their data after each reload.
      return !!(
        this._editMode || this._drawMode || this.relocateMode ||
        this.m_rmItems || this.m_bulkAdd || this.m_zoneBulkAdd ||
        this.m_itemDetail || this.m_moveDest ||
        this.m_count || this.m_subs || this.m_labels ||
        this.m_addShelf || this.m_confDel || this.m_confDelSub ||
        this.m_zone || this.m_pastePalletRack || this.m_pasteZone ||
        this.m_delEnt
      );
    },

    _reloadIfIdle(seq) {
      if (this._isUserBusy()) {
        this._pollPending = seq;
      } else {
        this._pollPending = 0;
        this._reloadSilently(seq);
      }
    },

    _checkPollPending() {
      if (this._pollPending && !this._isUserBusy()) {
        const seq = this._pollPending;
        this._pollPending = 0;
        this._reloadSilently(seq);
      }
    },

    async _reloadSilently(seq) {
      try {
        const [layoutResp, itemsResp] = await Promise.all([
          fetch('/api/layout'),
          fetch('/api/items'),
        ]);
        if (!layoutResp.ok || !itemsResp.ok) return;
        const layoutData = await layoutResp.json();
        const items      = await itemsResp.json();

        // Preserve the user's current pan/zoom and active warehouse tab
        const savedPanX = this._panX;
        const savedPanY = this._panY;
        const savedZoom = this._currentZoom;
        layoutData.activeWarehouseIdx = this._activeWhIdx;

        this._silentImport = true;
        if (layoutData.warehouses && layoutData.warehouses.length > 0) {
          this._mergeItems(layoutData, items);
          this._importAllWarehouses(layoutData);
        }
        this._silentImport = false;

        // Restore pan/zoom
        this._panX = savedPanX;
        this._panY = savedPanY;
        this._currentZoom = savedZoom;
        if (this._pzl) {
          this._pzl.style.transform =
            `translate(${savedPanX}px,${savedPanY}px) scale(${savedZoom})`;
        }

        // Re-point open modal references to freshly loaded objects
        this._reAnchorModalRefs();

        // Update seq baseline so next poll doesn't re-trigger
        this._pollSeq = layoutData._seq ?? seq;
      } catch (_) {}
    },

    _reAnchorModalRefs() {
      // Re-anchor _ai / _asub / _ash to newly loaded pallet rack objects
      if (this._ai) {
        const newPR = this._palletRacks.find(p => p.id === this._ai.id);
        if (!newPR) {
          // Pallet rack deleted by another user — close related modals
          this._ai = null; this._asub = null; this._ash = null;
          this.closeAllModals();
          return;
        }
        this._ai = newPR;

        if (this.m_subSel) {
          this.mc_subSelList = newPR.subsections.map(sub => ({
            id: sub.id, label: sub.name || `Sub ${sub.number}`,
            shelfCount: sub.shelves.length,
          }));
        }

        if (this._asub) {
          const newSub = newPR.subsections.find(s => s.id === this._asub.id);
          if (!newSub) {
            this._asub = null; this._ash = null;
            if (this.m_addItem) {
              this.addItemLocErr = 'The subsection containing this shelf has been deleted. Please close and choose another location.';
            } else if (this.m_shelfAct || this.m_viewItems || this.m_shelfSel || this.m_rmItems) {
              this.closeAllModals();
            }
            return;
          }
          this._asub = newSub;

          if (this.m_shelfSel) this.mc_shelfSelList = newSub.shelves;

          if (this._ash) {
            const newShelf = newSub.shelves.find(s => s.id === this._ash.id);
            if (!newShelf) {
              this._ash = null;
              if (this.m_addItem) {
                this.addItemLocErr = `Shelf has been deleted. Please close and choose another location.`;
              } else if (this.m_shelfAct || this.m_viewItems || this.m_rmItems) {
                this.closeAllModals();
              }
              return;
            }
            this._ash = newShelf;

            if (this.m_shelfAct) {
              this.mc_shelfActSub = `${newShelf.items.length} item${newShelf.items.length !== 1 ? 's' : ''} on this shelf`;
            }
            if (this.m_viewItems || this.m_rmItems) {
              this.mc_itemList = newShelf.items;
            }
          }
        }
      }

      // Re-anchor _azfi to newly loaded zone object
      if (this._azfi) {
        const newZone = this._zones.find(z => z.id === this._azfi.id);
        if (!newZone) {
          this._azfi = null;
          if (this.m_addItem) {
            this.addItemLocErr = `Zone "${this._azfi?.label ?? ''}" has been deleted. Please close and choose another location.`;
          } else if (this.m_zoneAct || this.m_zoneItems) {
            this.closeAllModals();
          }
          return;
        }
        this._azfi = newZone;

        if (this.m_zoneAct) {
          const n = newZone.items.length;
          this.mc_zoneActSub = `${n} item${n !== 1 ? 's' : ''} in this zone`;
        }
        if (this.m_zoneItems) this.mc_zoneItemList = newZone.items;
      }
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
      this.itemIdError = false; this.addItemLocErr = '';
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
      const totalSelected = this._selPalletRacks.length + this._selZones.length;
      if (totalSelected === 0) return;

      if (totalSelected === 1) {
        const entity = this._selPalletRacks[0] || this._selZones[0];
        const type   = this._selPalletRacks.length ? 'pallet-rack' : 'zone';
        this._pendDelEnt = { entity, type, multi: false };
        if (type === 'pallet-rack') {
          const total = entity.subsections.reduce((n, s) => n + s.shelves.reduce((m, sh) => m + sh.items.length, 0), 0);
          this.mc_delEntTitle = `Delete Pallet Rack "${entity.label}"?`;
          this.mc_delEntMsg   = total > 0
            ? `This pallet rack contains ${total} item(s). They will all be permanently removed.`
            : `Pallet Rack "${entity.label}" will be permanently removed.`;
        } else {
          const n = entity.items?.length || 0;
          this.mc_delEntTitle = `Delete Zone "${entity.label}"?`;
          this.mc_delEntMsg   = n > 0
            ? `This zone contains ${n} item(s). They will all be permanently removed.`
            : `Zone "${entity.label}" will be permanently removed.`;
        }
      } else {
        const totalItems = this._selPalletRacks.reduce((n, palletRack) =>
          n + palletRack.subsections.reduce((m, s) => m + s.shelves.reduce((k, sh) => k + sh.items.length, 0), 0), 0
        ) + this._selZones.reduce((n, z) => n + (z.items?.length || 0), 0);
        this._pendDelEnt = { multi: true, palletRacks: [...this._selPalletRacks], zones: [...this._selZones] };
        this.mc_delEntTitle = `Delete ${totalSelected} selected entities?`;
        this.mc_delEntMsg   = totalItems > 0
          ? `This will permanently remove ${totalSelected} entities and ${totalItems} stored item(s).`
          : `${totalSelected} selected entities will be permanently removed.`;
      }
      this.m_delEnt = true;
    },

    async confirmDeleteEntity() {
      this.m_delEnt = false;
      if (!this._pendDelEnt) return;

      if (this._pendDelEnt.multi) {
        const { palletRacks, zones } = this._pendDelEnt;
        this._pendDelEnt = null;
        this._clearAllSelection();
        for (const palletRack of palletRacks) {
          for (const sub of palletRack.subsections)
            for (const shelf of sub.shelves)
              for (const item of shelf.items)
                await this._removeItemFromDB(item.id);
          this._wh.querySelectorAll(`.edit-handle[data-type="pallet-rack"][data-id="${palletRack.id}"]`).forEach(el => el.remove());
          palletRack.element.remove();
          const idx = this._palletRacks.indexOf(palletRack);
          if (idx !== -1) this._palletRacks.splice(idx, 1);
        }
        for (const zone of zones) {
          for (const item of (zone.items || []))
            await this._removeItemFromDB(item.id);
          this._wh.querySelectorAll(`.edit-handle[data-type="zone"][data-id="${zone.id}"]`).forEach(el => el.remove());
          zone.element.remove();
          const idx = this._zones.indexOf(zone);
          if (idx !== -1) this._zones.splice(idx, 1);
        }
        this.palletRackCountText = `Pallet Racks: ${this._palletRacks.length}`;
        this._refreshNavLists();
        this.statusText = `Deleted ${palletRacks.length + zones.length} entities.`;
        this._saveLayout();
        return;
      }

      const { entity, type } = this._pendDelEnt;
      this._pendDelEnt = null;

      // Delete items from DB
      if (type === 'pallet-rack') {
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

      if (type === 'pallet-rack') {
        const idx = this._palletRacks.indexOf(entity);
        if (idx !== -1) this._palletRacks.splice(idx, 1);
        this._clearAllSelection();
        this.palletRackCountText = `Pallet Racks: ${this._palletRacks.length}`;
        this.statusText    = `Pallet Rack "${entity.label}" deleted.`;
      } else {
        const idx = this._zones.indexOf(entity);
        if (idx !== -1) this._zones.splice(idx, 1);
        this._clearAllSelection();
        this.statusText = `Zone "${entity.label}" deleted.`;
      }
      this._refreshNavLists();
      this._saveLayout();
    },

    // ── Inspector panel ───────────────────────────────────────────────────────

    _openInspector(entity, type) {
      this._inspEntity      = entity;
      this.insp_show        = true;
      this.insp_type        = type;
      this.insp_name        = entity.label;
      this.insp_row         = entity.row || '';
      this.insp_color       = entity.color;
      this.insp_labelColor  = entity.labelColor || entity.color;
      this.insp_fillColor   = entity.fillColor  || '#ffffff';
      this.insp_fillOpacity = entity.fillOpacity ?? 0;
      this.insp_hideLabel   = entity.hideLabel   ?? false;
      this.insp_hideHeader  = entity.hideHeader  ?? false;
      this.insp_itemFree    = entity.itemFree    ?? false;
      this.insp_nameError   = false;
      this.insp_shelfOrder  = type === 'pallet-rack' ? (entity.facing || 'right') : 'right';
      this.menuCollapsed    = false;  // auto-expand the menu
    },

    _closeInspector() {
      this._inspEntity = null;
      this.insp_show   = false;
    },

    async applyInspectorLabel() {
      const name = this.insp_name.trim();
      if (!name) { this.insp_nameError = true; return; }
      this.insp_nameError = false;
      const entity = this._inspEntity;
      if (!entity) return;
      entity.label = name;
      if (this.insp_type === 'pallet-rack') {
        const newRow = this.insp_row.trim();
        entity.row = newRow;
        const hdr = entity.element.querySelector('.pallet-rack-header');
        if (hdr) hdr.innerHTML = this._palletRackHeaderHtml(newRow, name, entity.labelColor);
        await fetch(`/api/items/pallet-rack/${entity.id}/label`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pallet_rack_label: name, pallet_rack_row: newRow }),
        });
      } else {
        const lbl = entity.element.querySelector('.zone-label');
        if (lbl) lbl.textContent = name;
      }
      this._refreshNavLists();
      this._saveLayout();
      this.statusText = `"${name}" saved.`;
    },

    applyShelfOrder(facing) {
      const palletRack = this._inspEntity;
      if (!palletRack || this.insp_type !== 'pallet-rack' || palletRack.facing === facing) return;
      palletRack.facing = facing;
      this.insp_shelfOrder = facing;
      palletRack.subsections.forEach(sub => {
        sub.element.classList.toggle('facing-right', facing === 'right');
        sub.element.classList.toggle('facing-left',  facing === 'left');
        // Reversing all children of shelvesDiv swaps wall side and shelf order
        const sd = sub.element.querySelector('.sub-shelves');
        if (!sd) return;
        const children = [...sd.children];
        children.reverse().forEach(c => sd.appendChild(c));
      });
      this._saveLayout();
    },

    // ── Copy / Paste pallet rack ─────────────────────────────────────────────

    _copyPalletRack() {
      if (!this._selPalletRack) return;
      const palletRack = this._selPalletRack;
      this._copiedPalletRack = {
        row: palletRack.row || '', color: palletRack.color, shelfColor: palletRack.shelfColor,
        fillColor: palletRack.fillColor || '#ffffff', fillOpacity: palletRack.fillOpacity ?? 0,
        labelColor: palletRack.labelColor || palletRack.color, rotation: palletRack.rotation || 0,
        facing: palletRack.facing, dimensions: { ...palletRack.dimensions },
        shelfLabels: [...palletRack.shelfLabels],
        subsectionStart: palletRack.subsectionStart, subsectionCount: palletRack.subsectionCount,
        position: { ...palletRack.position },
        subsections: palletRack.subsections.map(sub => ({
          number: sub.number, name: sub.name || '',
          shelves: sub.shelves.map(sh => ({ shelfNumber: sh.shelfNumber, label: sh.label })),
        })),
        sourceLabel: palletRack.label,
      };
      this.statusText = `Copied "${palletRack.label}". Press Ctrl+V to paste.`;
    },

    _openPastePalletRackModal() {
      if (!this._copiedPalletRack) return;
      this.f_pastePalletRackName    = this._copiedPalletRack.sourceLabel + ' (copy)';
      this.mc_pastePalletRackSub    = `Copying "${this._copiedPalletRack.sourceLabel}" — structure, colors, and shelf order. Items will not be copied.`;
      this.pastePalletRackNameError = false;
      this.m_pastePalletRack = true;
      this.$nextTick(() => { const el = this.$refs.pastePalletRackInput; el?.focus(); el?.select(); });
    },

    pastePalletRack() {
      const name = this.f_pastePalletRackName.trim();
      if (!name) { this.pastePalletRackNameError = true; return; }
      this.pastePalletRackNameError = false;
      const src = this._copiedPalletRack;
      const id  = ++this._palletRackCounter;
      const x   = Math.min(src.position.x + 30, Math.max(0, this._wh.clientWidth  - src.dimensions.width));
      const y   = Math.min(src.position.y + 30, Math.max(0, this._wh.clientHeight - src.dimensions.height));

      const el = document.createElement('div');
      el.className = 'pallet-rack';
      Object.assign(el.style, {
        left:`${x}px`, top:`${y}px`, width:`${src.dimensions.width}px`, height:`${src.dimensions.height}px`,
        borderColor: src.color, transform:`rotate(${src.rotation}deg)`,
      });
      el.dataset.palletRackId = id;
      el.innerHTML = `<div class="pallet-rack-header">${this._palletRackHeaderHtml(src.row || '', name, src.labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'pallet-rack-body';

      const palletRack = {
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
        if (srcSub.name) {
          const nameEl = document.createElement('div');
          nameEl.className = 'sub-name-label';
          nameEl.textContent = srcSub.name;
          subEl.appendChild(nameEl);
        }
        const shelvesDiv = document.createElement('div'); shelvesDiv.className = 'sub-shelves';
        const shelves = srcSub.shelves.map(ss => ({
          id: ++this._shelfCounter, palletRackId: id, subsectionId: subId,
          shelfNumber: ss.shelfNumber, label: ss.label, items: [], element: null,
        }));
        const makeSlot = (sh) => {
          const slot = document.createElement('div');
          slot.className = 'shelf-slot'; slot.textContent = sh.label;
          slot.style.borderColor = src.shelfColor; sh.element = slot; return slot;
        };
        if (src.facing === 'left') { [...shelves].reverse().forEach(sh => shelvesDiv.appendChild(makeSlot(sh))); }
        else                       { shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh))); }
        subEl.appendChild(shelvesDiv);
        const subObj = { id: subId, palletRackId: id, number: srcSub.number, name: srcSub.name || '', element: subEl, shelves };
        palletRack.subsections.push(subObj);
        subEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (this._drawMode || this._editMode || this._palletRackDragMoved) return;
          this._ai = this._palletRacks.find(i => i.id === id);
          this._asub = subObj;
          this._openShelfSelect(subObj);
        });
        body.appendChild(subEl);
      });

      el.appendChild(body);
      this._applyPalletRackFill(el, src.fillColor, src.fillOpacity);
      this._wh.appendChild(el);
      this._palletRacks.push(palletRack);
      this._attachPalletRackHandlers(palletRack);
      if (this._editMode) this._createHandles(palletRack, 'pallet-rack');

      this.palletRackCountText = `Pallet Racks: ${this._palletRacks.length}`;
      this._refreshNavLists();
      this.statusText = `Pallet Rack "${name}" pasted.`;
      this.m_pastePalletRack = false;
      this._saveLayout();
    },

    // ── Copy / Paste zone ─────────────────────────────────────────────────────

    _copyZone() {
      if (!this._selZone) return;
      const zone = this._selZone;
      this._copiedZone = {
        color: zone.color, fillOpacity: zone.fillOpacity,
        labelColor: zone.labelColor, rotation: zone.rotation || 0,
        hideLabel: zone.hideLabel ?? false, itemFree: zone.itemFree ?? false,
        dimensions: { ...zone.dimensions }, position: { ...zone.position },
        sourceLabel: zone.label,
      };
      this._copiedPalletRack = null;
      this.statusText = `Copied "${zone.label}". Press Ctrl+V to paste.`;
    },

    _openPasteZoneModal() {
      if (!this._copiedZone) return;
      this.f_pasteZoneName    = this._copiedZone.sourceLabel + ' (copy)';
      this.mc_pasteZoneSub    = `Copying "${this._copiedZone.sourceLabel}" — size, color, and rotation. Items will not be copied.`;
      this.pasteZoneNameError = false;
      this.m_pasteZone = true;
      this.$nextTick(() => { const el = this.$refs.pasteZoneInput; el?.focus(); el?.select(); });
    },

    pasteZone() {
      const label = this.f_pasteZoneName.trim();
      if (!label) { this.pasteZoneNameError = true; return; }
      this.pasteZoneNameError = false;
      const src = this._copiedZone;
      const id  = ++this._zoneCounter;
      const x   = src.position.x + 30;
      const y   = src.position.y + 30;

      const el = document.createElement('div');
      el.className = 'zone';
      Object.assign(el.style, {
        left:`${x}px`, top:`${y}px`,
        width:`${src.dimensions.width}px`, height:`${src.dimensions.height}px`,
        borderColor: src.color, transform:`rotate(${src.rotation}deg)`,
      });
      el.dataset.zoneId = id;
      this._applyZoneFill(el, src.color, src.fillOpacity);
      const lblEl = document.createElement('div');
      lblEl.className = 'zone-label';
      lblEl.textContent = label; lblEl.style.color = src.labelColor;
      if (src.hideLabel) lblEl.style.display = 'none';
      el.appendChild(lblEl);
      this._wh.appendChild(el);

      const zone = {
        id, label, color: src.color, fillOpacity: src.fillOpacity,
        labelColor: src.labelColor, rotation: src.rotation,
        hideLabel: src.hideLabel ?? false, itemFree: src.itemFree ?? false,
        position: { x, y }, dimensions: { ...src.dimensions },
        items: [], element: el, createdAt: new Date().toISOString(),
      };
      this._zones.push(zone);
      this._attachZoneHandlers(zone);
      if (this._editMode) this._createHandles(zone, 'zone');
      this._refreshNavLists();
      this.statusText = `Zone "${label}" pasted.`;
      this.m_pasteZone = false;
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

    // Public alias so Vue templates can call _saveLayout (underscore methods aren't on the proxy)
    saveLayout() { this._saveLayout(); },

    closeAllModals() {
      this.m_count = this.m_subs = this.m_labels = this.m_subSel = this.m_shelfSel = false;
      this.m_addShelf = this.m_shelfAct = this.m_addItem = this.m_bulkAdd = this.m_viewItems = this.m_itemDetail = this.m_editItem = this.m_rmItems = this.m_confDel = this.m_confDelSub = false;
      this.m_zone = this.m_pastePalletRack = this.m_pasteZone = this.m_delEnt = this.m_zoneAct = this.m_zoneItems = this.m_zoneBulkAdd = false;
      this.m_moveDest = false;
      this._ai = null; this._asub = null; this._ash = null; this._azfi = null;
      this._selItemIds.clear(); this._selZoneItemIds.clear();
      this._itemsToMove = [];
      this.mc_selItemIds = []; this.mc_selZoneItemIds = [];
      this.mc_selCount = 0; this.mc_zoneSelCount = 0;
      this._checkPollPending();
    },

    // ── Search ────────────────────────────────────────────────────────────────

    onSearchInput() {
      if (!this.searchQuery.trim()) this.clearSearch();
    },

    runSearch() {
      const query = this.searchQuery.trim().replace(/^0+(?=.)/, '');
      if (!query) return;
      this._clearHighlights();
      const q = query.toLowerCase();
      const multiWh = this._warehouses.length > 1;

      // Flush active warehouse into this._warehouses so all data is in one place.
      this._serializeCurrentWarehouse();

      const esc  = this._escH.bind(this);
      const results = [];

      for (let whIdx = 0; whIdx < this._warehouses.length; whIdx++) {
        const wh       = this._warehouses[whIdx];
        const isActive = whIdx === this._activeWhIdx;
        const whLabel  = wh.name || `Warehouse ${whIdx + 1}`;

        // ── Pallet racks ─────────────────────────────────────────────────────
        for (const prData of (wh.palletRacks || [])) {
          for (const subData of (prData.subsections || [])) {
            for (const shData of (subData.shelves || [])) {
              for (const item of (shData.items || [])) {
                if (!item.itemId || !item.itemId.toLowerCase().includes(q)) continue;

                // For the active warehouse, grab live DOM references and highlight.
                let liveSub = null, liveShelf = null;
                if (isActive) {
                  const livePr = this._palletRacks.find(p => p.id === prData.id);
                  if (livePr) {
                    if (!livePr.element.classList.contains('pallet-rack-highlight'))
                      livePr.element.classList.add('pallet-rack-highlight');
                    liveSub = livePr.subsections.find(s => s.id === subData.id);
                    if (liveSub) {
                      if (!liveSub.element.classList.contains('sub-highlight'))
                        liveSub.element.classList.add('sub-highlight');
                      liveShelf = liveSub.shelves.find(s => s.id === shData.id);
                      if (liveShelf?.element && !liveShelf.element.classList.contains('shelf-highlight'))
                        liveShelf.element.classList.add('shelf-highlight');
                    }
                  }
                }

                const whPart = multiWh
                  ? `<span class="lbl">WH:</span>${esc(whLabel)}<span class="sep">|</span>`
                  : '';
                const html = [
                  whPart + `<span class="lbl">PR:</span>${esc(prData.label)}`,
                  `<span class="sep">|</span><span class="lbl">SUB:</span>${esc(subData.name || String(subData.number))}`,
                  `<span class="sep">|</span><span class="lbl">SH:</span>${esc(shData.label)}`,
                  `<span class="sep">|</span><span class="lbl">ID:</span>${esc(item.itemId)}`,
                  item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${esc(item.type)}`     : '',
                  item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${esc(item.category)}` : '',
                ].filter(Boolean).join('');

                const locParts = [
                  multiWh                ? `WH: ${whLabel}`                          : '',
                  `PR: ${prData.label}`,
                  `SUB: ${subData.name || subData.number}`,
                  `SH: ${shData.label}`,
                  `ID: ${item.itemId}`,
                  item.type     ? `T: ${item.type}`     : '',
                  item.category ? `CAT: ${item.category}` : '',
                ].filter(Boolean).join(' | ');

                results.push({
                  html,
                  locationText: locParts,
                  cardStyle: '',
                  scrollTarget: liveSub?.element ?? null,
                  warehouseIdx:  whIdx,
                  palletRackId:  prData.id,
                  subId:         subData.id,
                  shelfId:       shData.id,
                  item,
                  shelf: liveShelf ?? null,
                });
              }
            }
          }
        }

        // ── Zones ─────────────────────────────────────────────────────────────
        for (const zoneData of (wh.zones || [])) {
          for (const item of (zoneData.items || [])) {
            if (!item.itemId || !item.itemId.toLowerCase().includes(q)) continue;

            let liveZone = null;
            if (isActive) {
              liveZone = this._zones.find(z => z.id === zoneData.id);
              if (liveZone && !liveZone.element.classList.contains('zone-highlight'))
                liveZone.element.classList.add('zone-highlight');
            }

            const whPart = multiWh
              ? `<span class="lbl">WH:</span>${esc(whLabel)}<span class="sep">|</span>`
              : '';
            const html = [
              whPart + `<span class="lbl">Z:</span>${esc(zoneData.label)}`,
              `<span class="sep">|</span><span class="lbl">ID:</span>${esc(item.itemId)}`,
              item.type     ? `<span class="sep">|</span><span class="lbl">T:</span>${esc(item.type)}`     : '',
              item.category ? `<span class="sep">|</span><span class="lbl">CAT:</span>${esc(item.category)}` : '',
            ].filter(Boolean).join('');

            const locParts = [
              multiWh           ? `WH: ${whLabel}`      : '',
              `Z: ${zoneData.label}`,
              `ID: ${item.itemId}`,
              item.type     ? `T: ${item.type}`     : '',
              item.category ? `CAT: ${item.category}` : '',
            ].filter(Boolean).join(' | ');

            results.push({
              html,
              locationText: locParts,
              cardStyle: 'border-left-color:#8b5cf6',
              scrollTarget: liveZone?.element ?? null,
              warehouseIdx: whIdx,
              zoneId:       zoneData.id,
              item,
              shelf: null,
            });
          }
        }
      }

      this.searchResults     = results;
      this.showSearchResults = true;
      if (results.length > 0) this._scheduleHighlightClear();

      if (results.length === 0) {
        this._log(`No items found matching "${query}"`, 'warn');
      } else {
        this._log(`Found ${results.length} item${results.length !== 1 ? 's' : ''} matching "${query}"`, 'success');
        results.forEach(r => this._log(r.locationText, 'success'));
        // Single result: jump to it automatically.
        if (results.length === 1) this.scrollToResult(results[0]);
      }
    },

    scrollToResult(result) {
      if (result.warehouseIdx !== this._activeWhIdx) {
        // Store lookup info; switchTab → _importLayout → _resetView will consume it.
        this._pendingScrollEl = result.zoneId !== undefined
          ? { zoneId: result.zoneId }
          : { palletRackId: result.palletRackId, subId: result.subId, shelfId: result.shelfId };
        this.switchTab(result.warehouseIdx);
        return;
      }
      // Same warehouse — pan immediately and zoom so the target fills ≥50% of viewport height.
      const el = result.scrollTarget;
      if (el) this._zoomPanToElement(el);
      // Restart pulsing on the specific element the user clicked.
      const pulseEl = result.shelf?.element ?? (result.zoneId !== undefined ? result.scrollTarget : null);
      const pulseClass  = result.shelf?.element ? 'shelf-highlight'  : 'zone-highlight';
      const staticClass = result.shelf?.element ? 'shelf-highlight-static' : 'zone-highlight-static';
      if (pulseEl) {
        pulseEl.classList.remove(pulseClass, staticClass);
        pulseEl.style.removeProperty('background'); // clear any inline !important from _stopPulsing
        void pulseEl.offsetWidth; // force reflow to restart CSS animation
        pulseEl.classList.add(pulseClass);
        this._scheduleHighlightClear();
      }
    },

    clearSearch() {
      this.searchQuery = '';
      this.searchResults = [];
      this.showSearchResults = false;
      this._clearHighlights();
    },

    _clearHighlights() {
      clearTimeout(this._highlightTimer);
      this._highlightTimer = null;
      // Shelves: remove class + any inline override set by _stopPulsing
      this._wh.querySelectorAll('.shelf-highlight,.shelf-highlight-static').forEach(el => {
        el.classList.remove('shelf-highlight', 'shelf-highlight-static');
        el.style.removeProperty('background');
      });
      // Zones: remove class + inline override, then restore the zone's own fill color
      this._wh.querySelectorAll('.zone-highlight,.zone-highlight-static').forEach(el => {
        el.classList.remove('zone-highlight', 'zone-highlight-static');
        el.style.removeProperty('background');
        const zone = this._zones.find(z => z.id === parseInt(el.dataset.zoneId));
        if (zone) this._applyZoneFill(el, zone.color, zone.fillOpacity);
      });
      this._wh.querySelectorAll('.pallet-rack-highlight,.sub-highlight')
        .forEach(el => el.classList.remove('pallet-rack-highlight', 'sub-highlight'));
    },

    _stopPulsing() {
      clearTimeout(this._highlightTimer);
      this._highlightTimer = null;
      // Stop shelf pulsing — force static orange via inline !important (beats any CSS cascade)
      this._wh.querySelectorAll('.shelf-highlight').forEach(el => {
        el.classList.remove('shelf-highlight');
        el.classList.add('shelf-highlight-static');
        el.style.setProperty('background', 'rgba(251,146,60,0.55)', 'important');
      });
      // Stop zone pulsing — force static yellow via inline !important
      this._wh.querySelectorAll('.zone-highlight').forEach(el => {
        el.classList.remove('zone-highlight');
        el.classList.add('zone-highlight-static');
        el.style.setProperty('background', 'rgba(254,240,138,0.4)', 'important');
      });
      // pallet-rack-highlight and sub-highlight are left untouched
    },

    _scheduleHighlightClear() {
      clearTimeout(this._highlightTimer);
      this._highlightTimer = setTimeout(() => this._stopPulsing(), 20_000);
    },

    // ── Navigation dropdowns ──────────────────────────────────────────────────

    _refreshNavLists() {
      const allPRs = [], allZones = [];
      // Only show entries for the currently active warehouse
      const prs   = this._palletRacks;
      const zones = this._zones;
      for (const pr of prs) {
        allPRs.push({
          id: pr.id, label: pr.label || '', row: pr.row || '',
          whLabel: '', warehouseIdx: this._activeWhIdx,
          position: { ...pr.position }, dimensions: { ...pr.dimensions },
        });
      }
      for (const zone of zones) {
        if (zone.itemFree) continue;  // exclude no-item zones
        allZones.push({
          id: zone.id, label: zone.label || '',
          whLabel: '', warehouseIdx: this._activeWhIdx,
          position: { ...zone.position }, dimensions: { ...zone.dimensions },
        });
      }
      this.navPalletRacks = allPRs.sort((a, b) => a.label.localeCompare(b.label));
      this.navZones       = allZones.sort((a, b) => a.label.localeCompare(b.label));
    },

    _jumpToElement(el, elX, elY, elW, elH) {
      const vpRect  = this._vp.getBoundingClientRect();
      const fitZoom = Math.min(
        Math.max(
          Math.min((vpRect.width * 0.65) / elW, (vpRect.height * 0.65) / elH),
          0.2,
        ),
        3,
      );
      this._currentZoom = fitZoom;
      this._panX = vpRect.width  / 2 - (elX + elW / 2) * fitZoom;
      this._panY = vpRect.height / 2 - (elY + elH / 2) * fitZoom;
      this._applyTransform();
      this.zoomText = `${Math.round(fitZoom * 100)}%`;
    },

    jumpToPalletRack(entry) {
      if (entry.warehouseIdx !== this._activeWhIdx) {
        this._pendingScrollEl = { palletRackId: entry.id, navJump: true };
        this.switchTab(entry.warehouseIdx);
        return;
      }
      const pr = this._palletRacks.find(p => p.id === entry.id);
      if (!pr) return;
      this._clearHighlights();
      pr.element.classList.add('pallet-rack-highlight');
      this._jumpToElement(pr.element, pr.position.x, pr.position.y, pr.dimensions.width, pr.dimensions.height);
      this._scheduleHighlightClear();
    },

    jumpToZone(entry) {
      if (entry.warehouseIdx !== this._activeWhIdx) {
        this._pendingScrollEl = { zoneId: entry.id, navJump: true };
        this.switchTab(entry.warehouseIdx);
        return;
      }
      const zone = this._zones.find(z => z.id === entry.id);
      if (!zone) return;
      this._clearHighlights();
      this._jumpToElement(zone.element, zone.position.x, zone.position.y, zone.dimensions.width, zone.dimensions.height);
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
        palletRackCounter: this._palletRackCounter,
        subsectionCounter: this._subsectionCounter,
        shelfCounter:      this._shelfCounter,
        itemCounter:       this._itemCounter,
        zoneCounter:       this._zoneCounter,
      };
      wh.palletRacks = this._palletRacks.map(pr => ({
        id: pr.id, label: pr.label, row: pr.row || '', color: pr.color, shelfColor: pr.shelfColor,
        fillColor: pr.fillColor || '#ffffff', fillOpacity: pr.fillOpacity ?? 0,
        labelColor: pr.labelColor || pr.color, rotation: pr.rotation || 0, facing: pr.facing,
        hideHeader: pr.hideHeader ?? false,
        position: { ...pr.position }, dimensions: { ...pr.dimensions },
        shelfCount: pr.shelfCount, shelfLabels: [...pr.shelfLabels],
        subsectionStart: pr.subsectionStart, subsectionCount: pr.subsectionCount,
        createdAt: pr.createdAt,
        subsections: pr.subsections.map(sub => ({
          id: sub.id, number: sub.number, name: sub.name || '',
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
        hideLabel: zone.hideLabel ?? false, itemFree: zone.itemFree ?? false,
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
        counters: {}, palletRacks: [], zones: [],
      });
      this._activeWhIdx = this._warehouses.length - 1;
      this._loadWarehouseDOM(this._warehouses[this._activeWhIdx]);
      this._syncTabs();
      this._saveLayout();
    },

    _confirmWarn(title, message) {
      this.warnModal = { title, message };
      this.m_warn = true;
      return new Promise(resolve => { this._warnResolve = resolve; });
    },

    warnAnswer(answer) {
      this.m_warn = false;
      if (this._warnResolve) { this._warnResolve(answer); this._warnResolve = null; }
    },

    async removeTab(idx) {
      if (this._warehouses.length <= 1) return;
      const whName = this._warehouses[idx]?.name || `Warehouse ${idx + 1}`;
      const ok1 = await this._confirmWarn(
        'Delete Warehouse?',
        `"${whName}" and all its pallet racks, zones, and items will be permanently removed.`,
      );
      if (!ok1) return;
      const ok2 = await this._confirmWarn(
        'Are You Absolutely Sure?',
        `Final confirmation — permanently delete "${whName}"? This cannot be undone.`,
      );
      if (!ok2) return;
      // Back up the database before destructive change
      try {
        const resp = await fetch('/api/backup-db', { method: 'POST' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (err) {
        alert('Database backup failed — deletion cancelled for safety. Please try again.');
        _sendVueError(err?.message || String(err), 'removeTab:backup', err?.stack || '', 'warehouse.js:removeTab');
        return;
      }
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
      const oldName = this._warehouses[idx].name;
      const newName = e.target.value.trim() || oldName;
      this._warehouses[idx].name = newName;
      this.renamingTabIdx = -1;
      this._syncTabs();
      this._saveLayout();
      if (newName !== oldName) {
        fetch('/api/items/rename-warehouse', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_name: oldName, new_name: newName }),
        }).catch(err => console.error('Rename warehouse items failed:', err));
      }
    },

    cancelRenameTab(idx) {
      this.renamingTabIdx = -1;
      this._syncTabs();
    },

    openReorderTabs() {
      this.reorderList   = this.tabs.map(t => ({ ...t }));
      this.reorderSelIdx = -1;
      this.m_reorderTabs = true;
    },
    reorderTabUp() {
      const i = this.reorderSelIdx;
      if (i <= 0) return;
      const item = this.reorderList.splice(i, 1)[0];
      this.reorderList.splice(i - 1, 0, item);
      this.reorderSelIdx = i - 1;
    },
    reorderTabDown() {
      const i = this.reorderSelIdx;
      if (i < 0 || i >= this.reorderList.length - 1) return;
      const item = this.reorderList.splice(i, 1)[0];
      this.reorderList.splice(i + 1, 0, item);
      this.reorderSelIdx = i + 1;
    },
    saveReorderTabs() {
      this.m_reorderTabs = false;
      this._serializeCurrentWarehouse();
      const activeWhId = this._warehouses[this._activeWhIdx].id;
      const idOrder    = this.reorderList.map(t => t.id);
      this._warehouses.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));
      this._activeWhIdx = this._warehouses.findIndex(wh => wh.id === activeWhId);
      this._syncTabs();
      this._saveLayout();
    },

    _loadWarehouseDOM(wh) {
      this._importLayout({
        warehouse:   { width: wh.width || 800, height: wh.height || 500, background: wh.background || null },
        counters:    wh.counters || {},
        palletRacks: wh.palletRacks || wh.isles || [],
        zones:       wh.zones   || [],
      });
      this.statusText = `${wh.name} — ${this._palletRacks.length} pallet rack(s), ${this._zones.length} zone(s).`;
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
          palletRacks: wh.palletRacks || wh.isles || [], zones: wh.zones || [],
        });
      });
      if (!this._warehouses.length) {
        this._warehouses.push({ id: ++this._whTabCounter, name: 'Warehouse 1',
          width:800, height:500, background:null, counters:{}, palletRacks:[], zones:[] });
      }
      this._activeWhIdx = Math.min(data.activeWarehouseIdx || 0, this._warehouses.length - 1);
      this._loadWarehouseDOM(this._warehouses[this._activeWhIdx]);
      this._syncTabs();
      if (!this._silentImport) this.$nextTick(() => this._resetView());
    },

    _importLayout(data) {
      if (!this._silentImport) {
        if (this._drawMode) this._cancelDrawMode();
        if (this._editMode) this._cancelEditMode();
        this.closeAllModals();
      }

      this._palletRacks.forEach(i => i.element.remove());
      this._palletRacks.length = 0;
      this._zones.forEach(z => z.element.remove());
      this._zones.length = 0;
      this._removeAllHandles();

      this._wh.style.width  = data.warehouse.width  + 'px';
      this._wh.style.height = data.warehouse.height + 'px';

      if (data.warehouse.background) this._setWarehouseBgSilent(data.warehouse.background);
      else this._clearBgSilent();

      const c = data.counters || {};
      this._palletRackCounter = c.palletRackCounter || c.isleCounter || 0;
      this._subsectionCounter = c.subsectionCounter  || 0;
      this._shelfCounter      = c.shelfCounter       || 0;
      this._itemCounter       = c.itemCounter        || 0;
      this._zoneCounter       = c.zoneCounter        || 0;

      (data.palletRacks || data.isles || []).forEach(d => this._rebuildPalletRack(d));
      (data.zones || []).forEach(d => this._rebuildZone(d));

      this.palletRackCountText = `Pallet Racks: ${this._palletRacks.length}`;
      this._refreshNavLists();
      // Use rAF to defer until after the browser has computed layout,
      // ensuring getBoundingClientRect() on the viewport returns correct dimensions.
      if (!this._silentImport) requestAnimationFrame(() => this._resetView());
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

    _rebuildPalletRack(d) {
      const row = d.row || '', sc = d.shelfColor || '#aaaaaa';
      const fillColor   = d.fillColor   || '#ffffff';
      const fillOpacity = d.fillOpacity ?? 0;
      const labelColor  = d.labelColor  || d.color;
      const rotation    = d.rotation    || 0;

      const el = document.createElement('div');
      el.className = 'pallet-rack';
      Object.assign(el.style, {
        left:`${d.position.x}px`, top:`${d.position.y}px`,
        width:`${d.dimensions.width}px`, height:`${d.dimensions.height}px`,
        borderColor: d.color, transform:`rotate(${rotation}deg)`,
      });
      const hideHeader = d.hideHeader ?? false;
      el.dataset.palletRackId = d.id;
      el.innerHTML = `<div class="pallet-rack-header"${hideHeader ? ' style="display:none"' : ''}>${this._palletRackHeaderHtml(row, d.label, labelColor)}</div>`;

      const body = document.createElement('div');
      body.className = 'pallet-rack-body';

      const palletRack = {
        id: d.id, label: d.label, row, color: d.color, shelfColor: sc,
        fillColor, fillOpacity, labelColor, rotation, facing: d.facing,
        hideHeader,
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
        if (sd.name) {
          const nameEl = document.createElement('div');
          nameEl.className = 'sub-name-label';
          nameEl.textContent = sd.name;
          subEl.appendChild(nameEl);
        }

        const shelvesDiv = document.createElement('div'); shelvesDiv.className = 'sub-shelves';

        const shelves = (sd.shelves || []).map(shd => ({
          id: shd.id, palletRackId: d.id, subsectionId: sd.id,
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
        } else {
          shelves.forEach(sh => shelvesDiv.appendChild(makeSlot(sh)));
        }
        subEl.appendChild(shelvesDiv);

        const subObj = { id: sd.id, palletRackId: d.id, number: sd.number, name: sd.name || '', element: subEl, shelves };
        palletRack.subsections.push(subObj);

        subEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this._drawMode || this._editMode || this._palletRackDragMoved) return;
          this._ai = this._palletRacks.find(i => i.id === d.id);
          this._asub = subObj;
          this._openShelfSelect(subObj);
        });
        body.appendChild(subEl);
      });

      el.appendChild(body);
      this._applyPalletRackFill(el, fillColor, fillOpacity);
      this._wh.appendChild(el);
      this._palletRacks.push(palletRack);
      this._attachPalletRackHandlers(palletRack);
    },

    _rebuildZone(d) {
      const fillOpacity = d.fillOpacity ?? 18;
      const labelColor  = d.labelColor  || '#444444';
      const rotation    = d.rotation    || 0;
      const hideLabel   = d.hideLabel   ?? false;
      const itemFree    = d.itemFree    ?? false;
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
      if (hideLabel) lblEl.style.display = 'none';
      el.appendChild(lblEl);
      this._wh.appendChild(el);
      const zone = {
        id: d.id, label: d.label, color: d.color, fillOpacity, labelColor, rotation,
        hideLabel, itemFree,
        position: { ...d.position }, dimensions: { ...d.dimensions },
        items: (d.items || []).map(i => ({ ...i })), element: el, createdAt: d.createdAt,
      };
      this._zones.push(zone);
      this._attachZoneHandlers(zone);
    },
  },
});

_vueApp.config.errorHandler = function(err, _vm, info) {
  _sendVueError(err?.message || String(err), info, err?.stack || '', 'vue:errorHandler');
};

_vueApp.mount('#app');
