const SUPABASE_URL = 'https://kkbejeioqltbllshhlcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_F8LXj9xjlkJKv4VQJDzoxQ_P3io41th';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isLoggedIn = false;
let currentSide = 'front';
let designState = { front: null, back: null };
let currentUser = null;
let appliedDiscount = 0;
let activeCouponCode = null;
let cart = JSON.parse(localStorage.getItem('ateeq_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('ateeq_wishlist')) || [];
let userOrders = []; 

const BLANK_PRICE = 800;
const CUSTOM_PRICE = 850;

function saveCart() {
    localStorage.setItem('ateeq_cart', JSON.stringify(cart));
    updateCartUI();
    trackAbandonedCart(); // تشغيل متتبع السلة المتروكة
}

// الدالة الذكية لتسجيل السلة المتروكة في الداتابيز
async function trackAbandonedCart() {
    // لو العميل مش مسجل دخول، مش هنعرف نبعتله إيميل فمش هنسجلها
    if (!isLoggedIn || !currentUser) return; 
    
    try {
        if (cart.length > 0) {
            // تنظيف السلة من الصور الضخمة قبل الحفظ زي ما عملنا في الأوردر
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
            // لو السلة فضيت (أو اشترى خلاص)، نمسح السلة المتروكة عشان منبعتلوش إيميل بالغلط
            await supabaseClient.from('abandoned_carts').delete().eq('user_id', currentUser.id);
        }
    } catch (error) { console.error("Cart tracking error:", error); }
}
function saveWishlist() {
    localStorage.setItem('ateeq_wishlist', JSON.stringify(wishlist));
    renderWishlist();
}

window.switchView = function(viewId, addToHistory = true) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block', 'flex'); 
    });
    const targetView = document.getElementById(viewId + '-view');
    if (targetView) {
        if (viewId === 'studio') {
            targetView.classList.remove('hidden');
            targetView.classList.add('flex');
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
    }
}

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

window.shopProductsData = [];
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
                <h4 class="text-white display-font text-xl uppercase truncate">${product.name}</h4>
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
        container.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Failed to load products. Check console.</div>';
    }
};

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
    } catch (err) {
        console.error(err);
    }
};

window.goToPDP = function(productId) {
    const product = window.shopProductsData.find(p => p.id === productId);
    if(!product) return;
    document.getElementById('pdp-title').textContent = product.name;
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
    switchView('pdp');
}
window.showToast = function(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
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
}

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
}

function toggleSizeGuide() {
    const modal = document.getElementById('size-modal');
    modal.classList.toggle('hidden');
    setTimeout(() => modal.classList.toggle('opacity-0'), 10);
}

async function __handleLogin(e) {
    if (e) e.preventDefault();
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
    // 1. إرسال أمر فعلي لقاعدة البيانات بإنهاء الجلسة تماماً
    await supabaseClient.auth.signOut();
    
    isLoggedIn = false;
    currentUser = null;
    
    // 2. تصفير السلة والمفضلة عشان الأكونت الجديد يبدأ على نظافة
    cart = [];
    wishlist = [];
    saveCart();
    saveWishlist();
    
    // 3. مسح الإيميل القديم من صفحة الدفع
    const chkEmail = document.getElementById('chk-email');
    if (chkEmail) chkEmail.value = '';
    
    toggleSettingsModal();
    document.getElementById('nav-auth-btn').style.display = ''; 
    document.getElementById('nav-profile-btn').style.display = 'none';
    switchView('home');
    showToast("Logged out successfully.", "info");
}

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
              <p class="text-gray-500 text-xs tracking-widest uppercase mb-6">Your cart is feeling empty.</p>
              <div class="flex flex-col gap-3 w-full max-w-[250px] mx-auto">
                  <button onclick="toggleCart(); switchView('shop');" class="w-full border border-[#333] text-white py-4 text-[10px] uppercase tracking-widest font-bold hover:border-white hover:bg-white hover:text-black transition">Shop The Collection</button>
                  <button onclick="toggleCart(); openStudio('custom');" class="w-full border border-[#333] text-gray-500 py-4 text-[10px] uppercase tracking-widest hover:border-white hover:text-white transition">Design Custom</button>
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
}

