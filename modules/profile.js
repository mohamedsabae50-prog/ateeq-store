export const saveProfileData = async function(e) {
    if (e) e.preventDefault();
    if (!window.isLoggedIn || !window.currentUser) {
        if(typeof window.showToast === 'function') window.showToast("You are not logged in!", "error");
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
        const { error } = await window.supabaseClient.from('profiles').update({ 
            full_name: name, phone: phone, age: age ? parseInt(age) : null, city: city
        }).eq('id', window.currentUser.id);
        if (error) throw error;
        if(typeof window.showToast === 'function') window.showToast("Profile updated successfully!", "success");
        if(typeof window.toggleSettingsModal === 'function') window.toggleSettingsModal();
    } catch (error) {
        if(typeof window.showToast === 'function') window.showToast("Failed to update profile.", "error");
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }
    }
};
export const toggleSettingsModal = async function() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
        if (window.isLoggedIn && window.currentUser) {
            try {
                const emailInput = document.getElementById('edit-email');
                if(emailInput) emailInput.value = window.currentUser.email;
                const { data } = await window.supabaseClient.from('profiles').select('*').eq('id', window.currentUser.id).single();
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
export const closeUserOrderModal = function() {
    const modal = document.getElementById('user-order-modal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};
export const openUserOrderModal = function(id) {
    if (!window.userOrders) return;
    const order = window.userOrders.find(o => o.id === id);
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
export const switchProfileTab = function(tabName) {
    const tabHistory = document.getElementById('tab-history');
    const tabWishlist = document.getElementById('tab-wishlist');
    const ordersContent = document.getElementById('tab-orders');
    const wishlistContent = document.getElementById('wishlist-container');
    if (tabName === 'history') {
        if(tabHistory) { tabHistory.classList.remove('border-transparent', 'text-gray-500'); tabHistory.classList.add('border-white', 'text-white'); }
        if(tabWishlist) { tabWishlist.classList.remove('border-white', 'text-white'); tabWishlist.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) ordersContent.classList.replace('hidden', 'block');
        if(wishlistContent) wishlistContent.classList.replace('grid', 'hidden');
        if (typeof window.fetchUserOrders === 'function') window.fetchUserOrders();
    } else if (tabName === 'wishlist') {
        if(tabWishlist) { tabWishlist.classList.remove('border-transparent', 'text-gray-500'); tabWishlist.classList.add('border-white', 'text-white'); }
        if(tabHistory) { tabHistory.classList.remove('border-white', 'text-white'); tabHistory.classList.add('border-transparent', 'text-gray-500'); }
        if(ordersContent) { ordersContent.classList.remove('block'); ordersContent.classList.add('hidden'); }
        if(wishlistContent) { wishlistContent.classList.remove('hidden'); wishlistContent.classList.add('grid'); }
        if (typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
    }
};