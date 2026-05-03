// ========================================
// UrbeGDL - Firebase v8 Version
// ========================================

let mapModal, markerModal;
let currentImage = null;
let currentUser = null;

// ======== INIT ========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Iniciando UrbeGDL...');
    try {
        initAuth();
        initModalMap();
        cargarReportes();
    } catch(e) {
        console.error('Error during init:', e);
    }
});

// ======== AUTH ========
function initAuth() {
    firebase.auth().onAuthStateChanged(function(user) {
        currentUser = user;
        updateUIForAuth(user);
        if (user) {
            console.log('✅ Usuario:', user.displayName);
        } else {
            console.log('❌ No hay usuario');
        }
    });
}

function updateUIForAuth(user) {
    const headerActions = document.getElementById('headerActions');
    const headerUser = document.getElementById('headerUser');
    const menuLogin = document.getElementById('menuLogin');
    const menuPerfil = document.getElementById('menuPerfil');
    const menuLogout = document.getElementById('menuLogout');
    const menuUserName = document.getElementById('menuUserName');

    if (user) {
        headerActions.style.display = 'none';
        headerUser.style.display = 'flex';
        document.getElementById('userName').textContent = user.displayName || 'Usuario';
        document.getElementById('userPhoto').src = user.photoURL || 'imagenes/logo.png';
        
        // Indicador de admin
        const adminEmails = ['urbegdl@gmail.com', 'angelfernando.ra@gmail.com'];
        const isAdmin = adminEmails.includes(user.email);
        if (isAdmin) {
            document.getElementById('userName').textContent = (user.displayName || 'Usuario') + ' ⚙️';
        }
        
        if (menuLogin) menuLogin.style.display = 'none';
        if (menuPerfil) menuPerfil.style.display = 'flex';
        if (menuLogout) menuLogout.style.display = 'flex';
        if (menuUserName) menuUserName.textContent = user.displayName || 'Perfil';
    } else {
        headerActions.style.display = 'flex';
        headerUser.style.display = 'none';
        
        if (menuLogin) menuLogin.style.display = 'flex';
        if (menuPerfil) menuPerfil.style.display = 'none';
        if (menuLogout) menuLogout.style.display = 'none';
    }
}

function loginConGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function(error) {
        console.error('Error login:', error);
        alert('Error al iniciar sesión: ' + error.message);
    });
}

function cerrarSesion() {
    firebase.auth().signOut().then(function() {
        console.log('✅ Sesión cerrada');
    }).catch(function(error) {
        console.error('Error:', error);
    });
}

function goToProfile() {
    if (!currentUser) {
        window.location.href = 'login.html';
    }
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('profileDropdown');
    const btn = document.querySelector('.profile-btn');
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// ======== NAVIGATION ========
function showSection(sectionName) {
    console.log('showSection called:', sectionName);
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
    console.log('toggleSlideMenu called');
    document.getElementById('slideMenu')?.classList.toggle('active');
}

function focusSearch() {
    document.getElementById('searchInput')?.focus();
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
    
    if (!currentUser) {
        alert('Debes iniciar sesión para reportar');
        loginConGoogle();
        return;
    }
    
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
    
    if (!currentUser) {
        alert('Debes iniciar sesión para reportar');
        loginConGoogle();
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
    
    // Firebase v8 syntax
    const reportesRef = window.db.ref('reportes');
    reportesRef.push({
        descripcion: descripcion,
        ubicacion: ubicacion,
        fecha: new Date().toLocaleString('es-MX'),
        imagen: currentImage || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        autor: {
            uid: currentUser.uid,
            nombre: currentUser.displayName || 'Usuario',
            foto: currentUser.photoURL || null,
            email: currentUser.email || null
        }
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
                const autor = reporte.autor || {};
                const autorNombre = autor.nombre || 'Anónimo';
                const autorFoto = autor.foto || 'imagenes/logo.png';
                
                card.innerHTML = `
                    <button class="report-delete-btn" onclick="event.stopPropagation(); eliminarReporte('${reporte.id}')">×</button>
                    ${reporte.imagen 
                        ? `<img src="${reporte.imagen}" loading="lazy" class="report-image" alt="Reporte" onerror="this.src='imagenes/noimagen.png'">` 
                        : `<img src="imagenes/noimagen.png" loading="lazy" class="report-image" alt="Sin imagen">`}
                    <div class="report-overlay">
                        <p class="report-overlay-text">${reporte.descripcion}</p>
                    </div>
                    <div class="report-info">
                        <div class="report-author">
                            <img src="${autorFoto}" alt="" loading="lazy" class="report-author-img" onerror="this.src='imagenes/logo.png'">
                            <span class="report-author-name">${autorNombre}</span>
                        </div>
                        <p class="report-description">${reporte.descripcion}</p>
                        <p class="report-location">📍 ${reporte.ubicacion}</p>
                        <span class="report-date">${reporte.fecha}</span>
                    </div>
                `;
                
                card.onclick = () => openDetailModal(reporte);
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
    if (!currentUser) {
        alert('Debes iniciar sesión');
        return;
    }
    
    // Get the report data to check ownership
    window.db.ref('reportes/' + id).once('value').then(function(snapshot) {
        const reporte = snapshot.val();
        if (!reporte) {
            alert('Reporte no encontrado');
            return;
        }
        
        const autor = reporte.autor || {};
        
        // Lista de correos con permisos de administrador
        const adminEmails = ['urbegdl@gmail.com', 'angelfernando.ra@gmail.com'];
        const isAdmin = adminEmails.includes(currentUser.email);
        
        // Permitir eliminar si es admin O si es el autor del reporte
        if (!isAdmin && autor.uid !== currentUser.uid) {
            alert('Solo puedes eliminar tus propios reportes');
            return;
        }
        
        if (!confirm('¿Eliminar este reporte?')) return;
        
        window.db.ref('reportes/' + id).remove()
            .then(() => console.log('✅ Eliminado'))
            .catch((error) => console.error('❌ Error:', error));
    }).catch(function(error) {
        console.error('Error:', error);
        alert('Error al verificar permisos');
    });
}

// ======== DETAIL MODAL (Pinterest Style) ========
function openDetailModal(reporte) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    
    const autor = reporte.autor || {};
    
    document.getElementById('detailImage').src = reporte.imagen || 'imagenes/noimagen.png';
    document.getElementById('detailAuthorPhoto').src = autor.foto || 'imagenes/logo.png';
    document.getElementById('detailAuthorName').textContent = autor.nombre || 'Anónimo';
    document.getElementById('detailDate').textContent = reporte.fecha || '';
    document.getElementById('detailDesc').textContent = reporte.descripcion || '';
    document.getElementById('detailLocation').textContent = '📍 ' + (reporte.ubicacion || '');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ======== FILTRAR ========
function filtrarReportes() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    document.querySelectorAll('.report-card').forEach(card => {
        const desc = card.querySelector('.report-description')?.textContent.toLowerCase() || '';
        const loc = card.querySelector('.report-location')?.textContent.toLowerCase() || '';
        const author = card.querySelector('.report-author-name')?.textContent.toLowerCase() || '';
        card.style.display = (!search || desc.includes(search) || loc.includes(search) || author.includes(search)) ? '' : 'none';
    });
}