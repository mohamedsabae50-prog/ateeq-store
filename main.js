const SUPABASE_URL = 'https://kkbejeioqltbllshhlcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_F8LXj9xjlkJKv4VQJDzoxQ_P3io41th';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isLoggedIn = false;
let currentUser = null;
let appliedDiscount = 0;
let activeCouponCode = null;
let cart = JSON.parse(localStorage.getItem('ateeq_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('ateeq_wishlist')) || [];

const BLANK_PRICE = 800;
const CUSTOM_PRICE = 850;

function saveCart() {
    localStorage.setItem('ateeq_cart', JSON.stringify(cart));
    updateCartUI();
}

function saveWishlist() {
    localStorage.setItem('ateeq_wishlist', JSON.stringify(wishlist));
    renderWishlist();
}

window.switchView = function(viewId) {
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
}

window.goHome = () => switchView('home');
window.goToShop = () => switchView('shop');
window.openStudio = function(mode, color = 'Black') {
    switchView('studio');
    if (mode === 'blank') {
        document.getElementById('studio-title').textContent = 'BLANK';
        document.getElementById('custom-fields').classList.add('hidden');
    } else {
        document.getElementById('studio-title').textContent = 'CUSTOM LAB';
        document.getElementById('custom-fields').classList.remove('hidden');
    }
    const targetSwatch = document.querySelector(`.swatch[data-color="${color}"]`);
    if (targetSwatch) targetSwatch.click();
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
                    <img src="${product.image_url}" class="absolute inset-0 w-full h-full object-cover grayscale opacity-80 group-hover:opacity-0 transition duration-700">
                    <img src="${hoverImg}" class="absolute inset-0 w-full h-full object-cover grayscale opacity-0 group-hover:opacity-80 transition duration-700">
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
}
window.applyCouponCode = async function() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const msg = document.getElementById('coupon-message');
    if (!code) { showToast("Please enter a coupon code", "error"); return; }

    try {
        const { data, error } = await supabaseClient
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('active', true)
            .single();

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
}
window.goToPDP = function(productId) {
    const product = window.shopProductsData.find(p => p.id === productId);
    if(!product) return;
    document.getElementById('pdp-title').textContent = product.name;
    document.getElementById('pdp-price').textContent = product.price + ' EGP';
    document.getElementById('main-pdp-img').src = product.image_url;
    const galleryContainer = document.getElementById('pdp-gallery');
    let galleryHTML = `<img src="${product.image_url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 grayscale hover:grayscale-0 transition">`;
    if (product.hover_image_url) {
        galleryHTML += `<img src="${product.hover_image_url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 grayscale hover:grayscale-0 transition">`;
    }
    if (product.gallery_urls && product.gallery_urls.length > 0) {
        product.gallery_urls.forEach(url => {
            galleryHTML += `<img src="${url}" onclick="document.getElementById('main-pdp-img').src=this.src" class="w-full aspect-[4/5] object-cover border border-[#333] cursor-pointer opacity-50 hover:opacity-100 grayscale hover:grayscale-0 transition">`;
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
}

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
window.parent.handleLogin = async function(e) {
    if (e) e.preventDefault(); 
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showToast("Please enter your email and password.", "error"); return; }
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if (error) throw error; 
        if (data.user) {
            isLoggedIn = true;
            currentUser = data.user;
            document.getElementById('nav-auth-btn').style.display = 'none';
            document.getElementById('nav-profile-btn').classList.remove('hidden');
            document.getElementById('nav-profile-btn').style.display = 'block';
            showToast("Welcome back to ATEEQ!", "success");
            toggleAuthModal();
            switchView('profile');
        }
    } catch (error) { showToast("Invalid Email or Password!", "error"); }
}

window.parent.handleRegister = async function(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const fullName = document.getElementById('reg-name').value;
    if (!email || !password || !fullName) { showToast("Please fill all fields.", "error"); return; }
    try {
        const { data, error } = await supabaseClient.auth.signUp({ email: email, password: password });
        if (error) throw error;
        if (data.user) {
            try { await supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName }]); } 
            catch (pErr) {}
            isLoggedIn = true;
            currentUser = data.user;
            document.getElementById('nav-auth-btn').style.display = 'none';
            document.getElementById('nav-profile-btn').classList.remove('hidden');
            document.getElementById('nav-profile-btn').style.display = 'block';
            showToast("Account created successfully!", "success");
            toggleAuthModal();
            switchView('profile');
        }
    } catch (error) { showToast(error.message, "error"); }
}

window.handleLogout = function() {
    isLoggedIn = false;
    currentUser = null;
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
  if (panel.classList.contains('translate-x-full')) {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    panel.classList.remove('translate-x-full');
  } else {
    overlay.classList.add('opacity-0', 'pointer-events-none');
    panel.classList.add('translate-x-full');
  }
}
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
    toggleCart(); switchView('checkout');
}

