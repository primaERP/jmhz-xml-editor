// Auto-generated Vue template for JMHZ Viewer
// Source of truth for both standalone and embed modes
window.JMHZ_VIEWER_TEMPLATE = `<!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-left">
      <img :src="assetBase + 'images/abra-logo-2026.svg'" alt="ABRA" style="flex-shrink: 0; height: 28px; width: auto;">
      <span style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">JMHZ Viewer</span>
    </div>
    <div class="toolbar-center"></div>
    <div class="toolbar-actions">
      <button @click="loadFile" v-if="xmlDoc">Nahrát XML</button>
      <button class="primary" @click="saveFile" v-if="xmlDoc">Uložit XML</button>
      <button @click="validateAll" v-if="xmlDoc">Zkontrolovat</button>
      <button @click="toggleViewMode" v-if="xmlDoc">Zobrazení: {{ viewMode === 'cards' ? 'Karty' : 'Tabulka' }}</button>
      <button @click="xlsDialog = true" v-if="xmlDoc">Export XLS</button>
    </div>
    <span class="privacy-note toolbar-empty-note" v-if="!xmlDoc">Tento nástroj funguje zcela ve vašem prohlížeči, žádná data se nikdy neodesílají na server</span>
  </div>

  <!-- XLS Export Dialog -->
  <div v-if="xlsDialog" style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35)" @click.self="xlsDialog=false">
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--sp-6);min-width:280px;display:flex;flex-direction:column;gap:var(--sp-4);">
      <div style="font-weight:600;font-size:.9375rem;">Možnosti exportu</div>
      <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" v-model="xlsOptTitle"> Název sloupce</label>
        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" v-model="xlsOptId"> ID pole</label>
        <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;"><input type="checkbox" v-model="xlsOptCategory"> Kategorie</label>
      </div>
      <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;">
        <button class="btn" @click="xlsDialog=false">Zrušit</button>
        <button class="btn primary" @click="exportToExcel">Exportovat</button>
      </div>
    </div>
  </div>

  <!-- View mode picker (first visit) -->
  <div v-if="showViewPicker && xmlDoc && employees.length > 0" class="view-picker-overlay" @click.self="pickViewMode('table')">
    <div class="view-picker-box">
      <h2>Zvolte výchozí zobrazení</h2>
      <p>Můžete kdykoliv přepnout tlačítkem v horní liště</p>
      <div class="view-picker-options">
        <div class="view-picker-card" @click="pickViewMode('table')">
          <div class="view-picker-preview"><img :src="assetBase + 'images/preview-table.png'" alt="Tabulka"></div>
          <h3>Tabulka</h3>
          <span>Přehled všech zaměstnanců a hodnot na jednom místě. Rychlé porovnávání a hromadné kontroly.</span>
        </div>
        <div class="view-picker-card" @click="pickViewMode('cards')">
          <div class="view-picker-preview"><img :src="assetBase + 'images/preview-cards.png'" alt="Karty"></div>
          <h3>Karty</h3>
          <span>Přehledné zobrazení po sekcích. Ideální pro menší soubory a kontrolu jednotlivých záznamů.</span>
        </div>
      </div>
    </div>
  </div>

  <div class="top-controls" v-if="xmlDoc && employees.length > 0">
    <!-- Global Search -->
    <div class="global-search">
      <div class="header-card" :class="{ expanded: headerExpanded }" style="margin-bottom: var(--sp-3);">
        <div class="header-card-header" @click="headerExpanded = !headerExpanded">
          <span class="header-card-info"><span class="stat-label">{{ formatName }}</span> <span class="header-card-info-value" v-if="xmlVersion">{{ xmlVersion }}</span></span>
          <span class="header-card-info"><span class="header-card-info-value">{{ employeeCountText }}</span></span>
          <span class="header-card-info" v-if="hasValidated"><span class="stat-label">Kontrola:</span> <span :class="errors.length > 0 ? 'stat-error' : 'stat-ok'">{{ validationCountText }}</span></span>
          <span class="header-card-info header-card-info-filename" v-if="filename"><span class="header-card-info-value">{{ filename }}{{ isDirty ? ' *' : '' }}</span></span>
          <span class="spacer"></span>
          <span class="header-toggle-text">{{ headerExpanded ? 'Skrýt hlavičku' : 'Zobrazit hlavičku' }}</span>
        </div>
        <div v-if="headerExpanded" class="header-card-body">
          <div class="section-card">
            <div class="section-body" style="max-height:none;">
              <table class="field-table">
                <tr v-for="f in documentHeader" :key="f.key" class="field-row" :class="{ 'has-error': f._hasError }" :data-hdr-key="f.key">
                  <td class="field-id"></td>
                  <td class="field-label">{{ f.label }}</td>
                  <td class="field-value" @click="!isEditingHeader(f.key) && startHeaderEdit(f)">
                    <input v-if="isEditingHeader(f.key)" type="text" :value="f.value" @blur="commitHeaderEdit(f, $event.target.value)" @keydown.enter="commitHeaderEdit(f, $event.target.value)" @keydown.escape="cancelHeaderEdit" autofocus>
                    <span v-else class="editable-header" :class="{ 'header-modified': f.modified, 'has-error': f._hasError }"><span v-if="f.modified" class="modified-dot"></span>{{ f.value || '—' }}</span>
                  </td>
                </tr>
                <tr v-if="employerName" class="field-row">
                  <td class="field-id"></td>
                  <td class="field-label">Zaměstnavatel</td>
                  <td class="field-value">{{ employerName }}</td>
                </tr>
                <tr v-if="datumVyplneni" class="field-row">
                  <td class="field-id"></td>
                  <td class="field-label">Datum</td>
                  <td class="field-value">{{ datumVyplneni }}</td>
                </tr>
                <tr v-if="actionSummary" class="field-row">
                  <td class="field-id"></td>
                  <td class="field-label">Akce</td>
                  <td class="field-value">{{ actionSummary }}</td>
                </tr>
                <tr v-if="czForeignerSplit" class="field-row">
                  <td class="field-id"></td>
                  <td class="field-label">Rozdělení</td>
                  <td class="field-value">{{ czForeignerSplit }}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="search-row">
        <div style="flex: 1; position: relative; display: flex; align-items: center;">
          <input ref="searchInput" placeholder="Filtrovat zobrazená pole — ID, název, XML cesta..." @input="onFieldSearchInput" @keydown.escape="clearFieldSearch" style="flex: 1;">
          <span class="search-help" title="Filtrovat pole:&#10;• ID — 10053, 10228&#10;• Název — příjmení, datum narození&#10;• Název sekce — zobrazí celou kategorii&#10;• Sekce + pole — trvalé bydliště PSČ&#10;Oddělte čárkou pro více filtrů">?</span>
        </div>
        <input placeholder="Hledat v hodnotách..." @input="onValueSearchInput" @keydown.escape="clearValueSearch">
      </div>
    </div>

    <!-- Group filter pills -->
    <div class="group-filter-bar" v-if="currentFormatGroups.length > 0">
      <div class="group-filter-pills">
        <button
          v-for="group in currentFormatGroups" :key="group.id"
          class="group-pill"
          :class="{ active: fieldSearch === group.query }"
          @click="fieldSearch === group.query ? applyGroupQuery('') : applyGroupQuery(group.query)">
          {{ group.label }}
        </button>
      </div>
    </div>

    <div v-if="hasSearch || (viewMode === 'table' && hasActions)" style="display: flex; align-items: center; gap: 16px; padding: 0 36px 6px; max-width: 1000px; margin: 0 auto; width: 100%; font-size: 0.75rem; color: var(--text-muted);">
      <label v-if="hasSearch && viewMode === 'cards'" style="font-size: 12px; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 4px;">
        <input type="checkbox" v-model="autoExpandMatched"> Automaticky rozbalit
      </label>
      <label v-if="hasSearch && viewMode === 'cards'" style="font-size: 12px; color: #6B7280; cursor: pointer; display: flex; align-items: center; gap: 4px;">
        <input type="checkbox" v-model="showAllFieldsInSearch"> Zobrazit všechna pole
      </label>
      <span v-if="viewMode === 'table' && hasActions" style="font-size: 12px; color: #6B7280; display: flex; align-items: center; gap: 4px;">
        Akce:
        <span class="action-filter">
          <button v-for="a in ['', '1', '2', '3', '4', '8']" :key="a" @click="actionFilter = a" :class="{ active: actionFilter === a }">{{ a ? 'A' + a : 'Vše' }}</button>
        </span>
      </span>
      <span class="match-count" v-if="(fieldSearch || valueSearch) && searchMatchInfo" style="margin-left: auto;">{{ searchMatchInfo }}</span>
    </div>
  </div>

  <!-- Table View -->
  <div class="table-content" v-if="xmlDoc && employees.length > 0 && viewMode === 'table' && !showViewPicker" ref="tableContentRef">
    <div class="table-view">
      <table>
        <thead>
          <tr>
            <th class="name-col">{{ rowColumnLabel }}</th>
            <th v-for="(field, ci) in visibleColumns" :key="ci">
              {{ field._colLabel || field.label }}<span class="col-id">{{ field.csszId || '' }}</span>
              <span class="col-sec">{{ fieldSecLabel(field) }}</span>
              <span v-if="actionFilter && getFieldReq(field, actionFilter)" class="col-req" :class="reqClass(getFieldReq(field, actionFilter))" :title="REQ_TITLES[getFieldReq(field, actionFilter)] || ''">{{ getFieldReq(field, actionFilter) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in displayList" :key="item.type === 'separator' ? 'sep' : item.emp._index">
            <tr v-if="item.type === 'separator'" class="separator-row">
              <td :colspan="visibleColumns.length + 1">{{ item.count }} dalších zaměstnanců</td>
            </tr>
            <tr v-else :class="{ matched: item.matched }">
              <td class="name-cell">
                <span class="error-dot-sm" v-if="getEmployeeErrorCount(item.emp._index) > 0"></span>
                {{ getRowLabel(item.emp) }}
              </td>
              <td v-for="(field, ci) in visibleColumns" :key="ci"
                  :class="{ 'has-error': hasFieldError(item.emp, field, field), 'cell-match': item.matched && isFieldMatch(item.emp, field, field) }"
                  :data-err-id="'e' + item.emp._index + '-' + fieldKey(field, field._instanceIndex)"
                  @click="startEdit(item.emp, field, field)">
                <template v-if="editingField === item.emp._index + ':' + fieldKey(field, field._instanceIndex)">
                  <input v-if="field.type === 'date'" type="date" :value="getFieldValue(item.emp, field, field)"
                         @blur="commitEdit(item.emp, field, $event.target.value, field)" @keydown.enter="commitEdit(item.emp, field, $event.target.value, field)"
                         @keydown.escape="cancelEdit" autofocus>
                  <select v-else-if="field.type === 'boolean'" :value="getFieldValue(item.emp, field, field)"
                          @change="commitEdit(item.emp, field, $event.target.value, field)" @blur="commitEdit(item.emp, field, $event.target.value, field)"
                          @keydown.escape="cancelEdit" autofocus>
                    <option value="">—</option><option value="A">A</option><option value="N">N</option>
                  </select>
                  <input v-else type="text" :value="getFieldValue(item.emp, field, field)" :maxlength="field.maxLength || undefined"
                         @blur="commitEdit(item.emp, field, $event.target.value, field)" @keydown.enter="commitEdit(item.emp, field, $event.target.value, field)"
                         @keydown.escape="cancelEdit" autofocus>
                </template>
                <template v-else>
                  <template v-if="getFieldValue(item.emp, field, field)">{{ getFieldValue(item.emp, field, field) }}</template>
                  <span class="cell-empty" v-else></span>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Content: Cards list -->
  <div class="content" v-if="xmlDoc && employees.length > 0 && viewMode === 'cards' && !showViewPicker"
       @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="handleDrop">
   <div class="content-inner">
    <!-- Unified display list: matched + separator + unmatched -->
    <template v-for="(item, idx) in displayList" :key="item.type === 'separator' ? 'sep' : item.emp._index">
      <!-- Separator -->
      <div v-if="item.type === 'separator'" class="search-separator">{{ item.count }} dalších zaměstnanců</div>
      <!-- Employee card -->
      <div v-else class="emp-card" :class="{ expanded: isEmployeeExpanded(item.emp._index, item.matched), 'has-matches': item.matched }">
        <div class="emp-card-header" @click="toggleEmployee(item.emp._index, item.matched)">
          <span class="emp-name">{{ getRowLabel(item.emp) }}</span>
          <span class="info-item" v-for="info in rowInfoDefs" :key="info.key"><span class="info-label">{{ info.label }}:</span><span :class="item.emp.fields[info.key]?.value ? 'info-value' : 'info-empty'">{{ item.emp.fields[info.key]?.value || '—' }}</span></span>
          <span class="spacer"></span>
          <span class="error-dot" v-if="getEmployeeErrorCount(item.emp._index) > 0" :title="getEmployeeErrorCount(item.emp._index) + ' chyb'"></span>
          <span class="match-badge" v-if="item.matched && getEmpMatchCount(item.emp._index) > 0">{{ getEmpMatchCount(item.emp._index) }} shod</span>
          <span v-if="isEmployeeExpanded(item.emp._index, item.matched)" class="expand-all-btn" @click.stop="toggleAllSections(item.emp)" title="Rozbalit/sbalit všechny sekce"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M4 6l4-4 4 4H4zm0 4l4 4 4-4H4z"/></svg></span>
        </div>
        <div class="emp-card-body" v-if="isEmployeeExpanded(item.emp._index, item.matched)">
          <template v-for="section in getSectionsForEmployee(item.emp)" :key="section._virtualId || section.id">
            <div class="section-card" v-if="!item.matched || sectionMatchesFieldFilter(section) || sectionHasMatchingFields(item.emp, section) || showAllFieldsInSearch">
              <div class="section-header" @click.stop="toggleSection(item.emp._index + ':' + (section._virtualId || section.id))">
                <svg class="section-chevron" :class="{ expanded: isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section) }" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z"/></svg>
                <span class="section-title">{{ section.label }}</span>
                <span class="section-badge errors" v-if="getSectionErrorCount(item.emp._index, section._virtualId || section.id, section) > 0">{{ getSectionErrorCount(item.emp._index, section._virtualId || section.id, section) }}</span>
                <button v-if="section._instanceIndex !== undefined" class="btn-remove-instance" @click.stop="removeInstance(item.emp, section)" title="Odebrat instanci" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0 4px;">&times;</button>
                <button v-if="section.repeating && section._instanceIndex === 0" class="btn-add-instance" @click.stop="addInstance(item.emp, section)" title="Přidat instanci" style="margin-left:4px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0 4px;">+</button>
              </div>
              <div class="section-body" :class="{ collapsed: !isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section) }"
                   :ref="el => setSectionBodyRef(item.emp._index + ':' + (section._virtualId || section.id), el)"
                   :style="getSectionBodyStyle(item.emp._index + ':' + (section._virtualId || section.id), isSectionExpanded(item.emp._index, section._virtualId || section.id, item.matched, section))">
                <table class="field-table">
                  <tr v-for="field in getVisibleFields(item.emp, section, item.matched)" :key="fieldKey(field, section._instanceIndex)"
                      class="field-row" :class="{ 'has-error': hasFieldError(item.emp, field, section), 'field-match': item.matched && isFieldMatch(item.emp, field, section) }" :data-field-id="field.csszId" :data-err-id="'e' + item.emp._index + '-' + fieldKey(field, section._instanceIndex)">
                    <td class="field-id">{{ field.csszId || '' }}</td>
                    <td class="field-label">{{ field.label }}<span class="xpath">{{ fieldXpath(field) }}</span></td>
                    <td class="field-value">
                      <template v-if="editingField === item.emp._index + ':' + fieldKey(field, section._instanceIndex)">
                        <input v-if="field.type === 'date'" type="date" :value="getFieldValue(item.emp, field, section)" @blur="commitEdit(item.emp, field, $event.target.value, section)" @keydown.enter="commitEdit(item.emp, field, $event.target.value, section)" @keydown.escape="cancelEdit" autofocus>
                        <select v-else-if="field.type === 'boolean'" :value="getFieldValue(item.emp, field, section)" @change="commitEdit(item.emp, field, $event.target.value, section)" @blur="commitEdit(item.emp, field, $event.target.value, section)" @keydown.escape="cancelEdit" autofocus><option value="">—</option><option value="A">A (Ano)</option><option value="N">N (Ne)</option></select>
                        <input v-else type="text" :value="getFieldValue(item.emp, field, section)" :maxlength="field.maxLength || undefined" :inputmode="field.type === 'number' ? 'numeric' : 'text'" @blur="commitEdit(item.emp, field, $event.target.value, section)" @keydown.enter="commitEdit(item.emp, field, $event.target.value, section)" @keydown.escape="cancelEdit" autofocus>
                      </template>
                      <template v-else>
                        <span @click.stop="startEdit(item.emp, field, section)" style="cursor: pointer; display: block; min-height: 24px; padding: 2px 0;">
                          <span class="modified-dot" v-if="isFieldModified(item.emp, field, section)"></span>
                          <template v-if="getFieldValue(item.emp, field, section)">{{ getFieldValue(item.emp, field, section) }}</template>
                          <span class="empty" v-else>—</span>
                        </span>
                      </template>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
   </div>
  </div>

  <!-- Empty State -->
  <div class="content" v-else-if="!xmlDoc" style="max-width: 100%;">
    <div class="empty-state">
      <div class="drop-zone" :class="{ dragover: isDragging }"
           @dragover.prevent="isDragging = true" @dragleave="isDragging = false"
           @drop.prevent="handleDrop" @click="loadFile">
        <p>Přetáhněte nebo klikněte pro načtení XML souboru měsíčního hlášení</p>
        <button @click.stop="loadFile" style="margin-top: 16px; padding: 10px 28px; font-size: 15px; font-weight: 500; border: 1px solid #D1D5DB; border-radius: 8px; background: #2563EB; color: #fff; cursor: pointer;">Nahrát XML</button>
      </div>
    </div>
  </div>

  <!-- Validation Panel -->
  <div class="validation-panel-spacer" v-if="errors.length > 0" :style="{ height: validationDockHeight + 'px' }"></div>
  <div class="validation-panel" v-if="errors.length > 0" ref="validationPanelRef">
    <div class="validation-header" @click="validationCollapsed = !validationCollapsed">
      Validace ({{ errors.length }} {{ errors.length === 1 ? 'chyba' : errors.length < 5 ? 'chyby' : 'chyb' }})
      {{ validationCollapsed ? '▲' : '▼' }}
    </div>
    <div class="validation-list" v-if="!validationCollapsed">
      <div v-for="(err, i) in errors" :key="i" class="validation-item">
        <span class="severity" :class="err.severity || 'error'"></span>
        <span class="path">{{ err.headerKey ? 'Záhlaví' : err.employeeName }} › {{ err.sectionLabel }} ›</span>
        <span class="message">{{ err.fieldLabel }}: {{ err.message }}</span>
        <span class="goto-btn" @click="navigateToError(err)">Přejít</span>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast success" v-if="toastMessage">{{ toastMessage }}</div>

  <!-- Hidden file input -->
  <input type="file" ref="fileInput" accept=".xml" style="display:none" @change="handleFileSelect">`;
