// Carousel Logic
let currentSlide = 0;
const totalSlides = 3;
let autoplayInterval;
const AUTOPLAY_DELAY = 6000;

document.addEventListener('DOMContentLoaded', () => {
    initCarousel();
    startAutoplay();
});

function initCarousel() {
    const videos = document.querySelectorAll('.carousel-video');
    if (videos[0]) videos[0].play().catch(e => console.log('Autoplay blocked'));
}

function goToSlide(slideIndex) {
    stopAutoplay();
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.pagination-dot');
    
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = slideIndex;
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
    
    // Play video
    const video = slides[currentSlide].querySelector('video');
    if(video) {
        video.currentTime = 0;
        video.play();
    }
    
    setTimeout(startAutoplay, 2000);
}

function nextSlide() {
    goToSlide((currentSlide + 1) % totalSlides);
}

function prevSlide() {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
}

function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
}

function stopAutoplay() {
    if (autoplayInterval) clearInterval(autoplayInterval);
}

window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.goToSlide = goToSlide;
window.scrollToProducts = (id) => {
    document.getElementById('products').scrollIntoView({behavior: 'smooth'});
};
