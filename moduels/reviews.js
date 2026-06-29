export const submitReview = async function(event) {
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
        const { error } = await window.supabaseClient.from('reviews').insert([{ 
            product_id: window.currentProductId, customer_name: name, rating: rating, comment: comment 
        }]);
        if (error) throw error;  
        if(typeof window.showToast === 'function') window.showToast("Review submitted successfully!", "success");  
        const form = document.getElementById('add-review-form');
        if(form) form.reset();
        toggleReviewForm();
        fetchReviews(window.currentProductId); 
    } catch (error) {
        if(typeof window.showToast === 'function') window.showToast("Failed to submit review.", "error");
    } finally {
        if(btn) { btn.innerHTML = 'SUBMIT REVIEW'; btn.disabled = false; }
    }
};
export const fetchReviews = async function(productId) {
    const container = document.getElementById('reviews-container');
    if(!container) return;
    container.innerHTML = '<p class="text-gray-500 text-[10px] tracking-widest uppercase">Loading reviews...</p>'; 
    try {
        const { data: reviews, error } = await window.supabaseClient.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
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
};
export const toggleReviewForm = function() {
    const form = document.getElementById('add-review-form');
    if(form) form.classList.toggle('hidden');
};