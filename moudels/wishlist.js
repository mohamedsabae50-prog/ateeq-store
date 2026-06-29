window.isWishlistActionRunning = false;

const normalizeWishlistItems = function(items = []) {
    return [...new Set((Array.isArray(items) ? items : []).map(item => String(item)).filter(Boolean))];
};

const normalizeWishlistProductId = function(productId) {
    const trimmedValue = String(productId).trim();
    return /^-?\d+$/.test(trimmedValue) ? Number(trimmedValue) : trimmedValue;
};

const syncWishlistToRemote = async function(userId, items) {
    if (!window.supabaseClient || !userId) return;

    try {
        const normalizedItems = normalizeWishlistItems(items);
        const currentRemoteItems = await window.supabaseClient.from('wishlist').select('product_id').eq('user_id', userId);
        const remoteIds = Array.isArray(currentRemoteItems?.data) ? currentRemoteItems.data.map(item => String(item.product_id)) : [];

        const idsToDelete = remoteIds.filter(id => !normalizedItems.includes(String(id)));
        const idsToAdd = normalizedItems.filter(id => !remoteIds.includes(String(id)));

        if (idsToDelete.length > 0) {
            for (const productId of idsToDelete) {
                try {
                    await window.supabaseClient.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId);
                } catch (deleteErr) {}
            }
        }

        if (idsToAdd.length > 0) {
            const inserts = idsToAdd.map(productId => ({
                user_id: userId,
                product_id: normalizeWishlistProductId(productId),
                product_title: 'Product',
                price: 0,
                filter: 'None'
            }));

            if (inserts.length > 0) {
                try {
                    await window.supabaseClient.from('wishlist').insert(inserts);
                } catch (insertErr) {}
            }
        }
    } catch (err) {}
};

const matchesWishlistProduct = function(existingRow, productId) {
    if (!existingRow || existingRow.product_id == null) return false;
    const targetValue = String(productId);
    const existingValue = String(existingRow.product_id);
    return existingValue === targetValue || Number(existingValue) === Number(productId);
};

const persistWishlistState = function(items, options = {}) {
    const normalizedItems = normalizeWishlistItems(items);
    localStorage.setItem('ateeq_wishlist', JSON.stringify(normalizedItems));
    window.wishlist = normalizedItems;

    if (options.triggerRefresh !== false && typeof window.fetchUserWishlist === 'function') {
        window.fetchUserWishlist();
    }

    return normalizedItems;
};

const updateWishlistHeartUi = function(productId, isActive, button = null) {
    const targetId = String(productId);
    const iconsToUpdate = [];

    if (button) {
        const directIcon = button.tagName === 'I' ? button : button.querySelector('i');
        if (directIcon) iconsToUpdate.push(directIcon);
    }

    document.querySelectorAll('#pdp-view .fa-heart, #sticky-cart-bar .fa-heart').forEach(icon => {
        if (icon && icon.dataset.wishlistProductId !== targetId) {
            iconsToUpdate.push(icon);
        }
    });

    iconsToUpdate.forEach(icon => {
        if (!icon) return;
        if (isActive) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid', 'text-red-500');
        } else {
            icon.classList.remove('fa-solid', 'text-red-500');
            icon.classList.add('fa-regular');
        }
    });

    if (button && button.tagName !== 'I') {
        if (isActive) {
            button.classList.remove('text-white');
            button.classList.add('text-red-500', 'border-red-500');
        } else {
            button.classList.remove('text-red-500', 'border-red-500');
            button.classList.add('text-white');
        }
    }
};

