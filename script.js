// ========================================
// UrbeGDL - Firebase v8 Version
// ========================================

let mapModal, markerModal;
let currentImage = null;

// ======== INIT ========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Iniciando UrbeGDL...');
    initModalMap();
    cargarReportes();
});

// ======== NAVIGATION ========
function showSection(sectionName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === sectionName);
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === 'section-' + sectionName);
    });
    document.getElementById('slideMenu')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSlideMenu() {
    document.getElementById('slideMenu')?.classList.toggle('active');
}

function focusSearch() {
    document.getElementById('searchInput')?.focus();
}

function goToProfile() {
    window.location.href = 'login.html';
}

// ======== MODAL MAP ========
function initModalMap() {
    const mapDiv = document.getElementById('modalMap');
    if (!mapDiv || typeof L === 'undefined') return;
    
    mapModal = L.map('modalMap', { center: [20.6736, -103.3438], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(mapModal);
    
    mapModal.on('click', function(e) {
        if (markerModal) markerModal.setLatLng(e.latlng);
        else markerModal = L.marker(e.latlng).addTo(mapModal);
        
        const ubiInput = document.getElementById('reportUbicacion');
        const ubiPreview = document.getElementById('ubicacionPreview');
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&addressdetails=1`)
            .then(res => res.json())
            .then(data => {
                const addr = data.address || {};
                let direccion = addr.road || addr.neighbourhood || addr.suburb || data.display_name || '';
                if (addr.city || addr.municipality) direccion += ', ' + (addr.city || addr.municipality);
                if (ubiInput && ubiPreview) {
                    ubiInput.value = direccion;
                    ubiPreview.textContent = '📍 ' + direccion;
                }
            })
            .catch(() => {
                const coords = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
                if (ubiInput && ubiPreview) {
                    ubiInput.value = coords;
                    ubiPreview.textContent = '📍 ' + coords;
                }
            });
    });
}

// ======== MODAL FUNCTIONS ========
function openReportModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
            document.getElementById('reportDescripcion')?.focus();
            if (mapModal) mapModal.invalidateSize();
        }, 300);
    }
}

function closeReportModal() {
    document.getElementById('reportModal')?.classList.remove('active');
}

// ======== IMAGE UPLOAD ========
function handleImageUpload() {
    const input = document.getElementById('reportImage');
    const text = document.getElementById('uploadText');
    
    if (input?.files?.[0]) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert('Imagen muy grande. Máximo 5MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImage = e.target.result;
            text.textContent = '✓ Foto seleccionada';
            text.style.color = 'var(--bright-green)';
        };
        reader.readAsDataURL(file);
    }
}

// ======== GUARDAR REPORTE (FIREBASE v8) ========
function guardarReporte() {
    console.log('📤 Guardando reporte...');
    
    const descripcion = document.getElementById('reportDescripcion').value.trim();
    const ubicacion = document.getElementById('reportUbicacion').value;
    
    if (descripcion.length < 10) {
        alert('Mínimo 10 caracteres');
        return;
    }
    if (!ubicacion) {
        alert('Selecciona una ubicación');
        return;
    }
    
    if (!window.db) {
        alert('Error de conexión. Recarga la página.');
        return;
    }
    
    // Firebase v8 syntax
    const reportesRef = window.db.ref('reportes');
    reportesRef.push({
        descripcion: descripcion,
        ubicacion: ubicacion,
        fecha: new Date().toLocaleString('es-MX'),
        imagen: currentImage || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log('✅ Reporte guardado!');
        document.getElementById('reportDescripcion').value = '';
        document.getElementById('reportUbicacion').value = '';
        document.getElementById('ubicacionPreview').textContent = '';
        document.getElementById('uploadText').textContent = 'Añadir foto';
        document.getElementById('uploadText').style.color = '';
        document.getElementById('reportImage').value = '';
        currentImage = null;
        if (markerModal) { mapModal.removeLayer(markerModal); markerModal = null; }
        closeReportModal();
        alert('✅ Reporte enviado correctamente!');
    }).catch((error) => {
        console.error('❌ Error:', error);
        alert('Error al guardar reporte.');
    });
}

// ======== CARGAR REPORTES (FIREBASE v8) ========
function cargarReportes() {
    const grid = document.getElementById('reportesGrid');
    if (!grid) return;
    
    if (!window.db) {
        console.log('⏳ Esperando Firebase...');
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">Conectando a Firebase...</p>';
        setTimeout(cargarReportes, 2000);
        return;
    }
    
    console.log('👂 Escuchando reportes...');
    
    const reportesRef = window.db.ref('reportes');
    
    reportesRef.on('value', (snapshot) => {
        console.log('📥 Datos recibidos');
        grid.innerHTML = '';
        
        const data = snapshot.val();
        if (!data) {
            grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No hay reportes aún. ¡Sé el primero!</p>';
            return;
        }
        
        const reportes = Object.entries(data)
            .map(([key, value]) => ({ id: key, ...value }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        console.log(`📋 ${reportes.length} reportes`);
        
        reportes.forEach(reporte => {
            const card = document.createElement('div');
            card.className = 'report-card' + (reporte.imagen ? '' : ' no-image');
            card.innerHTML = `
                <button class="report-delete-btn" onclick="eliminarReporte('${reporte.id}')">×</button>
                ${reporte.imagen 
                    ? `<img src="${reporte.imagen}" class="report-image" alt="Reporte" onerror="this.src='imagenes/noimagen.png'">` 
                    : `<img src="imagenes/noimagen.png" class="report-image" alt="Sin imagen">`}
                <div class="report-overlay">
                    <p class="report-overlay-text">${reporte.descripcion}</p>
                </div>
                <div class="report-info">
                    <p class="report-description">${reporte.descripcion}</p>
                    <p class="report-location">📍 ${reporte.ubicacion}</p>
                    <span class="report-date">${reporte.fecha}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }, (error) => {
        console.error('❌ Error:', error);
        grid.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">Error al cargar reportes</p>';
    });
}

// ======== ELIMINAR REPORTE ========
function eliminarReporte(id) {
    if (!confirm('¿Eliminar este reporte?')) return;
    if (!window.db) return;
    
    window.db.ref('reportes/' + id).remove()
        .then(() => console.log('✅ Eliminado'))
        .catch((error) => console.error('❌ Error:', error));
}

// ======== FILTRAR ========
function filtrarReportes() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    document.querySelectorAll('.report-card').forEach(card => {
        const desc = card.querySelector('.report-description')?.textContent.toLowerCase() || '';
        const loc = card.querySelector('.report-location')?.textContent.toLowerCase() || '';
        card.style.display = (!search || desc.includes(search) || loc.includes(search)) ? '' : 'none';
    });
}