window.goToCheckout = function() {
    if (!isLoggedIn) {
        toggleCart(); toggleAuthModal(); 
        showToast("Please Log In or Register first to proceed.", "error"); return;
    }
    if(cart.length === 0) { showToast("Your cart is empty!", "error"); return; }
    
    // 4. سحب إيميل الأكونت الحالي ووضعه أوتوماتيك في خانة الدفع
    if (currentUser && currentUser.email) {
        const chkEmail = document.getElementById('chk-email');
        if (chkEmail) {
            chkEmail.value = currentUser.email;
            chkEmail.readOnly = true; // اختياري: عشان العميل ميغيروش ويبوظ تأكيد الطلب
            chkEmail.classList.add('opacity-70', 'cursor-not-allowed');
        }
    }
    
    toggleCart(); switchView('checkout');
}

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
};

window.submitOrder = async function(event) {
    event.preventDefault();
    const emailEl = document.getElementById('chk-email');
    const email = emailEl ? emailEl.value : '';
    const paymentInput = document.querySelector('input[name="payment"]:checked');
    if (!paymentInput) { showToast("Please select a payment method.", "error"); return; }
    const paymentMethod = paymentInput.value;
    
    if (!isLoggedIn || !currentUser) { showToast("Please log in to complete your order.", "error"); return; }
    
    // 🚀 فحص وجود إيصال الدفع لو العميل اختار إنستاباي
    const receiptInput = document.getElementById('instapay-receipt');
    let receiptFile = null;
    if (paymentMethod === 'Instapay') {
        if (!receiptInput || !receiptInput.files || receiptInput.files.length === 0) {
            showToast("Please upload your Instapay payment screenshot.", "error");
            return; // توقيف الدفع لو مرفعش الصورة
        }
        receiptFile = receiptInput.files[0];
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    const p1 = document.getElementById('chk-phone1') ? document.getElementById('chk-phone1').value : '';
    const p2 = document.getElementById('chk-phone2') ? document.getElementById('chk-phone2').value : '';
    const phoneRegex = /^01[0125][0-9]{8}$/;
    
    if (!phoneRegex.test(p1)) {
        showToast("Please enter a valid 11-digit Egyptian phone number", "error");
        return; 
    }
    const customerPhone = p2 ? `${p1} (WhatsApp: ${p2})` : p1;
    
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        let totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
        if (appliedDiscount > 0) {
            totalAmount = totalAmount - (totalAmount * (appliedDiscount / 100));
        }
        
        let serialNumber = 'ATQ-2026-' + Math.floor(100000 + Math.random() * 900000);
        const customerName = document.getElementById('chk-name') ? document.getElementById('chk-name').value : 'N/A';
        const mainAddr = document.getElementById('chk-address') ? document.getElementById('chk-address').value : '';
        const bldg = document.getElementById('chk-building') ? document.getElementById('chk-building').value : '';
        const floor = document.getElementById('chk-floor') ? document.getElementById('chk-floor').value : '';
        const apt = document.getElementById('chk-apt') ? document.getElementById('chk-apt').value : '';
        const mark = document.getElementById('chk-landmark') ? document.getElementById('chk-landmark').value : '';
        const customerAddress = `${mainAddr}, Bldg: ${bldg}, Floor: ${floor}, Apt: ${apt} ${mark ? '(Mark: '+mark+')' : ''}`;

        // 🚀 رفع صورة الإيصال للـ Storage وتوليد الرابط الخاص بيها
        let receiptUrl = null;
        if (receiptFile) {
            showToast("Uploading receipt image...", "info");
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt-${serialNumber}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('receipts')
                .upload(`public/${fileName}`, receiptFile);
                
            if (uploadError) {
                console.error("Receipt Upload Error:", uploadError);
                throw new Error("Failed to upload receipt. Please try again.");
            }
            
            const { data: publicUrlData } = supabaseClient.storage.from('receipts').getPublicUrl(`public/${fileName}`);
            receiptUrl = publicUrlData.publicUrl;
        }

        const cleanCartForDB = cart.map(item => {
            if (item.type === 'CUSTOM') {
                const { preview, ...restOfItem } = item; 
                return restOfItem; 
            }
            return item;
        });

        // 🚀 حفظ الأوردر بالكامل في قاعدة البيانات + رابط الإيصال
        const { error } = await supabaseClient.from('orders').insert([{
            user_id: currentUser.id, 
            serial_number: serialNumber, 
            total_amount: totalAmount,
            payment_method: paymentMethod, 
            status: 'Pending', 
            full_name: customerName,
            phone: customerPhone, 
            address: customerAddress, 
            items: cleanCartForDB,
            receipt_url: receiptUrl // ربط الإيصال بالأوردر
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
                serial_number: serialNumber, email: email, total_amount: totalAmount, payment_method: paymentMethod
            });
        } catch (emailErr) {}
        
        document.getElementById('order-serial').textContent = serialNumber;
        document.getElementById('user-email-confirm').textContent = email;
        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden'); 
        setTimeout(() => { modal.classList.remove('opacity-0'); }, 50);
        
        cart = []; 
        appliedDiscount = 0;
        activeCouponCode = null;
        saveCart();
        
    } catch (error) { 
        console.error("Order Failed: ", error);
        showToast(error.message || "Failed to place order.", "error"); 
    } finally {
        submitBtn.innerHTML = originalBtnText; 
        submitBtn.disabled = false;
    }
};

