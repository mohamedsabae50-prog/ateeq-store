const SUPABASE_URL = 'https://kkbejeioqltbllshhlcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_F8LXj9xjlkJKv4VQJDzoxQ_P3io41th';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let isLoggedIn = false;
let currentSide = 'front';
let currentProduct = 'hoodie'; 
let designState = { front: null, back: null };
let currentUser = null;
let appliedDiscount = 0;
let activeCouponCode = null;
let cart = JSON.parse(localStorage.getItem('ateeq_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('ateeq_wishlist')) || [];
let userOrders = []; 
const BLANK_PRICE = 800;
const CUSTOM_PRICE = 850;
const BASE_PRICE = 800; 
const BACK_PRINT_PRICE = 100; 
let totalCustomPrice = BASE_PRICE;
window.frontHasDesign = false;
window.backHasDesign = false;
let canvasInstance = null;
const REMOVE_BG_KEYS = ['o1AkssPAwYnCxy3MuyhGqjki', 'siyGKSwHaciGGjxSZQWsiWr6'];
window.shopProductsData = [];function saveCart() {
    localStorage.setItem('ateeq_cart', JSON.stringify(cart));
    updateCartUI();
    trackAbandonedCart(); 
}
async function trackAbandonedCart() {
    if (!isLoggedIn || !currentUser) return; 
    try {
        if (cart.length > 0) {
            const cleanCart = cart.map(item => {
                if (item.type === 'CUSTOM') { const { preview, ...rest } = item; return rest; }
                return item;
            });
            await supabaseClient.from('abandoned_carts').upsert({
                user_id: currentUser.id,
                email: currentUser.email,
                cart_data: cleanCart,
                last_updated: new Date().toISOString()
            });
        } else {
            await supabaseClient.from('abandoned_carts').delete().eq('user_id', currentUser.id);
        }
    } catch (error) {}
}
function saveWishlist() {
    localStorage.setItem('ateeq_wishlist', JSON.stringify(wishlist));
    if(typeof renderWishlist === 'function') renderWishlist();
}window.switchView = function(viewId, addToHistory = true) {
    document.querySelectorAll('.view-section').forEach(el => {
        const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('active');
    }
        el.classList.add('hidden');
        el.classList.remove('block', 'flex'); 
    });
    const targetView = document.getElementById(viewId + '-view');
    if (targetView) {
        if (viewId === 'studio') {
            targetView.classList.remove('hidden');
            targetView.classList.add('flex');
            setTimeout(initStudioCanvas, 150);
            if(typeof forceBlackColor === 'function') forceBlackColor();
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
    if (viewId === 'profile' && typeof fetchUserOrders === 'function') {
        fetchUserOrders();
    }
    if (addToHistory) {
        history.pushState({ view: viewId }, '', `#${viewId}`);
    };
};
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view) {
        switchView(event.state.view, false);
    } else {
        switchView('home', false);
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
        setTimeout(() => switchView(initialView, false), 100);
    }
});
window.goHome = () => switchView('home');
window.goToShop = () => switchView('shop');
window.openStudio = function(mode, color = 'Black') {
    switchView('studio');
};
window.loadShopProducts = async function() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>';
    try {
        const { data: products, error } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
        if (error) throw error;
        window.shopProductsData = products;
        if (products.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No products available right now.</div>';
            return;
        }
        container.innerHTML = products.map(product => {
            const hoverImg = product.hover_image_url ? product.hover_image_url : product.image_url;
            const category = product.category ? product.category.toLowerCase() : 'hoodies';
            const stockBadge = product.stock_status === 'Out of Stock' ? '<span class="text-red-500 text-[9px] uppercase tracking-widest">Sold Out</span>' : '';
            return `
            <div class="product-card is-visible group cursor-pointer" data-category="${category}" data-price="${product.price}" onclick="goToPDP(${product.id})">
                <div class="w-full aspect-[4/5] bg-[#0a0a0a] border border-[#222] overflow-hidden relative mb-4 flex items-center justify-center transition-colors duration-300 group-hover:border-white">
                    <img src="${product.image_url}" class="absolute inset-0 w-full h-full object-cover group-hover:opacity-0 transition duration-700">
                    <img src="${hoverImg}" class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition duration-700">
                    <div class="absolute bottom-0 left-0 w-full bg-[#050505]/80 backdrop-blur-sm p-4 transform translate-y-full transition-transform duration-500 group-hover:translate-y-0 flex justify-center gap-4 border-t border-[#333]">
                        <span class="text-[10px] text-white font-bold tracking-widest uppercase">View Details</span>
                    </div>
                </div>
<h4 class="text-white display-font text-sm md:text-xl uppercase ">${product.name}</h4>
                <div class="flex justify-between items-center mt-1">
                    <p class="text-gray-400 text-xs tracking-widest uppercase font-bold">${product.price} EGP</p>
                    ${stockBadge}
                </div>
            </div>
            `;
        }).join('');
        const resultsCount = document.getElementById('results-count');
        if(resultsCount) resultsCount.textContent = products.length + ' Results';
        if(typeof applyFilters === 'function') applyFilters();
    } catch (error) {
        container.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Failed to load products.</div>';
    }
};window.goToPDP = function(productId) {
    const product = window.shopProductsData.find(p => p.id == productId);
    if(!product) return;
    document.getElementById('pdp-title').textContent = product.name;
    document.getElementById('pdp-details').innerText = product.details;
    document.getElementById('pdp-price').textContent = product.price + ' EGP';
    document.getElementById('main-pdp-img').src = product.image_url;
    const galleryContainer = document.getElementById('pdp-gallery');
    let galleryHTML = `<img src="${product.image_url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 transition">`;
    if (product.hover_image_url) {
        galleryHTML += `<img src="${product.hover_image_url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 transition">`;
    }
    if (product.gallery_urls && product.gallery_urls.length > 0) {
        product.gallery_urls.forEach(url => {
            galleryHTML += `<img src="${url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 transition">`;
        });
    }
    galleryContainer.innerHTML = galleryHTML;
    const categoryName = product.category ? product.category.toLowerCase() : 'hoodies';
    if(typeof renderSizes === 'function') renderSizes('pdp-size-container', categoryName, 'pdp-size');
    window.currentProductId = product.id; 
    if(typeof fetchReviews === 'function') fetchReviews(product.id); 
    if (typeof renderRelatedProducts === 'function') renderRelatedProducts(productId);    
    switchView('pdp');
    window.scrollTo(0, 0);
};
window.renderRelatedProducts = function(currentId) {
    const container = document.getElementById('related-products-container');
    if (!container) return;
    let productList = window.shopProductsData || [];
    if (productList.length === 0) return;
    const filtered = productList.filter(p => p.id != currentId);
    const selected = filtered.sort(() => 0.5 - Math.random()).slice(0, 4);
    container.innerHTML = selected.map(p => `
    <div class="group cursor-pointer" onclick="goToPDP('${p.id}')">
        <div class="relative bg-[#0e141a] border border-[#1e2a36] aspect-[3/4] mb-3 overflow-hidden flex items-center justify-center">
            <img src="${p.image_url || 'blanks.jpg'}" onerror="this.src='blanks.jpg'" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        </div>
<h4 class="text-white text-[8px] md:text-[10px] tracking-widest uppercase font-bold mb-1">${p.name}</h4>
        <p class="text-[#8ea4be] text-[9px] tracking-widest uppercase">${p.price} EGP</p>
    </div>
    `).join('');
};window.showToast = function(message, type = 'info') {
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
window.toggleAuthModal = function() {
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
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        if (menu.classList.contains('active')) {
            menu.classList.remove('active');
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
        } else {
            menu.classList.add('active');
            menu.style.opacity = '1';
            menu.style.visibility = 'visible';
        }
    }
};
window.toggleSizeGuide = function() {
    const modal = document.getElementById('size-modal');
    if(modal) {
        modal.classList.toggle('hidden');
        setTimeout(() => modal.classList.toggle('opacity-0'), 10);
    }
};async function __handleLogin(e) {
    if (e) e.preventDefault();
    const mobAuthBtn = document.getElementById('mobile-auth-btn');
    const mobProfBtn = document.getElementById('mobile-profile-btn');
    if (mobAuthBtn && mobProfBtn) {
        mobAuthBtn.classList.add('hidden');
        mobProfBtn.classList.remove('hidden');
    }
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const email = emailEl ? emailEl.value : '';
    const password = passEl ? passEl.value : '';
    if (!email || !password) { showToast("Please enter your email and password.", "error"); return; }
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if (error) throw error;
        if (data && data.user) {
            isLoggedIn = true;
            currentUser = data.user;
            const navAuthBtn = document.getElementById('nav-auth-btn');
            const navProfileBtn = document.getElementById('nav-profile-btn');
            if (navAuthBtn) navAuthBtn.style.display = 'none';
            if (navProfileBtn) { navProfileBtn.classList.remove('hidden'); navProfileBtn.style.display = 'block'; }
            showToast("Welcome back to ATEEQ!", "success");
            if (typeof toggleAuthModal === 'function') toggleAuthModal();
            switchView('profile');
        }
    } catch (error) { showToast("Invalid Email or Password!", "error"); }
}
async function __handleRegister(e) {
    if (e) e.preventDefault();
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const nameEl = document.getElementById('reg-name');
    const email = emailEl ? emailEl.value : '';
    const password = passEl ? passEl.value : '';
    const fullName = nameEl ? nameEl.value : '';
    if (!email || !password || !fullName) { showToast("Please fill all fields.", "error"); return; }
    try {
        const { data, error } = await supabaseClient.auth.signUp({ email: email, password: password });
        if (error) throw error;
        if (data && data.user) {
            try { await supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName }]); } catch (pErr) {}
            isLoggedIn = true;
            currentUser = data.user;
            const navAuthBtn = document.getElementById('nav-auth-btn');
            const navProfileBtn = document.getElementById('nav-profile-btn');
            if (navAuthBtn) navAuthBtn.style.display = 'none';
            if (navProfileBtn) { navProfileBtn.classList.remove('hidden'); navProfileBtn.style.display = 'block'; }
            showToast("Account created successfully!", "success");
            if (typeof toggleAuthModal === 'function') toggleAuthModal();
            switchView('profile');
        }
    } catch (error) { showToast(error.message || 'Registration failed', "error"); }
}
window.handleLogin = __handleLogin;
window.handleRegister = __handleRegister;
try { if (window.parent) { window.parent.handleLogin = __handleLogin; window.parent.handleRegister = __handleRegister; } } catch(e) {}
window.handleLogout = async function() {
    const mobAuthBtn = document.getElementById('mobile-auth-btn');
    const mobProfBtn = document.getElementById('mobile-profile-btn');
    if (mobAuthBtn && mobProfBtn) {
        mobAuthBtn.classList.remove('hidden');
        mobProfBtn.classList.add('hidden');
    }
    await supabaseClient.auth.signOut();
    isLoggedIn = false;
    currentUser = null;
    cart = [];
    wishlist = [];
    saveCart();
    saveWishlist();
    const chkEmail = document.getElementById('chk-email');
    if (chkEmail) chkEmail.value = '';
    if(typeof toggleSettingsModal === 'function') {
        const modal = document.getElementById('settings-modal');
        if(modal && !modal.classList.contains('hidden')) toggleSettingsModal();
    }
    document.getElementById('nav-auth-btn').style.display = ''; 
    document.getElementById('nav-profile-btn').style.display = 'none';
    switchView('home');
    showToast("Logged out successfully.", "info");
};
window.animateCartIcon = function() {
    const cartLink = document.querySelector('a[onclick="toggleCart(); return false;"]');
    if(cartLink) {
        cartLink.style.transform = 'scale(1.2)';
        cartLink.style.color = '#fff';
        setTimeout(() => { cartLink.style.transform = 'scale(1)'; cartLink.style.color = ''; }, 300);
    }
}
window.toggleCart = function() {
    const overlay = document.getElementById('cart-overlay');
    const panel = document.getElementById('cart-panel');
    if (!overlay || !panel) return;
    if (panel.classList.contains('translate-x-full')) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        panel.classList.remove('translate-x-full');
    } else {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        panel.classList.add('translate-x-full');
    }
};
window.updateCartUI = function() {
  const cartCount = document.getElementById('cart-count');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  if(cartCount) cartCount.textContent = cart.length;
  if(!cartItemsContainer) return;
  if(cart.length === 0) {
      cartItemsContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-center mt-10">
              <i class="fa-solid fa-cart-shopping text-5xl text-[#222] mb-6"></i>
              <p class="text-gray-500 text-xs tracking-widest uppercase mb-6">Your cart is empty.</p>
              <div class="flex flex-col gap-3 w-full max-w-[250px] mx-auto">
                  <button onclick="toggleCart(); switchView('shop');" class="w-full border border-[#333] text-white py-4 text-[10px] uppercase tracking-widest font-bold hover:border-white hover:bg-white hover:text-black transition">Shop</button>
                  <button onclick="toggleCart(); openStudio('custom');" class="w-full border border-[#333] text-gray-500 py-4 text-[10px] uppercase tracking-widest hover:border-white hover:text-white transition">Custom</button>
              </div>
          </div>
      `;
      if(cartTotal) cartTotal.textContent = '0 EGP';
      return;
  }
  let total = 0;
  cartItemsContainer.innerHTML = '';
  cart.forEach((item, index) => {
      total += item.price;
      let details = `<p class="text-gray-500 text-[10px] tracking-widest uppercase mt-1">Size: ${item.size}</p>`;
      if(item.type === 'CUSTOM') details += `<p class="text-gray-500 text-[10px] tracking-widest uppercase">Placement: ${item.placement}</p>`;
      cartItemsContainer.innerHTML += `
         <div class="flex justify-between items-center border-b border-[#222] pb-4">
            <div>
               <h3 class="text-white display-font uppercase tracking-wide text-lg">${item.title}</h3>
               ${details}
               <p class="text-white text-xs font-bold mt-2">${item.price} EGP</p>
            </div>
            <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
         </div>
      `;
  });
  if(cartTotal) cartTotal.textContent = `${total} EGP`;
}
window.removeFromCart = function(index) { 
    cart.splice(index, 1); 
    saveCart(); 
}
window.addPdpToCart = function() {
    const sizeInput = document.querySelector('input[name="pdp-size"]:checked');
    const size = sizeInput ? sizeInput.value : 'L';
    const title = document.getElementById('pdp-title').textContent;
    const priceText = document.getElementById('pdp-price').textContent;
    const price = parseFloat(priceText.replace(' EGP', ''));
    cart.push({ id: Date.now(), type: 'STORE', title: title, size: size, price: price });
    saveCart();
    toggleCart();
    animateCartIcon(); 
};
window.goToCheckout = function() {
    if (!isLoggedIn) {
        toggleCart(); toggleAuthModal(); 
        showToast("Please Log In or Register first to proceed.", "error"); return;
    }
    if(cart.length === 0) { showToast("Your cart is empty!", "error"); return; }
    if (currentUser && currentUser.email) {
        const chkEmail = document.getElementById('chk-email');
        if (chkEmail) {
            chkEmail.value = currentUser.email;
            chkEmail.readOnly = true; 
            chkEmail.classList.add('opacity-70', 'cursor-not-allowed');
        }
    }
    toggleCart(); switchView('checkout');
}
window.applyCouponCode = async function() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const msg = document.getElementById('coupon-message');
    if (!code) { showToast("Please enter a coupon code", "error"); return; }
    try {
        const { data, error } = await supabaseClient.from('coupons').select('*').eq('code', code).eq('active', true).single();
        msg.classList.remove('hidden', 'text-red-500', 'text-green-500');
        if (error || !data) {
            appliedDiscount = 0;
            activeCouponCode = null;
            msg.textContent = "Invalid or Expired Coupon";
            msg.classList.add('text-red-500');
            showToast("Coupon not found", "error");
        } else {
            appliedDiscount = data.discount_percent;
            activeCouponCode = data.code;
            msg.textContent = `Coupon Applied: ${data.discount_percent}% Discount`;
            msg.classList.add('text-green-500');
            showToast("Discount applied successfully", "success");
            let totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
            let discountAmount = (totalAmount * (appliedDiscount / 100));
            let finalTotal = totalAmount - discountAmount;
            showToast(`New Total: ${finalTotal} EGP`, "info");
        }
    } catch (err) {}
};
window.trackOrder = async function(event) {
    const serial = document.getElementById('track-serial').value.trim();
    if(!serial) { showToast("Please enter a valid serial number", "error"); return; }
    const btn = (event && (event.currentTarget || event.target)) || null;
    const originalText = (btn && btn.innerHTML) ? btn.innerHTML : '';
    if (btn && typeof btn.innerHTML !== 'undefined') btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Searching...';
    if (btn) btn.disabled = true;
    try {
        const { data, error } = await supabaseClient.from('orders').select('status, total_amount, created_at').eq('serial_number', serial).single();
        const resDiv = document.getElementById('track-result');
        resDiv.classList.remove('hidden');
        if (error || !data) {
            resDiv.innerHTML = '<span class="text-red-500 font-bold uppercase tracking-widest"><i class="fa-solid fa-circle-xmark mr-2"></i>Order Not Found</span>';
        } else {
            const date = new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            let statusColor = data.status === 'Pending' ? 'text-yellow-500' : data.status === 'Shipped' ? 'text-blue-500' : 'text-green-500';
            resDiv.innerHTML = `
                <div class="flex justify-between items-center mb-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Date:</span> <span class="text-white">${date}</span></div>
                <div class="flex justify-between items-center mb-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Amount:</span> <span class="text-white font-bold">${data.total_amount} EGP</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Status:</span> <span class="${statusColor} font-bold uppercase tracking-widest">${data.status}</span></div>
            `;
        }
    } catch(err) {} 
    finally { if (btn && typeof originalText !== 'undefined') btn.innerHTML = originalText; if (btn) btn.disabled = false; }
};window.submitOrder = async function(event) {
    event.preventDefault();
    const emailEl = document.getElementById('chk-email');
    const email = (emailEl && emailEl.value) ? emailEl.value : (currentUser ? currentUser.email : '');
    const paymentInput = document.querySelector('input[name="payment"]:checked');
    if (!paymentInput) { showToast("Please select a payment method.", "error"); return; }
    const paymentMethod = paymentInput.value;
    if (!isLoggedIn || !currentUser) { showToast("Please log in to complete your order.", "error"); return; }
    const receiptInput = document.getElementById('instapay-receipt');
    let receiptFile = null;
    if (paymentMethod === 'Instapay') {
        if (!receiptInput || !receiptInput.files || receiptInput.files.length === 0) {
            showToast("Please upload your Instapay payment screenshot.", "error");
            return; 
        }
        receiptFile = receiptInput.files[0];
    }
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    const p1 = document.getElementById('chk-phone1') ? document.getElementById('chk-phone1').value : '';
    const p2 = document.getElementById('chk-phone2') ? document.getElementById('chk-phone2').value : '';
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(p1)) { showToast("Please enter a valid 11-digit Egyptian phone number", "error"); return; }
    const customerPhone = p2 ? `${p1} (WhatsApp: ${p2})` : p1;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    try {
        let totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
        if (appliedDiscount > 0) totalAmount = totalAmount - (totalAmount * (appliedDiscount / 100));
        let serialNumber = 'ATQ-2026-' + Math.floor(100000 + Math.random() * 900000);
        const customerName = document.getElementById('chk-name') ? document.getElementById('chk-name').value : 'N/A';
        const mainAddr = document.getElementById('chk-address') ? document.getElementById('chk-address').value : '';
        const bldg = document.getElementById('chk-building') ? document.getElementById('chk-building').value : '';
        const floor = document.getElementById('chk-floor') ? document.getElementById('chk-floor').value : '';
        const apt = document.getElementById('chk-apt') ? document.getElementById('chk-apt').value : '';
        const mark = document.getElementById('chk-landmark') ? document.getElementById('chk-landmark').value : '';
        const customerAddress = `${mainAddr}, Bldg: ${bldg}, Floor: ${floor}, Apt: ${apt} ${mark ? '(Mark: '+mark+')' : ''}`;
        
        let receiptUrl = null;
        if (receiptFile) {
            showToast("Uploading receipt image...", "info");
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt-${serialNumber}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage.from('receipts').upload(`public/${fileName}`, receiptFile);
            if (uploadError) throw new Error("Failed to upload receipt.");
            receiptUrl = supabaseClient.storage.from('receipts').getPublicUrl(`public/${fileName}`).data.publicUrl;
        }

        let customDesignUrl = null;
        const hasCustomItem = cart.some(item => item.type === 'CUSTOM');
        const customItemWithPreview = cart.find(item => item.type === 'CUSTOM' && item.preview);
        if (hasCustomItem) {
            if (!customItemWithPreview) throw new Error("Design image is missing!");
            showToast("Uploading custom design...", "info");
            const blob = dataURLtoBlob(customItemWithPreview.preview);
            const designFileName = `design-${serialNumber}.png`;
            const { error: designError } = await supabaseClient.storage.from('custom-designs').upload(designFileName, blob, { contentType: 'image/png' });
            if (designError) throw new Error("Storage Error: " + designError.message);
            customDesignUrl = supabaseClient.storage.from('custom-designs').getPublicUrl(designFileName).data.publicUrl;
        }

        // رفع ملف الـ HQ الأصلي وحفظه في الطلب
        const cleanCartForDB = await Promise.all(cart.map(async item => {
            if (item.type === 'CUSTOM') {
                let uploadedHqUrl = null;
                if (item.hqFile && item.hqFile.startsWith('data:image')) {
                    try {
                        showToast("Uploading HQ print file...", "info");
                        const blob = dataURLtoBlob(item.hqFile);
                        // استخراج الامتداد
                        const mimeString = item.hqFile.split(',')[0].split(':')[1].split(';')[0];
                        const ext = mimeString.split('/')[1] || 'png';
                        const fileName = `hq-${serialNumber}-${Date.now()}.${ext}`;
                        
                        const { error } = await supabaseClient.storage.from('custom-designs').upload(`public/${fileName}`, blob);
                        if (!error) {
                            uploadedHqUrl = supabaseClient.storage.from('custom-designs').getPublicUrl(`public/${fileName}`).data.publicUrl;
                        }
                    } catch(e) { console.error("HQ Upload error", e); }
                }
                const { preview, hqFile, ...restOfItem } = item; 
                if (uploadedHqUrl) restOfItem.hqFile = uploadedHqUrl; 
                return restOfItem; 
            }
            return item;
        }));

        const { error } = await supabaseClient.from('orders').insert([{
            user_id: currentUser.id, serial_number: serialNumber, total_amount: totalAmount,
            payment_method: paymentMethod, status: 'Pending', full_name: customerName,
            phone: customerPhone, address: customerAddress, items: cleanCartForDB,
            receipt_url: receiptUrl, custom_design_url: customDesignUrl 
        }]);
        if (error) throw error;
        
        for (const item of cart) {
            if (item.type === 'STORE' && item.title) {
                const { data: prod } = await supabaseClient.from('products').select('stock_count').eq('name', item.title).single();
                if (prod) {
                    let newCount = prod.stock_count - 1;
                    let newStatus = newCount <= 0 ? 'Out of Stock' : 'In Stock';
                    await supabaseClient.from('products').update({ stock_count: newCount, stock_status: newStatus }).eq('name', item.title);
                }
            }
        }
        try { 
            await emailjs.send("service_58ov5us", "template_kmoa9gi", { 
                serial_number: serialNumber, 
                email: email, 
                total_amount: totalAmount, 
                payment_method: paymentMethod 
            }); 
            
            console.log("✅ Emails sent successfully!");
        } catch (emailErr) {
            console.error("❌ Failed to send email:", emailErr);
        }        
        const serialEl = document.getElementById('order-serial');
        if (serialEl) { if (serialEl.tagName === 'INPUT') serialEl.value = serialNumber; else serialEl.textContent = serialNumber; }
        const emailConfirmEl = document.getElementById('user-email-confirm');
        if (emailConfirmEl) emailConfirmEl.textContent = email || (currentUser ? currentUser.email : '');

        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden'); 
        setTimeout(() => { modal.classList.remove('opacity-0'); }, 50);
        
        cart = []; appliedDiscount = 0; activeCouponCode = null; saveCart();
    } catch (error) { 
        showToast(error.message || "Failed to place order.", "error"); 
    } finally {
        submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false;
    }
};
window.closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); switchView('home'); }, 500);
}
window.toggleInstapayUI = function(show) {
    const block = document.getElementById('instapay-block');
    if (block) {
        if (show) {
            block.classList.remove('hidden');
            block.classList.add('block');
        } else {
            block.classList.add('hidden');
            block.classList.remove('block');
        }
    }
};window.fetchUserOrders = async function() {
    if (!isLoggedIn || !currentUser) return;
    const container = document.getElementById('orders-container');
    if (!container) return;
    try {
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        userOrders = orders; 
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center mt-10">
                    <i class="fa-solid fa-box-open text-4xl text-[#333] mb-4"></i>
                    <p class="text-gray-500 text-xs tracking-widest uppercase">You haven't placed any orders yet.</p>
                </div>`;
            return;
        }
        container.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const statusColor = order.status === 'Pending' ? 'text-yellow-500 border-yellow-500' : 'text-green-500 border-green-500';
            return `
            <div onclick="openUserOrderModal('${order.id}')" class="border border-[#222] p-6 bg-[#050505] cursor-pointer hover:border-gray-500 transition-all duration-300 mb-4">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <p class="text-gray-500 text-[10px] tracking-widest uppercase mb-1">Order #${order.serial_number} (Click for details)</p>
                        <p class="text-white text-xs tracking-widest uppercase font-bold">Placed on ${date}</p>
                    </div>
                    <span class="text-[10px] tracking-widest uppercase font-bold border px-3 py-1 rounded-full ${statusColor}">${order.status}</span>
                </div>
                <div class="border-t border-[#222] pt-6 flex justify-between items-center">
                    <div>
                        <p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Payment Method</p>
                        <p class="text-white text-xs tracking-widest uppercase font-bold">${order.payment_method}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Total Amount</p>
                        <p class="text-white text-lg tracking-widest font-bold">${order.total_amount} EGP</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (error) {}
};
window.openUserOrderModal = function(id) {
    const order = userOrders.find(o => o.id === id);
    if (!order) return;
    const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items)) {
        itemsHtml = order.items.map(item => `
            <div class="flex justify-between items-center text-xs mt-2 bg-[#111] p-3 border border-[#222]">
                <span class="text-gray-300">- ${item.title || item.name} <b class="text-white ml-1">(Size: ${item.size || 'N/A'})</b></span>
                <span class="text-white font-bold">${item.price} EGP</span>
            </div> `).join('');
    } else {
        itemsHtml = '<div class="text-gray-600 text-xs mt-1">No items recorded</div>';
    }
    const content = document.getElementById('user-modal-order-content');
    if(content) {
        content.innerHTML = `<div class="flex justify-between items-center border-b border-[#222] pb-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Serial Number</span><span class="text-white font-bold">${order.serial_number}</span></div><div class="flex justify-between items-center border-b border-[#222] py-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Date</span><span class="text-white">${date}</span></div><div class="py-3 border-b border-[#222]"><div class="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Items Ordered</div>${itemsHtml}</div><div class="flex justify-between items-center border-b border-[#222] py-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Payment Method</span><span class="text-white">${order.payment_method}</span></div><div class="flex justify-between items-center pt-3"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Total Amount</span><span class="text-white font-bold text-lg">${order.total_amount} EGP</span></div>`;
    }
    const modal = document.getElementById('user-order-modal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};
window.closeUserOrderModal = function() {
    const modal = document.getElementById('user-order-modal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};window.toggleSettingsModal = async function() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
        if (isLoggedIn && currentUser) {
            try {
                const emailInput = document.getElementById('edit-email');
                if(emailInput) emailInput.value = currentUser.email;
                const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
                if (data) {
                    const nameInput = document.getElementById('edit-name');
                    const phoneInput = document.getElementById('edit-phone');
                    const ageInput = document.getElementById('edit-age');
                    const cityInput = document.getElementById('edit-city');
                    if(nameInput) nameInput.value = data.full_name || '';
                    if(phoneInput) phoneInput.value = data.phone || '';
                    if(ageInput) ageInput.value = data.age || '';
                    if(cityInput) cityInput.value = data.city || '';
                }
            } catch (error) {}
        }
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    }
};
window.saveProfileData = async function(e) {
    if (e) e.preventDefault();
    if (!isLoggedIn || !currentUser) {
        showToast("You are not logged in!", "error");
        return;
    }
    const btn = document.getElementById('save-profile-btn');
    let originalText = '';
    if(btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        btn.style.pointerEvents = 'none';
    }
    const nameEl = document.getElementById('edit-name');
    const phoneEl = document.getElementById('edit-phone');
    const ageEl = document.getElementById('edit-age');
    const cityEl = document.getElementById('edit-city');
    const name = nameEl ? nameEl.value : '';
    const phone = phoneEl ? phoneEl.value : '';
    const age = ageEl ? ageEl.value : '';
    const city = cityEl ? cityEl.value : '';
    try {
        const { error } = await supabaseClient.from('profiles').update({ 
            full_name: name, phone: phone, age: age ? parseInt(age) : null, city: city
        }).eq('id', currentUser.id);
        if (error) throw error;
        showToast("Profile updated successfully!", "success");
        toggleSettingsModal();
    } catch (error) {
        showToast("Failed to update profile.", "error");
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }
    }
};window.toggleWishlist = async function(productId, event, btnElement = null) {
    if(event) event.stopPropagation();
    const button = btnElement || (event ? event.currentTarget : null);
    const icon = button ? button.querySelector('i') : null;
    if (!isLoggedIn || !currentUser) {
        showToast("Please log in to save items to your wishlist!", "error");
        toggleAuthModal();
        return;
    }
    try {
        if (icon) icon.className = "fa-solid fa-circle-notch fa-spin text-gray-500";
        const { data, error } = await supabaseClient.from('wishlist').select('*').eq('user_id', currentUser.id).eq('product_id', productId);
        if (data && data.length > 0) {
            await supabaseClient.from('wishlist').delete().eq('user_id', currentUser.id).eq('product_id', productId);
            showToast("Removed from Wishlist", "info");
            if (button) {
                button.classList.remove('text-red-500', 'border-red-500');
                button.classList.add('text-white');
                if (icon) icon.className = "fa-regular fa-heart";
            }
        } else {
            await supabaseClient.from('wishlist').insert([{ user_id: currentUser.id, product_id: productId }]);
            showToast("Added to Wishlist!", "success");
            if (button) {
                button.classList.remove('text-white');
                button.classList.add('text-red-500');
                if (icon) icon.className = "fa-solid fa-heart";
            }
        }
        const wishlistTab = document.getElementById('wishlist-container');
        if (wishlistTab && !wishlistTab.classList.contains('hidden')) {
            fetchUserWishlist();
        }
    } catch(err) {
        if (icon) icon.className = "fa-regular fa-heart text-white";
    }
}
window.fetchUserWishlist = async function() {
    if (!isLoggedIn || !currentUser) return;
    const container = document.getElementById('wishlist-container');
    if (!container) return;
    container.innerHTML = '<p class="text-center col-span-full text-gray-500 text-xs tracking-widest uppercase py-10"><i class="fa-solid fa-circle-notch fa-spin text-xl"></i></p>';
    try {
        const { data: wishlistItems, error } = await supabaseClient.from('wishlist').select(`product_id, products (*)`).eq('user_id', currentUser.id);
        if (error) throw error;
        if (!wishlistItems || wishlistItems.length === 0) {
            container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-center py-10"><i class="fa-regular fa-heart text-4xl text-[#222] mb-4"></i><p class="text-gray-500 text-xs tracking-widest uppercase">Your wishlist is empty.</p></div>`;
            return;
        }
        container.innerHTML = wishlistItems.map(item => {
            const prod = item.products;
            if (!prod) return '';
            return `<div class="group relative bg-[#050505] border border-[#111] p-4 transition hover:border-[#222]"><div class="relative overflow-hidden aspect-square mb-4 cursor-pointer" onclick="goToPDP('${prod.id}')"><img src="${prod.image_url}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500"></div><div class="flex justify-between items-start"><div><h4 class="text-xs uppercase text-white font-bold tracking-wider">${prod.name}</h4><p class="text-[10px] text-gray-500 mt-1">${prod.price} EGP</p></div><button onclick="toggleWishlist('${prod.id}', event, this)" class="border border-[#333] hover:border-white w-14 h-14 flex items-center justify-center transition text-white"><i class="fa-solid fa-heart text-red-500"></i></button></div></div>`;
        }).join('');
    } catch(err) {
        container.innerHTML = '<p class="text-center col-span-full text-red-500 text-xs tracking-widest uppercase">Error loading wishlist.</p>';
    }
}
window.toggleWishlistFromPDP = function(event, btnElement) {
    if(!window.currentProductId) return;
    toggleWishlist(window.currentProductId, event, btnElement);
}
window.removeFromWishlist = function(index) {
    wishlist.splice(index, 1); saveWishlist(); showToast('Removed from wishlist.', 'info');
};
window.goToPDP_ByName = function(name) {
    
    const p = window.shopProductsData.find(x => x.name === name);
    if(p) goToPDP(p.id);
}
window.switchProfileTab = function(tabName) {
    const tabHistory = document.getElementById('tab-history');
    const tabWishlist = document.getElementById('tab-wishlist');
    const ordersContent = document.getElementById('tab-orders');
    const wishlistContent = document.getElementById('wishlist-container');
    if (tabName === 'history') {
        if(tabHistory) { tabHistory.classList.remove('border-transparent', 'text-gray-500'); tabHistory.classList.add('border-white', 'text-white'); }
        if(tabWishlist) { tabWishlist.classList.remove('border-white', 'text-white'); tabWishlist.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) ordersContent.classList.replace('hidden', 'block');
        if(wishlistContent) wishlistContent.classList.replace('grid', 'hidden');
        if (typeof fetchUserOrders === 'function') fetchUserOrders();
    } else if (tabName === 'wishlist') {
        if(tabWishlist) { tabWishlist.classList.remove('border-transparent', 'text-gray-500'); tabWishlist.classList.add('border-white', 'text-white'); }
        if(tabHistory) { tabHistory.classList.remove('border-white', 'text-white'); tabHistory.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) { ordersContent.classList.remove('block'); ordersContent.classList.add('hidden'); }
        if(wishlistContent) { wishlistContent.classList.remove('hidden'); wishlistContent.classList.add('grid'); }
        if (typeof fetchUserWishlist === 'function') fetchUserWishlist();
    }
}
window.toggleReviewForm = function() {
    const form = document.getElementById('add-review-form');
    if(form) form.classList.toggle('hidden');
};
window.fetchReviews = async function(productId) {
    const container = document.getElementById('reviews-container');
    if(!container) return;
    container.innerHTML = '<p class="text-gray-500 text-[10px] tracking-widest uppercase">Loading reviews...</p>';
    try {
        const { data: reviews, error } = await supabaseClient.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
        if (error) throw error;
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-[10px] tracking-widest uppercase border border-[#222] p-4 text-center">No reviews yet. Be the first!</p>';
            const avgRatingEl = document.getElementById('avg-rating');
            if(avgRatingEl) avgRatingEl.innerText = '';
            return;
        }
        const avg = Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length);
        const avgRatingEl = document.getElementById('avg-rating');
        if(avgRatingEl) avgRatingEl.innerText = '★'.repeat(avg) + '☆'.repeat(5 - avg);
        container.innerHTML = reviews.map(review => `
            <div class="bg-[#0a0a0a] p-4 border border-[#222]">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-white text-xs font-bold uppercase block">${review.customer_name}</span>
                        <span class="text-green-500 text-[9px] uppercase tracking-widest"><i class="fa-solid fa-circle-check"></i> Verified</span>
                    </div>
                    <span class="text-yellow-500 text-xs">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                </div>
                <p class="text-gray-400 text-[11px] leading-relaxed">${review.comment}</p>
                <p class="text-[#444] text-[9px] mt-3 uppercase tracking-widest">${new Date(review.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-red-500 text-[10px] uppercase">Failed to load reviews.</p>';
    }
};window.submitReview = async function(event) {
    event.preventDefault();
    if (!window.currentProductId) return;
    const btn = document.getElementById('submit-review-btn');
    if(btn) { btn.innerHTML = 'SUBMITTING...'; btn.disabled = true; }
    const nameEl = document.getElementById('review-name');
    const ratingEl = document.getElementById('review-rating');
    const commentEl = document.getElementById('review-comment');
    const name = nameEl ? nameEl.value : 'Anonymous';
    const rating = ratingEl ? parseInt(ratingEl.value) : 5;
    const comment = commentEl ? commentEl.value : '';
    try {
        const { error } = await supabaseClient.from('reviews').insert([{ 
            product_id: window.currentProductId, customer_name: name, rating: rating, comment: comment 
        }]);
        if (error) throw error;
        showToast("Review submitted successfully!", "success");
        const form = document.getElementById('add-review-form');
        if(form) form.reset();
        toggleReviewForm();
        fetchReviews(window.currentProductId); 
    } catch (error) {
        showToast("Failed to submit review.", "error");
    } finally {
        if(btn) { btn.innerHTML = 'SUBMIT REVIEW'; btn.disabled = false; }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    async function checkUserStatus() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            isLoggedIn = true; currentUser = session.user;
            const authBtn = document.getElementById('nav-auth-btn');
            const profileBtn = document.getElementById('nav-profile-btn');
            if(authBtn) authBtn.style.display = 'none';
            if(profileBtn) { profileBtn.classList.remove('hidden'); profileBtn.style.display = 'block'; }
        }
    }
    checkUserStatus();
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash){ splash.classList.add('slide-up'); setTimeout(() => splash.style.display = 'none', 1200); }
    }, 1000);
    loadShopProducts(); 
    let activeFilters = { category: 'all', size: 'all', color: 'all', fit: 'all' };
    let currentSort = 'default';
    window.applyFilters = function() {
        const container = document.getElementById('products-container');
        if(!container) return;
        let products = Array.from(document.querySelectorAll('.product-card'));
        let visibleCount = 0;
        products.forEach(product => {
            const productCategory = product.getAttribute('data-category') || '';
            const productSizes = product.getAttribute('data-sizes') || '';
            const productColors = product.getAttribute('data-colors') || '';
            const productFit = product.getAttribute('data-fit') || '';
            let categoryMatch = activeFilters.category === 'all' || productCategory.includes(activeFilters.category);
            let sizeMatch = activeFilters.size === 'all' || productSizes.includes(activeFilters.size);
            let colorMatch = activeFilters.color === 'all' || productColors.includes(activeFilters.color);
            let fitMatch = activeFilters.fit === 'all' || productFit.includes(activeFilters.fit);
            if (categoryMatch && sizeMatch && colorMatch && fitMatch) {
                product.style.display = 'block'; product.classList.add('is-visible'); visibleCount++;
            } else {
                product.style.display = 'none'; product.classList.remove('is-visible');
            }
        });
        let visibleProducts = products.filter(p => p.classList.contains('is-visible'));
        if (currentSort === 'price-asc') visibleProducts.sort((a, b) => parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price')));
        else if (currentSort === 'price-desc') visibleProducts.sort((a, b) => parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price')));
        visibleProducts.forEach(p => container.appendChild(p));
        const resultsCount = document.getElementById('results-count');
        if(resultsCount) resultsCount.textContent = visibleCount + (visibleCount === 1 ? ' Result' : ' Results');
    }
    const sortSelect = document.getElementById('sort-select');
    if(sortSelect) { sortSelect.addEventListener('change', function() { currentSort = this.value; applyFilters(); }); }
    document.querySelectorAll('.filter-category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            document.querySelectorAll('.filter-category-checkbox').forEach(cb => cb.checked = false);
            this.checked = true; activeFilters.category = this.value; applyFilters();
        });
    });
    document.querySelectorAll('.filter-fit-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            document.querySelectorAll('.filter-fit-checkbox').forEach(cb => cb.checked = false);
            this.checked = true; activeFilters.fit = this.value; applyFilters();
        });
    });document.querySelectorAll('.filter-size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = this.getAttribute('data-size');
            if (activeFilters.size === size) { activeFilters.size = 'all'; this.classList.remove('bg-white', 'text-black'); } 
            else {
                document.querySelectorAll('.filter-size-btn').forEach(b => b.classList.remove('bg-white', 'text-black'));
                this.classList.add('bg-white', 'text-black'); activeFilters.size = size;
            }
            applyFilters();
        });
    });
    document.querySelectorAll('.filter-color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            if (activeFilters.color === color) { activeFilters.color = 'all'; this.classList.remove('ring-2', 'ring-white'); } 
            else {
                document.querySelectorAll('.filter-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'));
                this.classList.add('ring-2', 'ring-white'); activeFilters.color = color;
            }
            applyFilters();
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
    
    if (music && musicBtn) {
        music.volume = 0.3; 
                const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) {
            let playPromise = music.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => { 
                    isPlaying = true; 
                    musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300'; 
                }).catch(error => {
                    isPlaying = false; 
                    musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300';
                });
            }
        } else {
            isPlaying = false;
            musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300';
        }
        music.addEventListener('ended', function() { 
            this.currentTime = 20; 
            if(isPlaying) this.play(); 
        });       
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (isPlaying) { 
                music.pause(); 
                musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300'; 
            } else { 
                if (music.currentTime < 20) music.currentTime = 20; 
                music.play(); 
                musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300'; 
            }
            isPlaying = !isPlaying;
        });
    }
    let originalTitle = document.title;
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            document.title = cart.length > 0 ? `(${cart.length}) عـتـيـق | طقمك في انتظارك 🖤` : "عـتـيـق | We miss you 🖤";
            if (music && isPlaying) music.pause(); 
        } else {
            document.title = originalTitle;
            if (music && isPlaying) music.play(); 
        }
    });
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('mousemove', (e) => {
        if (cursor) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }
    });
    const mainAddBtn = document.getElementById('main-add-btn');
    const stickyBar = document.getElementById('sticky-cart-bar');
    if (mainAddBtn && stickyBar) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting && !document.getElementById('pdp-view').classList.contains('hidden')) {
                    stickyBar.classList.remove('translate-y-full');
                    const pdpTitle = document.getElementById('pdp-title');
                    const stickyTitle = document.getElementById('sticky-title');
                    if(pdpTitle && stickyTitle) stickyTitle.textContent = pdpTitle.textContent;
                    const pdpImg = document.getElementById('main-pdp-img');
                    const stickyImg = document.getElementById('sticky-img');
                    if(pdpImg && stickyImg) stickyImg.src = pdpImg.src;
                } else stickyBar.classList.add('translate-y-full');
            });
        }, { threshold: 0 }); 
        observer.observe(mainAddBtn);
    }
});async function processImageWithoutBackground(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    for (let i = 0; i < REMOVE_BG_KEYS.length; i++) {
        try {
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': REMOVE_BG_KEYS[i] },
                body: formData
            });
            if (response.ok) return await response.blob();
            else {
                if (i === REMOVE_BG_KEYS.length - 1) throw new Error('All API limits reached.');
            }
        } catch (error) {
            if (i === REMOVE_BG_KEYS.length - 1) throw error;
        }
    }
}
window.forceImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const uploadDiv = event.target.nextElementSibling;
    const originalHTML = uploadDiv.innerHTML;
    uploadDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-[#4fb3d9]"></i><p class="text-[10px] tracking-widest uppercase font-bold text-[#4fb3d9]">Processing AI...</p>';
    event.target.value = '';
    try {
        const noBgBlob = await processImageWithoutBackground(file);
        const reader = new FileReader();
        reader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                img.scaleToWidth(150);
                if (typeof canvasInstance !== 'undefined' && canvasInstance) {
                    canvasInstance.add(img);
                    canvasInstance.centerObject(img);
                    canvasInstance.setActiveObject(img);
                    canvasInstance.renderAll();
                }
            });
        };
        reader.readAsDataURL(noBgBlob);
    } catch (error) {
        const fallbackReader = new FileReader();
        fallbackReader.onload = function(f) {
            fabric.Image.fromURL(f.target.result, function(img) {
                img.scaleToWidth(150);
                if (typeof canvasInstance !== 'undefined' && canvasInstance) {
                    canvasInstance.add(img);
                    canvasInstance.centerObject(img);
                    canvasInstance.setActiveObject(img);
                    canvasInstance.renderAll();
                }
            });
        };
        fallbackReader.readAsDataURL(file);
    } finally {
        uploadDiv.innerHTML = originalHTML;
    }
};
function initStudioCanvas() {
    if (canvasInstance) return;
    const wrapper = document.getElementById('canvas-wrapper');
    if(!wrapper) return;
    const canvasWidth = wrapper.clientWidth || 400;
    const canvasHeight = wrapper.clientHeight || 500;
    canvasInstance = new fabric.Canvas('studioCanvas', {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 'transparent',
        selection: true,
        preserveObjectStacking: true 
    });
    fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#1e1e1e',
        cornerStrokeColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        cornerSize: 12,
        padding: 8,
        cornerStyle: 'circle',
        borderDashArray: [4, 4],
        borderScaleFactor: 2
    });
    setupCanvasEvents();
    attachPriceEvents();
}window.addTextToStudio = function() {
    const textInputEl = document.getElementById('studioTextInput');
    if(!textInputEl) return;
    const textInput = textInputEl.value;
    if (!textInput) {
        showToast("Please enter some text", "warning");
        return;
    }
    if (!canvasInstance) return;
    const colorEl = document.getElementById('studioTextColor');
    const fontEl = document.getElementById('studioTextFont');
    const selectedColor = colorEl ? colorEl.value : '#ffffff';
    const selectedFont = fontEl ? fontEl.value : 'Montserrat';
    const textObj = new fabric.Text(textInput, {
        left: 150,
        top: 150,
        fontFamily: selectedFont,
        fill: selectedColor,
        fontSize: 40,
        selectable: true
    });
    canvasInstance.add(textObj);   
    canvasInstance.setActiveObject(textObj); 
    canvasInstance.renderAll(); 
    textInputEl.value = '';
    showToast("Text added!", "success");
    if (typeof updateDynamicPrice === 'function') updateDynamicPrice();
};
window.clearStudioCanvas = function() {
    if (!canvasInstance) return;
    canvasInstance.clear();
    showToast("Design reset completed", "info");
};
async function generateFinalProof() {
    designState[currentSide] = JSON.stringify(canvasInstance.toJSON());
    const cw = canvasInstance.getWidth();
    const ch = canvasInstance.getHeight();
    const compCanvas = document.createElement('canvas');
    compCanvas.width = cw * 2;
    compCanvas.height = ch;
    const ctx = compCanvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, compCanvas.width, compCanvas.height);
    const drawSide = async (side, offsetX) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            let currentSrc = document.getElementById('hoodieBase').src;
            if (side === 'front') {
                img.src = currentSrc.includes('back') ? currentSrc.replace(/back/i, 'front') : currentSrc;
            } else {
                img.src = currentSrc.includes('front') ? currentSrc.replace(/front/i, 'back') : currentSrc;
            }
            img.onload = () => {
                ctx.drawImage(img, offsetX, 0, cw, ch);
                if (designState[side]) {
                    const tempFabCanvas = document.createElement('canvas');
                    tempFabCanvas.width = cw; tempFabCanvas.height = ch;
                    const tempFab = new fabric.StaticCanvas(tempFabCanvas, { width: cw, height: ch });
                    tempFab.loadFromJSON(designState[side], () => {
                        tempFab.renderAll();
                        ctx.drawImage(tempFab.getElement(), offsetX, 0, cw, ch);
                        resolve();
                    });
                } else {
                    resolve();
                }
            };
            img.onerror = () => resolve();
        });
    };
    await drawSide('front', 0);
    await drawSide('back', cw);
    return compCanvas.toDataURL('image/png', 1.0);
}
window.addStudioToCart = async function() {    
    if (!canvasInstance) return;
    designState[currentSide] = JSON.stringify(canvasInstance.toJSON());
    let hasFront = designState.front && JSON.parse(designState.front).objects.length > 0;
    let hasBack = designState.back && JSON.parse(designState.back).objects.length > 0;
    if (!hasFront && !hasBack) {
        showToast("Please add a design to the front or back first!", "error");
        return;
    }
    showToast("Generating design proof...", "info");
    try {
        const colorInput = document.getElementById('custom-color-input');
        const requestedColor = colorInput ? colorInput.value : 'Default Black';
        const finalDesignData = await generateFinalProof();
        const sizeInput = document.querySelector('input[name="studio-size"]:checked');
        const size = sizeInput ? sizeInput.value : 'L';
        let placementText = [];
        if (hasFront) placementText.push("Front");
        if (hasBack) placementText.push("Back");
        const notesInput = document.getElementById('order-notes-input');
        const customerNotes = notesInput ? notesInput.value : '';       
        let hqFileData = '';
        const hqFileInput = document.getElementById('hq-file-input');
        if (hqFileInput && hqFileInput.files.length > 0) {
            const file = hqFileInput.files[0];
            if (file.size > 4 * 1024 * 1024) {
                showToast("File is too large! Maximum allowed size is 4MB.", "error");
                return; 
            }
            hqFileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
        cart.push({
            id: Date.now(),
            type: 'CUSTOM',
            title: 'DTF CUSTOM PRINT',
            size: size,
            price: totalCustomPrice,
            placement: placementText.join(' & '),
            color: requestedColor,
            preview: finalDesignData,
            hqFile: hqFileData,
            notes: customerNotes 
        });
        saveCart();
        toggleCart();
        animateCartIcon();
        showToast("Custom design added to cart!", "success");
    } catch (e) {
        showToast("Error generating design proof.", "error");
    }
};
function setupCanvasEvents() {
    if (!canvasInstance) return;
    canvasInstance.on('selection:created', handleSelection);
    canvasInstance.on('selection:updated', handleSelection);
    canvasInstance.on('selection:cleared', function() {
        const toolbar = document.getElementById('editing-toolbar');
        if(toolbar) toolbar.classList.add('hidden');
    });
}
function handleSelection(e) {
    const activeObject = e.selected[0];
    const toolbar = document.getElementById('editing-toolbar');
    const colorWrapper = document.getElementById('edit-color-wrapper');
    const fontWrapper = document.getElementById('edit-font-wrapper');
    const opacityWrapper = document.getElementById('edit-opacity-wrapper'); 
    if (!activeObject || !toolbar) {
        if(toolbar) toolbar.classList.add('hidden'); 
        return;
    }
    toolbar.classList.remove('hidden'); 
    if (activeObject.type === 'text') {
        if(colorWrapper) colorWrapper.style.display = 'flex';
        if(fontWrapper) fontWrapper.style.display = 'flex';
        if(opacityWrapper) opacityWrapper.style.display = 'none'; 
        const itemColor = document.getElementById('item-color');
        const itemFont = document.getElementById('item-font');
        if(itemColor) itemColor.value = activeObject.fill || '#1e1e1e';
        if(itemFont) itemFont.value = activeObject.fontFamily || 'Arial';
    } else {
        if(colorWrapper) colorWrapper.style.display = 'none';
        if(fontWrapper) fontWrapper.style.display = 'none';
        if(opacityWrapper) opacityWrapper.style.display = 'flex'; 
        const currentOpacity = activeObject.opacity !== undefined ? activeObject.opacity : 1;
        const itemOpacity = document.getElementById('item-opacity');
        const opacityVal = document.getElementById('opacity-value');
        if(itemOpacity) itemOpacity.value = currentOpacity;
        if(opacityVal) opacityVal.innerText = Math.round(currentOpacity * 100) + '%';
    }
}
window.updateDynamicPrice = function() {
    const priceDisplay = document.getElementById('dynamic-price-value') || document.getElementById('price-number');   
    if (!priceDisplay || typeof canvasInstance === 'undefined') return;
    let basePrice = BASE_PRICE; 
    let isCurrentlyBack = false;
    const hoodieBaseImg = document.getElementById('hoodieBase');
    if (hoodieBaseImg) {
        if (hoodieBaseImg.src.includes('tshirt')) basePrice = 500; 
        if (hoodieBaseImg.src.includes('back')) isCurrentlyBack = true; 
    }
    const objectsCount = canvasInstance.getObjects().length;
     if (isCurrentlyBack) {
        window.backHasDesign = (objectsCount > 0); 
    } else {
        window.frontHasDesign = (objectsCount > 0); 
    }
    let printCost = 0;
    if (window.frontHasDesign) printCost += 50; 
    if (window.backHasDesign) printCost += 50;  
    totalCustomPrice = basePrice + printCost;
    priceDisplay.innerText = totalCustomPrice;
};
function attachPriceEvents() {
    if (typeof canvasInstance !== 'undefined' && canvasInstance) {
        canvasInstance.on('object:added', window.updateDynamicPrice);
        canvasInstance.on('object:removed', window.updateDynamicPrice);
    } else {
        setTimeout(attachPriceEvents, 500);
    }
}
window.deleteSelectedObject = function() {
    if (!canvasInstance) return;
    const activeObject = canvasInstance.getActiveObject();
    if (activeObject) {
        canvasInstance.remove(activeObject); 
        canvasInstance.discardActiveObject(); 
        canvasInstance.requestRenderAll(); 
        showToast("Element deleted", "info");
    } else {
        showToast("Please select an element to delete", "warning");
    }
};
window.addEventListener('keydown', function(e) {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
        return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvasInstance) {
        const activeObject = canvasInstance.getActiveObject();
        if (activeObject) {
            window.deleteSelectedObject(); 
        }
    }
});
window.openWhatsApp = function() {
    let phone = "201220543105"; 
    let message = "أهلاً عتيق، محتاج مساعدة 🖤";
    const pdpView = document.getElementById('pdp-view');
    if (pdpView && !pdpView.classList.contains('hidden')) {
        const titleEl = document.getElementById('pdp-title');
        const priceEl = document.getElementById('pdp-price');
        let productName = titleEl ? titleEl.textContent : '';
        let productPrice = priceEl ? priceEl.textContent : '';
        message = `أهلاً عتيق، أنا بستفسر عن الهودي ده:\n*${productName}*\nسعره: ${productPrice}`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
};
window.shareDesign = async function() {
    const shareText = "🔥 صممت الهودي بتاعي بنفسي على ATEEQ STUDIOS! \nادخل صمم طقمك المخصوص من هنا:\n";
    const shareUrl = window.location.origin; 
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Custom ATEEQ Design',
                text: shareText,
                url: shareUrl
            });
            showToast("Thanks for sharing! 🖤", "success");
        } catch (err) {}
    } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
        window.open(waUrl, '_blank');
    }
};

async function fetchInstagramFeed() {
    const feedContainer = document.getElementById('insta-feed');
    if (!feedContainer) return;

    const API_URL = 'https://feeds.behold.so/XIY9sTJl0RgeFDBNI8TB';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!data || data.length === 0) return;

        data.reverse().forEach(item => {
            const imgElement = document.createElement('img');
            imgElement.src = item.mediaUrl;
            imgElement.classList.add('h-48', 'md:h-72', 'w-48', 'md:w-72', 'object-cover', 'shrink-0', 'opacity-70', 'hover:opacity-100', 'transition', 'duration-300', 'cursor-pointer');
            
            imgElement.onclick = () => window.open(item.permalink, '_blank');
            
            feedContainer.prepend(imgElement);
        });
    } catch (error) {
        console.error('Error fetching Instagram feed:', error);
    }
}

document.addEventListener('DOMContentLoaded', fetchInstagramFeed);
document.addEventListener('DOMContentLoaded', fetchInstagramFeed);
document.addEventListener('DOMContentLoaded', fetchInstagramFeed);
function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}
function forceBlackColor() {
    let attempts = 0;
    let forceInterval = setInterval(() => {
        const blackBtn = document.getElementById('default-black-btn') || document.querySelector('[data-color="Black"]');
        if (blackBtn) {
            blackBtn.click();
            if (typeof changeStudioColor === 'function') {
                changeStudioColor('#1e1e1e', blackBtn);
            }
        }
        attempts++;
        if (attempts > 10) clearInterval(forceInterval);
    }, 500);
}
window.addEventListener('load', forceBlackColor);
window.toggleHoodieSide = function() {
    const hoodie = document.getElementById('hoodieBase');
    const flipBtn = document.getElementById('sideToggleBtn');
    if (!hoodie || !canvasInstance) return;
    designState[currentSide] = JSON.stringify(canvasInstance.toJSON());   
    const ext = 'png';  
    if (currentSide === 'front') {
        currentSide = 'back';
        hoodie.src = `media/${currentProduct}-back.${ext}`; 
    } else {
        currentSide = 'front';
hoodie.src = `media/${currentProduct}-front.${ext}`;
    } 
    const textKey = currentSide === 'back' ? 'view_front' : 'view_back';
    const renderedText = siteTranslations[currentLang] ? siteTranslations[currentLang][textKey] : (currentSide === 'back' ? 'View Front' : 'View Back');
    if(flipBtn) flipBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span data-tr="${textKey}">${renderedText}</span>`;
    canvasInstance.clear();
    if (designState[currentSide]) {
        canvasInstance.loadFromJSON(designState[currentSide], canvasInstance.renderAll.bind(canvasInstance));
    }
    showToast("Switched to " + currentSide + " view", "info");
    if(typeof updateDynamicPrice === 'function') updateDynamicPrice();
};
window.changeGarment = function(garment) {
    currentProduct = garment.replace('-', ''); 
    currentSide = 'front';
document.getElementById('hoodieBase').src = 'media/' + currentProduct + '-front.png';
   const btnH = document.getElementById('btn-hoodie');
    const btnT = document.getElementById('btn-tshirt');   
    if (currentProduct === 'hoodie') {
        btnH.classList.add('text-white'); btnH.classList.remove('text-[#6e849c]');
        btnT.classList.add('text-[#6e849c]'); btnT.classList.remove('text-white');
    } else {
        btnT.classList.add('text-white'); btnT.classList.remove('text-[#6e849c]');
        btnH.classList.add('text-[#6e849c]'); btnH.classList.remove('text-white');
    }
    const sideBtn = document.getElementById('sideToggleBtn');
    const backText = siteTranslations[currentLang] ? siteTranslations[currentLang]['view_back'] : 'View Back';
    if(sideBtn) sideBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span data-tr="view_back">${backText}</span>`;    
    if(canvasInstance) canvasInstance.clear();
    designState = { front: null, back: null };
    if(typeof updateDynamicPrice === 'function') updateDynamicPrice();
};
document.addEventListener('DOMContentLoaded', () => {
    const menuLinks = document.querySelectorAll('#mobile-menu button, #mobile-menu a'); 
    
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
      document.getElementById('mobile-menu').classList.add('hidden');
        });
    });
});async function fetchInstagramPhotos() {
    const INSTA_TOKEN = 'YOUR_INSTAGRAM_ACCESS_TOKEN'; 
    const url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink&limit=6&access_token=${INSTA_TOKEN}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.data) {
            const instaFeed = document.getElementById('insta-feed');
            data.data.forEach(post => {
                if (post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM') {
                    const imgHTML = `
                        <img onclick="window.open('${post.permalink}', '_blank')" 
                             src="${post.media_url}" 
                             class="h-48 md:h-72 w-48 md:w-72 object-cover shrink-0 opacity-70 hover:opacity-100 transition duration-300 cursor-pointer" 
                             alt="Instagram Post">
                    `;
                    instaFeed.innerHTML += imgHTML;
                }
            });
        }
    } catch (error) {
        console.error('Error fetching Instagram posts:', error);
    }
}

document.addEventListener('DOMContentLoaded', fetchInstagramPhotos);
