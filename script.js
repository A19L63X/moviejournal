// Configuración de Supabase - REEMPLAZA con tus credenciales
const SUPABASE_URL = 'https://wszpszjpfasqfutjskbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzenBzempwZmFzcWZ1dGpza2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Mzk1ODIsImV4cCI6MjA3NTUxNTU4Mn0.tc3U6nj3ZKlhz5I46DH6rTJcKrNR5VxPvjLGVlVLBVg';

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
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            const { data, error } = await this.supabase.from('movies').select('count');
            
            if (error) {
                console.warn('Error conectando a Supabase, usando localStorage:', error);
                this.showMessage('Modo offline activado. Los datos se guardarán localmente.', 'info');
            }
        } catch (error) {
            console.warn('Supabase no disponible, usando localStorage:', error);
        }

        this.setupEventListeners();
        await this.loadMovies();
    }

    setupEventListeners() {
        // SISTEMA DE MEDIAS ESTRELLAS
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', () => this.setRating(star.dataset.value));
            
            // Efecto hover para medias estrellas
            star.addEventListener('mouseover', (e) => {
                const value = parseFloat(e.target.dataset.value);
                this.highlightStars(value);
            });
        });

        document.getElementById('stars').addEventListener('mouseleave', () => {
            this.highlightStars(this.currentRating);
        });

        // Enlaces de búsqueda IMDB, TMDB y Wikipedia
        document.getElementById('title').addEventListener('input', (e) => {
            this.updateSearchLinks(e.target.value);
        });

        // Inicializar enlaces de búsqueda
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
