window.initMovies = function() {
    // This object will be exposed to the global scope to handle inline onclick events.
    window.movieApp = {};

    // --- DOM Elements & State ---
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const qualityFilter = document.getElementById('qualityFilter');
    const genreFilter = document.getElementById('genreFilter');
    const sortBy = document.getElementById('sortBy');
    const limitFilter = document.getElementById('limitFilter');
    const movieGrid = document.getElementById('movieGrid');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const pagination = document.getElementById('pagination');
    const movieModal = document.getElementById('movieModal');
    const modalContent = document.getElementById('modalContent');
    const YTS_API_BASE_URL = 'https://movies-api.accel.li/api/v2/';
    let ytsCurrentPage = 1;
    let ytsCurrentQuery = '';
    let ytsCurrentQuality = 'all';
    let ytsCurrentGenre = 'all';
    let ytsCurrentSortBy = 'date_added';
    let ytsCurrentLimit = 6;

    const tmdbContent = document.getElementById('tmdb-content');
    const tmdbButtons = document.querySelectorAll('.tmdb-btn');
    const tmdbYearSelect = document.getElementById('tmdbYearSelect');
    const TMDB_API_KEY = '91db3cd652f82bf70319270e3edd4e5d';
    let tmdbCurrentMovieData = [];
    let tmdbCurrentApiType = 'popular';

    // --- YTS Functions ---
    async function fetchYTSMovies(page = 1) {
        loader.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        movieGrid.innerHTML = '';
        pagination.innerHTML = '';
        ytsCurrentPage = page;

        const params = new URLSearchParams({
            limit: ytsCurrentLimit,
            page: ytsCurrentPage,
            sort_by: ytsCurrentSortBy,
        });
        if (ytsCurrentQuery) params.append('query_term', ytsCurrentQuery);
        if (ytsCurrentQuality !== 'all') params.append('quality', ytsCurrentQuality);
        if (ytsCurrentGenre !== 'all') params.append('genre', ytsCurrentGenre);
        
        const url = `${YTS_API_BASE_URL}list_movies.json?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.status === 'ok' && data.data.movie_count > 0) {
                renderYTSMovies(data.data.movies);
                renderYTSPagination(data.data.movie_count, data.data.limit);
            } else {
                noResultsMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('YTS Fetch error:', error);
            errorMessage.classList.remove('hidden');
        } finally {
            loader.classList.add('hidden');
        }
    }

    function renderYTSMovies(movies) {
        movieGrid.innerHTML = ''; 
        movies.forEach(movie => {
            const movieCard = `
                <div class="group bg-white rounded-lg overflow-hidden shadow-lg cursor-pointer transform hover:-translate-y-2 transition-transform duration-300" onclick="movieApp.showMovieDetails(${movie.id})">
                    <div class="relative">
                        <img src="${movie.large_cover_image}" alt="${movie.title}" class="w-full h-auto object-cover" referrerpolicy="no-referrer" onerror="movieApp.handleImageError(this, '${movie.imdb_code}')">
                        <div class="absolute inset-0 movie-card-overlay flex flex-col justify-end p-4">
                            <h3 class="text-white font-bold text-lg truncate">${movie.title}</h3>
                            <p class="text-gray-300 text-sm">${movie.year}</p>
                            <div class="flex items-center mt-1">
                                <svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span class="text-white">${movie.rating} / 10</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            movieGrid.innerHTML += movieCard;
        });
    }
    
    function renderYTSPagination(totalMovies, limit) {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalMovies / limit);
        if (totalPages <= 1) return;

        const createButton = (text, page, disabled = false) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.className = 'px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-indigo-600 hover:text-white disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors';
            button.disabled = disabled;
            button.onclick = () => fetchYTSMovies(page);
            return button;
        };

        pagination.appendChild(createButton('&laquo; Prev', ytsCurrentPage - 1, ytsCurrentPage === 1));
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${ytsCurrentPage} of ${totalPages}`;
        pageInfo.className = 'px-4 py-2 text-gray-600';
        pagination.appendChild(pageInfo);
        pagination.appendChild(createButton('Next &raquo;', ytsCurrentPage + 1, ytsCurrentPage >= totalPages));
    }

    async function showMovieDetails(movieId) {
        movieModal.classList.remove('hidden', 'opacity-0');
        modalContent.innerHTML = `<div class="p-8 text-center"><svg class="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="mt-4">Loading details...</p></div>`;
        setTimeout(() => modalContent.classList.add('modal-enter-active'), 10);

        const url = `${YTS_API_BASE_URL}movie_details.json?movie_id=${movieId}&with_images=true&with_cast=true`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch details');
            const data = await response.json();
            if (data.status === 'ok') {
                renderModalContent(data.data.movie);
            } else {
                throw new Error('API returned an error for movie details');
            }
        } catch (error) {
            console.error('Modal fetch error:', error);
            modalContent.innerHTML = `<div class="p-8 text-center text-red-400">Failed to load movie details.</div>`;
        }
    }
    movieApp.showMovieDetails = showMovieDetails;

    function renderModalContent(movie) {
        const trailerHtml = movie.yt_trailer_code ? `<div class="mb-6"><h3 class="text-2xl font-semibold mb-4 text-white">Trailer</h3><div class="aspect-w-16 rounded-lg overflow-hidden"><iframe src="https://www.youtube.com/embed/${movie.yt_trailer_code}?autoplay=0&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>` : '';
        const torrentsHtml = movie.torrents.map(torrent => {
            const magnetLink = `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(movie.title_long)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://tracker.dler.org:6969/announce&tr=udp://open.stealth.si:80/announce&tr=udp://open.demonii.com:1337/announce&tr=https://tracker.moeblog.cn:443/announce&tr=udp://open.dstud.io:6969/announce&tr=udp://tracker.srv00.com:6969/announce&tr=https://tracker.zhuqiy.com:443/announce&tr=https://tracker.pmman.tech:443/announce`;
            return `<a href="${magnetLink}" target="_blank" class="block sm:inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 mr-2 mb-2">${torrent.quality} <span class="font-normal text-indigo-200">(${torrent.type})</span> - ${torrent.size}</a>`;
        }).join('');
        
        const subtitleSearchLink = `https://yifysubtitles.ch/movie-imdb/${movie.imdb_code}`;
        
        const castHtml = movie.cast ? movie.cast.map(actor => `<div class="text-center"><img src="${actor.url_small_image}" alt="${actor.name}" class="w-24 h-24 rounded-full mx-auto object-cover mb-2 border-2 border-gray-600" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/96x96/4b5563/ffffff?text=${actor.name.charAt(0)}';"><p class="font-semibold">${actor.name}</p><p class="text-sm text-gray-400">${actor.character_name}</p></div>`).join('') : '<p>Not available.</p>';
        
        modalContent.innerHTML = `
            <button onclick="movieApp.closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            <div class="p-6 md:p-8"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-1">
                    <img src="${movie.large_cover_image}" alt="${movie.title}" class="rounded-lg shadow-lg w-full mb-6" referrerpolicy="no-referrer" onerror="movieApp.handleImageError(this, '${movie.imdb_code}')">
                    <h3 class="text-xl font-semibold mb-3 text-white">Downloads</h3><div class="flex flex-wrap items-center mb-4">${torrentsHtml}</div>
                    <h3 class="text-xl font-semibold mb-3 text-white">Subtitles</h3><a href="${subtitleSearchLink}" target="_blank" class="inline-block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200">Search for Subtitles</a>
                </div>
                <div class="lg:col-span-2">
                    <h2 class="text-3xl lg:text-4xl font-bold text-white mb-2">${movie.title_long}</h2>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-gray-300">
                        <span class="flex items-center"><svg class="w-5 h-5 text-yellow-400 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg> ${movie.rating} / 10</span>
                        <span class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" /></svg> ${movie.like_count} Likes</span>
                        <span>${movie.runtime} min</span><span class="border border-gray-500 px-2 py-0.5 rounded">${movie.mpa_rating || 'N/A'}</span>
                    </div>
                    <div class="flex flex-wrap gap-2 mb-6">${movie.genres.map(g => `<span class="bg-gray-700 text-gray-200 text-sm font-medium px-3 py-1 rounded-full">${g}</span>`).join('')}</div>
                    ${trailerHtml}
                    <h3 class="text-2xl font-semibold mb-2 text-white">Plot Summary</h3><p class="text-gray-300 mb-6">${movie.description_full}</p>
                    <p class="text-sm text-gray-500 mb-6">Note: Director information is not provided by the YTS API.</p>
                    <h3 class="text-2xl font-semibold mb-4 text-white">Cast</h3><div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">${castHtml}</div>
                </div>
            </div></div>
        `;
    }
    
    async function handleImageError(img, imdbId) {
        if (img.dataset.triedFallback) return; 
        img.dataset.triedFallback = 'true';
        
        if (!imdbId || imdbId === '0' || imdbId === '') {
             img.src = 'https://placehold.co/300x450/e5e7eb/9ca3af?text=No+Image';
             return;
        }

        try {
            const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.movie_results && data.movie_results.length > 0 && data.movie_results[0].poster_path) {
                img.src = `https://image.tmdb.org/t/p/w500${data.movie_results[0].poster_path}`;
            } else if (data.tv_results && data.tv_results.length > 0 && data.tv_results[0].poster_path) {
                img.src = `https://image.tmdb.org/t/p/w500${data.tv_results[0].poster_path}`;
            } else {
                img.src = 'https://placehold.co/300x450/e5e7eb/9ca3af?text=No+Image';
            }
        } catch (error) {
            console.error('TMDB Image Fallback error:', error);
            img.src = 'https://placehold.co/300x450/e5e7eb/9ca3af?text=No+Image';
        }
    }
    movieApp.handleImageError = handleImageError;

    function closeModal() {
        modalContent.classList.remove('modal-enter-active');
        modalContent.classList.add('modal-leave-active');
        setTimeout(() => {
            movieModal.classList.add('hidden', 'opacity-0');
            modalContent.classList.remove('modal-leave-active');
        }, 300);
    }
    movieApp.closeModal = closeModal;

    function handleYTSSearch() {
        ytsCurrentQuery = searchInput.value.trim();
        ytsCurrentQuality = qualityFilter.value;
        ytsCurrentGenre = genreFilter.value;
        ytsCurrentSortBy = sortBy.value;
        ytsCurrentLimit = limitFilter.value;
        fetchYTSMovies(1); 
    }

    // --- TMDB Functions ---
    async function fetchTMDBMovies(type = 'popular') {
        const baseUrl = 'https://api.themoviedb.org/3';
        let endpoint = '';
        tmdbCurrentApiType = type;

        switch (type) {
            case 'now_playing': endpoint = '/movie/now_playing'; break;
            case 'tv': endpoint = '/tv/popular'; break;
            default: endpoint = '/movie/popular'; break;
        }
        
        tmdbContent.innerHTML = '<p class="col-span-full text-center text-lg text-gray-500">Loading from TMDB...</p>';
        let allResults = [];
        for (let page = 1; page <= 5; page++) {
            try {
                const response = await fetch(`${baseUrl}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
                const data = await response.json();
                allResults = allResults.concat(data.results);
                if (allResults.length >= 100) break;
            } catch (error) {
                console.error('Error fetching TMDB movies:', error);
                tmdbContent.innerHTML = '<p class="col-span-full text-center text-red-500">Error loading movies from TMDB.</p>';
                return;
            }
        }

        tmdbCurrentMovieData = allResults.slice(0, 100);
        filterTMDBMoviesByYear();
    }

    function displayTMDBMovies(data) {
        tmdbContent.innerHTML = '';
        if (data.length === 0) {
            tmdbContent.innerHTML = '<p class="col-span-full text-center text-gray-400">No items found for the selected year.</p>';
            return;
        }
        data.forEach(item => {
            const title = item.title || item.name;
            const releaseDate = item.release_date || item.first_air_date || 'N/A';
            const isTvShow = tmdbCurrentApiType === 'tv' || !!item.name;

            const cardAction = isTvShow ? `
                const tvLink = document.querySelector('[data-target="tv-series"]');
                if (tvLink) tvLink.click();
                if (window.seriesApp && window.seriesApp.selectTMDBShow) {
                    window.seriesApp.selectTMDBShow(${item.id});
                }
            ` : `
                document.getElementById('searchInput').value = '${title.replace(/'/g, "\\'")}';
                document.getElementById('searchButton').click();
                document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
            `;

            const btnText = isTvShow ? 'Find EZTV Torrents' : 'Search on YTS';
            const btnColor = isTvShow ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700';

            const card = `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.02]" onclick="${cardAction}">
                    <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${title}" class="w-full h-auto object-cover" onerror="this.onerror=null;this.src='https://placehold.co/500x750/e5e7eb/9ca3af?text=No+Image';">
                    <div class="p-4 flex flex-col flex-grow text-gray-800">
                        <h3 class="font-bold text-lg truncate">${title}</h3>
                        <p class="text-sm text-gray-500">Release: ${releaseDate}</p>
                        <p class="text-sm text-gray-500 mb-3">Rating: ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}/10</p>
                        <button class="mt-auto w-full text-center ${btnColor} text-white font-semibold py-2 px-3 rounded-md transition-colors duration-200 text-sm">${btnText}</button>
                    </div>
                </div>
            `;
            tmdbContent.insertAdjacentHTML('beforeend', card);
        });
    }

    function filterTMDBMoviesByYear() {
        const selectedYear = tmdbYearSelect.value;
        if (selectedYear) {
            const filteredData = tmdbCurrentMovieData.filter(item => {
                const releaseDate = item.release_date || item.first_air_date;
                return releaseDate && releaseDate.startsWith(selectedYear);
            });
            displayTMDBMovies(filteredData);
        } else {
            displayTMDBMovies(tmdbCurrentMovieData);
        }
    }
    
    function populateYearSelector() {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1950; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            tmdbYearSelect.appendChild(option);
        }
    }

    // --- Event Listeners ---
    searchButton.addEventListener('click', handleYTSSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') handleYTSSearch();
    });
    movieModal.addEventListener('click', (event) => {
        if (event.target === movieModal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !movieModal.classList.contains('hidden')) closeModal();
    });

    tmdbButtons.forEach(button => {
        button.addEventListener('click', () => {
            tmdbButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchTMDBMovies(button.dataset.type);
        });
    });
    tmdbYearSelect.addEventListener('change', filterTMDBMoviesByYear);

    // --- Initial Load ---
    fetchYTSMovies();
    populateYearSelector();
    fetchTMDBMovies(tmdbCurrentApiType);
};
