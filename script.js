// ========================================
// UrbeGDL - Firebase Version
// ========================================

let mapModal, markerModal;
let currentImage = null;

// ======== INIT ========
document.addEventListener('DOMContentLoaded', function() {
    initModalMap();
    escucharReportesFirebase();
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
        if (markerModal) {
            markerModal.setLatLng(e.latlng);
        } else {
            markerModal = L.marker(e.latlng).addTo(mapModal);
        }
        
        const ubiInput = document.getElementById('reportUbicacion');
        const ubiPreview = document.getElementById('ubicacionPreview');
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&addressdetails=1`)
            .then(res => res.json())
            .then(data => {
                const addr = data.address;
                let direccion = '';
                
                if (addr.road) {
                    direccion = addr.road;
                    if (addr.house_number) direccion += ' ' + addr.house_number;
                } else if (addr.neighbourhood) {
                    direccion = addr.neighborhood;
                } else if (addr.suburb) {
                    direccion = addr.suburb;
                }
                
                if (addr.city || addr.municipality) {
                    direccion += ', ' + (addr.city || addr.municipality);
                }
                
                if (!direccion) {
                    direccion = data.display_name || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
                }
                
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
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    
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
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.remove('active');
}

// ======== IMAGE UPLOAD ========
function handleImageUpload() {
    const input = document.getElementById('reportImage');
    const text = document.getElementById('uploadText');
    
    if (input && input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImage = e.target.result;
            text.textContent = '✓ Foto seleccionada';
            text.style.color = 'var(--bright-green)';
        };
        reader.readAsDataURL(file);
    }
}

// ======== GUARDAR REPORTE (FIREBASE) ========
function guardarReporte() {
    const descripcion = document.getElementById('reportDescripcion').value.trim();
    const ubicacion = document.getElementById('reportUbicacion').value;
    
    if (descripcion.length < 10) {
        alert('Describe el problema (mínimo 10 caracteres)');
        return;
    }
    
    if (!ubicacion) {
        alert('Selecciona una ubicación en el mapa');
        return;
    }
    
    const { db, ref, push } = window.firebaseDB;
    if (!db) {
        alert('Error de conexión. Intenta de nuevo.');
        return;
    }
    
    const reportesRef = ref(db, 'reportes');
    const nuevoReporte = push(reportesRef);
    
    set(nuevoReporte, {
        descripcion: descripcion,
        ubicacion: ubicacion,
        fecha: new Date().toLocaleString('es-MX'),
        imagen: currentImage,
        timestamp: Date.now()
    }).then(() => {
        // Reset form
        document.getElementById('reportDescripcion').value = '';
        document.getElementById('reportUbicacion').value = '';
        document.getElementById('ubicacionPreview').textContent = '';
        document.getElementById('uploadText').textContent = 'Añadir foto';
        document.getElementById('uploadText').style.color = '';
        document.getElementById('reportImage').value = '';
        currentImage = null;
        
        if (markerModal) {
            mapModal.removeLayer(markerModal);
            markerModal = null;
        }
        
        closeReportModal();
    }).catch((error) => {
        console.error('Error guardando:', error);
        alert('Error al guardar reporte. Intenta de nuevo.');
    });
}

// ======== ESCuchar REPORTES (FIREBASE) ========
function escucharReportesFirebase() {
    const grid = document.getElementById('reportesGrid');
    if (!grid) return;
    
    const { db, ref, onValue } = window.firebaseDB;
    if (!db) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">Conectando a Firebase...</p>';
        return;
    }
    
    const reportesRef = ref(db, 'reportes');
    
    onValue(reportesRef, (snapshot) => {
        grid.innerHTML = '';
        
        const data = snapshot.val();
        if (!data) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">No hay reportes aún. ¡Sé el primero en reportar!</p>';
            return;
        }
        
        // Convert to array and sort by timestamp (newest first)
        const reportes = Object.entries(data)
            .map(([key, value]) => ({ id: key, ...value }))
            .sort((a, b) => b.timestamp - a.timestamp);
        
        reportes.forEach(reporte => {
            const card = document.createElement('div');
            card.className = 'report-card' + (reporte.imagen ? '' : ' no-image');
            
            card.innerHTML = `
                <button class="report-delete-btn" onclick="eliminarReporte('${reporte.id}')">×</button>
                ${reporte.imagen 
                    ? `<img src="${reporte.imagen}" class="report-image" alt="Reporte">` 
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
        console.error('Error obteniendo reportes:', error);
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#e74c3c;padding:40px;">Error al cargar reportes</p>';
    });
}

// ======== ELIMINAR REPORTE (FIREBASE) ========
function eliminarReporte(id) {
    if (!confirm('¿Eliminar este reporte?')) return;
    
    const { db, ref, remove } = window.firebaseDB;
    if (!db) return;
    
    const reporteRef = ref(db, 'reportes/' + id);
    remove(reporteRef).catch((error) => {
        console.error('Error eliminando:', error);
        alert('Error al eliminar reporte');
    });
}

// ======== FILTRAR REPORTES ========
function filtrarReportes() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const cards = document.querySelectorAll('.report-card');
    
    cards.forEach(card => {
        const desc = card.querySelector('.report-description')?.textContent.toLowerCase() || '';
        const location = card.querySelector('.report-location')?.textContent.toLowerCase() || '';
        
        const matches = !searchTerm || desc.includes(searchTerm) || location.includes(searchTerm);
        card.style.display = matches ? '' : 'none';
    });
}