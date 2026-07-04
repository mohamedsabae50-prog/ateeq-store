const SUPABASE_URL = 'https://kkbejeioqltbllshhlcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_F8LXj9xjlkJKv4VQJDzoxQ_P3io41th';
const safeReadStoredArray = function(key, fallback = []) {
    try {
        const rawValue = localStorage.getItem(key);
        if (rawValue === null || rawValue === undefined || rawValue === '') return fallback;
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        return fallback;
    }
};
window.supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
window.isLoggedIn = false;
window.currentUser = null;
window.cart = safeReadStoredArray('ateeq_cart');
window.wishlist = safeReadStoredArray('ateeq_wishlist');
window.userOrders = []; 
window.appliedDiscount = 0;
window.activeCouponCode = null;
window.shopProductsData = [];
window.currentProductId = null;
window.currentSide = 'front';
window.currentProduct = 'hoodie'; 
window.designState = { front: null, back: null };
window.BLANK_PRICE = 800;
window.CUSTOM_PRICE = 850;
window.BASE_PRICE = 800; 
window.BACK_PRINT_PRICE = 100; 
window.totalCustomPrice = window.BASE_PRICE;
window.frontHasDesign = false;
window.backHasDesign = false;
window.canvasInstance = null;
window.REMOVE_BG_KEYS = ['o1AkssPAwYnCxy3MuyhGqjki', 'siyGKSwHaciGGjxSZQWsiWr6'];
window.activeFilters = window.activeFilters || { category: 'all', size: 'all', color: 'all', fit: 'all' };
window.currentSort = window.currentSort || 'default';
import { toggleMobileMenu, switchView, showToast, toggleAuthModal, toggleSizeGuide, goHome, goToShop, openStudio } from './modules/ui.js';
import { loadShopProducts, goToPDP, renderRelatedProducts, applyFilters, goToPDP_ByName } from './modules/products.js';
import { updateCartUI, trackAbandonedCart, saveWishlist, renderWishlist, toggleCart, saveCart, removeFromCart, addPdpToCart, animateCartIcon } from './modules/cart.js';
import { submitOrder, goToCheckout, applyCouponCode, trackOrder, closeSuccessModal, toggleInstapayUI } from './modules/checkout.js';
import { handleLogout, __handleRegister, __handleLogin, fetchUserOrders } from './modules/auth.js';
import { initStudioCanvas, changeGarment, addTextToStudio, forceBlackColor, deleteSelectedObject, processImageWithoutBackground, forceImageUpload, clearStudioCanvas, generateFinalProof, addStudioToCart, handleSelection, setupCanvasEvents, updateDynamicPrice, attachPriceEvents, toggleHoodieSide } from './modules/studio.js';
import { submitReview, fetchReviews, toggleReviewForm } from './modules/reviews.js';
import { fetchInstagramFeed, fetchInstagramPhotos, dataURLtoBlob, syncHeartIcons } from './modules/social.js';
import { saveProfileData, toggleSettingsModal, closeUserOrderModal, openUserOrderModal, switchProfileTab } from './modules/profile.js';
import { removeFromWishlist, fetchUserWishlist, toggleWishlistFromWishlistPage, toggleWishlistFromPDP, toggleWishlist } from './modules/wishlist.js';
import { shareDesign, openWhatsApp } from './modules/share.js';
import { initAppEvents } from './modules/events.js';
window.toggleMobileMenu = toggleMobileMenu; window.switchView = switchView; window.showToast = showToast; window.toggleAuthModal = toggleAuthModal; window.toggleSizeGuide = toggleSizeGuide; window.goHome = goHome; window.goToShop = goToShop; window.openStudio = openStudio;
window.safeReadStoredArray = safeReadStoredArray;
window.loadShopProducts = loadShopProducts; window.goToPDP = goToPDP; window.renderRelatedProducts = renderRelatedProducts; window.applyFilters = applyFilters; window.goToPDP_ByName = goToPDP_ByName;
window.updateCartUI = updateCartUI; window.trackAbandonedCart = trackAbandonedCart; window.saveWishlist = saveWishlist; window.renderWishlist = renderWishlist; window.toggleCart = toggleCart; window.saveCart = saveCart; window.removeFromCart = removeFromCart; window.addPdpToCart = addPdpToCart; window.animateCartIcon = animateCartIcon;
window.submitOrder = submitOrder; window.goToCheckout = goToCheckout; window.applyCouponCode = applyCouponCode; window.trackOrder = trackOrder; window.closeSuccessModal = closeSuccessModal; window.toggleInstapayUI = toggleInstapayUI;
window.handleLogout = handleLogout; window.__handleRegister = __handleRegister; window.__handleLogin = __handleLogin; window.fetchUserOrders = fetchUserOrders;
window.initStudioCanvas = initStudioCanvas; window.changeGarment = changeGarment; window.addTextToStudio = addTextToStudio; window.forceBlackColor = forceBlackColor; window.deleteSelectedObject = deleteSelectedObject; window.processImageWithoutBackground = processImageWithoutBackground; window.forceImageUpload = forceImageUpload; window.clearStudioCanvas = clearStudioCanvas; window.generateFinalProof = generateFinalProof; window.addStudioToCart = addStudioToCart; window.handleSelection = handleSelection; window.setupCanvasEvents = setupCanvasEvents; window.updateDynamicPrice = updateDynamicPrice; window.attachPriceEvents = attachPriceEvents; window.toggleHoodieSide = toggleHoodieSide;
window.submitReview = submitReview; window.fetchReviews = fetchReviews; window.toggleReviewForm = toggleReviewForm;
window.fetchInstagramFeed = fetchInstagramFeed; window.fetchInstagramPhotos = fetchInstagramPhotos; window.dataURLtoBlob = dataURLtoBlob; window.syncHeartIcons = syncHeartIcons;
window.saveProfileData = saveProfileData; window.toggleSettingsModal = toggleSettingsModal; window.closeUserOrderModal = closeUserOrderModal; window.openUserOrderModal = openUserOrderModal; window.switchProfileTab = switchProfileTab;
window.removeFromWishlist = removeFromWishlist; window.fetchUserWishlist = fetchUserWishlist; window.toggleWishlistFromWishlistPage = toggleWishlistFromWishlistPage; window.toggleWishlistFromPDP = toggleWishlistFromPDP; window.toggleWishlist = toggleWishlist;
window.shareDesign = shareDesign; window.openWhatsApp = openWhatsApp;
window.openPolicy = function(type) {
    const modal = document.getElementById('policy-modal');
    const title = document.getElementById('policy-title');
    const text = document.getElementById('policy-text');
    const policies = {
        privacy: { title: 'Privacy Policy', text: 'We respect your privacy and will never share your personal details without consent.' },
        terms: { title: 'Terms of Service', text: 'By using ATEEQ, you agree to our store policies and usage terms.' },
        refund: { title: 'Refund Policy', text: 'Custom orders are non-refundable unless defective, and standard items can be returned within 14 days.' }
    };
    if (modal && title && text) {
        const policy = policies[type] || policies.privacy;
        title.textContent = policy.title;
        text.textContent = policy.text;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};
window.closePolicy = function() {
    const modal = document.getElementById('policy-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
try { if (window.parent) { window.parent.handleLogin = __handleLogin; window.parent.handleRegister = __handleRegister; } } catch(e) {}
initAppEvents();
attachPriceEvents();
if (typeof window.loadShopProducts === 'function') window.loadShopProducts();
