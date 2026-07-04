export const fetchInstagramFeed = async function() {
    return; 
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
};
export const fetchInstagramPhotos = async function() {
    return; 
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
};
export const dataURLtoBlob = function(dataurl) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
};
export const syncHeartIcons = function() {
    if (!window.currentProductId) return;

    let currentWishlist = [];
    try {
        const storedWishlist = JSON.parse(localStorage.getItem('ateeq_wishlist') || '[]');
        currentWishlist = Array.isArray(storedWishlist) ? storedWishlist : [];
    } catch (error) {
        currentWishlist = [];
    }

    const normalizedWishlist = [...new Set(currentWishlist.map(item => String(item)).filter(Boolean))];
    const isWishlisted = normalizedWishlist.includes(String(window.currentProductId));
    const pdpHeartIcons = document.querySelectorAll('#pdp-view .fa-heart, #sticky-cart-bar .fa-heart');
    pdpHeartIcons.forEach(icon => {
        if (isWishlisted) {
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid', 'text-red-500');
        } else {
            icon.classList.add('fa-regular');
            icon.classList.remove('fa-solid', 'text-red-500');
        }
    });
};
