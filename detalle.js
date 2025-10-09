// Configuración de Supabase - misma que en script.js
const SUPABASE_URL = 'https://wszpszjpfasqfutjskbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzenBzempwZmFzcWZ1dGpza2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzk1ODIsImV4cCI6MjA3NTUxNTU4Mn0.tc3U6nj3ZKlhz5I46DH6rTJcKrNR5VxPvjLGVlVLBVg';

class MovieDetail {
    constructor() {
        this.supabase = null;
        this.movie = null;
        this.currentRating = 0;
        this.init();
    }

    async init() {
        try {
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (error) {
            console.warn('Supabase no disponible:', error);
        }

        await this.loadMovie();
        this.setupEventListeners();
    }

    async loadMovie() {
        const urlParams = new URLSearchParams(window.location.search);
        const movieId = urlParams.get('id');

        if (!movieId) {
            this.showError();
            return;
        }

        try {
            let movie = null;

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('movies')
                    .select('*')
                    .eq('id', movieId)
                    .single();

                if (error) throw error;
                movie = data;
            } else {
                const movies = JSON.parse(localStorage.getItem('movies')) || [];
                movie = movies.find(m => m.id == movieId);
            }

            if (movie) {
                this.movie = movie;
                this.displayMovie();
            } else {
                this.showError();
            }
        } catch (error) {
            console.error('Error cargando película:', error);
            this.showError();
        }
    }

    displayMovie() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('movieDetail').style.display = 'block';

        // Llenar datos en vista de lectura
        document.getElementById('detailTitle').textContent = this.movie.title;
        document.getElementById('detailDirector').textContent = this.movie.director;
        document.getElementById('detailCast').textContent = this.movie.cast;
        document.getElementById('detailYear').textContent = this.movie.year;
        document.getElementById('detailDuration').textContent = `${this.movie.duration} min`;
        document.getElementById('detailGenre').textContent = this.movie.genre;
        document.getElementById('detailCountry').textContent = this.movie.country;
        document.getElementById('detailLanguage').textContent = this.movie.language;
        document.getElementById('detailBudget').textContent = this.movie.budget || 'No especificado';
        document.getElementById('detailStudio').textContent = this.movie.studio || 'No especificado';
        document.getElementById('detailBoxOffice').textContent = this.movie.box_office || 'No especificado';
        document.getElementById('detailScreenplay').textContent = this.movie.screenplay || 'No especificado';
        document.getElementById('detailMusic').textContent = this.movie.music || 'No especificado';
        document.getElementById('detailCinematography').textContent = this.movie.cinematography || 'No especificado';
        document.getElementById('detailAwards').textContent = this.movie.awards || 'No especificado';
        document.getElementById('detailDescription').textContent = this.movie.description;

        // Mostrar valoración con medias estrellas
        const ratingElement = document.getElementById('detailRating');
        ratingElement.innerHTML = this.renderStars(this.movie.rating);
        
        // Mostrar número de rating
        document.getElementById('detailRatingNumber').textContent = `${this.movie.rating}/5`;

        // Mostrar póster
        const posterImg = document.getElementById('detailPoster');
        if (this.movie.poster) {
            posterImg.src = this.movie.poster;
            posterImg.style.display = 'block';
        } else {
            posterImg.style.display = 'none';
        }

