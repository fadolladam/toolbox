window.initSeries = function() {
    window.seriesApp = {};

    // --- DOM Elements & State ---
    const tvSearchInput = document.getElementById('tvSearchInput');
    const tvSearchButton = document.getElementById('tvSearchButton');
    const tvLimitFilter = document.getElementById('tvLimitFilter');
    const eztvGrid = document.getElementById('eztvGrid');
    const eztvLoader = document.getElementById('eztvLoader');
    const eztvErrorMessage = document.getElementById('eztvErrorMessage');
    const eztvNoResultsMessage = document.getElementById('eztvNoResultsMessage');
    const eztvPagination = document.getElementById('eztvPagination');
    const currentShowBanner = document.getElementById('currentShowBanner');
    
    const tvModal = document.getElementById('tvModal');
    const tvModalContent = document.getElementById('tvModalContent');

    const tmdbTvContent = document.getElementById('tmdb-tv-content');
    const tmdbTvButtons = document.querySelectorAll('.tmdb-tv-btn');
    const tmdbTvYearSelect = document.getElementById('tmdbTvYearSelect');

    const EZTV_API_BASE_URL = 'https://eztvx.to/api/get-torrents';
    const TMDB_API_KEY = '91db3cd652f82bf70319270e3edd4e5d';

    let eztvCurrentPage = 1;
    let eztvCurrentLimit = 20;
    let eztvCurrentImdbId = '';
    let tmdbTvCurrentData = [];

    // Poster cache to optimize network calls
    const posterCache = {};

    // --- Helpers ---
    function formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0 || bytes === "0") return 'N/A';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function formatDate(unixTimestamp) {
        if (!unixTimestamp) return 'N/A';
        const date = new Date(unixTimestamp * 1000);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function cleanImdbId(rawId) {
        if (!rawId) return '';
        let digits = rawId.toString().trim().replace(/^tt/i, '');
        if (!digits || digits === '0') return '';
        // IMDb standard requires 7-digit IDs (e.g. 0098844 for Law & Order). EZTV matches exact 7-digit padded IDs.
        if (digits.length < 7) {
            digits = digits.padStart(7, '0');
        }
        return digits;
    }

    function extractShowTitle(t) {
        if (!t) return 'TV Release';
        const match = t.match(/^(.*?)(?:[\s\.]s\d+e\d+|[\s\.]\d{1,2}x\d{1,2})/i);
        if (match) return match[1].replace(/\./g, ' ').trim();
        return t.replace(/\./g, ' ').replace(/\[.*?\]/g, '').trim();
    }

    function detectQuality(item) {
        const str = ((item.title || '') + ' ' + (item.filename || '')).toLowerCase();
        if (str.includes('2160p') || str.includes('4k')) return '2160p';
        if (str.includes('1080p')) return '1080p';
        if (str.includes('720p')) return '720p';
        if (str.includes('480p')) return '480p';
        if (str.includes('hevc') || str.includes('x265')) return 'HEVC';
        return 'SD';
    }

    async function getPosterForImdbId(rawImdbId, fallbackScreenshot) {
        const cleanId = cleanImdbId(rawImdbId);
        
        if (!cleanId) {
            if (fallbackScreenshot) {
                return fallbackScreenshot.startsWith('//') ? 'https:' + fallbackScreenshot : fallbackScreenshot;
            }
            return 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';
        }

        if (posterCache[cleanId]) {
            return posterCache[cleanId];
        }

        try {
            const res = await fetch(`https://api.themoviedb.org/3/find/tt${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
            const data = await res.json();
            if (data.tv_results && data.tv_results.length > 0 && data.tv_results[0].poster_path) {
                const url = `https://image.tmdb.org/t/p/w500${data.tv_results[0].poster_path}`;
                posterCache[cleanId] = url;
                return url;
            } else if (data.movie_results && data.movie_results.length > 0 && data.movie_results[0].poster_path) {
                const url = `https://image.tmdb.org/t/p/w500${data.movie_results[0].poster_path}`;
                posterCache[cleanId] = url;
                return url;
            }
        } catch (e) {
            console.warn('Poster fetch error:', e);
        }

        if (fallbackScreenshot) {
            const src = fallbackScreenshot.startsWith('//') ? 'https:' + fallbackScreenshot : fallbackScreenshot;
            posterCache[cleanId] = src;
            return src;
        }

        const placeholder = 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';
        posterCache[cleanId] = placeholder;
        return placeholder;
    }

    // --- EZTV API Functions ---
    async function fetchEZTVTorrents(page = 1, imdbId = '') {
        if (eztvLoader) eztvLoader.classList.remove('hidden');
        if (eztvErrorMessage) eztvErrorMessage.classList.add('hidden');
        if (eztvNoResultsMessage) eztvNoResultsMessage.classList.add('hidden');
        if (eztvGrid) eztvGrid.innerHTML = '';
        if (eztvPagination) eztvPagination.innerHTML = '';
        
        eztvCurrentPage = page;
        eztvCurrentImdbId = cleanImdbId(imdbId);

        const params = new URLSearchParams({
            limit: eztvCurrentLimit,
            page: eztvCurrentPage
        });

        if (eztvCurrentImdbId) {
            params.append('imdb_id', eztvCurrentImdbId);
        }

        const url = `${EZTV_API_BASE_URL}?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data && data.torrents && data.torrents.length > 0) {
                renderEZTVTorrents(data.torrents);
                renderEZTVPagination(data.torrents_count || 1000, data.limit || eztvCurrentLimit);
            } else {
                if (eztvNoResultsMessage) eztvNoResultsMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('EZTV Fetch error:', error);
            if (eztvErrorMessage) eztvErrorMessage.classList.remove('hidden');
        } finally {
            if (eztvLoader) eztvLoader.classList.add('hidden');
        }
    }

    function renderEZTVTorrents(torrents) {
        if (!eztvGrid) return;
        eztvGrid.innerHTML = '';

        // Group releases by TV Show for unified front page cards
        const showGroups = [];
        const showMap = new Map();

        torrents.forEach(item => {
            const cleanId = item.imdb_id && item.imdb_id !== '0' && item.imdb_id !== 0 ? cleanImdbId(item.imdb_id) : '';
            const showTitle = extractShowTitle(item.title || item.filename);
            const groupKey = cleanId ? `imdb_${cleanId}` : `title_${showTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

            if (!showMap.has(groupKey)) {
                const group = {
                    key: groupKey,
                    imdb_id: cleanId,
                    title: showTitle,
                    torrents: [item],
                    latestSeason: item.season ? parseInt(item.season) : 0,
                    latestEpisode: item.episode ? parseInt(item.episode) : 0,
                    qualities: new Set(),
                    screenshot: item.large_screenshot || item.small_screenshot || ''
                };
                showMap.set(groupKey, group);
                showGroups.push(group);
            } else {
                const group = showMap.get(groupKey);
                group.torrents.push(item);
                const s = item.season ? parseInt(item.season) : 0;
                const e = item.episode ? parseInt(item.episode) : 0;
                if (s > group.latestSeason || (s === group.latestSeason && e > group.latestEpisode)) {
                    group.latestSeason = s;
                    group.latestEpisode = e;
                }
            }

            const q = detectQuality(item);
            showMap.get(groupKey).qualities.add(q);
        });

        showGroups.forEach(group => {
            const latestEpStr = (group.latestSeason && group.latestEpisode) ? `S${String(group.latestSeason).padStart(2, '0')}E${String(group.latestEpisode).padStart(2, '0')}` : '';
            const qualityBadges = Array.from(group.qualities).map(q => `<span class="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">${q}</span>`).join(' ');
            const countStr = `${group.torrents.length} ${group.torrents.length === 1 ? 'Release' : 'Releases'}`;
            const cardId = `group-poster-${group.key.replace(/[^a-zA-Z0-9_-]/g, '')}`;

            const clickAction = group.imdb_id ? `seriesApp.showTVShowDetails('${group.imdb_id}')` : `seriesApp.searchShowByTitle('${group.title.replace(/'/g, "\\'")}')`;

            const card = `
                <div class="group bg-white rounded-lg overflow-hidden shadow-lg flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1.5 border border-gray-100 cursor-pointer" onclick="${clickAction}">
                    <div class="relative aspect-[2/3] bg-gray-900 overflow-hidden">
                        <img id="${cardId}" src="https://placehold.co/300x450/1e293b/94a3b8?text=Loading..." alt="${group.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        
                        ${latestEpStr ? `<span class="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-md shadow z-10">Latest: ${latestEpStr}</span>` : ''}

                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
                            <h3 class="font-bold text-sm leading-snug line-clamp-2 mb-1">${group.title}</h3>
                            <p class="text-xs text-indigo-200">${countStr} available</p>
                        </div>
                    </div>

                    <div class="p-3.5 flex flex-col flex-grow justify-between bg-white">
                        <div>
                            <h3 class="font-bold text-gray-800 text-base line-clamp-1 mb-1" title="${group.title}">${group.title}</h3>
                            <div class="flex flex-wrap items-center gap-1 my-2">
                                ${qualityBadges}
                            </div>
                            <p class="text-xs text-gray-500 mb-3">${countStr} grouped releases</p>
                        </div>

                        <div class="pt-2 border-t border-gray-100">
                            <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-md transition-colors text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                <i class="fas fa-list-ul"></i> Browse Qualities & Episodes
                            </button>
                        </div>
                    </div>
                </div>
            `;
            eztvGrid.insertAdjacentHTML('beforeend', card);

            getPosterForImdbId(group.imdb_id, group.screenshot).then(posterUrl => {
                const imgEl = document.getElementById(cardId);
                if (imgEl) imgEl.src = posterUrl;
            });
        });
    }

    function searchShowByTitle(title) {
        if (tvSearchInput) tvSearchInput.value = title;
        handleTVSearch();
    }
    seriesApp.searchShowByTitle = searchShowByTitle;

    function renderEZTVPagination(totalTorrents, limit) {
        if (!eztvPagination) return;
        eztvPagination.innerHTML = '';
        const maxPages = 100; // EZTV API caps page parameter between 1 and 100
        const totalPages = Math.min(Math.ceil(totalTorrents / limit), maxPages);
        if (totalPages <= 1) return;

        const createBtn = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = 'px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-indigo-600 hover:text-white disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors text-sm font-medium';
            btn.disabled = disabled;
            btn.onclick = () => {
                fetchEZTVTorrents(page, eztvCurrentImdbId);
                const section = document.getElementById('tv-series');
                if (section) section.scrollIntoView({ behavior: 'smooth' });
            };
            return btn;
        };

        eztvPagination.appendChild(createBtn('&laquo; Prev', eztvCurrentPage - 1, eztvCurrentPage === 1));
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${eztvCurrentPage} of ${totalPages}`;
        pageInfo.className = 'px-4 py-2 text-gray-600 text-sm font-medium';
        eztvPagination.appendChild(pageInfo);

        eztvPagination.appendChild(createBtn('Next &raquo;', eztvCurrentPage + 1, eztvCurrentPage >= totalPages));
    }

    // --- Search Handler using TMDB /find and /search/tv ---
    async function handleTVSearch() {
        const query = tvSearchInput ? tvSearchInput.value.trim() : '';
        eztvCurrentLimit = tvLimitFilter ? (parseInt(tvLimitFilter.value) || 20) : 20;

        if (!query) {
            if (currentShowBanner) {
                currentShowBanner.classList.add('hidden');
                currentShowBanner.innerHTML = '';
            }
            fetchEZTVTorrents(1, '');
            return;
        }

        if (eztvLoader) eztvLoader.classList.remove('hidden');
        if (eztvErrorMessage) eztvErrorMessage.classList.add('hidden');
        if (eztvNoResultsMessage) eztvNoResultsMessage.classList.add('hidden');
        if (eztvGrid) eztvGrid.innerHTML = '';

        // Check if query is an IMDb ID (e.g. tt6048596 or 6048596)
        if (/^(tt)?\d+$/i.test(query)) {
            const cleanId = cleanImdbId(query);
            try {
                const findUrl = `https://api.themoviedb.org/3/find/tt${cleanId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
                const findRes = await fetch(findUrl);
                const findData = await findRes.json();
                
                let show = null;
                if (findData.tv_results && findData.tv_results.length > 0) {
                    show = findData.tv_results[0];
                }

                if (currentShowBanner) {
                    currentShowBanner.classList.remove('hidden');
                    if (show) {
                        currentShowBanner.innerHTML = `
                            <div class="p-4 bg-indigo-900 text-white rounded-xl shadow-md flex items-center gap-4">
                                <img src="${show.poster_path ? 'https://image.tmdb.org/t/p/w185' + show.poster_path : 'https://placehold.co/80x120?text=No+Image'}" alt="${show.name}" class="w-16 h-24 object-cover rounded-lg shadow">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <h3 class="text-xl font-bold">${show.name} <span class="text-sm font-normal text-indigo-200">(${show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'})</span></h3>
                                        <span class="text-xs bg-indigo-700 text-indigo-200 px-2 py-0.5 rounded font-mono">IMDb: tt${cleanId}</span>
                                    </div>
                                    <p class="text-xs text-indigo-200 line-clamp-2 mt-1">${show.overview || 'No overview available.'}</p>
                                    <div class="mt-2 flex items-center gap-3 text-xs">
                                        <span class="text-yellow-400 font-semibold"><i class="fas fa-star mr-1"></i>${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</span>
                                        <button onclick="seriesApp.showTVShowDetails('${cleanId}')" class="text-indigo-300 hover:text-white underline"><i class="fas fa-list-ul mr-1"></i> View Seasons & Episodes</button>
                                    </div>
                                </div>
                                <button onclick="seriesApp.clearShowFilter()" class="bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                    <i class="fas fa-times mr-1"></i> Clear Filter
                                </button>
                            </div>
                        `;
                    } else {
                        currentShowBanner.innerHTML = `<div class="p-4 bg-indigo-50 border-l-4 border-indigo-500 text-indigo-900 rounded-r-lg flex items-center justify-between"><div><span class="font-bold">IMDb ID Lookup:</span> tt${cleanId}</div><button onclick="seriesApp.clearShowFilter()" class="text-xs text-indigo-700 hover:underline"><i class="fas fa-times mr-1"></i> Clear Filter</button></div>`;
                    }
                }
            } catch (e) {
                console.warn('TMDB /find failed for IMDb ID:', e);
            }
            fetchEZTVTorrents(1, cleanId);
            return;
        }

        // Otherwise, search show title via TMDB /search/tv
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const show = data.results[0];
                const extResponse = await fetch(`https://api.themoviedb.org/3/tv/${show.id}/external_ids?api_key=${TMDB_API_KEY}`);
                const extData = await extResponse.json();

                if (extData && extData.imdb_id) {
                    const cleanId = cleanImdbId(extData.imdb_id);

                    let altMatchesHtml = '';
                    if (data.results.length > 1) {
                        const altShows = data.results.slice(1, 5);
                        altMatchesHtml = `
                            <div class="mt-3 pt-3 border-t border-indigo-800 flex items-center gap-2 flex-wrap text-xs text-indigo-200">
                                <span class="font-semibold text-white">Other TMDB Matches:</span>
                                ${altShows.map(alt => `
                                    <button onclick="seriesApp.selectTMDBShow(${alt.id})" class="bg-indigo-800 hover:bg-indigo-700 text-indigo-100 px-2 py-1 rounded transition-colors">
                                        ${alt.name} (${alt.first_air_date ? alt.first_air_date.split('-')[0] : 'N/A'})
                                    </button>
                                `).join('')}
                            </div>
                        `;
                    }

                    if (currentShowBanner) {
                        currentShowBanner.classList.remove('hidden');
                        currentShowBanner.innerHTML = `
                            <div class="p-4 bg-indigo-900 text-white rounded-xl shadow-md flex flex-col gap-3">
                                <div class="flex items-center gap-4">
                                    <img src="${show.poster_path ? 'https://image.tmdb.org/t/p/w185' + show.poster_path : 'https://placehold.co/80x120?text=No+Image'}" alt="${show.name}" class="w-16 h-24 object-cover rounded-lg shadow">
                                    <div class="flex-1">
                                        <h3 class="text-xl font-bold">${show.name} <span class="text-sm font-normal text-indigo-200">(${show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'})</span></h3>
                                        <p class="text-xs text-indigo-200 line-clamp-2 mt-1">${show.overview || 'No overview available.'}</p>
                                        <div class="mt-2 flex items-center gap-3 text-xs">
                                            <span class="bg-indigo-700 px-2 py-0.5 rounded font-mono">IMDb: tt${cleanId}</span>
                                            <span class="text-yellow-400 font-semibold"><i class="fas fa-star mr-1"></i>${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</span>
                                            <button onclick="seriesApp.showTVShowDetails('${cleanId}')" class="text-indigo-300 hover:text-white underline"><i class="fas fa-list-ul mr-1"></i> View Seasons & Episodes</button>
                                        </div>
                                    </div>
                                    <button onclick="seriesApp.clearShowFilter()" class="bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                        <i class="fas fa-times mr-1"></i> Clear Filter
                                    </button>
                                </div>
                                ${altMatchesHtml}
                            </div>
                        `;
                    }
                    fetchEZTVTorrents(1, cleanId);
                } else {
                    if (currentShowBanner) currentShowBanner.classList.add('hidden');
                    if (eztvNoResultsMessage) eztvNoResultsMessage.classList.remove('hidden');
                    if (eztvLoader) eztvLoader.classList.add('hidden');
                }
            } else {
                if (currentShowBanner) currentShowBanner.classList.add('hidden');
                if (eztvNoResultsMessage) eztvNoResultsMessage.classList.remove('hidden');
                if (eztvLoader) eztvLoader.classList.add('hidden');
            }
        } catch (error) {
            console.error('TMDB TV Search error:', error);
            if (eztvErrorMessage) eztvErrorMessage.classList.remove('hidden');
            if (eztvLoader) eztvLoader.classList.add('hidden');
        }
    }

    function clearShowFilter() {
        if (tvSearchInput) tvSearchInput.value = '';
        if (currentShowBanner) {
            currentShowBanner.classList.add('hidden');
            currentShowBanner.innerHTML = '';
        }
        fetchEZTVTorrents(1, '');
    }
    seriesApp.clearShowFilter = clearShowFilter;

    // --- Show Details Modal with Quality Sidebar & Season Accordions ---
    let activeModalTorrents = [];
    let activeModalQualityFilter = 'all';

    async function showTVShowDetails(rawImdbId) {
        const imdbId = cleanImdbId(rawImdbId);
        if (!imdbId) return;

        if (tvModal) {
            tvModal.classList.remove('hidden');
            setTimeout(() => tvModal.classList.remove('opacity-0'), 10);
        }
        if (tvModalContent) {
            tvModalContent.innerHTML = `<div class="p-8 text-center"><svg class="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="mt-4 text-white">Loading TV show details and torrents...</p></div>`;
            setTimeout(() => tvModalContent.classList.add('modal-enter-active'), 10);
        }

        try {
            let showMeta = null;
            try {
                const tmdbFindUrl = `https://api.themoviedb.org/3/find/tt${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
                const metaRes = await fetch(tmdbFindUrl);
                const metaData = await metaRes.json();
                if (metaData.tv_results && metaData.tv_results.length > 0) {
                    showMeta = metaData.tv_results[0];
                }
            } catch (e) {
                console.warn('TMDB meta fetch failed', e);
            }

            const eztvUrl = `${EZTV_API_BASE_URL}?imdb_id=${imdbId}&limit=100`;
            const eztvRes = await fetch(eztvUrl);
            const eztvData = await eztvRes.json();
            activeModalTorrents = eztvData.torrents || [];
            activeModalQualityFilter = 'all';

            renderTVModalContent(imdbId, showMeta);
        } catch (error) {
            console.error('Modal error:', error);
            if (tvModalContent) tvModalContent.innerHTML = `<div class="p-8 text-center text-red-400">Failed to load show details.</div>`;
        }
    }
    seriesApp.showTVShowDetails = showTVShowDetails;

    function renderTVModalContent(imdbId, showMeta) {
        if (!tvModalContent) return;
        const title = showMeta ? showMeta.name : `TV Show (tt${imdbId})`;
        const overview = showMeta ? showMeta.overview : 'No description available.';
        const posterSrc = showMeta && showMeta.poster_path ? `https://image.tmdb.org/t/p/w500${showMeta.poster_path}` : 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Image';
        const rating = showMeta && showMeta.vote_average ? showMeta.vote_average.toFixed(1) : 'N/A';
        const airDate = showMeta && showMeta.first_air_date ? showMeta.first_air_date : 'N/A';

        // Detect available qualities in activeModalTorrents
        const availableQualities = new Set(['all']);
        activeModalTorrents.forEach(t => {
            availableQualities.add(detectQuality(t));
        });

        const qualityTabsOrder = ['all', '2160p', '1080p', '720p', '480p', 'HEVC', 'SD'];
        const activeTabs = qualityTabsOrder.filter(q => availableQualities.has(q));

        const tabsHtml = activeTabs.map(q => {
            const label = q === 'all' ? 'All Qualities' : q;
            const count = q === 'all' ? activeModalTorrents.length : activeModalTorrents.filter(t => detectQuality(t) === q).length;
            const isActive = activeModalQualityFilter === q;
            return `
                <button onclick="seriesApp.filterModalQuality('${q}')" class="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}">
                    <span>${label}</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 ${isActive ? 'bg-indigo-700 text-white' : 'bg-gray-900/80 text-gray-400'} rounded-full">(${count})</span>
                </button>
            `;
        }).join('');

        tvModalContent.innerHTML = `
            <button onclick="seriesApp.closeTVModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10 p-2"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            <div class="p-6 md:p-8">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left Sidebar Column -->
                    <div class="lg:col-span-1 space-y-4">
                        <img src="${posterSrc}" alt="${title}" class="rounded-xl shadow-lg w-full object-cover">
                        
                        <!-- Metadata Box -->
                        <div class="bg-gray-900/60 p-4 rounded-xl space-y-2 text-sm text-gray-300 border border-gray-700">
                            <div><span class="text-gray-400">IMDb ID:</span> <span class="font-mono text-indigo-300">tt${imdbId}</span></div>
                            <div><span class="text-gray-400">First Aired:</span> ${airDate}</div>
                            <div><span class="text-gray-400">TMDB Rating:</span> <span class="text-yellow-400 font-bold"><i class="fas fa-star mr-1"></i>${rating} / 10</span></div>
                        </div>

                        <!-- Quality Filter Sidebar Box (Placed below Metadata) -->
                        <div class="bg-gray-900/60 p-4 rounded-xl border border-gray-700 space-y-3">
                            <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-700 pb-2">
                                <i class="fas fa-filter text-indigo-400"></i> Quality Filter
                            </h4>
                            <div class="flex flex-col gap-1.5">
                                ${tabsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Right Content Column -->
                    <div class="lg:col-span-2">
                        <h2 class="text-3xl font-bold text-white mb-3">${title}</h2>
                        <h3 class="text-xl font-semibold mb-2 text-white">Overview</h3>
                        <p class="text-gray-300 text-sm mb-6 leading-relaxed">${overview}</p>

                        <!-- Collapsible Seasons Accordions Container -->
                        <div id="modalEpisodesContainer">
                            ${renderModalEpisodesHtml()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function filterModalQuality(quality) {
        activeModalQualityFilter = quality;
        const container = document.getElementById('modalEpisodesContainer');
        if (container) {
            container.innerHTML = renderModalEpisodesHtml();
        }

        // Update active tab styles in left sidebar
        const tabs = tvModalContent.querySelectorAll('button[onclick*="filterModalQuality"]');
        tabs.forEach(btn => {
            const isTarget = btn.getAttribute('onclick').includes(`'${quality}'`);
            const spanCount = btn.querySelector('span:last-child');
            if (isTarget) {
                btn.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all bg-indigo-600 text-white shadow-md font-bold';
                if (spanCount) spanCount.className = 'text-[10px] font-mono px-2 py-0.5 bg-indigo-700 text-white rounded-full';
            } else {
                btn.className = 'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white';
                if (spanCount) spanCount.className = 'text-[10px] font-mono px-2 py-0.5 bg-gray-900/80 text-gray-400 rounded-full';
            }
        });
    }
    seriesApp.filterModalQuality = filterModalQuality;

    function renderModalEpisodesHtml() {
        const filteredTorrents = activeModalQualityFilter === 'all'
            ? activeModalTorrents
            : activeModalTorrents.filter(t => detectQuality(t) === activeModalQualityFilter);

        if (filteredTorrents.length === 0) {
            return `<p class="text-gray-400 italic bg-gray-900/40 p-4 rounded-xl">No downloads available for the selected quality filter (${activeModalQualityFilter}).</p>`;
        }

        // Group filtered torrents by season
        const seasonsMap = {};
        filteredTorrents.forEach(t => {
            const seasonNum = t.season ? parseInt(t.season) : 0;
            if (!seasonsMap[seasonNum]) seasonsMap[seasonNum] = [];
            seasonsMap[seasonNum].push(t);
        });

        const sortedSeasonKeys = Object.keys(seasonsMap).sort((a, b) => b - a);
        let torrentsHtml = '';

        sortedSeasonKeys.forEach((sKey, sIdx) => {
            const sNum = parseInt(sKey);
            const seasonLabel = sNum === 0 ? 'Specials / Other Releases' : `Season ${sNum}`;
            const sTorrents = seasonsMap[sKey];
            const seasonCollapseId = `season-collapse-${sNum}`;
            // Expand latest season by default, collapse older seasons
            const isDefaultOpen = sIdx === 0;

            // Sub-group releases inside season by Episode Number to collapse duplicate release variants!
            const episodeMap = new Map();
            sTorrents.forEach(t => {
                const epNum = t.episode ? parseInt(t.episode) : 0;
                const epKey = epNum > 0 ? `E${String(epNum).padStart(2, '0')}` : 'Other';
                if (!episodeMap.has(epKey)) {
                    episodeMap.set(epKey, [t]);
                } else {
                    episodeMap.get(epKey).push(t);
                }
            });

            const episodeKeys = Array.from(episodeMap.keys()).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return parseInt(b.replace('E', '')) - parseInt(a.replace('E', ''));
            });

            let epCardsHtml = '';
            episodeKeys.forEach(epKey => {
                const epReleases = episodeMap.get(epKey);
                epReleases.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));

                const primary = epReleases[0];
                const altCount = epReleases.length - 1;
                const torrentFileUrl = `torrent_proxy.php?hash=${primary.hash}`;
                const qTag = detectQuality(primary);
                const collapseId = `ep-collapse-${sNum}-${epKey}`;

                let altRowsHtml = '';
                if (altCount > 0) {
                    altRowsHtml = epReleases.slice(1).map(alt => {
                        const altProxyUrl = `torrent_proxy.php?hash=${alt.hash}`;
                        const altQ = detectQuality(alt);
                        return `
                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-gray-800/80 hover:bg-gray-800 rounded-md text-xs border-l-2 border-indigo-500 gap-2">
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-gray-200 truncate" title="${alt.title || alt.filename}">${alt.title || alt.filename}</div>
                                    <div class="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                                        <span class="bg-gray-700 text-indigo-300 font-bold px-1.5 py-0.5 rounded text-[10px]">${altQ}</span>
                                        <span class="text-green-400"><i class="fas fa-arrow-up mr-1"></i>${alt.seeds}</span>
                                        <span class="text-blue-400"><i class="fas fa-arrow-down mr-1"></i>${alt.peers}</span>
                                        <span>${formatBytes(alt.size_bytes)}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <a href="${alt.magnet_url}" class="bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded transition-colors flex items-center gap-1">
                                        <i class="fas fa-magnet"></i> Magnet
                                    </a>
                                    <a href="${altProxyUrl}" download="${alt.title || alt.filename}.torrent" class="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded transition-colors flex items-center gap-1">
                                        <i class="fas fa-file-download"></i> .torrent
                                    </a>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                epCardsHtml += `
                    <div class="bg-gray-700/60 rounded-lg p-3 space-y-2 border border-gray-600/50">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="bg-indigo-900/90 text-indigo-200 font-bold text-xs px-2.5 py-0.5 rounded-md shadow">${epKey !== 'Other' ? epKey : 'Special'}</span>
                                    <h5 class="font-bold text-sm text-white truncate" title="${primary.title || primary.filename}">${primary.title || primary.filename}</h5>
                                </div>
                                <div class="flex items-center gap-3 text-xs text-gray-300 mt-1.5">
                                    <span class="bg-gray-800 text-indigo-300 font-bold px-2 py-0.5 rounded text-[10px]">${qTag}</span>
                                    <span class="text-green-400 font-semibold"><i class="fas fa-arrow-up mr-1"></i>${primary.seeds} seeds</span>
                                    <span class="text-blue-400 font-semibold"><i class="fas fa-arrow-down mr-1"></i>${primary.peers} peers</span>
                                    <span class="font-mono text-gray-300">${formatBytes(primary.size_bytes)}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                <a href="${primary.magnet_url}" class="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5 shadow-sm">
                                    <i class="fas fa-magnet"></i> Magnet
                                </a>
                                <a href="${torrentFileUrl}" download="${primary.title || primary.filename}.torrent" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5 shadow-sm">
                                    <i class="fas fa-file-download"></i> .torrent
                                </a>
                            </div>
                        </div>

                        ${altCount > 0 ? `
                            <div class="pt-1">
                                <button onclick="seriesApp.toggleEpisodeCollapse('${collapseId}')" class="text-xs text-indigo-300 hover:text-indigo-100 font-medium flex items-center gap-1 focus:outline-none">
                                    <i class="fas fa-chevron-down text-[10px] transition-transform" id="icon-${collapseId}"></i>
                                    <span>${altCount} alternative ${altCount === 1 ? 'file size / format' : 'file sizes / formats'}</span>
                                </button>
                                <div id="${collapseId}" class="hidden space-y-1.5 mt-2 pl-2 border-l border-gray-600">
                                    ${altRowsHtml}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            torrentsHtml += `
                <div class="mb-4 bg-gray-900/60 rounded-xl overflow-hidden border border-gray-700">
                    <button onclick="seriesApp.toggleSeasonCollapse('${seasonCollapseId}')" class="w-full p-4 flex items-center justify-between bg-indigo-950/60 hover:bg-indigo-900/80 transition-colors text-left focus:outline-none">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-layer-group text-indigo-400 text-base"></i>
                            <h4 class="text-lg font-bold text-white">${seasonLabel}</h4>
                            <span class="text-xs bg-indigo-900/80 text-indigo-200 px-2.5 py-0.5 rounded-full font-medium border border-indigo-700/50">${episodeKeys.length} ${episodeKeys.length === 1 ? 'episode' : 'episodes'} (${sTorrents.length} releases)</span>
                        </div>
                        <i class="fas fa-chevron-down text-indigo-300 transition-transform duration-300 ${isDefaultOpen ? 'rotate-180' : ''}" id="icon-${seasonCollapseId}"></i>
                    </button>
                    <div id="${seasonCollapseId}" class="${isDefaultOpen ? '' : 'hidden'} p-4 space-y-3 bg-gray-800/40 border-t border-gray-700/50">
                        ${epCardsHtml}
                    </div>
                </div>
            `;
        });

        return torrentsHtml;
    }

    function toggleSeasonCollapse(seasonCollapseId) {
        const el = document.getElementById(seasonCollapseId);
        const icon = document.getElementById(`icon-${seasonCollapseId}`);
        if (el) {
            if (el.classList.contains('hidden')) {
                el.classList.remove('hidden');
                if (icon) icon.classList.add('rotate-180');
            } else {
                el.classList.add('hidden');
                if (icon) icon.classList.remove('rotate-180');
            }
        }
    }
    seriesApp.toggleSeasonCollapse = toggleSeasonCollapse;

    function toggleEpisodeCollapse(collapseId) {
        const el = document.getElementById(collapseId);
        const icon = document.getElementById(`icon-${collapseId}`);
        if (el) {
            if (el.classList.contains('hidden')) {
                el.classList.remove('hidden');
                if (icon) icon.classList.add('rotate-180');
            } else {
                el.classList.add('hidden');
                if (icon) icon.classList.remove('rotate-180');
            }
        }
    }
    seriesApp.toggleEpisodeCollapse = toggleEpisodeCollapse;

    function closeTVModal() {
        if (!tvModalContent || !tvModal) return;
        tvModalContent.classList.remove('modal-enter-active');
        tvModalContent.classList.add('modal-leave-active');
        tvModal.classList.add('opacity-0');
        setTimeout(() => {
            tvModal.classList.add('hidden');
            tvModalContent.classList.remove('modal-leave-active');
        }, 300);
    }
    seriesApp.closeTVModal = closeTVModal;

    // --- TMDB TV Functions ---
    async function fetchTMDBTvShows(type = 'popular') {
        const baseUrl = 'https://api.themoviedb.org/3';
        let endpoint = '/tv/popular';
        if (type === 'top_rated') endpoint = '/tv/top_rated';
        if (type === 'on_the_air') endpoint = '/tv/on_the_air';

        if (tmdbTvContent) tmdbTvContent.innerHTML = '<p class="col-span-full text-center text-lg text-gray-500 py-6">Loading TV Shows from TMDB...</p>';

        try {
            const response = await fetch(`${baseUrl}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
            const data = await response.json();
            tmdbTvCurrentData = data.results || [];
            filterTMDBTvByYear();
        } catch (error) {
            console.error('Error fetching TMDB TV shows:', error);
            if (tmdbTvContent) tmdbTvContent.innerHTML = '<p class="col-span-full text-center text-red-500 py-6">Error loading TV shows from TMDB.</p>';
        }
    }

    function displayTMDBTvShows(shows) {
        if (!tmdbTvContent) return;
        tmdbTvContent.innerHTML = '';
        if (shows.length === 0) {
            tmdbTvContent.innerHTML = '<p class="col-span-full text-center text-gray-400 py-6">No shows found for the selected year.</p>';
            return;
        }

        shows.forEach(show => {
            const title = show.name;
            const airDate = show.first_air_date || 'N/A';
            const rating = show.vote_average ? show.vote_average.toFixed(1) : 'N/A';
            const posterSrc = show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : 'https://placehold.co/500x750/e5e7eb/9ca3af?text=No+Image';

            const card = `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.02] border border-gray-100" onclick="seriesApp.selectTMDBShow(${show.id})">
                    <img src="${posterSrc}" alt="${title}" class="w-full h-auto object-cover">
                    <div class="p-4 flex flex-col flex-grow text-gray-800">
                        <h3 class="font-bold text-lg truncate mb-1">${title}</h3>
                        <p class="text-sm text-gray-500">First Air: ${airDate}</p>
                        <p class="text-sm text-gray-500 mb-3">Rating: ${rating}/10</p>
                        <button class="mt-auto w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-1.5">
                            <i class="fas fa-search"></i> Find EZTV Torrents
                        </button>
                    </div>
                </div>
            `;
            tmdbTvContent.insertAdjacentHTML('beforeend', card);
        });
    }

    async function selectTMDBShow(tmdbId) {
        if (eztvLoader) eztvLoader.classList.remove('hidden');
        if (eztvErrorMessage) eztvErrorMessage.classList.add('hidden');
        if (eztvNoResultsMessage) eztvNoResultsMessage.classList.add('hidden');
        if (eztvGrid) eztvGrid.innerHTML = '';

        try {
            const [showRes, extRes] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`),
                fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`)
            ]);
            const show = await showRes.json();
            const extData = await extRes.json();

            if (extData && extData.imdb_id) {
                const cleanId = cleanImdbId(extData.imdb_id);
                if (tvSearchInput) tvSearchInput.value = show.name || '';
                if (currentShowBanner) {
                    currentShowBanner.classList.remove('hidden');
                    currentShowBanner.innerHTML = `
                        <div class="p-4 bg-indigo-900 text-white rounded-xl shadow-md flex items-center gap-4">
                            <img src="${show.poster_path ? 'https://image.tmdb.org/t/p/w185' + show.poster_path : 'https://placehold.co/80x120?text=No+Image'}" alt="${show.name}" class="w-16 h-24 object-cover rounded-lg shadow">
                            <div class="flex-1">
                                <h3 class="text-xl font-bold">${show.name} <span class="text-sm font-normal text-indigo-200">(${show.first_air_date ? show.first_air_date.split('-')[0] : 'N/A'})</span></h3>
                                <p class="text-xs text-indigo-200 line-clamp-2 mt-1">${show.overview || 'No overview available.'}</p>
                                <div class="mt-2 flex items-center gap-3 text-xs">
                                    <span class="bg-indigo-700 px-2 py-0.5 rounded font-mono">IMDb: tt${cleanId}</span>
                                    <span class="text-yellow-400 font-semibold"><i class="fas fa-star mr-1"></i>${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}</span>
                                    <button onclick="seriesApp.showTVShowDetails('${cleanId}')" class="text-indigo-300 hover:text-white underline"><i class="fas fa-list-ul mr-1"></i> View Seasons & Episodes</button>
                                </div>
                            </div>
                            <button onclick="seriesApp.clearShowFilter()" class="bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                <i class="fas fa-times mr-1"></i> Clear Filter
                            </button>
                        </div>
                    `;
                }
                fetchEZTVTorrents(1, cleanId);
            } else {
                if (tvSearchInput) tvSearchInput.value = show.name || '';
                if (currentShowBanner) currentShowBanner.classList.add('hidden');
                if (eztvNoResultsMessage) eztvNoResultsMessage.classList.remove('hidden');
                if (eztvLoader) eztvLoader.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error selecting TMDB show:', error);
            if (eztvErrorMessage) eztvErrorMessage.classList.remove('hidden');
            if (eztvLoader) eztvLoader.classList.add('hidden');
        }

        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    seriesApp.selectTMDBShow = selectTMDBShow;

    function filterTMDBTvByYear() {
        if (!tmdbTvYearSelect) return;
        const selectedYear = tmdbTvYearSelect.value;
        if (selectedYear) {
            const filtered = tmdbTvCurrentData.filter(show => show.first_air_date && show.first_air_date.startsWith(selectedYear));
            displayTMDBTvShows(filtered);
        } else {
            displayTMDBTvShows(tmdbTvCurrentData);
        }
    }

    function populateTvYearSelector() {
        if (!tmdbTvYearSelect) return;
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 1950; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            tmdbTvYearSelect.appendChild(option);
        }
    }

    // --- Event Listeners ---
    if (tvSearchButton) tvSearchButton.addEventListener('click', handleTVSearch);
    if (tvSearchInput) {
        tvSearchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') handleTVSearch();
        });
    }

    if (tvModal) {
        tvModal.addEventListener('click', (event) => {
            if (event.target === tvModal) closeTVModal();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && tvModal && !tvModal.classList.contains('hidden')) closeTVModal();
    });

    tmdbTvButtons.forEach(button => {
        button.addEventListener('click', () => {
            tmdbTvButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchTMDBTvShows(button.dataset.type);
        });
    });
    if (tmdbTvYearSelect) tmdbTvYearSelect.addEventListener('change', filterTMDBTvByYear);

    // --- Initial Load ---
    fetchEZTVTorrents(1, '');
    populateTvYearSelector();
    fetchTMDBTvShows('popular');
};
