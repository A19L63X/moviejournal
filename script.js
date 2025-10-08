class MovieManager {
    constructor() {
        this.movies = JSON.parse(localStorage.getItem('movies')) || [];
        this.currentRating = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderMovies();
    }

    setupEventListeners() {
        // Sistema de estrellas
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', () => this.setRating(star.dataset.value));
        });

        // Drag and drop para imágenes
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('poster');

        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Formulario
        document.getElementById('movieForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMovie();
        });

        // Búsqueda
        document.getElementById('search').addEventListener('input', (e) => {
            this.renderMovies(e.target.value);
        });

        // Exportar/Importar
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.importData(e.target.files[0]);
            }
        });
    }

    setRating(rating) {
        this.currentRating = parseInt(rating);
        document.getElementById('rating').value = this.currentRating;
        
        document.querySelectorAll('.star').forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
                star.textContent = '★';
            } else {
                star.classList.remove('active');
                star.textContent = '☆';
            }
        });
    }

    handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona una imagen válida');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${e.target.result}" class="preview-image" alt="Vista previa">`;
        };
        reader.readAsDataURL(file);
    }

    addMovie() {
        const title = document.getElementById('title').value;
        const director = document.getElementById('director').value;
        const actor = document.getElementById('actor').value;
        const year = document.getElementById('year').value;
        const rating = this.currentRating;
        const description = document.getElementById('description').value;
        
        const preview = document.querySelector('.preview-image');
        const poster = preview ? preview.src : '';

        if (rating === 0) {
            alert('Por favor, selecciona una valoración con estrellas');
            return;
        }

        const movie = {
            id: Date.now(),
            title,
            director,
            actor,
            year: parseInt(year),
            rating,
            description,
            poster,
            dateAdded: new Date().toISOString()
        };

        this.movies.push(movie);
        this.saveMovies();
        this.renderMovies();
        this.resetForm();
        
        // Mostrar mensaje de éxito
        this.showMessage('¡Película agregada correctamente!', 'success');
    }

    resetForm() {
        document.getElementById('movieForm').reset();
        this.setRating(0);
        document.getElementById('imagePreview').innerHTML = '';
    }

    deleteMovie(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta película?')) {
            this.movies = this.movies.filter(movie => movie.id !== id);
            this.saveMovies();
            this.renderMovies();
            this.showMessage('Película eliminada correctamente', 'info');
        }
    }

    saveMovies() {
        localStorage.setItem('movies', JSON.stringify(this.movies));
    }

    renderMovies(searchTerm = '') {
        const moviesList = document.getElementById('moviesList');
        let filteredMovies = this.movies;

        if (searchTerm) {
            filteredMovies = this.movies.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.actor.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filteredMovies.length === 0) {
            moviesList.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1; padding: 40px;">No se encontraron películas. ¡Agrega tu primera película!</p>';
            return;
        }

        moviesList.innerHTML = filteredMovies.map(movie => `
            <div class="movie-card">
                ${movie.poster ? `<img src="${movie.poster}" class="movie-poster" alt="${movie.title}">` : '<div class="no-poster">🎬 Sin póster</div>'}
                <div class="movie-title">${movie.title} (${movie.year})</div>
                <div class="movie-info"><strong>Director:</strong> ${movie.director}</div>
                <div class="movie-info"><strong>Protagonista:</strong> ${movie.actor}</div>
                <div class="movie-info">
                    <strong>Valoración:</strong> 
                    ${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}
                </div>
                <div class="movie-description">${movie.description}</div>
                <button class="delete-btn" onclick="movieManager.deleteMovie(${movie.id})">
                    🗑️ Eliminar
                </button>
            </div>
        `).join('');
    }

    // Función para exportar datos
    exportData() {
        if (this.movies.length === 0) {
            alert('No hay películas para exportar.');
            return;
        }

        const dataStr = JSON.stringify(this.movies, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `mis-peliculas-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('¡Datos exportados correctamente!', 'success');
    }

    // Función para importar datos
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedMovies = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedMovies)) {
                    throw new Error('Formato de archivo inválido');
                }

                if (confirm(`¿Quieres agregar ${importedMovies.length} películas a tu colección?`)) {
                    // Combinar las películas existentes con las importadas
                    this.movies = [...this.movies, ...importedMovies];
                    this.saveMovies();
                    this.renderMovies();
                    this.showMessage(`¡${importedMovies.length} películas importadas correctamente!`, 'success');
                }
            } catch (error) {
                alert('Error al importar el archivo. Verifica que sea un archivo JSON válido exportado desde esta aplicación.');
                console.error('Error importing data:', error);
            }
        };
        reader.readAsText(file);
    }

    // Función para mostrar mensajes
    showMessage(message, type = 'info') {
        // Crear elemento de mensaje
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageEl);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }
}

// Añadir estilos para las animaciones de mensajes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .no-poster {
        width: 100%;
        height: 200px;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        color: #666;
        font-size: 1.2em;
        margin-bottom: 10px;
    }
`;
document.head.appendChild(style);

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.movieManager = new MovieManager();
});