window.closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); switchView('home'); }, 500);
}

window.removeFromWishlist = function(index) {
    wishlist.splice(index, 1); saveWishlist(); showToast('Removed from wishlist.', 'info');
}

window.goToPDP_ByName = function(name) {
    const p = window.shopProductsData.find(x => x.name === name);
    if(p) goToPDP(p.id);
}

window.switchProfileTab = function(tabName) {
    const tabHistory = document.getElementById('tab-history');
    const tabWishlist = document.getElementById('tab-wishlist');
    const ordersContent = document.getElementById('tab-orders');
    const wishlistContent = document.getElementById('tab-wishlist-content');
    if (tabName === 'history') {
        if(tabHistory) { tabHistory.classList.remove('border-transparent', 'text-gray-500'); tabHistory.classList.add('border-white', 'text-white'); }
        if(tabWishlist) { tabWishlist.classList.remove('border-white', 'text-white'); tabWishlist.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) ordersContent.classList.replace('hidden', 'block');
        if(wishlistContent) wishlistContent.classList.replace('block', 'hidden');
        if (typeof fetchUserOrders === 'function') fetchUserOrders();
    } else if (tabName === 'wishlist') {
        if(tabWishlist) { tabWishlist.classList.remove('border-transparent', 'text-gray-500'); tabWishlist.classList.add('border-white', 'text-white'); }
        if(tabHistory) { tabHistory.classList.remove('border-white', 'text-white'); tabHistory.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) ordersContent.classList.replace('block', 'hidden');
        if(wishlistContent) wishlistContent.classList.replace('hidden', 'block');
        if (typeof fetchUserWishlist === 'function') fetchUserWishlist();
    }
}

window.fetchUserOrders = async function() {
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
            <div onclick="openUserOrderModal('${order.id}')" class="border border-[#222] p-6 bg-[#050505] cursor-pointer hover:border-gray-500 transition-all duration-300">
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
    } catch (error) {
        console.error("Error:", error.message);
    }
};

window.toggleSettingsModal = async function() {
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

async function __saveProfileData(e) {
    if (e) e.preventDefault();
    const newNameEl = document.getElementById('edit-name');
    const newPhoneEl = document.getElementById('edit-phone');
    const newAgeEl = document.getElementById('edit-age');
    const newCityEl = document.getElementById('edit-city');
    const newName = newNameEl ? newNameEl.value : '';
    const newPhone = newPhoneEl ? newPhoneEl.value : '';
    const newAge = newAgeEl ? newAgeEl.value : '';
    const newCity = newCityEl ? newCityEl.value : '';
    try {
        const { error } = await supabaseClient.from('profiles').update({
            full_name: newName, phone: newPhone, age: newAge ? parseInt(newAge) : null, city: newCity
        }).eq('id', currentUser ? currentUser.id : null);
        if (error) throw error;
        showToast("Profile Updated Successfully!", "success");
        if (typeof toggleSettingsModal === 'function') toggleSettingsModal();
    } catch (error) { showToast("Failed to update profile.", "error"); }
}

window.saveProfileData = __saveProfileData;
try { if (window.parent) window.parent.saveProfileData = __saveProfileData; } catch(e) {}

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
    content.innerHTML = `<div class="flex justify-between items-center border-b border-[#222] pb-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Serial Number</span><span class="text-white font-bold">${order.serial_number}</span></div><div class="flex justify-between items-center border-b border-[#222] py-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Date</span><span class="text-white">${date}</span></div><div class="py-3 border-b border-[#222]"><div class="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Items Ordered</div>${itemsHtml}</div><div class="flex justify-between items-center border-b border-[#222] py-2"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Payment Method</span><span class="text-white">${order.payment_method}</span></div><div class="flex justify-between items-center pt-3"><span class="text-gray-500 text-[10px] uppercase tracking-widest">Total Amount</span><span class="text-white font-bold text-lg">${order.total_amount} EGP</span></div>`;
    const modal = document.getElementById('user-order-modal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
};

window.closeUserOrderModal = function() {
    const modal = document.getElementById('user-order-modal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
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
        const { data, error } = await supabaseClient
            .from('wishlist')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);
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
        const wishlistTab = document.getElementById('tab-wishlist-content');
        if (wishlistTab && !wishlistTab.classList.contains('hidden')) {
            fetchUserWishlist();
        }
    } catch(err) {
        console.error("Wishlist Error:", err.message);
        if (icon) icon.className = "fa-regular fa-heart text-white";
    }
}