        this.prepareEditForm();
    }

    // Renderizar estrellas para vista de detalles
    renderStars(rating) {
        let starsHTML = '';
        for (let i = 0.5; i <= 5; i += 0.5) {
            if (i <= rating) {
                starsHTML += '<span class="star active">★</span>';
            } else {
                starsHTML += '<span class="star">☆</span>';
            }
        }
        return starsHTML;
    }

    prepareEditForm() {
        // Llenar formulario de edición con datos actuales
        document.getElementById('editId').value = this.movie.id;
        document.getElementById('editTitle').value = this.movie.title;
        document.getElementById('editDirector').value = this.movie.director;
        document.getElementById('editCast').value = this.movie.cast;
        document.getElementById('editYear').value = this.movie.year;
        document.getElementById('editGenre').value = this.movie.genre;
        document.getElementById('editDuration').value = this.movie.duration;
        document.getElementById('editCountry').value = this.movie.country;
        document.getElementById('editLanguage').value = this.movie.language;
        document.getElementById('editBudget').value = this.movie.budget || '';
        document.getElementById('editStudio').value = this.movie.studio || '';
        document.getElementById('editBoxOffice').value = this.movie.box_office || '';
        document.getElementById('editScreenplay').value = this.movie.screenplay || '';
        document.getElementById('editMusic').value = this.movie.music || '';
        document.getElementById('editCinematography').value = this.movie.cinematography || '';
        document.getElementById('editAwards').value = this.movie.awards || '';
        document.getElementById('editDescription').value = this.movie.description;
        
        // Configurar estrellas
        this.setEditRating(this.movie.rating);

        // Mostrar imagen actual
        if (this.movie.poster) {
            const preview = document.getElementById('editImagePreview');
            preview.innerHTML = `<img src="${this.movie.poster}" class="preview-image" alt="Vista previa">`;
        }
    }

    setupEventListeners() {
        // Botón editar
        document.getElementById('editButton').addEventListener('click', () => {
            this.showEditView();
        });

        // Botón cancelar edición
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.showReadView();
        });

        // Formulario de edición
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateMovie();
        });

        // SISTEMA DE MEDIAS ESTRELLAS EN EDICIÓN
        document.querySelectorAll('#editStars .star').forEach(star => {
            star.addEventListener('click', () => this.setEditRating(star.dataset.value));
            
            star.addEventListener('mouseover', (e) => {
                const value = parseFloat(e.target.dataset.value);
                this.highlightEditStars(value);
            });
        });

        document.getElementById('editStars').addEventListener('mouseleave', () => {
            this.highlightEditStars(this.currentRating);
        });

        // Drag and drop para edición
        const dropZone = document.getElementById('editDropZone');
        const fileInput = document.getElementById('editPoster');

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
                this.handleEditImageUpload(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleEditImageUpload(e.target.files[0]);
            }
        });
    }

    // SISTEMA DE MEDIAS ESTRELLAS PARA EDICIÓN
    setEditRating(rating) {
        this.currentRating = parseFloat(rating);
        document.getElementById('editRating').value = this.currentRating;
        this.highlightEditStars(this.currentRating);
        this.updateEditRatingDisplay();
    }

    highlightEditStars(rating) {
        document.querySelectorAll('#editStars .star').forEach(star => {
            const starValue = parseFloat(star.dataset.value);
            if (starValue <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    updateEditRatingDisplay() {
        document.getElementById('editRatingValue').textContent = `${this.currentRating}/5`;
    }

    showEditView() {
        document.getElementById('readView').style.display = 'none';
        document.getElementById('editView').style.display = 'block';
    }

    showReadView() {
        document.getElementById('editView').style.display = 'none';
        document.getElementById('readView').style.display = 'block';
        this.prepareEditForm();
    }

    handleEditImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona una imagen válida');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('editImagePreview');
            preview.innerHTML = `<img src="${e.target.result}" class="preview-image" alt="Vista previa">`;
        };
        reader.readAsDataURL(file);
    }

    async updateMovie() {
        const movieData = this.getEditFormData();
        if (!movieData) return;

        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('movies')
                    .update(movieData)
                    .eq('id', this.movie.id)
                    .select();

                if (error) throw error;
                this.movie = { ...this.movie, ...movieData };
            } else {
                const movies = JSON.parse(localStorage.getItem('movies')) || [];
                const index = movies.findIndex(m => m.id == this.movie.id);
                if (index !== -1) {
                    movies[index] = { ...movies[index], ...movieData };
                    localStorage.setItem('movies', JSON.stringify(movies));
                    this.movie = movies[index];
                }
            }

            this.displayMovie();
            this.showReadView();
            this.showMessage('¡Película actualizada correctamente!', 'success');
            
        } catch (error) {
            console.error('Error actualizando película:', error);
            this.showMessage('Error al actualizar la película', 'error');
        }
    }

    getEditFormData() {
        const title = document.getElementById('editTitle').value.trim();
        const director = document.getElementById('editDirector').value.trim();
        const cast = document.getElementById('editCast').value.trim();
        const year = document.getElementById('editYear').value;
        const rating = this.currentRating;
        const description = document.getElementById('editDescription').value.trim();
        
        const genre = document.getElementById('editGenre').value;
        const duration = document.getElementById('editDuration').value;
        const country = document.getElementById('editCountry').value.trim();
        const language = document.getElementById('editLanguage').value.trim();
        const budget = document.getElementById('editBudget').value.trim();
        const studio = document.getElementById('editStudio').value.trim();
        const boxOffice = document.getElementById('editBoxOffice').value.trim();
        const screenplay = document.getElementById('editScreenplay').value.trim();
        const music = document.getElementById('editMusic').value.trim();
        const cinematography = document.getElementById('editCinematography').value.trim();
        const awards = document.getElementById('editAwards').value.trim();
        
        const preview = document.querySelector('#editImagePreview .preview-image');
        const poster = preview ? preview.src : this.movie.poster;

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

        return {
            title,
            director,
            cast,  // Ahora coincide con la columna en Supabase
            year: parseInt(year),
            rating,
            description,
            genre,
            duration: parseInt(duration),
            country,
            language,
            budget: budget || 'No especificado',
            studio: studio || 'No especificado',
            box_office: boxOffice || 'No especificado',
            screenplay: screenplay || 'No especificado',
            music: music || 'No especificado',
            cinematography: cinematography || 'No especificado',
            awards: awards || 'No especificado',
            poster,
            updated_at: new Date().toISOString()
        };
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }

    showMessage(message, type = 'info') {
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

// Inicializar la página de detalles
document.addEventListener('DOMContentLoaded', () => {
    new MovieDetail();
});