window.trackOrder = async function(event) {
    const serial = document.getElementById('track-serial').value.trim();
    if(!serial) { showToast("Please enter a valid serial number", "error"); return; }
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Searching...';
    btn.disabled = true;
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
    finally { btn.innerHTML = originalText; btn.disabled = false; }
};
window.submitOrder = async function(event) {
    event.preventDefault();
    const email = document.getElementById('chk-email').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!isLoggedIn || !currentUser) { showToast("Please log in to complete your order.", "error"); return; }

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

        const { error } = await supabaseClient.from('orders').insert([{
            user_id: currentUser.id, serial_number: serialNumber, total_amount: totalAmount,
            payment_method: paymentMethod, status: 'Pending', full_name: customerName,
            phone: customerPhone, address: customerAddress, items: cart 
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
        modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); }, 50);

        cart = []; 
        appliedDiscount = 0;
        activeCouponCode = null;
        saveCart();
    } catch (error) { 
        showToast("Failed to place order.", "error"); 
    } finally {
        submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false;
    }
}

window.closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); switchView('home'); }, 500);
}

window.addToWishlist = function() {
    if (!isLoggedIn) {
        toggleAuthModal(); showToast("Please Log In to add items to your wishlist.", "error"); return;
    }
    const title = document.getElementById('pdp-title').textContent;
    const exists = wishlist.find(item => item.title === title);
    if(exists) { showToast('Item is already in your Wishlist!', 'info'); return; }
    const product = window.shopProductsData.find(p => p.name === title);
    const imgUrl = product ? product.image_url : "";
    const priceText = document.getElementById('pdp-price').textContent;
    const price = parseFloat(priceText.replace(' EGP', ''));
    wishlist.push({ title: title, price: price, image_url: imgUrl });
    saveWishlist();
    showToast('Added to wishlist!', 'success');
}

window.renderWishlist = function() {
    const container = document.getElementById('wishlist-container');
    if(!container) return;
    if(wishlist.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-xs tracking-widest uppercase text-center col-span-full mt-10">Your wishlist is empty.</p>';
        return;
    }
    container.innerHTML = wishlist.map((item, index) => `
    <div class="bg-[#0a0a0a] border border-[#222] p-4 group relative transition hover:border-white">
        <button onclick="removeFromWishlist(${index})" class="absolute top-4 right-4 z-10 text-gray-500 hover:text-red-500 transition text-lg"><i class="fa-solid fa-trash"></i></button>
        <div class="w-full aspect-[4/5] bg-black overflow-hidden relative mb-4 flex items-center justify-center p-4">
            <img src="${item.image_url}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="${item.title}">
        </div>
        <h4 class="text-white display-font text-lg uppercase">${item.title}</h4>
        <p class="text-gray-400 text-[10px] tracking-widest uppercase font-bold mt-1 mb-4">${item.price} EGP</p>
        <button onclick="goToPDP_ByName('${item.title}')" class="w-full border border-[#333] hover:bg-white hover:text-black text-white py-3 text-[10px] tracking-widest uppercase font-bold transition">View Product</button>
    </div>`).join('');
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
    const wishlistContent = document.getElementById('wishlist-container');
    if (tabName === 'history') {
        if(tabHistory) { tabHistory.classList.remove('border-transparent', 'text-gray-500'); tabHistory.classList.add('border-white', 'text-white'); }
        if(tabWishlist) { tabWishlist.classList.remove('border-white', 'text-white'); tabWishlist.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) ordersContent.classList.replace('hidden', 'block');
        if(wishlistContent) { wishlistContent.classList.remove('grid'); wishlistContent.classList.add('hidden'); }
        if (typeof fetchUserOrders === 'function') fetchUserOrders();
    } else if (tabName === 'wishlist') {
        if(tabWishlist) { tabWishlist.classList.remove('border-transparent', 'text-gray-500'); tabWishlist.classList.add('border-white', 'text-white'); }
        if(tabHistory) { tabHistory.classList.remove('border-white', 'text-white'); tabHistory.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) { ordersContent.classList.remove('block'); ordersContent.classList.add('hidden'); }
        if(wishlistContent) { wishlistContent.classList.remove('hidden'); wishlistContent.classList.add('grid'); }
        renderWishlist();
    }
}

