// Configuración de Supabase
const SUPABASE_URL = 'https://wszpszjpfasqfutjskbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzenBzempwZmFzcWZ1dGpza2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzk1ODIsImV4cCI6MjA3NTUxNTU4Mn0.tc3U6nj3ZKlhz5I46DH6rTJcKrNR5VxPvjLGVlVLBVg';

class MovieManager {
    constructor() {
        this.supabase = null;
        this.movies = [];
        this.currentRating = 0;
        this.isAlphaView = true; // Cambiado a true para mostrar orden alfabético por defecto
        this.init();
    }

    async init() {
        try {
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Test connection
            const { data, error } = await this.supabase.from('movies').select('count');
            
            if (error) {
                console.warn('Error conectando a Supabase, usando localStorage:', error);
                this.showMessage('Modo offline activado. Los datos se guardarán localmente.', 'info');
            }
        } catch (error) {
            console.warn('Supabase no disponible, usando localStorage:', error);
        }

        // Verificar parámetro de URL para determinar la vista
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        
        if (viewParam === 'collection') {
            // VISTA COLECCIÓN: Ocultar formulario, mostrar grid y cambiar títulos
            document.getElementById('formContainer').style.display = 'none';
            this.isAlphaView = false;
            document.getElementById('moviesTitle').textContent = 'Mi Colección de Películas';
            document.getElementById('sortAlphabetical').textContent = '🔤 Ver Orden Alfabético';
            
            // Cambiar título de la página y header principal con iconos
            document.title = '🎬📚 My Movies Collection';
            document.getElementById('mainHeader').textContent = '🎬 My Movies Collection 🎬';
        } else {
            // VISTA PRINCIPAL: Mostrar formulario y lista alfabética
            document.getElementById('formContainer').style.display = 'block';
            this.isAlphaView = true;
            document.getElementById('moviesTitle').textContent = 'Películas en Orden Alfabético';
            document.getElementById('sortAlphabetical').textContent = '🎬 Ver Vista de Colección';
            
            // Asegurar títulos correctos para vista principal con iconos
            document.title = '🎬📝 My Movies Diaries';
            document.getElementById('mainHeader').textContent = '🎬 My Movies Diaries 🎬';
        }

        this.setupEventListeners();
        this.initGenreCheckboxes();
        this.initCountrySelect();
        await this.loadMovies();
    }

    setupEventListeners() {
        // SISTEMA DE MEDIAS ESTRELLAS
        document.querySelectorAll('#stars .star').forEach(star => {
            star.addEventListener('click', () => this.setRating(star.dataset.value));
            
            star.addEventListener('mouseover', (e) => {
                const value = parseFloat(e.target.dataset.value);
                this.highlightStars(value);
            });
        });

        document.getElementById('stars').addEventListener('mouseleave', () => {
            this.highlightStars(this.currentRating);
        });

        // Enlaces de búsqueda
        document.getElementById('title').addEventListener('input', (e) => {
            this.updateSearchLinks(e.target.value);
        });

        this.updateSearchLinks('');

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

        // Ver todas - MODIFICADO: abrir en nueva pestaña
        document.getElementById('showAll').addEventListener('click', () => {
            this.openCollectionInNewTab();
        });
    }

