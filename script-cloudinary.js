// Configuration Cloudinary
let cloudinaryConfig = {
    cloudName: 'dvg2qrfyj',
    uploadPreset: 'cloudmedia'
};

// État de l'application
let mediaFiles = [];
let currentFilter = 'all';

// Éléments DOM
const configModal = document.getElementById('configModal');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('emptyState');
const filters = document.getElementById('filters');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const settingsBtn = document.getElementById('settingsBtn');

// Statistiques
const fileCount = document.getElementById('fileCount');
const countAll = document.getElementById('countAll');
const countImages = document.getElementById('countImages');
const countVideos = document.getElementById('countVideos');

// Initialisation
function init() {
    // Charger la config depuis localStorage
    const savedConfig = localStorage.getItem('cloudinaryConfig');
    const savedMedia = localStorage.getItem('cloudinaryMedia');
    
    if (savedConfig) {
        cloudinaryConfig = JSON.parse(savedConfig);
        configModal.classList.add('hidden');
    }
    
    if (savedMedia) {
        mediaFiles = JSON.parse(savedMedia);
        updateUI();
    }
    
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    // Configuration
    document.getElementById('saveConfig').addEventListener('click', saveConfiguration);
    settingsBtn.addEventListener('click', () => configModal.classList.remove('hidden'));
    
    // Upload
    uploadZone.addEventListener('click', () => {
        if (!cloudinaryConfig.cloudName) {
            alert('Veuillez configurer Cloudinary d\'abord');
            return;
        }
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragging');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragging');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragging');
        if (!cloudinaryConfig.cloudName) {
            alert('Veuillez configurer Cloudinary d\'abord');
            return;
        }
        handleFiles(e.dataTransfer.files);
    });
    
    // Modal
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderGallery();
        });
    });
    
    // Échap pour fermer modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Sauvegarder la configuration
function saveConfiguration() {
    const cloudName = document.getElementById('cloudName').value.trim();
    const uploadPreset = document.getElementById('uploadPreset').value.trim();
    
    if (!cloudName || !uploadPreset) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    cloudinaryConfig = { cloudName, uploadPreset };
    localStorage.setItem('cloudinaryConfig', JSON.stringify(cloudinaryConfig));
    configModal.classList.add('hidden');
    alert('Configuration sauvegardée ! Vous pouvez maintenant uploader vos fichiers.');
}

// Upload vers Cloudinary
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload échoué');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erreur upload:', error);
        throw error;
    }
}

// Gestion des fichiers
async function handleFiles(files) {
    if (files.length === 0) return;
    
    uploadProgress.style.display = 'block';
    progressText.textContent = 'Upload en cours...';
    
    let uploaded = 0;
    const total = files.length;
    
    for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            alert(`Le fichier ${file.name} n'est pas une image ou une vidéo valide`);
            continue;
        }
        
        try {
            progressText.textContent = `Upload ${uploaded + 1}/${total}...`;
            const percentage = ((uploaded / total) * 100);
            progressFill.style.width = percentage + '%';
            
            const result = await uploadToCloudinary(file);
            
            const media = {
                id: result.public_id,
                name: file.name,
                type: isImage ? 'image' : 'video',
                url: result.secure_url,
                thumbnail: result.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
                publicId: result.public_id,
                size: (file.size / 1024 / 1024).toFixed(2),
                date: new Date().toLocaleDateString('fr-FR')
            };
            
            mediaFiles.unshift(media);
            uploaded++;
            
        } catch (error) {
            alert(`Erreur lors de l'upload de ${file.name}: ${error.message}`);
        }
    }
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Upload terminé !';
    
    saveMediaToStorage();
    updateUI();
    
    setTimeout(() => {
        uploadProgress.style.display = 'none';
        progressFill.style.width = '0%';
    }, 2000);
    
    fileInput.value = '';
}

// Sauvegarder dans localStorage
function saveMediaToStorage() {
    localStorage.setItem('cloudinaryMedia', JSON.stringify(mediaFiles));
}

// Mise à jour de l'interface
function updateUI() {
    updateStats();
    renderGallery();
    
    if (mediaFiles.length > 0) {
        filters.style.display = 'flex';
        emptyState.style.display = 'none';
    } else {
        filters.style.display = 'none';
        emptyState.style.display = 'block';
        gallery.innerHTML = '';
    }
}

// Mise à jour des statistiques
function updateStats() {
    const imageCount = mediaFiles.filter(m => m.type === 'image').length;
    const videoCount = mediaFiles.filter(m => m.type === 'video').length;
    
    fileCount.textContent = mediaFiles.length;
    countAll.textContent = mediaFiles.length;
    countImages.textContent = imageCount;
    countVideos.textContent = videoCount;
}

// Rendu de la galerie
function renderGallery() {
    const filteredMedia = mediaFiles.filter(m => 
        currentFilter === 'all' ? true : m.type === currentFilter
    );
    
    if (filteredMedia.length === 0 && mediaFiles.length > 0) {
        gallery.innerHTML = '<div class="empty-state"><p>Aucun média dans cette catégorie</p></div>';
        return;
    }
    
    gallery.innerHTML = filteredMedia.map(media => `
        <div class="media-card">
            <div class="media-preview" onclick="openModal('${media.id}')">
                ${media.type === 'image' 
                    ? `<img src="${media.thumbnail}" alt="${media.name}">`
                    : `<video src="${media.url}" preload="metadata"></video>`
                }
                <div class="media-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${media.type === 'image'
                            ? '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
                            : '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'
                        }
                    </svg>
                </div>
            </div>
            <div class="media-info">
                <p class="media-name">${media.name}</p>
                <div class="media-meta">
                    <span>${media.size} MB</span>
                    <span>${media.date}</span>
                </div>
                <div class="media-actions">
                    <button class="action-btn copy-btn" onclick="copyLink('${media.url}', this)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span class="copy-text">Lien</span>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteMedia('${media.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Copier le lien
function copyLink(url, button) {
    navigator.clipboard.writeText(url).then(() => {
        button.classList.add('copied');
        const text = button.querySelector('.copy-text');
        const svg = button.querySelector('svg');
        
        text.textContent = 'Copié';
        svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        
        setTimeout(() => {
            button.classList.remove('copied');
            text.textContent = 'Lien';
            svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
        }, 2000);
    });
}

// Supprimer un média
function deleteMedia(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?\n\nNote: Le fichier restera sur Cloudinary mais sera retiré de cette liste.')) {
        mediaFiles = mediaFiles.filter(m => m.id !== id);
        saveMediaToStorage();
        updateUI();
    }
}

// Ouvrir le modal
function openModal(id) {
    const media = mediaFiles.find(m => m.id === id);
    if (!media) return;
    
    modalContent.innerHTML = media.type === 'image'
        ? `<img src="${media.url}" alt="${media.name}">`
        : `<video src="${media.url}" controls autoplay></video>`;
    
    modal.classList.add('active');
}

// Fermer le modal
function closeModal() {
    modal.classList.remove('active');
    modalContent.innerHTML = '';
}

// Démarrage
init();