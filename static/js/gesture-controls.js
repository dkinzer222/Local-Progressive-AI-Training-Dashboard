// Gesture Controls for Mobile Users
const gestureControls = {
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    minSwipeDistance: 50, // Minimum distance for a swipe
    swipeTimeout: null,
    
    init() {
        const mainContent = document.querySelector('.container-fluid');
        if (!mainContent) return;
        
        // Add touch event listeners
        mainContent.addEventListener('touchstart', this.handleTouchStart.bind(this));
        mainContent.addEventListener('touchmove', this.handleTouchMove.bind(this));
        mainContent.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Initialize pinch-zoom for visualizations
        this.initPinchZoom();
        
        // Add gesture hints for mobile users
        this.addGestureHints();
    },
    
    handleTouchStart(event) {
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
    },
    
    handleTouchMove(event) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        // Prevent default scrolling when interacting with visualization elements
        if (event.target.closest('#advancedViz, #trainingChart, #memoryChart')) {
            event.preventDefault();
        }
    },
    
    handleTouchEnd(event) {
        this.touchEndX = event.changedTouches[0].clientX;
        this.touchEndY = event.changedTouches[0].clientY;
        
        this.handleGesture();
    },
    
    handleGesture() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // Reset touch coordinates
        const resetCoords = () => {
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchEndX = 0;
            this.touchEndY = 0;
        };
        
        // Handle horizontal swipe
        if (absX > this.minSwipeDistance && absX > absY) {
            if (deltaX > 0) {
                // Swipe right - Previous tab
                this.navigateTabs('prev');
            } else {
                // Swipe left - Next tab
                this.navigateTabs('next');
            }
        }
        // Handle vertical swipe
        else if (absY > this.minSwipeDistance && absY > absX) {
            const targetElement = document.elementFromPoint(this.touchStartX, this.touchStartY);
            if (targetElement.closest('.activity-log')) {
                // Allow native scrolling in activity log
                return;
            }
            
            if (deltaY > 0) {
                // Swipe down - Collapse section
                this.toggleSection(targetElement.closest('.card'), 'collapse');
            } else {
                // Swipe up - Expand section
                this.toggleSection(targetElement.closest('.card'), 'expand');
            }
        }
        
        resetCoords();
    },
    
    navigateTabs(direction) {
        const tabs = Array.from(document.querySelectorAll('.nav-link'));
        const activeTab = document.querySelector('.nav-link.active');
        const currentIndex = tabs.indexOf(activeTab);
        let nextIndex;
        
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % tabs.length;
        } else {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }
        
        // Trigger click on the next/previous tab
        tabs[nextIndex].click();
    },
    
    toggleSection(cardElement, action) {
        if (!cardElement) return;
        
        const cardBody = cardElement.querySelector('.card-body');
        if (!cardBody) return;
        
        if (action === 'collapse') {
            cardBody.style.display = 'none';
        } else {
            cardBody.style.display = 'block';
        }
    },
    
    initPinchZoom() {
        const vizElements = document.querySelectorAll('#advancedViz, #trainingChart, #memoryChart');
        
        vizElements.forEach(element => {
            let initialDistance = 0;
            let currentScale = 1;
            
            element.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    initialDistance = Math.hypot(
                        e.touches[0].pageX - e.touches[1].pageX,
                        e.touches[0].pageY - e.touches[1].pageY
                    );
                }
            });
            
            element.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    const currentDistance = Math.hypot(
                        e.touches[0].pageX - e.touches[1].pageX,
                        e.touches[0].pageY - e.touches[1].pageY
                    );
                    
                    if (initialDistance > 0) {
                        const newScale = (currentDistance / initialDistance) * currentScale;
                        // Limit scale between 0.5 and 3
                        const limitedScale = Math.min(Math.max(newScale, 0.5), 3);
                        element.style.transform = `scale(${limitedScale})`;
                    }
                }
            });
            
            element.addEventListener('touchend', () => {
                if (initialDistance > 0) {
                    currentScale = parseFloat(element.style.transform.replace('scale(', '')) || 1;
                    initialDistance = 0;
                }
            });
        });
    },
    
    addGestureHints() {
        // Add gesture hints for first-time mobile users
        if (window.innerWidth <= 768 && !localStorage.getItem('gestureHintsShown')) {
            const hints = document.createElement('div');
            hints.className = 'gesture-hints alert alert-info alert-dismissible fade show';
            hints.innerHTML = `
                <h6>Mobile Gesture Controls:</h6>
                <ul class="mb-0">
                    <li>Swipe left/right to switch tabs</li>
                    <li>Swipe up/down to expand/collapse sections</li>
                    <li>Pinch to zoom visualizations</li>
                </ul>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            document.querySelector('.container-fluid').insertBefore(
                hints,
                document.querySelector('.container-fluid').firstChild
            );
            
            localStorage.setItem('gestureHintsShown', 'true');
        }
    }
};

// Initialize gesture controls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    gestureControls.init();
});
