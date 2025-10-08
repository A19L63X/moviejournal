// Configuración de Supabase - REEMPLAZA con tus credenciales
const SUPABASE_URL = 'https://wszpszjpfasqfutjskbl.supabase.co'; // Tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzenBzempwZmFzcWZ1dGpza2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzk1ODIsImV4cCI6MjA3NTUxNTU4Mn0.tc3U6nj3ZKlhz5I46DH6rTJcKrNR5VxPvjLGVlVLBVg'; // Tu clave pública anónima

class MovieManager {
    constructor() {
        this.supabase = null;
        this.movies = [];
        this.currentRating = 0;
        this.isAlphaView = false;
        this.init();
    }

    async init() {
        try {
            // Inicializar Supabase
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Verificar conexión
            const { data, error } = await this.supabase.from('movies').select('count');
            
            if (error) {
                console.warn('Error conectando a Supabase, usando localStorage:', error);
                this.showMessage('Modo offline activado. Los datos se guardarán localmente.', 'info');
            } else {
                console.log('Conectado a Supabase correctamente');
            }
        } catch (error) {
            console.warn('Supabase no disponible, usando localStorage:', error);
        }

        this.setupEventListeners();
        await this.loadMovies();
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

        // Orden alfabético
        document.getElementById('sortAlphabetical').addEventListener('click', () => {
            this.toggleAlphaView();
        });

        // Ver todas
        document.getElementById('showAll').addEventListener('click', () => {
            this.showAllMovies();
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

    async addMovie() {
        const movieData = this.getFormData();
        if (!movieData) return;

        try {
            let result;

            if (this.supabase) {
                // Guardar en Supabase
                const { data, error } = await this.supabase
                    .from('movies')
                    .insert([movieData])
                    .select();

                if (error) throw error;
                result = data[0];
            } else {
                // Fallback a localStorage
                movieData.id = Date.now();
                movieData.created_at = new Date().toISOString();
                result = movieData;
                this.saveToLocalStorage(movieData);
            }

            this.movies.push(result);
            this.renderMovies();
            this.resetForm();
            this.showMessage('¡Película agregada correctamente!', 'success');
            
        } catch (error) {
            console.error('Error agregando película:', error);
            this.showMessage('Error al agregar la película', 'error');
        }
    }

    async deleteMovie(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta película?')) return;

        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('movies')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }

            this.movies = this.movies.filter(movie => movie.id !== id);
            
            if (!this.supabase) {
                localStorage.setItem('movies', JSON.stringify(this.movies));
            }

            this.renderMovies();
            this.showMessage('Película eliminada correctamente', 'info');
            
        } catch (error) {
            console.error('Error eliminando película:', error);
            this.showMessage('Error al eliminar la película', 'error');
        }
    }

    resetForm() {
        document.getElementById('movieForm').reset();
        this.setRating(0);
        document.getElementById('imagePreview').innerHTML = '';
    }

    getFormData() {
        const title = document.getElementById('title').value.trim();
        const director = document.getElementById('director').value.trim();
        const actor = document.getElementById('actor').value.trim();
        const year = document.getElementById('year').value;
        const rating = this.currentRating;
        const description = document.getElementById('description').value.trim();
        
        const preview = document.querySelector('.preview-image');
        const poster = preview ? preview.src : '';

        // Validaciones
        if (!title || !director || !actor || !year) {
            this.showMessage('Por favor, completa todos los campos obligatorios', 'error');
            return null;
        }

        if (rating === 0) {
            this.showMessage('Por favor, selecciona una valoración con estrellas', 'error');
            return null;
        }

        return {
            title,
            director,
            actor,
            year: parseInt(year),
            rating,
            description,
            poster,
            created_at: new Date().toISOString()
        };
    }

    async loadMovies() {
        try {
            let movies = [];

            if (this.supabase) {
                // Cargar desde Supabase
                const { data, error } = await this.supabase
                    .from('movies')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                movies = data || [];
            } else {
                // Cargar desde localStorage
                const localData = localStorage.getItem('movies');
                movies = localData ? JSON.parse(localData) : [];
            }

            this.movies = movies;
            this.renderMovies();
            
        } catch (error) {
            console.error('Error cargando películas:', error);
            // Fallback a localStorage
            const localData = localStorage.getItem('movies');
            this.movies = localData ? JSON.parse(localData) : [];
            this.renderMovies();
        }
    }

    saveToLocalStorage(movie) {
        const movies = JSON.parse(localStorage.getItem('movies')) || [];
        movies.push(movie);
        localStorage.setItem('movies', JSON.stringify(movies));
    }

    renderMovies(searchTerm = '') {
        const moviesList = document.getElementById('moviesList');
        const moviesCount = document.getElementById('moviesCount');
        
        let filteredMovies = this.movies;

        // Aplicar búsqueda
        if (searchTerm) {
            filteredMovies = this.movies.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.actor.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Actualizar contador
        moviesCount.textContent = `${filteredMovies.length} película${filteredMovies.length !== 1 ? 's' : ''}`;

        if (this.isAlphaView) {
            this.renderAlphaView(filteredMovies);
            return;
        }

        if (filteredMovies.length === 0) {
            moviesList.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <p>${searchTerm ? 'No se encontraron películas que coincidan con tu búsqueda.' : 'No hay películas en tu colección. ¡Agrega la primera!'}</p>
                </div>
            `;
            return;
        }

        moviesList.innerHTML = filteredMovies.map(movie => `
            <div class="movie-card">
                ${movie.poster ? 
                    `<img src="${movie.poster}" class="movie-poster" alt="${movie.title}" onerror="this.style.display='none'">` : 
                    '<div class="no-poster">🎬 Sin póster</div>'
                }
                <div class="movie-title">${this.escapeHtml(movie.title)} (${movie.year})</div>
                <div class="movie-info"><strong>Director:</strong> ${this.escapeHtml(movie.director)}</div>
                <div class="movie-info"><strong>Protagonista:</strong> ${this.escapeHtml(movie.actor)}</div>
                <div class="movie-info">
                    <strong>Valoración:</strong> 
                    ${'★'.repeat(movie.rating)}${'☆'.repeat(5 - movie.rating)}
                </div>
                <div class="movie-description">${this.escapeHtml(movie.description)}</div>
                <div class="movie-actions">
                    <a href="detalle.html?id=${movie.id}" class="view-btn">👁️ VER</a>
                    <button class="delete-btn" onclick="movieManager.deleteMovie(${movie.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderAlphaView(movies) {
        const moviesList = document.getElementById('moviesList');
        
        // Ordenar alfabéticamente
        const sortedMovies = [...movies].sort((a, b) => 
            a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
        );

        if (sortedMovies.length === 0) {
            moviesList.innerHTML = '<div class="loading">No hay películas para mostrar</div>';
            return;
        }

        moviesList.innerHTML = `
            <div class="alpha-list">
                ${sortedMovies.map(movie => `
                    <div class="alpha-item">
                        <span class="alpha-title">${this.escapeHtml(movie.title)}</span>
                        <span class="alpha-year">${movie.year}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    toggleAlphaView() {
        this.isAlphaView = !this.isAlphaView;
        
        if (this.isAlphaView) {
            document.getElementById('moviesTitle').textContent = 'Películas en Orden Alfabético';
            document.getElementById('sortAlphabetical').textContent = '🎬 Ver Vista Normal';
            this.renderMovies(document.getElementById('search').value);
        } else {
            this.showAllMovies();
        }
    }

    showAllMovies() {
        this.isAlphaView = false;
        document.getElementById('moviesTitle').textContent = 'Mi Colección de Películas';
        document.getElementById('sortAlphabetical').textContent = '🔤 Ver Orden Alfabético';
        this.renderMovies(document.getElementById('search').value);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        // Remover mensajes existentes
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);

        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }
        }, 4000);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.movieManager = new MovieManager();
});
