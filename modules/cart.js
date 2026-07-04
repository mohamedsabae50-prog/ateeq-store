const safeWriteStoredArray = function(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
    } catch (error) {}
};

export const updateCartUI = function() {
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartItems = Array.isArray(window.cart) ? window.cart : [];

    if (cartCount) cartCount.textContent = cartItems.length;
    if (!cartItemsContainer) return;

    if (cartItems.length === 0) {
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
        if (cartTotal) cartTotal.textContent = '0 EGP';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = '';
    cartItems.forEach((item, index) => {
        total += Number(item.price) || 0;
        let details = `<p class="text-gray-500 text-[10px] tracking-widest uppercase mt-1">Size: ${item.size || 'L'}</p>`;
        if (item.type === 'CUSTOM') details += `<p class="text-gray-500 text-[10px] tracking-widest uppercase">Placement: ${item.placement || 'Front'}</p>`;
        cartItemsContainer.innerHTML += `
            <div class="flex justify-between items-center border-b border-[#222] pb-4">
                <div>
                    <h3 class="text-white display-font uppercase tracking-wide text-lg">${item.title || 'Product'}</h3>
                    ${details}
                    <p class="text-white text-xs font-bold mt-2">${item.price} EGP</p>
                </div>
                <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    if (cartTotal) cartTotal.textContent = `${total} EGP`;
};

export const trackAbandonedCart = async function() {
    if (!window.isLoggedIn || !window.currentUser) return;
    try {
        const cartItems = Array.isArray(window.cart) ? window.cart : [];
        if (cartItems.length > 0) {
            const cleanCart = cartItems.map(item => {
                if (item.type === 'CUSTOM') {
                    const { preview, ...rest } = item;
                    return rest;
                }
                return item;
            });
            await window.supabaseClient.from('abandoned_carts').upsert({
                user_id: window.currentUser.id,
                email: window.currentUser.email,
                cart_data: cleanCart,
                last_updated: new Date().toISOString()
            });
        } else {
            await window.supabaseClient.from('abandoned_carts').delete().eq('user_id', window.currentUser.id);
        }
    } catch (error) {}
};

export const saveWishlist = function() {
    window.wishlist = Array.isArray(window.wishlist) ? window.wishlist : [];
    safeWriteStoredArray('ateeq_wishlist', window.wishlist);
    if (typeof window.renderWishlist === 'function') window.renderWishlist();
};

export const renderWishlist = function() {
    const container = document.getElementById('wishlist-container');
    if (!container) return;

    let currentWishlist = [];
    try {
        const storedWishlist = JSON.parse(localStorage.getItem('ateeq_wishlist') || '[]');
        currentWishlist = Array.isArray(storedWishlist) ? storedWishlist : [];
    } catch (error) {
        currentWishlist = [];
    }

    if (currentWishlist.length === 0) {
        container.innerHTML = '<div class="p-8 border border-dashed border-[#1e2a36] text-center bg-[#131b23] col-span-full"><p class="text-[#6e849c] text-xs tracking-widest uppercase">Your wishlist is empty.</p></div>';
        return;
    }

    let html = '';
    currentWishlist.forEach(id => {
        const prod = Array.isArray(window.shopProductsData) ? window.shopProductsData.find(p => String(p.id) === String(id)) : null;
        if (prod) {
            html += `
                <div class="bg-[#111a22] border border-[#1e2a36] p-4 flex flex-col relative group">
                    <button onclick="window.toggleWishlistFromWishlistPage('${prod.id}', event)" class="absolute top-2 right-2 z-10 text-red-500 hover:text-white transition bg-[#090e13] p-2 rounded-full w-8 h-8 flex items-center justify-center border border-[#1e2a36]">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <img src="${prod.image_url}" class="w-full aspect-[4/5] object-cover mb-4 cursor-pointer" onclick="window.goToPDP('${prod.id}')">
                    <h4 class="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 truncate cursor-pointer" onclick="window.goToPDP('${prod.id}')">${prod.name}</h4>
                    <p class="text-[#8ea4be] text-[10px] uppercase font-bold tracking-widest">${prod.price} EGP</p>
                </div>`;
        }
    });
    container.innerHTML = html;
};

export const toggleCart = function() {
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

export const saveCart = function() {
    window.cart = Array.isArray(window.cart) ? window.cart : [];
    safeWriteStoredArray('ateeq_cart', window.cart);
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
    if (typeof window.trackAbandonedCart === 'function') window.trackAbandonedCart();
};

export const removeFromCart = function(index) {
    if (Array.isArray(window.cart)) {
        window.cart.splice(index, 1);
        saveCart();
    }
};

export const addPdpToCart = function() {
    const sizeInput = document.querySelector('input[name="pdp-size"]:checked');
    const size = sizeInput ? sizeInput.value : 'L';
    
    const titleEl = document.getElementById('pdp-title');
    const title = titleEl ? titleEl.textContent : 'Product';
    
    const priceEl = document.getElementById('pdp-price');
    const priceText = priceEl ? priceEl.textContent : '0 EGP';
    const price = parseFloat(priceText.replace(' EGP', '')) || 0;

    const isPreorder = window.currentProductIsPreorder || false;
    let finalTitle = title;
    if (isPreorder) {
        finalTitle = `[PRE-ORDER] ${title}`;
    }

    if (!Array.isArray(window.cart)) window.cart = [];

    window.cart.push({ 
        id: Date.now(), 
        product_id: window.currentProductId,
        type: 'STORE', 
        title: finalTitle, 
        size: size, 
        price: price,
        preorder: isPreorder 
    });
    
    if (typeof window.saveCart === 'function') window.saveCart();
    if (typeof window.toggleCart === 'function') window.toggleCart();
    if (typeof window.animateCartIcon === 'function') window.animateCartIcon(); 
};

export const animateCartIcon = function() {
    const cartLink = document.querySelector('a[onclick="toggleCart(); return false;"]');
    if (cartLink) {
        cartLink.style.transform = 'scale(1.2)';
        cartLink.style.color = '#fff';
        setTimeout(() => { cartLink.style.transform = 'scale(1)'; cartLink.style.color = ''; }, 300);
    }
};
