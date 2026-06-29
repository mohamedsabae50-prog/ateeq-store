export const shareDesign = async function() {
    const shareText = "🔥 صممت الهودي بتاعي بنفسي على ATEEQ STUDIOS! \nادخل صمم طقمك المخصوص من هنا:\n";
    const shareUrl = window.location.origin; 
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Custom ATEEQ Design',
                text: shareText,
                url: shareUrl
            });
            if(typeof window.showToast === 'function') window.showToast("Thanks for sharing! 🖤", "success");
        } catch (err) {}
    } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
        window.open(waUrl, '_blank');
    }
};
export const openWhatsApp = function() {
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