window.fetchUserWishlist = async function() {
    if (!isLoggedIn || !currentUser) return;
    const container = document.getElementById('wishlist-container');
    if (!container) return;
    container.innerHTML = '<p class="text-center col-span-full text-gray-500 text-xs tracking-widest uppercase py-10"><i class="fa-solid fa-circle-notch fa-spin text-xl"></i></p>';
    try {
        const { data: wishlistItems, error } = await supabaseClient
            .from('wishlist')
            .select(`product_id, products (*)`)
            .eq('user_id', currentUser.id);
        if (error) throw error;
        if (!wishlistItems || wishlistItems.length === 0) {
            container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-center py-10"><i class="fa-regular fa-heart text-4xl text-[#222] mb-4"></i><p class="text-gray-500 text-xs tracking-widest uppercase">Your wishlist is empty.</p></div>`;
            return;
        }
        container.innerHTML = wishlistItems.map(item => {
            const prod = item.products;
            if (!prod) return '';
            return `<div class="group relative bg-[#050505] border border-[#111] p-4 transition hover:border-[#222]"><div class="relative overflow-hidden aspect-square mb-4 cursor-pointer" onclick="switchView('shop')"><img src="${prod.image_url}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500"></div><div class="flex justify-between items-start"><div><h4 class="text-xs uppercase text-white font-bold tracking-wider">${prod.name}</h4><p class="text-[10px] text-gray-500 mt-1">${prod.price} EGP</p></div><button onclick="toggleWishlist('${prod.id}', event, this)" class="border border-[#333] hover:border-white w-14 h-14 flex items-center justify-center transition text-white"><i class="fa-solid fa-heart text-red-500"></i></button></div></div>`;
        }).join('');
    } catch(err) {
        console.error(err);
        container.innerHTML = '<p class="text-center col-span-full text-red-500 text-xs tracking-widest uppercase">Error loading wishlist.</p>';
    }
}

window.toggleWishlistFromPDP = function(event, btnElement) {
    const titleElement = document.getElementById('pdp-title');
    if (!titleElement) return;
    const title = titleElement.textContent.trim();
    if (window.shopProductsData && window.shopProductsData.length > 0) {
        const product = window.shopProductsData.find(p => p.name.toUpperCase() === title.toUpperCase());
        if (product && product.id) {
            toggleWishlist(product.id, event, btnElement);
        } else {
            console.error("Product ID not found for: ", title);
        }
    } else {
        console.error("Shop products data is not loaded yet.");
    }
}

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
    });
    document.querySelectorAll('.filter-size-btn').forEach(btn => {
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
        let playPromise = music.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => { isPlaying = true; musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300'; })
            .catch(error => {
                isPlaying = false; musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300';
                document.body.addEventListener('click', function playOnFirstClick() {
                    if (!isPlaying) { music.currentTime = 20; music.play(); isPlaying = true; musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300'; }
                    document.body.removeEventListener('click', playOnFirstClick);
                }, { once: true });
            });
        }
        music.addEventListener('ended', function() { this.currentTime = 20; this.play(); });
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (isPlaying) { music.pause(); musicIcon.className = 'fa-solid fa-volume-xmark text-xs text-gray-300'; } 
            else { if (music.currentTime < 20) music.currentTime = 20; music.play(); musicIcon.className = 'fa-solid fa-volume-high text-xs text-gray-300'; }
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
                    document.getElementById('sticky-title').textContent = document.getElementById('pdp-title').textContent;
                    document.getElementById('sticky-img').src = document.getElementById('main-pdp-img').src;
                } else stickyBar.classList.add('translate-y-full');
            });
        }, { threshold: 0 }); 
        observer.observe(mainAddBtn);
    }
});