    // Inicializar checkboxes de género
    initGenreCheckboxes() {
        const checkboxes = document.querySelectorAll('input[name="genre"]');
        const hiddenInput = document.getElementById('genre');
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedGenres = Array.from(document.querySelectorAll('input[name="genre"]:checked'))
                    .map(cb => cb.value)
                    .join(', ');
                hiddenInput.value = selectedGenres;
            });
        });
    }

    // Inicializar select de países
    initCountrySelect() {
        const countrySelect = document.getElementById('country');
        if (!countrySelect) return;

        // Ordenar países por nombre
        const paisesOrdenados = [...paises].sort((a, b) => 
            a.nombre.localeCompare(b.nombre, 'es')
        );

        // Limpiar select
        countrySelect.innerHTML = '<option value="">Selecciona un país</option>';

        // Llenar con opciones
        paisesOrdenados.forEach(pais => {
            const option = document.createElement('option');
            option.value = pais.nombre; // Guardar el nombre del país, no el ISO
            option.textContent = pais.nombre;
            countrySelect.appendChild(option);
        });
    }

    // NUEVO MÉTODO: Abrir colección en nueva pestaña
    openCollectionInNewTab() {
        // Crear una URL con parámetro para vista de colección
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'collection');
        
        // Abrir en nueva pestaña
        window.open(url.toString(), '_blank');
    }

    // Actualizar enlaces de búsqueda
    updateSearchLinks(title) {
        const imdbLink = document.getElementById('imdbSearch');
        const tmdbLink = document.getElementById('tmdbSearch');
        const wikipediaLink = document.getElementById('wikipediaSearch');
        const filmaffinityLink = document.getElementById('filmaffinitySearch');
        
        if (title && title.trim() !== '') {
            const encodedTitle = encodeURIComponent(title.trim());
            imdbLink.href = `https://www.imdb.com/find?q=${encodedTitle}`;
            tmdbLink.href = `https://www.themoviedb.org/search?query=${encodedTitle}`;
            wikipediaLink.href = `https://es.wikipedia.org/w/index.php?search=${encodedTitle}`;
            filmaffinityLink.href = `https://www.filmaffinity.com/es/search.php?stext=${encodedTitle}`;
            imdbLink.style.opacity = '1';
            tmdbLink.style.opacity = '1';
            wikipediaLink.style.opacity = '1';
            filmaffinityLink.style.opacity = '1';
        } else {
            imdbLink.href = '#';
            tmdbLink.href = '#';
            wikipediaLink.href = '#';
            filmaffinityLink.href = '#';
            imdbLink.style.opacity = '0.6';
            tmdbLink.style.opacity = '0.6';
            wikipediaLink.style.opacity = '0.6';
            filmaffinityLink.style.opacity = '0.6';
        }
    }

    // SISTEMA DE MEDIAS ESTRELLAS
    setRating(rating) {
        this.currentRating = parseFloat(rating);
        document.getElementById('rating').value = this.currentRating;
        this.highlightStars(this.currentRating);
        this.updateRatingDisplay();
    }

    highlightStars(rating) {
        document.querySelectorAll('#stars .star').forEach(star => {
            const starValue = parseFloat(star.dataset.value);
            if (starValue <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    updateRatingDisplay() {
        document.getElementById('ratingValue').textContent = `${this.currentRating}/5`;
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
                console.log('Enviando datos a Supabase:', movieData);
                
                const { data, error } = await this.supabase
                    .from('movies')
                    .insert([movieData])
                    .select();

                if (error) {
                    console.error('Error de Supabase:', error);
                    throw error;
                }
                result = data[0];
            } else {
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
            this.showMessage('Error al agregar la película: ' + error.message, 'error');
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
        this.currentRating = 0;
        this.highlightStars(0);
        this.updateRatingDisplay();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('rating').value = '0';
        this.updateSearchLinks('');
        
        // Limpiar checkboxes de género
        document.querySelectorAll('input[name="genre"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('genre').value = '';
        
        // Resetear select de país
        document.getElementById('country').value = '';
    }

    getFormData() {
        // Campos principales
        const title = document.getElementById('title').value.trim();
        const director = document.getElementById('director').value.trim();
        const cast = document.getElementById('cast').value.trim();
        const year = document.getElementById('year').value;
        const rating = this.currentRating;
        const description = document.getElementById('description').value.trim();
        const review = document.getElementById('review').value.trim();
        
        // Campos adicionales
        const genre = document.getElementById('genre').value;
        const duration = document.getElementById('duration').value;
        const countrySelect = document.getElementById('country');
        const country = countrySelect.value; // Solo el nombre del país
        const language = document.getElementById('language').value.trim();
        const budget = document.getElementById('budget').value.trim();
        const studio = document.getElementById('studio').value.trim();
        const boxOffice = document.getElementById('boxOffice').value.trim();
        const screenplay = document.getElementById('screenplay').value.trim();
        const music = document.getElementById('music').value.trim();
        const cinematography = document.getElementById('cinematography').value.trim();
        const awards = document.getElementById('awards').value.trim();
        
        const preview = document.querySelector('#imagePreview .preview-image');
        const poster = preview ? preview.src : '';

        // Validaciones
        const requiredFields = [
            { value: title, name: 'Película' },
            { value: director, name: 'Director' },
            { value: cast, name: 'Reparto' },
            { value: year, name: 'Año' },
            { value: genre, name: 'Género' },
            { value: duration, name: 'Duración' },
            { value: country, name: 'País' },
            { value: language, name: 'Idioma' }
        ];

        for (let field of requiredFields) {
            if (!field.value) {
                this.showMessage(`Por favor, completa el campo: ${field.name}`, 'error');
                return null;
            }
        }

        if (rating === 0) {
            this.showMessage('Por favor, selecciona una valoración con estrellas', 'error');
            return null;
        }

        // Crear objeto de datos limpio - SIN country_iso
        const movieData = {
            title,
            director,
            movie_cast: cast,
            year: parseInt(year),
            rating: parseFloat(rating),
            description,
            review: review || 'Sin reseña personal',
            genre,
            duration: parseInt(duration),
            country: country, // Solo el nombre del país
            language,
            budget: budget || 'No especificado',
            studio: studio || 'No especificado',
            box_office: boxOffice || 'No especificado',
            screenplay: screenplay || 'No especificado',
            music: music || 'No especificado',
            cinematography: cinematography || 'No especificado',
            awards: awards || 'No especificado',
            poster,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('Datos de la película preparados:', movieData);
        return movieData;
    }

    async loadMovies() {
        try {
            let movies = [];

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('movies')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                movies = data || [];
            } else {
                const localData = localStorage.getItem('movies');
                movies = localData ? JSON.parse(localData) : [];
            }

            this.movies = movies;
            this.renderMovies();
            
        } catch (error) {
            console.error('Error cargando películas:', error);
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

        if (searchTerm) {
            filteredMovies = this.movies.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (movie.movie_cast && movie.movie_cast.toLowerCase().includes(searchTerm.toLowerCase())) ||
                movie.genre.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

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

        moviesList.innerHTML = filteredMovies.map(movie => {
            // Obtener código ISO del país basado en el nombre
            const countryIso = obtenerISOPais(movie.country);
            const flagUrl = countryIso ? `https://flagcdn.com/w20/${countryIso.toLowerCase()}.png` : '';
            
            return `
                <div class="movie-card">
                    ${movie.poster ? 
                        `<div class="poster-container">
                            <img src="${movie.poster}" class="movie-poster" alt="${movie.title}" 
                                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'no-poster\\'>🎬 Sin póster</div>'">
                        </div>` : 
                        '<div class="no-poster">🎬 Sin póster</div>'
                    }
                    <div class="movie-title">${this.escapeHtml(movie.title)}</div>
                    <div class="movie-year-rating">
                        <span class="movie-year">${movie.year}</span>
                        <span class="rating-number">${movie.rating}/5</span>
                    </div>
                    <!-- Nueva línea: Mostrar bandera del país -->
                    <div class="movie-country">
                        ${flagUrl ? `<img src="${flagUrl}" alt="Bandera" class="country-flag-small" title="${movie.country}">` : ''}
                        <span class="country-name">${movie.country}</span>
                    </div>
                    <div class="movie-description">${this.escapeHtml(movie.description)}</div>
                    <div class="movie-actions">
                        <a href="detalle.html?id=${movie.id}" class="view-btn">👁️ VER</a>
                        <button class="delete-btn" onclick="movieManager.deleteMovie(${movie.id})">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // LISTA ALFABÉTICA
    renderAlphaView(movies) {
        const moviesList = document.getElementById('moviesList');
        
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
                    <a href="detalle.html?id=${movie.id}" class="alpha-item">
                        <span class="alpha-title">${this.escapeHtml(movie.title)}</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span class="alpha-genre">${movie.genre}</span>
                            <span class="alpha-year">${movie.year}</span>
                            <span class="alpha-rating">${movie.rating}/5</span>
                        </div>
                    </a>
                `).join('')}
            </div>
        `;
    }

    toggleAlphaView() {
        this.isAlphaView = !this.isAlphaView;
        
        if (this.isAlphaView) {
            document.getElementById('moviesTitle').textContent = 'Películas en Orden Alfabético';
            document.getElementById('sortAlphabetical').textContent = '🎬 Ver Vista de Colección';
            this.renderMovies(document.getElementById('search').value);
        } else {
            document.getElementById('moviesTitle').textContent = 'Mi Colección de Películas';
            document.getElementById('sortAlphabetical').textContent = '🔤 Ver Orden Alfabético';
            this.renderMovies(document.getElementById('search').value);
        }
    }

    showAllMovies() {
        this.isAlphaView = false;
        document.getElementById('moviesTitle').textContent = 'Mi Colección de Películas';
        document.getElementById('sortAlphabetical').textContent = '🔤 Ver Orden Alfabético';
        this.renderMovies(document.getElementById('search').value);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'info') {
        // Eliminar mensajes existentes
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
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

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.movieManager = new MovieManager();
});
