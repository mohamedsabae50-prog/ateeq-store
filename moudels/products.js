export const loadShopProducts = async function() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fa-solid fa-circle-notch fa-spin text-3xl"></i></div>';
    try {
        const { data: products, error } = await window.supabaseClient.from('products').select('*').order('id', { ascending: false });
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
};
export const goToPDP = function(productId) {
    const product = Array.isArray(window.shopProductsData) ? window.shopProductsData.find(p => String(p.id) === String(productId)) : null;
    if (!product) return;

    const titleEl = document.getElementById('pdp-title');
    const detailsEl = document.getElementById('pdp-details');
    const priceEl = document.getElementById('pdp-price');
    const mainImageEl = document.getElementById('main-pdp-img');

    if (titleEl) titleEl.textContent = product.name;
    if (detailsEl) detailsEl.innerText = product.details;
    if (priceEl) priceEl.textContent = product.price + ' EGP';
    if (mainImageEl) mainImageEl.src = product.image_url;

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
    if (galleryContainer) galleryContainer.innerHTML = galleryHTML;

    const categoryName = product.category ? product.category.toLowerCase() : 'hoodies';
    if (typeof window.renderSizes === 'function') window.renderSizes('pdp-size-container', categoryName, 'pdp-size');
    window.currentProductId = product.id;
    if (typeof window.fetchReviews === 'function') window.fetchReviews(product.id);

    if (typeof renderRelatedProducts === 'function') renderRelatedProducts(productId);
    const addToCartBtn = document.getElementById('main-add-btn');
    if (addToCartBtn) {
        if (product.stock_status === 'Out of Stock') {
            addToCartBtn.textContent = 'SOLD OUT';
            addToCartBtn.disabled = true;
            addToCartBtn.classList.add('opacity-50', 'cursor-not-allowed');
            addToCartBtn.classList.remove('cursor-pointer');
        } else {
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.disabled = false;
            addToCartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            addToCartBtn.classList.add('cursor-pointer');
        }
    }
    if (typeof window.syncHeartIcons === 'function') window.syncHeartIcons();
    if (typeof window.switchView === 'function') window.switchView('pdp');
    window.scrollTo(0, 0);
};
export const renderRelatedProducts = function(currentId) {
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
};
export const applyFilters = function() {
    const container = document.getElementById('products-container');
    if(!container) return;
    let products = Array.from(document.querySelectorAll('.product-card'));
    let visibleCount = 0;
        const filters = window.activeFilters || { category: 'all', size: 'all', color: 'all', fit: 'all' };
    const sortMode = window.currentSort || 'default';

    products.forEach(product => {
        const productCategory = product.getAttribute('data-category') || '';
        const productSizes = product.getAttribute('data-sizes') || '';
        const productColors = product.getAttribute('data-colors') || '';
        const productFit = product.getAttribute('data-fit') || '';
        let categoryMatch = filters.category === 'all' || productCategory.includes(filters.category);
        let sizeMatch = filters.size === 'all' || productSizes.includes(filters.size);
        let colorMatch = filters.color === 'all' || productColors.includes(filters.color);
        let fitMatch = filters.fit === 'all' || productFit.includes(filters.fit);
        if (categoryMatch && sizeMatch && colorMatch && fitMatch) {
            product.style.display = 'block'; product.classList.add('is-visible'); visibleCount++;
        } else {
            product.style.display = 'none'; product.classList.remove('is-visible');
        }
    });
    let visibleProducts = products.filter(p => p.classList.contains('is-visible'));
    if (sortMode === 'price-asc') visibleProducts.sort((a, b) => parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price')));
    else if (sortMode === 'price-desc') visibleProducts.sort((a, b) => parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price')));
    visibleProducts.forEach(p => container.appendChild(p));
    const resultsCount = document.getElementById('results-count');
    if(resultsCount) resultsCount.textContent = visibleCount + (visibleCount === 1 ? ' Result' : ' Results');
};
export const goToPDP_ByName = function(name) {
    const p = window.shopProductsData.find(x => x.name === name);
    if(p && typeof window.goToPDP === 'function') window.goToPDP(p.id);
};