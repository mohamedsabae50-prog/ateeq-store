export const initAppEvents = function() {
    document.addEventListener('DOMContentLoaded', () => {
        window.activeFilters = window.activeFilters || { category: 'all', size: 'all', color: 'all', fit: 'all' };
        window.currentSort = window.currentSort || 'default';
        if (typeof window.updateCartUI === 'function') window.updateCartUI();
        async function checkUserStatus() {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    window.isLoggedIn = true; window.currentUser = session.user;
                    const authBtn = document.getElementById('nav-auth-btn');
                    const profileBtn = document.getElementById('nav-profile-btn');
                    if(authBtn) authBtn.style.display = 'none';
                    if(profileBtn) { profileBtn.classList.remove('hidden'); profileBtn.style.display = 'block'; }
                }
            } catch (error) {}
        }
        checkUserStatus();
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash){ splash.classList.add('slide-up'); setTimeout(() => splash.style.display = 'none', 1200); }
        }, 1000);
        if (typeof window.loadShopProducts === 'function') window.loadShopProducts();
        const sortSelect = document.getElementById('sort-select');
        if(sortSelect) { sortSelect.addEventListener('change', function() { window.currentSort = this.value; if(typeof window.applyFilters === 'function') window.applyFilters(); }); }
        document.querySelectorAll('.filter-category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                document.querySelectorAll('.filter-category-checkbox').forEach(cb => cb.checked = false);
                this.checked = true; window.activeFilters.category = this.value; if(typeof window.applyFilters === 'function') window.applyFilters();
            });
        });
        document.querySelectorAll('.filter-fit-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                document.querySelectorAll('.filter-fit-checkbox').forEach(cb => cb.checked = false);
                this.checked = true; window.activeFilters.fit = this.value; if(typeof window.applyFilters === 'function') window.applyFilters();
            });
        });
        document.querySelectorAll('.filter-size-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const size = this.getAttribute('data-size');
                if (window.activeFilters.size === size) { window.activeFilters.size = 'all'; this.classList.remove('bg-white', 'text-black'); } 
                else {
                    document.querySelectorAll('.filter-size-btn').forEach(b => b.classList.remove('bg-white', 'text-black'));
                    this.classList.add('bg-white', 'text-black'); window.activeFilters.size = size;
                }
                if(typeof window.applyFilters === 'function') window.applyFilters();
            });
        });
        document.querySelectorAll('.filter-color-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const color = this.getAttribute('data-color');
                if (window.activeFilters.color === color) { window.activeFilters.color = 'all'; this.classList.remove('ring-2', 'ring-white'); } 
                else {
                    document.querySelectorAll('.filter-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'));
                    this.classList.add('ring-2', 'ring-white'); window.activeFilters.color = color;
                }
                if(typeof window.applyFilters === 'function') window.applyFilters();
            });
        });
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); }
                });
            }, { root: null, rootMargin: '0px', threshold: 0.15 });
            document.querySelectorAll('.slow-reveal').forEach(el => observer.observe(el));
        } else { document.querySelectorAll('.slow-reveal').forEach(el => el.classList.add('active')); }
        const music = document.getElementById('bg-music');
        const musicBtn = document.getElementById('music-toggle');
        const musicIcon = document.getElementById('music-icon');
        let isPlaying = false;
        if (musicBtn && musicIcon) {
            musicBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (music && typeof music.play === 'function' && typeof music.pause === 'function') {
                    if (isPlaying) {
                        music.pause();
                        musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300';
                    } else {
                        if (music.currentTime < 20) music.currentTime = 20;
                        music.play().catch(() => {});
                        musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300';
                    }
                    isPlaying = !isPlaying;
                }
            });
        }
        if (music) {
            music.volume = 0.3;
        }
        document.addEventListener('mousemove', (e) => {
            const cursor = document.getElementById('custom-cursor');
            if (cursor) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }
        });
        const mainAddBtn = document.getElementById('main-add-btn');
        const stickyBar = document.getElementById('sticky-cart-bar');
        if (mainAddBtn && stickyBar) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting && !document.getElementById('pdp-view').classList.contains('hidden')) {
                        stickyBar.classList.remove('translate-y-full');
                    } else stickyBar.classList.add('translate-y-full');
                });
            }, { threshold: 0 });
            observer.observe(mainAddBtn);
        }
        document.querySelectorAll('#mobile-menu button, #mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                document.getElementById('mobile-menu').classList.add('hidden');
            });
        });
        if(typeof window.fetchInstagramPhotos === 'function') window.fetchInstagramPhotos();
        if(typeof window.fetchInstagramFeed === 'function') window.fetchInstagramFeed();
    });
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            if(typeof window.switchView === 'function') window.switchView(event.state.view, false);
        } else {
            if(typeof window.switchView === 'function') window.switchView('home', false);
        }
    });

   window.addEventListener('load', () => {
        if (!window.location.hash) {
            history.replaceState({ view: 'home' }, '', '#home');
        } else {
            let initialView = window.location.hash.replace('#', '');
            if (initialView === 'pdp' || initialView === 'checkout') {
                initialView = 'shop'; 
                history.replaceState({ view: 'shop' }, '', '#shop');
            }
            setTimeout(() => {
                if(typeof window.switchView === 'function') window.switchView(initialView, false);
            }, 100);
        }
    });
    window.addEventListener('keydown', function(e) {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
            return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && window.canvasInstance) {
            const activeObject = window.canvasInstance.getActiveObject();
            if (activeObject && typeof window.deleteSelectedObject === 'function') {
                window.deleteSelectedObject(); 
            }
        }
    });
};