let canvasInstance = null;
const REMOVE_BG_KEYS = ['o1AkssPAwYnCxy3MuyhGqjki', 'siyGKSwHaciGGjxSZQWsiWr6'];

async function processImageWithoutBackground(imageFile) {
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

function initStudioCanvas() {
    if (canvasInstance) return;

    const wrapper = document.getElementById('canvas-wrapper');
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
        cornerColor: '#ffffff',
        cornerStrokeColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        cornerSize: 12,
        padding: 8,
        cornerStyle: 'circle',
        borderDashArray: [4, 4],
        borderScaleFactor: 2
    });
    document.getElementById('studioImageUpload').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const labelSpan = this.previousElementSibling;
        const iconElement = labelSpan.previousElementSibling;
        const originalIconClass = iconElement.className;
        const originalText = labelSpan.textContent;
        iconElement.className = "fa-solid fa-circle-notch fa-spin text-2xl mb-3 text-white";
        labelSpan.textContent = "Removing Background...";
        showToast("Magic Eraser is working... Please wait", "info");
        try {
            const blob = await processImageWithoutBackground(file);
            const url = URL.createObjectURL(blob);
            fabric.Image.fromURL(url, function(img) {
                img.scaleToWidth(canvasInstance.getWidth() * 0.7);
                img.set({
                    left: canvasInstance.getWidth() / 2,
                    top: canvasInstance.getHeight() / 2,
                    originX: 'center',
                    originY: 'center'
                });
                canvasInstance.add(img);
                canvasInstance.setActiveObject(img);
                canvasInstance.renderAll();
                showToast("Background removed successfully!", "success");
            });
        } catch (error) {
            console.error(error);
            showToast("Failed to remove background. Loading original image.", "error");
            const fallbackReader = new FileReader();
            fallbackReader.onload = function(f) {
                fabric.Image.fromURL(f.target.result, function(img) {
                    img.scaleToWidth(canvasInstance.getWidth() * 0.7);
                    img.set({ left: canvasInstance.getWidth() / 2, top: canvasInstance.getHeight() / 2, originX: 'center', originY: 'center' });
                    canvasInstance.add(img);
                    canvasInstance.setActiveObject(img);
                    canvasInstance.renderAll();
                });
            };
            fallbackReader.readAsDataURL(file);
        } finally {
            iconElement.className = originalIconClass;
            labelSpan.textContent = originalText;
            e.target.value = '';
        }
    });
    document.querySelectorAll('input[name="studio-size"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('input[name="studio-size"] + div').forEach(div => {
                div.classList.remove('bg-white', 'text-black', 'border-white');
            });
            if(this.checked) {
                this.nextElementSibling.classList.add('bg-white', 'text-black', 'border-white');
            }
        });
    });
    document.querySelector('input[name="studio-size"]:checked').dispatchEvent(new Event('change'));
}

window.addTextToStudio = function() {
    const input = document.getElementById('studioTextContainer');
    if (!input || !input.value.trim() || !canvasInstance) return;
    const text = new fabric.Text(input.value.toUpperCase(), {
        left: canvasInstance.getWidth() / 2,
        top: canvasInstance.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Space Grotesk',
        fontSize: 24,
        fill: '#ffffff',
        fontWeight: 'bold',
        textAlign: 'center'
    });
    canvasInstance.add(text);
    canvasInstance.setActiveObject(text);
    canvasInstance.renderAll();
    input.value = '';
};

window.clearStudioCanvas = function() {
    if (!canvasInstance) return;
    canvasInstance.clear();
    showToast("Design reset completed", "info");
};

window.addStudioToCart = function() {
    if (!canvasInstance) return;
    const sizeInput = document.querySelector('input[name="studio-size"]:checked');
    const size = sizeInput ? sizeInput.value : 'L';
    const finalDesignData = canvasInstance.toDataURL({ format: 'png', quality: 1.0 });
    cart.push({
        id: Date.now(),
        type: 'CUSTOM',
        title: 'DTF CUSTOM PRINT',
        size: size,
        price: CUSTOM_PRICE,
        placement: currentSide === 'front' ? 'Center Chest' : 'Back Print',
        preview: finalDesignData
    });
    saveCart();
    toggleCart();
    animateCartIcon();
    showToast("Custom design added to cart!", "success");
};

