export const toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        menu.style.opacity = '0';       
        menu.classList.add('pointer-events-none');         
        setTimeout(() => {
            menu.classList.add('hidden', 'invisible');
        }, 300);       
    } else {
        menu.classList.remove('hidden', 'invisible', 'pointer-events-none');       
        setTimeout(() => {
            menu.classList.add('active');
            menu.style.opacity = '1';
        }, 10);
    }
};
export const switchView = function(viewId, addToHistory = true) {
    const mobileNavMenu = document.getElementById('mobile-menu');
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block', 'flex'); 
    });
    const targetView = document.getElementById(viewId + '-view');
    if (targetView) {
        if (viewId === 'studio') {
            targetView.classList.remove('hidden');
            targetView.classList.add('flex');
            setTimeout(window.initStudioCanvas, 150); 
            if(typeof window.forceBlackColor === 'function') window.forceBlackColor();
        } else {
            targetView.classList.remove('hidden');
            targetView.classList.add('block');
        }
    }
    const stickyBar = document.getElementById('sticky-cart-bar');
    if (stickyBar && viewId !== 'pdp') {
        stickyBar.classList.add('translate-y-full');
    }
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        toggleMobileMenu();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (viewId === 'profile' && typeof window.fetchUserOrders === 'function') {
        window.fetchUserOrders();
    }
    if (addToHistory) {
        history.pushState({ view: viewId }, '', `#${viewId}`);
    }
};
export const showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    if(!toast || !toastMsg || !toastIcon) return;
    if (type === 'error') toastIcon.className = 'fa-solid fa-circle-exclamation text-red-500 text-lg';
    else if (type === 'success') toastIcon.className = 'fa-solid fa-circle-check text-green-500 text-lg';
    else toastIcon.className = 'fa-solid fa-circle-info text-white text-lg';
    toastMsg.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-[-20px]', 'pointer-events-none');
    }, 3000);
};
export const toggleAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('active')) toggleMobileMenu();
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
};
export const toggleSizeGuide = function() {
    const modal = document.getElementById('size-modal');
    if(modal) {
        modal.classList.toggle('hidden');
        setTimeout(() => modal.classList.toggle('opacity-0'), 10);
    }
};
export const goHome = () => { if(typeof window.switchView === 'function') window.switchView('home'); };
export const goToShop = () => { if(typeof window.switchView === 'function') window.switchView('shop'); };
export const openStudio = function(mode, color = 'Black') {
    if(typeof window.switchView === 'function') window.switchView('studio');
};
