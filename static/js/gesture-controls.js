// Gesture Controls for Mobile Users
const gestureControls = {
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    minSwipeDistance: 50, // Minimum distance for a swipe
    swipeTimeout: null,
    
    init() {
        try {
            const mainContent = document.querySelector('.container-fluid');
            if (!mainContent) {
                console.warn('Main content container not found, gesture controls initialization skipped');
                return;
            }
            
            // Add touch event listeners
            mainContent.addEventListener('touchstart', this.handleTouchStart.bind(this));
            mainContent.addEventListener('touchmove', this.handleTouchMove.bind(this));
            mainContent.addEventListener('touchend', this.handleTouchEnd.bind(this));
            
            // Initialize pinch-zoom for visualizations
            this.initPinchZoom();
            
            // Add gesture hints for mobile users
            this.addGestureHints();
            
            console.log('Gesture controls initialized successfully');
        } catch (error) {
            console.error('Error initializing gesture controls:', error);
        }
    },
    
    handleTouchStart(event) {
        try {
            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
        } catch (error) {
            console.error('Error handling touch start:', error);
        }
    },
    
    handleTouchMove(event) {
        try {
            if (!this.touchStartX || !this.touchStartY) return;
            
            // Prevent default scrolling when interacting with visualization elements
            const target = event.target.closest('#advancedViz, #trainingChart, #memoryChart');
            if (target) {
                event.preventDefault();
            }
        } catch (error) {
            console.error('Error handling touch move:', error);
        }
    },
    
    handleTouchEnd(event) {
        try {
            this.touchEndX = event.changedTouches[0].clientX;
            this.touchEndY = event.changedTouches[0].clientY;
            
            this.handleGesture();
        } catch (error) {
            console.error('Error handling touch end:', error);
        }
    },
    
    handleGesture() {
        try {
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
                if (!targetElement) return;
                
                const activityLog = targetElement.closest('.activity-log');
                if (activityLog) {
                    // Allow native scrolling in activity log
                    return;
                }
                
                const card = targetElement.closest('.card');
                if (card) {
                    if (deltaY > 0) {
                        // Swipe down - Collapse section
                        this.toggleSection(card, 'collapse');
                    } else {
                        // Swipe up - Expand section
                        this.toggleSection(card, 'expand');
                    }
                }
            }
            
            resetCoords();
        } catch (error) {
            console.error('Error handling gesture:', error);
        }
    },
    
    navigateTabs(direction) {
        try {
            const tabs = Array.from(document.querySelectorAll('.nav-link'));
            if (!tabs.length) return;
            
            const activeTab = document.querySelector('.nav-link.active');
            if (!activeTab) return;
            
            const currentIndex = tabs.indexOf(activeTab);
            let nextIndex;
            
            if (direction === 'next') {
                nextIndex = (currentIndex + 1) % tabs.length;
            } else {
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            }
            
            // Trigger click on the next/previous tab
            tabs[nextIndex].click();
        } catch (error) {
            console.error('Error navigating tabs:', error);
        }
    },
    
    toggleSection(cardElement, action) {
        try {
            if (!cardElement) return;
            
            const cardBody = cardElement.querySelector('.card-body');
            if (!cardBody) return;
            
            cardBody.style.display = action === 'collapse' ? 'none' : 'block';
        } catch (error) {
            console.error('Error toggling section:', error);
        }
    },
    
    initPinchZoom() {
        try {
            const vizElements = document.querySelectorAll('#advancedViz, #trainingChart, #memoryChart');
            if (!vizElements.length) {
                console.warn('No visualization elements found for pinch-zoom');
                return;
            }
            
            vizElements.forEach(element => {
                if (!element) return;
                
                let initialDistance = 0;
                let currentScale = 1;
                
                element.addEventListener('touchstart', (e) => {
                    try {
                        if (e.touches.length === 2) {
                            initialDistance = Math.hypot(
                                e.touches[0].pageX - e.touches[1].pageX,
                                e.touches[0].pageY - e.touches[1].pageY
                            );
                        }
                    } catch (error) {
                        console.error('Error in pinch-zoom touchstart:', error);
                    }
                });
                
                element.addEventListener('touchmove', (e) => {
                    try {
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
                    } catch (error) {
                        console.error('Error in pinch-zoom touchmove:', error);
                    }
                });
                
                element.addEventListener('touchend', () => {
                    try {
                        if (initialDistance > 0) {
                            currentScale = parseFloat(element.style.transform.replace('scale(', '')) || 1;
                            initialDistance = 0;
                        }
                    } catch (error) {
                        console.error('Error in pinch-zoom touchend:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Error initializing pinch-zoom:', error);
        }
    },
    
    addGestureHints() {
        try {
            // Add gesture hints for first-time mobile users
            if (window.innerWidth <= 768 && !localStorage.getItem('gestureHintsShown')) {
                const container = document.querySelector('.container-fluid');
                if (!container) return;
                
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
                
                container.insertBefore(hints, container.firstChild);
                localStorage.setItem('gestureHintsShown', 'true');
            }
        } catch (error) {
            console.error('Error adding gesture hints:', error);
        }
    }
};

// Initialize gesture controls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        gestureControls.init();
    } catch (error) {
        console.error('Error initializing gesture controls:', error);
    }
});