window.fetchUserOrders = async function() {
    if (!isLoggedIn || !currentUser) return;
    const container = document.getElementById('orders-container');
    if (!container) return;
    try {
        const { data: orders, error } = await supabaseClient.from('orders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (error) throw error;
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center mt-10">
                    <i class="fa-solid fa-box-open text-4xl text-[#333] mb-4"></i>
                    <p class="text-gray-500 text-xs tracking-widest uppercase">You haven't placed any orders yet.</p>
                    <button onclick="switchView('shop')" class="mt-6 border border-[#333] text-white px-8 py-3 text-[10px] tracking-widest uppercase font-bold hover:bg-white hover:text-black transition">Start Shopping</button>
                </div>`;
            return;
        }
        container.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const statusColor = order.status === 'Pending' ? 'text-yellow-500 border-yellow-500' : 'text-green-500 border-green-500';
            return `
            <div class="border border-[#222] p-6 relative bg-[#050505]">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <p class="text-gray-500 text-[10px] tracking-widest uppercase mb-1">Order #${order.serial_number}</p>
                        <p class="text-white text-xs tracking-widest uppercase font-bold">Placed on ${date}</p>
                    </div>
                    <span class="text-[10px] tracking-widest uppercase font-bold border px-3 py-1 rounded-full ${statusColor}">${order.status}</span>
                </div>
                <div class="border-t border-[#222] pt-6 flex justify-between items-center">
                    <div><p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Payment Method</p><p class="text-white text-xs tracking-widest uppercase font-bold">${order.payment_method}</p></div>
                    <div class="text-right"><p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Total Amount</p><p class="text-white text-lg tracking-widest font-bold">${order.total_amount} EGP</p></div>
                </div>
            </div>`;
        }).join('');
    } catch (error) { container.innerHTML = `<p class="text-center text-red-500 text-xs tracking-widest uppercase mt-10">Failed to load orders.</p>`; }
}

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

window.parent.saveProfileData = async function(e) {
    if (e) e.preventDefault();
    const newName = document.getElementById('edit-name').value;
    const newPhone = document.getElementById('edit-phone').value;
    const newAge = document.getElementById('edit-age').value;
    const newCity = document.getElementById('edit-city').value;
    try {
        const { error } = await supabaseClient.from('profiles').update({
            full_name: newName, phone: newPhone, age: newAge ? parseInt(newAge) : null, city: newCity
        }).eq('id', currentUser.id);
        if (error) throw error;
        showToast("Profile Updated Successfully!", "success");
        toggleSettingsModal();
    } catch (error) { showToast("Failed to update profile.", "error"); }
}

document.addEventListener('DOMContentLoaded', () => {
   updateCartUI();
   renderWishlist();
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

   const designLayer = document.getElementById('designLayer');
   const uploadInput = document.getElementById('designUpload');
   const placementSelect = document.getElementById('placement');
   const hoodieBase = document.getElementById('hoodieBase');
   let selectedColor = 'Black';

   document.querySelectorAll('.swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(b => b.classList.remove('ring-white'));
        btn.classList.add('ring-white');
        if(hoodieBase) {
            hoodieBase.className = 'w-full h-full object-contain transition duration-500 p-10 ' + btn.dataset.filter;
            hoodieBase.dataset.color = btn.dataset.color;
        }
        const clbl = document.getElementById('colorLabel');
        if(clbl) clbl.textContent = btn.dataset.color;
        selectedColor = btn.dataset.color;
      });
   });

   const placementStyles = {
      center: { width:'25%', left:'50%', top:'48%', transform:'translate(-50%,-50%)', maxHeight:'35%' },
      pocket: { width:'10%', left:'62%', top:'38%', transform:'translate(-50%,-50%)', maxHeight:'15%' },
      back:   { width:'40%', left:'50%', top:'52%', transform:'translate(-50%,-50%)', maxHeight:'50%' }
   };

   function applyPlacement(){
      if(!placementSelect || !designLayer) return;
      Object.assign(designLayer.style, placementStyles[placementSelect.value]);
   }

   if(uploadInput) {
        uploadInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            if(designLayer) {
                designLayer.src = ev.target.result;
                designLayer.classList.remove('hidden');
                applyPlacement();
            }
          };
          reader.readAsDataURL(file);
          document.getElementById('uploadLabel').textContent = "File Selected";
          document.getElementById('uploadLabel').classList.add('text-white');
        });
   }
   if(placementSelect) placementSelect.addEventListener('change', applyPlacement);

   const orderForm = document.getElementById('orderForm');
   if(orderForm) {
        orderForm.addEventListener('submit', function(e){
          e.preventDefault();
          const sizeInput = document.querySelector('input[name="size"]:checked');
          cart.push({
              id: Date.now(), type: 'CUSTOM', title: 'DTF CUSTOM PRINT',
              size: sizeInput ? sizeInput.value : 'L', price: CUSTOM_PRICE,
              placement: placementSelect ? placementSelect.options[placementSelect.selectedIndex].dataset.label : 'Center Chest'
          });
          saveCart();
          toggleCart(); 
          animateCartIcon();
        });
   }

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
       if (document.hidden) document.title = cart.length > 0 ? `(${cart.length}) عـتـيـق | طقمك في انتظارك 🖤` : "عـتـيـق | We miss you 🖤";
       else document.title = originalTitle;
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
