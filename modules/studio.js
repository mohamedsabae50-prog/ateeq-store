export const initStudioCanvas = function() {
    if (window.canvasInstance) return;
    const wrapper = document.getElementById('canvas-wrapper');
    if(!wrapper) return;
    const canvasWidth = wrapper.clientWidth || 400;
    const canvasHeight = wrapper.clientHeight || 500;
    window.canvasInstance = new window.fabric.Canvas('studioCanvas', {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 'transparent',
        selection: true,
        preserveObjectStacking: true 
    });
    window.fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#1e1e1e',
        cornerStrokeColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        cornerSize: 12,
        padding: 8,
        cornerStyle: 'circle',
        borderDashArray: [4, 4],
        borderScaleFactor: 2
    });
    if(typeof window.setupCanvasEvents === 'function') window.setupCanvasEvents();
    if(typeof window.attachPriceEvents === 'function') window.attachPriceEvents();
};
export const changeGarment = function(garment) {
    window.currentProduct = garment.replace('-', ''); 
    window.currentSide = 'front';
    document.getElementById('hoodieBase').src = 'media/' + window.currentProduct + '-front.png'; 
    const btnH = document.getElementById('btn-hoodie');
    const btnT = document.getElementById('btn-tshirt');   
    if (window.currentProduct === 'hoodie') {
        btnH.classList.add('text-white'); btnH.classList.remove('text-[#6e849c]');
        btnT.classList.add('text-[#6e849c]'); btnT.classList.remove('text-white');
    } else {
        btnT.classList.add('text-white'); btnT.classList.remove('text-[#6e849c]');
        btnH.classList.add('text-[#6e849c]'); btnH.classList.remove('text-white');
    } 
    const sideBtn = document.getElementById('sideToggleBtn');
    const backText = window.siteTranslations && window.siteTranslations[window.currentLang] ? window.siteTranslations[window.currentLang]['view_back'] : 'View Back';
    if(sideBtn) sideBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span data-tr="view_back">${backText}</span>`;       
    if(window.canvasInstance) window.canvasInstance.clear();
    window.designState = { front: null, back: null };
    if(typeof window.updateDynamicPrice === 'function') window.updateDynamicPrice();
};
export const addTextToStudio = function() {
    const textInputEl = document.getElementById('studioTextInput');
    if(!textInputEl) return;
    const textInput = textInputEl.value;
    if (!textInput) {
        if(typeof window.showToast === 'function') window.showToast("Please enter some text", "warning");
        return;
    }
    if (!window.canvasInstance) return;
    const colorEl = document.getElementById('studioTextColor');
    const fontEl = document.getElementById('studioTextFont');
    const selectedColor = colorEl ? colorEl.value : '#ffffff';
    const selectedFont = fontEl ? fontEl.value : 'Montserrat'; 
    const textObj = new window.fabric.Text(textInput, {
        left: 150,
        top: 150,
        fontFamily: selectedFont,
        fill: selectedColor,
        fontSize: 40,
        selectable: true
    });  
    window.canvasInstance.add(textObj);   
    window.canvasInstance.setActiveObject(textObj); 
    window.canvasInstance.renderAll(); 
    textInputEl.value = '';
    if(typeof window.showToast === 'function') window.showToast("Text added!", "success");
    if (typeof window.updateDynamicPrice === 'function') window.updateDynamicPrice();
};
export const forceBlackColor = function() {
    let attempts = 0;
    let forceInterval = setInterval(() => {
        const blackBtn = document.getElementById('default-black-btn') || document.querySelector('[data-color="Black"]');
        if (blackBtn) {
            blackBtn.click();
            if (typeof window.changeStudioColor === 'function') {
                window.changeStudioColor('#1e1e1e', blackBtn);
            }
        }
        attempts++;
        if (attempts > 10) clearInterval(forceInterval);
    }, 500);
};
export const deleteSelectedObject = function() {
    if (!window.canvasInstance) return;
    const activeObject = window.canvasInstance.getActiveObject();
    if (activeObject) {
        window.canvasInstance.remove(activeObject); 
        window.canvasInstance.discardActiveObject(); 
        window.canvasInstance.requestRenderAll(); 
        if(typeof window.showToast === 'function') window.showToast("Element deleted", "info");
    } else {
        if(typeof window.showToast === 'function') window.showToast("Please select an element to delete", "warning");
    }
};
export const processImageWithoutBackground = async function(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');
    const keys = window.REMOVE_BG_KEYS || []; 
    for (let i = 0; i < keys.length; i++) {
        try {
            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': keys[i] },
                body: formData
            });
            if (response.ok) return await response.blob();
            else {
                if (i === keys.length - 1) throw new Error('All API limits reached.');
            }
        } catch (error) {
            if (i === keys.length - 1) throw error;
        }
    }
};
export const forceImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const uploadDiv = event.target.nextElementSibling;
    const originalHTML = uploadDiv.innerHTML;
    uploadDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-[#4fb3d9]"></i><p class="text-[10px] tracking-widest uppercase font-bold text-[#4fb3d9]">Processing AI...</p>';
    event.target.value = '';
    try {
        const noBgBlob = await processImageWithoutBackground(file);
        const reader = new FileReader();
        reader.onload = function(f) {
            window.fabric.Image.fromURL(f.target.result, function(img) {
                img.scaleToWidth(150);
                if (typeof window.canvasInstance !== 'undefined' && window.canvasInstance) {
                    window.canvasInstance.add(img);
                    window.canvasInstance.centerObject(img);
                    window.canvasInstance.setActiveObject(img);
                    window.canvasInstance.renderAll();
                }
            });
        };
        reader.readAsDataURL(noBgBlob);
    } catch (error) {
        const fallbackReader = new FileReader();
        fallbackReader.onload = function(f) {
            window.fabric.Image.fromURL(f.target.result, function(img) {
                img.scaleToWidth(150);
                if (typeof window.canvasInstance !== 'undefined' && window.canvasInstance) {
                    window.canvasInstance.add(img);
                    window.canvasInstance.centerObject(img);
                    window.canvasInstance.setActiveObject(img);
                    window.canvasInstance.renderAll();
                }
            });
        };
        fallbackReader.readAsDataURL(file);
    } finally {
        uploadDiv.innerHTML = originalHTML;
    }
};
export const clearStudioCanvas = function() {
    if (!window.canvasInstance) return;
    window.canvasInstance.clear();
    if(typeof window.showToast === 'function') window.showToast("Design reset completed", "info");
};
export const generateFinalProof = async function() {
    window.designState[window.currentSide] = JSON.stringify(window.canvasInstance.toJSON());
    const cw = window.canvasInstance.getWidth();
    const ch = window.canvasInstance.getHeight();
    const compCanvas = document.createElement('canvas');
    compCanvas.width = cw * 2;
    compCanvas.height = ch;
    const ctx = compCanvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, compCanvas.width, compCanvas.height);
    
    const drawSide = async (side, offsetX) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            let currentSrc = document.getElementById('hoodieBase').src;
            if (side === 'front') {
                img.src = currentSrc.includes('back') ? currentSrc.replace(/back/i, 'front') : currentSrc;
            } else {
                img.src = currentSrc.includes('front') ? currentSrc.replace(/front/i, 'back') : currentSrc;
            }
            img.onload = () => {
                ctx.drawImage(img, offsetX, 0, cw, ch);
                if (window.designState[side]) {
                    const tempFabCanvas = document.createElement('canvas');
                    tempFabCanvas.width = cw; tempFabCanvas.height = ch;
                    const tempFab = new window.fabric.StaticCanvas(tempFabCanvas, { width: cw, height: ch });
                    tempFab.loadFromJSON(window.designState[side], () => {
                        tempFab.renderAll();
                        ctx.drawImage(tempFab.getElement(), offsetX, 0, cw, ch);
                        resolve();
                    });
                } else {
                    resolve();
                }
            };
            img.onerror = () => resolve();
        });
    };
    
    await drawSide('front', 0);
    await drawSide('back', cw);
    return compCanvas.toDataURL('image/png', 1.0);
};
export const addStudioToCart = async function() {    
    if (!window.canvasInstance) return;
    window.designState[window.currentSide] = JSON.stringify(window.canvasInstance.toJSON());
    let hasFront = window.designState.front && JSON.parse(window.designState.front).objects.length > 0;
    let hasBack = window.designState.back && JSON.parse(window.designState.back).objects.length > 0;
    
    if (!hasFront && !hasBack) {
        if(typeof window.showToast === 'function') window.showToast("Please add a design to the front or back first!", "error");
        return;
    }
    if(typeof window.showToast === 'function') window.showToast("Generating design proof...", "info");
    
    try {
        const colorInput = document.getElementById('custom-color-input');
        const requestedColor = colorInput ? colorInput.value : 'Default Black';
        const finalDesignData = await generateFinalProof();
        const sizeInput = document.querySelector('input[name="studio-size"]:checked');
        const size = sizeInput ? sizeInput.value : 'L';
        let placementText = [];
        if (hasFront) placementText.push("Front");
        if (hasBack) placementText.push("Back");
        const notesInput = document.getElementById('order-notes-input');
        const customerNotes = notesInput ? notesInput.value : '';       
        let hqFileData = '';
        const hqFileInput = document.getElementById('hq-file-input');
        
        if (hqFileInput && hqFileInput.files.length > 0) {
            const file = hqFileInput.files[0];
            if (file.size > 4 * 1024 * 1024) {
                if(typeof window.showToast === 'function') window.showToast("File is too large! Maximum allowed size is 4MB.", "error");
                return; 
            }
            hqFileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
        window.cart.push({
            id: Date.now(),
            type: 'CUSTOM',
            title: 'DTF CUSTOM PRINT',
            size: size,
            price: window.totalCustomPrice || 0,
            placement: placementText.join(' & '),
            color: requestedColor,
            preview: finalDesignData,
            hqFile: hqFileData,
            notes: customerNotes 
        });
        if(typeof window.saveCart === 'function') window.saveCart();
        if(typeof window.toggleCart === 'function') window.toggleCart();
        if(typeof window.animateCartIcon === 'function') window.animateCartIcon();
        if(typeof window.showToast === 'function') window.showToast("Custom design added to cart!", "success");
    } catch (e) {
        if(typeof window.showToast === 'function') window.showToast("Error generating design proof.", "error");
    }
};
export const handleSelection = function(e) {
    const activeObject = e.selected[0];
    const toolbar = document.getElementById('editing-toolbar');
    const colorWrapper = document.getElementById('edit-color-wrapper');
    const fontWrapper = document.getElementById('edit-font-wrapper');
    const opacityWrapper = document.getElementById('edit-opacity-wrapper'); 
    
    if (!activeObject || !toolbar) {
        if(toolbar) toolbar.classList.add('hidden'); 
        return;
    }
    toolbar.classList.remove('hidden'); 
    if (activeObject.type === 'text') {
        if(colorWrapper) colorWrapper.style.display = 'flex';
        if(fontWrapper) fontWrapper.style.display = 'flex';
        if(opacityWrapper) opacityWrapper.style.display = 'none'; 
        const itemColor = document.getElementById('item-color');
        const itemFont = document.getElementById('item-font');
        if(itemColor) itemColor.value = activeObject.fill || '#1e1e1e';
        if(itemFont) itemFont.value = activeObject.fontFamily || 'Arial';
    } else {
        if(colorWrapper) colorWrapper.style.display = 'none';
        if(fontWrapper) fontWrapper.style.display = 'none';
        if(opacityWrapper) opacityWrapper.style.display = 'flex'; 
        const currentOpacity = activeObject.opacity !== undefined ? activeObject.opacity : 1;
        const itemOpacity = document.getElementById('item-opacity');
        const opacityVal = document.getElementById('opacity-value');
        if(itemOpacity) itemOpacity.value = currentOpacity;
        if(opacityVal) opacityVal.innerText = Math.round(currentOpacity * 100) + '%';
    }
};
export const setupCanvasEvents = function() {
    if (!window.canvasInstance) return;
    window.canvasInstance.on('selection:created', handleSelection);
    window.canvasInstance.on('selection:updated', handleSelection);
    window.canvasInstance.on('selection:cleared', function() {
        const toolbar = document.getElementById('editing-toolbar');
        if(toolbar) toolbar.classList.add('hidden');
    });
};
export const updateDynamicPrice = function() {
    const priceDisplay = document.getElementById('dynamic-price-value') || document.getElementById('price-number');
    if (!priceDisplay || typeof window.canvasInstance === 'undefined') return;
    let basePrice = window.BASE_PRICE || 800; 
    let isCurrentlyBack = false;
    const hoodieBaseImg = document.getElementById('hoodieBase');
    if (hoodieBaseImg) {
        if (hoodieBaseImg.src.includes('tshirt')) basePrice = 500; 
        if (hoodieBaseImg.src.includes('back')) isCurrentlyBack = true; 
    } 
    const objectsCount = window.canvasInstance ? window.canvasInstance.getObjects().length : 0;
    if (isCurrentlyBack) {
        window.backHasDesign = (objectsCount > 0); 
    } else {
        window.frontHasDesign = (objectsCount > 0); 
    }  
    let printCost = 0;
    if (window.frontHasDesign) printCost += 50; 
    if (window.backHasDesign) printCost += 50;  
    
    window.totalCustomPrice = basePrice + printCost;
    priceDisplay.innerText = window.totalCustomPrice;
};
export const attachPriceEvents = function() {
    if (typeof window.canvasInstance !== 'undefined' && window.canvasInstance) {
        window.canvasInstance.on('object:added', window.updateDynamicPrice);
        window.canvasInstance.on('object:removed', window.updateDynamicPrice);
    } else {
        setTimeout(attachPriceEvents, 500);
    }
};
export const toggleHoodieSide = function() {
    const hoodie = document.getElementById('hoodieBase');
    const flipBtn = document.getElementById('sideToggleBtn');
    if (!hoodie || !window.canvasInstance) return;
    window.designState[window.currentSide] = JSON.stringify(window.canvasInstance.toJSON());   
    const ext = 'png';  
    if (window.currentSide === 'front') {
        window.currentSide = 'back';
        hoodie.src = `media/${window.currentProduct}-back.${ext}`; 
    } else {
        window.currentSide = 'front';
        hoodie.src = `media/${window.currentProduct}-front.${ext}`;
    } 
    const textKey = window.currentSide === 'back' ? 'view_front' : 'view_back';
    const renderedText = (typeof window.siteTranslations !== 'undefined' && window.siteTranslations[window.currentLang]) ? window.siteTranslations[window.currentLang][textKey] : (window.currentSide === 'back' ? 'View Front' : 'View Back');
    if(flipBtn) flipBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span data-tr="${textKey}">${renderedText}</span>`;
    window.canvasInstance.clear();
    if (window.designState[window.currentSide]) {
        window.canvasInstance.loadFromJSON(window.designState[window.currentSide], window.canvasInstance.renderAll.bind(window.canvasInstance));
    }
    if(typeof window.showToast === 'function') window.showToast("Switched to " + window.currentSide + " view", "info");
    if(typeof window.updateDynamicPrice === 'function') window.updateDynamicPrice();
};
