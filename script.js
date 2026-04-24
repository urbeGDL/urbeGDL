// ========================================
// UrbeGDL - JavaScript Functions
// ========================================

let mapModal, markerModal;
let currentImage = null;

// ======== INIT ========
document.addEventListener('DOMContentLoaded', function() {
    renderReportes();
    initModalMap();
});

// ======== NAVIGATION ========
function showSection(sectionName) {
    // Update tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === sectionName);
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Show section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === 'section-' + sectionName);
    });
    
    // Close slide menu if open
    document.getElementById('slideMenu')?.classList.remove('active');
    
    // Scroll to top
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
    
    mapModal = L.map('modalMap', {
        center: [20.6736, -103.3438],
        zoom: 13
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
    }).addTo(mapModal);
    
    mapModal.on('click', function(e) {
        if (markerModal) markerModal.setLatLng(e.latlng);
        else markerModal = L.marker(e.latlng).addTo(mapModal);
        
        const ubiInput = document.getElementById('reportUbicacion');
        const ubiPreview = document.getElementById('ubicacionPreview');
        if (ubiInput && ubiPreview) {
            ubiInput.value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
            ubiPreview.textContent = '📍 ' + ubiInput.value;
        }
    });
}

// ======== MODAL FUNCTIONS ========
function openReportModal(e) {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.add('active');
        // Focus on description input
        setTimeout(() => {
            document.getElementById('reportDescripcion')?.focus();
            if (mapModal) mapModal.invalidateSize();
        }, 300);
    }
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ======== IMAGE UPLOAD ========
function handleImageUpload() {
    const input = document.getElementById('reportImage');
    const text = document.getElementById('uploadText');
    
    if (input && input.files && input.files[0]) {
        const file = input.files[0];
        
        // Preview image
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImage = e.target.result;
            text.textContent = '✓ Foto seleccionada';
            text.style.color = 'var(--bright-green)';
        };
        reader.readAsDataURL(file);
    }
}

// ======== GUARDAR REPORTE ========
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
    
    const reporte = {
        id: Date.now(),
        descripcion: descripcion,
        ubicacion: ubicacion,
        fecha: new Date().toLocaleString('es-MX'),
        imagen: currentImage
    };
    
    // Save to localStorage
    const reportes = JSON.parse(localStorage.getItem('reportes')) || [];
    reportes.unshift(reporte);
    localStorage.setItem('reportes', JSON.stringify(reportes));
    
    // Reset form
    document.getElementById('reportDescripcion').value = '';
    document.getElementById('reportUbicacion').value = '';
    document.getElementById('ubicacionPreview').textContent = '';
    document.getElementById('uploadText').textContent = 'Añadir foto (opcional)';
    document.getElementById('uploadText').style.color = '';
    document.getElementById('reportImage').value = '';
    currentImage = null;
    
    if (markerModal) {
        mapModal.removeLayer(markerModal);
        markerModal = null;
    }
    
    closeReportModal();
    renderReportes();
}

// ======== RENDER REPORTES - Masonry Grid ========
function renderReportes() {
    const grid = document.getElementById('reportesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const reportes = JSON.parse(localStorage.getItem('reportes')) || [];
    
    if (reportes.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">No hay reportes aún. ¡Sé el primero en reportar!</p>';
        return;
    }
    
    reportes.forEach(reporte => {
        const card = document.createElement('div');
        card.className = 'report-card' + (reporte.imagen ? '' : ' no-image');
        
        card.innerHTML = `
            <button class="report-delete-btn" onclick="eliminarReporte(${reporte.id})">×</button>
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
}

// ======== ELIMINAR REPORTE ========
function eliminarReporte(id) {
    if (confirm('¿Eliminar este reporte?')) {
        const reportes = JSON.parse(localStorage.getItem('reportes')) || [];
        const filtered = reportes.filter(r => r.id !== id);
        localStorage.setItem('reportes', JSON.stringify(filtered));
        renderReportes();
    }
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