const originalSwitchView = window.switchView;
window.switchView = function(viewId, addToHistory = true) {
    originalSwitchView(viewId, addToHistory);
    if (viewId === 'studio') {
        setTimeout(initStudioCanvas, 150);
    }
};

window.deleteActiveObject = function() {
    if (!canvasInstance) return;
    const activeObject = canvasInstance.getActiveObject();
    if (activeObject) {
        canvasInstance.remove(activeObject);
        canvasInstance.discardActiveObject();
        canvasInstance.renderAll();
        showToast("Item deleted", "info");
    } else {
        showToast("Please select an item to delete first", "error");
    }
};

window.toggleHoodieSide = function() {
    const hoodie = document.getElementById('hoodieBase');
    const flipBtn = document.getElementById('flip-btn');
    if (!hoodie || !canvasInstance) return;
    designState[currentSide] = JSON.stringify(canvasInstance.toJSON());
    if (currentSide === 'front') {
        currentSide = 'back';
        hoodie.src = 'back.webp';
        flipBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> View Front';
    } else {
        currentSide = 'front';
        hoodie.src = 'front.webp';
        flipBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> View Back';
    }
    canvasInstance.clear();
    if (designState[currentSide]) {
        canvasInstance.loadFromJSON(designState[currentSide], canvasInstance.renderAll.bind(canvasInstance));
    }
    showToast("Switched to " + currentSide + " view", "info");
};

window.changeStudioColor = function(color) {
    const hoodie = document.getElementById('hoodieBase');
    if (!hoodie) return;
    if (color === 'Black') {
        hoodie.src = currentSide === 'front' ? "front.webp" : "back.webp";
    }
};
// 1. الواتساب الذكي
window.openWhatsApp = function() {
    let phone = "201220543105"; // رقمك
    let message = "أهلاً عتيق، محتاج مساعدة 🖤";
    
    // لو العميل فاتح صفحة منتج، نسحب اسم المنتج وسعره
    const pdpView = document.getElementById('pdp-view');
    if (pdpView && !pdpView.classList.contains('hidden')) {
        let productName = document.getElementById('pdp-title').textContent;
        let productPrice = document.getElementById('pdp-price').textContent;
        message = `أهلاً عتيق، أنا بستفسر عن الهودي ده:\n*${productName}*\nسعره: ${productPrice}`;
    }
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
};

// 2. إظهار وإخفاء بلوك الإنستاباي
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
};
// نصوص السياسات الرسمية المطابقة لمعايير فيسبوك وتيك توك
const legalPolicies = {
    'privacy': {
        title: 'Privacy Policy',
        content: '<p>At ATEEQ, we are committed to protecting your privacy. We collect personal information such as your name, email, phone number, and shipping address solely for the purpose of fulfilling your orders and providing customer support.</p><p>We do not sell, rent, or share your personal data with third parties. Your payment information is processed securely. By using our website, you consent to our collection and use of your information as described in this policy.</p>'
    },
    'terms': {
        title: 'Terms of Service',
        content: '<p>Welcome to ATEEQ. By accessing or using our website, you agree to be bound by these Terms of Service. All content, designs, and graphics on this site are the exclusive property of ATEEQ STUDIOS.</p><p>We reserve the right to refuse service, cancel orders, or correct any errors, inaccuracies, or omissions at any time without prior notice. Custom products generated via our Custom Lab are created specifically for you and are subject to specific return guidelines.</p>'
    },
    'refund': {
        title: 'Refund & Return Policy',
        content: '<p>We want you to be completely satisfied with your purchase. ATEEQ accepts returns and exchanges within 14 days of delivery, provided the items are unworn, unwashed, and in their original packaging.</p><p><b>Exceptions:</b> Please note that custom-designed pieces (orders made via the Custom Lab) are final sale and non-refundable unless defective. To initiate a return, please contact our support team via WhatsApp or Email.</p>'
    }
};

window.openPolicy = function(type) {
    document.getElementById('policy-title').textContent = legalPolicies[type].title;
    document.getElementById('policy-content').innerHTML = legalPolicies[type].content;
    const modal = document.getElementById('policy-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closePolicy = function() {
    const modal = document.getElementById('policy-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};
