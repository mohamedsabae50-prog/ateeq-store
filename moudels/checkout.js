export const submitOrder = async function(event) {
    event.preventDefault();
    const emailEl = document.getElementById('chk-email');
    const email = (emailEl && emailEl.value) ? emailEl.value : (window.currentUser ? window.currentUser.email : '');
    const paymentInput = document.querySelector('input[name="payment"]:checked');
    if (!paymentInput) { 
        if (typeof window.showToast === 'function') window.showToast("Please select a payment method.", "error"); 
        return; 
    }
    const paymentMethod = paymentInput.value;
    if (!window.isLoggedIn || !window.currentUser) { 
        if (typeof window.showToast === 'function') window.showToast("Please log in to complete your order.", "error"); 
        return; 
    }
    const receiptInput = document.getElementById('instapay-receipt');
    let receiptFile = null;
    if (paymentMethod === 'Instapay') {
        if (!receiptInput || !receiptInput.files || receiptInput.files.length === 0) {
            if (typeof window.showToast === 'function') window.showToast("Please upload your Instapay payment screenshot.", "error");
            return; 
        }
        receiptFile = receiptInput.files[0];
    }
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    const p1 = document.getElementById('chk-phone1') ? document.getElementById('chk-phone1').value : '';
    const p2 = document.getElementById('chk-phone2') ? document.getElementById('chk-phone2').value : '';
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(p1)) { 
        if (typeof window.showToast === 'function') window.showToast("Please enter a valid 11-digit Egyptian phone number", "error"); 
        return; 
    }
    const customerPhone = p2 ? `${p1} (WhatsApp: ${p2})` : p1;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    try {
        const cartItems = Array.isArray(window.cart) ? window.cart : [];
        let totalAmount = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        if (window.appliedDiscount > 0) totalAmount = totalAmount - (totalAmount * (window.appliedDiscount / 100));
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
            if (typeof window.showToast === 'function') window.showToast("Uploading receipt image...", "info");
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt-${serialNumber}.${fileExt}`;
            const { error: uploadError } = await window.supabaseClient.storage.from('receipts').upload(`public/${fileName}`, receiptFile);
            if (uploadError) throw new Error("Failed to upload receipt.");
            receiptUrl = window.supabaseClient.storage.from('receipts').getPublicUrl(`public/${fileName}`).data.publicUrl;
        }
        let customDesignUrl = null;
        const hasCustomItem = window.cart.some(item => item.type === 'CUSTOM');
        const customItemWithPreview = window.cart.find(item => item.type === 'CUSTOM' && item.preview);
        if (hasCustomItem) {
            if (!customItemWithPreview) throw new Error("Design image is missing!");
            if (typeof window.showToast === 'function') window.showToast("Uploading custom design...", "info");
            const blob = window.dataURLtoBlob(customItemWithPreview.preview);
            const designFileName = `design-${serialNumber}.png`;
            const { error: designError } = await window.supabaseClient.storage.from('custom-designs').upload(designFileName, blob, { contentType: 'image/png' });
            if (designError) throw new Error("Storage Error: " + designError.message);
            customDesignUrl = window.supabaseClient.storage.from('custom-designs').getPublicUrl(designFileName).data.publicUrl;
           }
        const cleanCartForDB = await Promise.all(cartItems.map(async item => {
            if (item.type === 'CUSTOM') {
                let uploadedHqUrl = null;
                if (item.hqFile && item.hqFile.startsWith('data:image')) {
                    try {
                        if (typeof window.showToast === 'function') window.showToast("Uploading HQ print file...", "info");
                        const blob = window.dataURLtoBlob(item.hqFile);
                        const mimeString = item.hqFile.split(',')[0].split(':')[1].split(';')[0];
                        const ext = mimeString.split('/')[1] || 'png';
                        const fileName = `hq-${serialNumber}-${Date.now()}.${ext}`;
                        const { error } = await window.supabaseClient.storage.from('custom-designs').upload(`public/${fileName}`, blob);
                        if (!error) {
                            uploadedHqUrl = window.supabaseClient.storage.from('custom-designs').getPublicUrl(`public/${fileName}`).data.publicUrl;
                        }
                    } catch(e) { console.error("HQ Upload error", e); }
                }
                const { preview, hqFile, ...restOfItem } = item; 
                if (uploadedHqUrl) restOfItem.hqFile = uploadedHqUrl; 
                return restOfItem; 
            }
            return item;
        }));
        const { error } = await window.supabaseClient.from('orders').insert([{
            user_id: window.currentUser.id, serial_number: serialNumber, total_amount: totalAmount,
            payment_method: paymentMethod, status: 'Pending', full_name: customerName,
            phone: customerPhone, address: customerAddress, items: cleanCartForDB,
            receipt_url: receiptUrl, custom_design_url: customDesignUrl 
        }]);
        if (error) throw error;
        for (const item of cartItems) {
            if (item.type === 'STORE' && item.title) {
                const { data: prod } = await window.supabaseClient.from('products').select('stock_count').eq('name', item.title).single();
                if (prod) {
                    let newCount = prod.stock_count - 1;
                    let newStatus = newCount <= 0 ? 'Out of Stock' : 'In Stock';
                    await window.supabaseClient.from('products').update({ stock_count: newCount, stock_status: newStatus }).eq('name', item.title);
                }}}
        try { 
            await window.emailjs.send("service_58ov5us", "template_kmoa9gi", { 
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
        if (emailConfirmEl) emailConfirmEl.textContent = email || (window.currentUser ? window.currentUser.email : '');
        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden'); 
        setTimeout(() => { modal.classList.remove('opacity-0'); }, 50);  
        window.cart = []; window.appliedDiscount = 0; window.activeCouponCode = null; 
        if (typeof window.saveCart === 'function') window.saveCart();   
    } catch (error) { 
        if (typeof window.showToast === 'function') window.showToast(error.message || "Failed to place order.", "error"); 
    } finally {
        submitBtn.innerHTML = originalBtnText; submitBtn.disabled = false;
    }
};
export const goToCheckout = function() {
    if (!window.isLoggedIn) {
        if (typeof window.toggleCart === 'function') window.toggleCart(); 
        if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal(); 
        if (typeof window.showToast === 'function') window.showToast("Please Log In or Register first to proceed.", "error"); 
        return;
    }  
    if(window.cart.length === 0) { 
        if (typeof window.showToast === 'function') window.showToast("Your cart is empty!", "error"); 
        return; 
    }   
    if (window.currentUser && window.currentUser.email) {
        const chkEmail = document.getElementById('chk-email');
        if (chkEmail) {
            chkEmail.value = window.currentUser.email;
            chkEmail.readOnly = true; 
            chkEmail.classList.add('opacity-70', 'cursor-not-allowed');
        }
    }
    if (typeof window.toggleCart === 'function') window.toggleCart(); 
    if (typeof window.switchView === 'function') window.switchView('checkout');
};
export const applyCouponCode = async function() {
    const code = document.getElementById('coupon-code').value.trim().toUpperCase();
    const msg = document.getElementById('coupon-message');
    if (!code) { if(typeof window.showToast === 'function') window.showToast("Please enter a coupon code", "error"); return; }
    try {
        const { data, error } = await window.supabaseClient.from('coupons').select('*').eq('code', code).eq('active', true).single();
        msg.classList.remove('hidden', 'text-red-500', 'text-green-500');
        if (error || !data) {
            window.appliedDiscount = 0;
            window.activeCouponCode = null;
            msg.textContent = "Invalid or Expired Coupon";
            msg.classList.add('text-red-500');
            if(typeof window.showToast === 'function') window.showToast("Coupon not found", "error");
        } else {
            window.appliedDiscount = data.discount_percent;
            window.activeCouponCode = data.code;
            msg.textContent = `Coupon Applied: ${data.discount_percent}% Discount`;
            msg.classList.add('text-green-500');
            if(typeof window.showToast === 'function') window.showToast("Discount applied successfully", "success");
            let totalAmount = window.cart.reduce((sum, item) => sum + item.price, 0);
            let discountAmount = (totalAmount * (window.appliedDiscount / 100));
            let finalTotal = totalAmount - discountAmount;
            if(typeof window.showToast === 'function') window.showToast(`New Total: ${finalTotal} EGP`, "info");
        }
    } catch (err) {}
};
export const trackOrder = async function(event) {
    const serial = document.getElementById('track-serial').value.trim();
    if(!serial) { if(typeof window.showToast === 'function') window.showToast("Please enter a valid serial number", "error"); return; }
    const btn = (event && (event.currentTarget || event.target)) || null;
    const originalText = (btn && btn.innerHTML) ? btn.innerHTML : '';
    if (btn && typeof btn.innerHTML !== 'undefined') btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Searching...';
    if (btn) btn.disabled = true;
    try {
        const { data, error } = await window.supabaseClient.from('orders').select('status, total_amount, created_at').eq('serial_number', serial).single();
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
export const closeSuccessModal = function() {
    const modal = document.getElementById('success-modal');
    if(modal) modal.classList.add('opacity-0');
    setTimeout(() => { if(modal) modal.classList.add('hidden'); if(typeof window.switchView === 'function') window.switchView('home'); }, 500);
};
export const toggleInstapayUI = function(show) {
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