export const fetchUserWishlist = async function() {
    const localWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);

    if (window.isLoggedIn && window.currentUser) {
        try {
            const { data } = await window.supabaseClient.from('wishlist').select('product_id').eq('user_id', window.currentUser.id);
            if (Array.isArray(data) && data.length > 0) {
                const dbWishlist = normalizeWishlistItems(data.map(item => String(item.product_id)));
                const mergedWishlist = normalizeWishlistItems([...new Set([...localWishlist, ...dbWishlist])]);
                localStorage.setItem('ateeq_wishlist', JSON.stringify(mergedWishlist));
                window.wishlist = mergedWishlist;
            } else {
                localStorage.setItem('ateeq_wishlist', JSON.stringify(localWishlist));
                window.wishlist = localWishlist;
            }
        } catch (err) {
            localStorage.setItem('ateeq_wishlist', JSON.stringify(localWishlist));
            window.wishlist = localWishlist;
        }
    }

    const container = document.getElementById('wishlist-container');
    if (!container) return;

    let currentWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);

    if (currentWishlist.length === 0) {
        container.innerHTML = '<div class="p-8 border border-dashed border-[#1e2a36] text-center bg-[#131b23] col-span-full"><p class="text-[#6e849c] text-xs tracking-widest uppercase">Your wishlist is empty.</p></div>';
        return;
    }

    if (!window.shopProductsData || window.shopProductsData.length === 0) {
        try {
            const { data } = await window.supabaseClient.from('products').select('*');
            window.shopProductsData = data || [];
        } catch(e) {}
    }

    let html = '';
    currentWishlist.forEach(id => {
        const prod = window.shopProductsData.find(p => String(p.id) === String(id));
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

export const toggleWishlist = async function(productId, event, btnElement = null) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    if (window.isWishlistActionRunning) return;
    
    const button = btnElement || (event ? event.currentTarget : null);
    const icon = button ? button.querySelector('i') : null;

    if (!window.isLoggedIn || !window.currentUser) {
        if(typeof window.showToast === 'function') window.showToast("Please log in to save items to your wishlist!", "error");
        if(typeof window.toggleAuthModal === 'function') window.toggleAuthModal();
        return;
    }

    window.isWishlistActionRunning = true;
    const prodIdStr = String(productId);
    const normalizedProductId = normalizeWishlistProductId(prodIdStr);

    try {
        if (icon) icon.className = "fa-solid fa-circle-notch fa-spin text-gray-500";

        const { data: existingRows } = await window.supabaseClient.from('wishlist').select('id, product_id').eq('user_id', window.currentUser.id);
        const isCurrentlyWishlisted = Boolean(existingRows && existingRows.some(item => matchesWishlistProduct(item, normalizedProductId)));
        const currentWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
        const nextWishlist = isCurrentlyWishlisted
            ? currentWishlist.filter(item => item !== prodIdStr)
            : [...currentWishlist, prodIdStr];

        persistWishlistState(nextWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, !isCurrentlyWishlisted, button);

        if (isCurrentlyWishlisted) {
            try {
                await window.supabaseClient.from('wishlist').delete().eq('user_id', window.currentUser.id).eq('product_id', normalizedProductId);
            } catch (err) {}
            if(typeof window.showToast === 'function') window.showToast("Removed from Wishlist", "info");
        } else {
            try {
                await syncWishlistToRemote(window.currentUser.id, nextWishlist);
            } catch (err) {}
            if(typeof window.showToast === 'function') window.showToast("Added to Wishlist!", "success");
        }

        persistWishlistState(nextWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, !isCurrentlyWishlisted, button);
        
        if(typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();

    } catch(err) {
        const fallbackWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
        persistWishlistState(fallbackWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, fallbackWishlist.includes(prodIdStr), button);
        if (icon) icon.className = "fa-regular fa-heart text-white";
    } finally {
        window.isWishlistActionRunning = false;
    }
};

export const toggleWishlistFromPDP = async function(event, btn) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!window.currentProductId || window.isWishlistActionRunning) return;

    if (!window.isLoggedIn || !window.currentUser) {
        if(typeof window.showToast === 'function') window.showToast("Please log in to save items to your wishlist!", "error");
        if(typeof window.toggleAuthModal === 'function') window.toggleAuthModal();
        return;
    }

    window.isWishlistActionRunning = true;
    const prodIdStr = String(window.currentProductId);
    const normalizedProductId = normalizeWishlistProductId(prodIdStr);

    try {
        const { data: existingRows } = await window.supabaseClient.from('wishlist').select('id, product_id').eq('user_id', window.currentUser.id);
        const isCurrentlyWishlisted = Boolean(existingRows && existingRows.some(item => matchesWishlistProduct(item, normalizedProductId)));
        const currentWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
        const nextWishlist = isCurrentlyWishlisted
            ? currentWishlist.filter(item => item !== prodIdStr)
            : [...currentWishlist, prodIdStr];

        persistWishlistState(nextWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, !isCurrentlyWishlisted, btn);

        if (isCurrentlyWishlisted) {
            try {
                await window.supabaseClient.from('wishlist').delete().eq('user_id', window.currentUser.id).eq('product_id', normalizedProductId);
            } catch (err) {}
            if(typeof window.showToast === 'function') window.showToast("Removed from wishlist", "info");
        } else {
            try {
                await syncWishlistToRemote(window.currentUser.id, nextWishlist);
            } catch (err) {}
            if(typeof window.showToast === 'function') window.showToast("Added to wishlist", "success");
        }

        persistWishlistState(nextWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, !isCurrentlyWishlisted, btn);
        
        if(typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
    } catch(e) {
        const fallbackWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
        persistWishlistState(fallbackWishlist, { triggerRefresh: false });
        updateWishlistHeartUi(prodIdStr, fallbackWishlist.includes(prodIdStr), btn);
    } finally {
        window.isWishlistActionRunning = false;
    }
};

export const toggleWishlistFromWishlistPage = async function(id, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!window.isLoggedIn || !window.currentUser || window.isWishlistActionRunning) return;

    window.isWishlistActionRunning = true;
    const idStr = String(id);

    try {
        const currentWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
        const nextWishlist = currentWishlist.filter(item => String(item) !== idStr);
        persistWishlistState(nextWishlist, { triggerRefresh: false });

        try {
            await window.supabaseClient.from('wishlist').delete().eq('user_id', window.currentUser.id).eq('product_id', idStr);
        } catch (err) {}

        if(typeof window.showToast === 'function') window.showToast("Removed from wishlist", "info");
        if(typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
    } catch(e) {
    } finally {
        window.isWishlistActionRunning = false;
    }
};

export const removeFromWishlist = async function(index) {
    let currentWishlist = normalizeWishlistItems(JSON.parse(localStorage.getItem('ateeq_wishlist')) || []);
    if (currentWishlist.length > index) {
        const idToRemove = String(currentWishlist[index]);
        const nextWishlist = currentWishlist.filter((_, wishlistIndex) => wishlistIndex !== index);

        if (window.isLoggedIn && window.currentUser) {
            if (window.isWishlistActionRunning) return;
            window.isWishlistActionRunning = true;
            try {
                persistWishlistState(nextWishlist, { triggerRefresh: false });
                try {
                    await window.supabaseClient.from('wishlist').delete().eq('user_id', window.currentUser.id).eq('product_id', idToRemove);
                } catch(e) {}
            } catch(e) {
            } finally {
                window.isWishlistActionRunning = false;
            }
        } else {
            persistWishlistState(nextWishlist, { triggerRefresh: false });
        }
        
        if(typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
    }
}; 