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
    
    // Initialize - show conocenos by default, hide reportes
    var reportesSection = document.getElementById('section-reportes');
    var conocenosSection = document.getElementById('section-conocenos');
    var tabReportes = document.getElementById('tab-reportes');
    var tabConocenos = document.getElementById('tab-conocenos');
    var fabBtn = document.getElementById('fabBtn');
    
    if (reportesSection) reportesSection.classList.add('hidden');
    if (conocenosSection) conocenosSection.classList.remove('hidden');
    if (tabReportes) tabReportes.classList.remove('active');
    if (tabConocenos) tabConocenos.classList.add('active');
    if (fabBtn) fabBtn.classList.remove('visible');
    
    console.log('✅ Funciones de navegación cargadas');
});

// ======== NAVIGATION ========
function mostrarReportesInline() {
    console.log('📋 Mostrando Reportes');
    var reportesSection = document.getElementById('section-reportes');
    var conocenosSection = document.getElementById('section-conocenos');
    var tabReportes = document.getElementById('tab-reportes');
    var tabConocenos = document.getElementById('tab-conocenos');
    var fabBtn = document.getElementById('fabBtn');
    
    if (reportesSection) reportesSection.classList.remove('hidden');
    if (conocenosSection) conocenosSection.classList.add('hidden');
    if (tabReportes) tabReportes.classList.add('active');
    if (tabConocenos) tabConocenos.classList.remove('active');
    if (fabBtn) fabBtn.classList.add('visible');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarConocenosInline() {
    console.log('ℹ️ Mostrando Conócenos');
    var reportesSection = document.getElementById('section-reportes');
    var conocenosSection = document.getElementById('section-conocenos');
    var tabReportes = document.getElementById('tab-reportes');
    var tabConocenos = document.getElementById('tab-conocenos');
    var fabBtn = document.getElementById('fabBtn');
    
    if (reportesSection) reportesSection.classList.add('hidden');
    if (conocenosSection) conocenosSection.classList.remove('hidden');
    if (tabConocenos) tabConocenos.classList.add('active');
    if (tabReportes) tabReportes.classList.remove('active');
    if (fabBtn) fabBtn.classList.remove('visible');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.mostrarReportes = mostrarReportesInline;
window.mostrarConocenos = mostrarConocenosInline;
window.mostrarReportesInline = mostrarReportesInline;
window.mostrarConocenosInline = mostrarConocenosInline;

function showSection(sectionName) {
    console.log('📱 showSection:', sectionName);
    if (sectionName === 'reportes') {
        mostrarReportes();
    } else if (sectionName === 'conocenos') {
        mostrarConocenos();
    }
}

// Initialize - hide reportes initially
document.addEventListener('DOMContentLoaded', function() {
    const reportesSection = document.getElementById('section-reportes');
    if (reportesSection) reportesSection.style.display = 'none';
});

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
    console.log('🔵 openReportModal called');
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const modal = document.getElementById('reportModal');
    console.log('Modal element:', modal);
    if (modal) {
        modal.classList.add('active');
        console.log('Modal should be visible now');
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
            text.textContent = '✓ Imagen subida';
            text.style.color = 'var(--bright-green)';
            alert('✓ Imagen subida correctamente');
        };
        reader.readAsDataURL(file);
    }
}

// ======== GUARDAR REPORTE (FIREBASE v8) ========
function guardarReporte() {
    console.log('📤 Guardando reporte...');
    
    const user = window.currentUser || firebase.auth().currentUser;
    if (!user) {
        alert('Debes iniciar sesión para crear reportes');
        window.location.href = 'login.html';
        return;
    }
    
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
    
    // Firebase v8 syntax - guardar con userId
    const reportesRef = window.db.ref('reportes');
    reportesRef.push({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
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


// ======== CARGAR REPORTES (FIREBASE v8) ========
function cargarReportes() {
    const grid = document.getElementById('reportesGrid');
    if (!grid) return;
    
    console.log('🔍 cargarReportes - db:', window.db, 'firebase:', window.firebase);
    
    if (!window.db || !window.firebase) {
        console.log('⏳ Esperando Firebase...');
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">Conectando a Firebase...</p>';
        setTimeout(cargarReportes, 2000);
        return;
    }
    
    console.log('👂 Escuchando reportes...');
    
    try {
        const reportesRef = window.db.ref('reportes');
        
        reportesRef.on('value', (snapshot) => {
            console.log('📥 Datos recibidos:', snapshot.numChildren(), 'items');
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
            console.error('❌ Error Firebase:', error);
            grid.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">Error al cargar reportes</p>';
        });
    } catch (e) {
        console.error('❌ Excepción:', e);
        grid.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px;">Error de conexión</p>';
        setTimeout(cargarReportes, 3000);
    }
}

// ======== ELIMINAR REPORTE ========
function eliminarReporte(id) {
    const user = window.currentUser || firebase.auth().currentUser;
    const ADMIN_EMAIL = 'urbegdl@gmail.com';
    
    if (!user) {
        alert('Debes iniciar sesión para eliminar reportes');
        return;
    }
    
    if (!window.db) {
        alert('Error de conexión');
        return;
    }
    
    // Get reporte first to check ownership
    window.db.ref('reportes/' + id).once('value')
        .then((snapshot) => {
            const reporte = snapshot.val();
            if (!reporte) {
                alert('Reporte no encontrado');
                return;
            }
            
            const isOwner = reporte.userId === user.uid;
            const isAdmin = user.email === ADMIN_EMAIL;
            
            console.log('Eliminar check - userId:', user.uid, 'reporteUserId:', reporte.userId, 'isOwner:', isOwner, 'isAdmin:', isAdmin);
            
            if (!isOwner && !isAdmin) {
                alert('Solo puedes eliminar tus propios reportes');
                return;
            }
            
            if (!confirm('¿Eliminar este reporte?')) return;
            
            window.db.ref('reportes/' + id).remove()
                .then(() => {
                    console.log('✅ Eliminado');
                    alert('Reporte eliminado');
                })
                .catch((error) => {
                    console.error('❌ Error:', error);
                    alert('Error al eliminar');
                });
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            alert('Error al verificar reporte');
        });
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