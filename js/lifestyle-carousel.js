(function initializeLifestyleCarousel() {
  'use strict';

  var section = document.querySelector('.review-photo-strip');
  if (!section) return;

  var viewport = section.querySelector('.carousel-viewport');
  var track = section.querySelector('.carousel-track');
  var images = Array.prototype.slice.call(section.querySelectorAll('.carousel-track img'));
  if (!viewport || !track || images.length === 0) return;

  var cardSpan = 274;
  var preloadDistance = cardSpan * 4;
  var hasStarted = false;

  function requestImage(image) {
    image.loading = 'eager';
    image.fetchPriority = 'low';
  }

  function decodeImage(image) {
    requestImage(image);
    if (typeof image.decode === 'function') {
      return image.decode().catch(function ignoreDecodeFailure() {});
    }

    if (image.complete) return Promise.resolve();
    return new Promise(function waitForImage(resolve) {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }

  function beginCarousel() {
    if (hasStarted) return;
    hasStarted = true;

    var visibleCount = Math.ceil(viewport.clientWidth / cardSpan) + 1;
    var bufferedCount = Math.min(images.length, visibleCount + 4);
    var visibleImages = images.slice(0, visibleCount);

    images.slice(0, bufferedCount).forEach(requestImage);

    if ('IntersectionObserver' in window) {
      var horizontalLoader = new IntersectionObserver(function loadUpcoming(entries) {
        entries.forEach(function loadEntry(entry) {
          if (!entry.isIntersecting) return;
          requestImage(entry.target);
          horizontalLoader.unobserve(entry.target);
        });
      }, {
        root: viewport,
        rootMargin: '0px ' + preloadDistance + 'px 0px 0px',
        threshold: 0
      });

      images.forEach(function observeImage(image) {
        horizontalLoader.observe(image);
      });
    } else {
      images.forEach(requestImage);
    }

    Promise.all(visibleImages.map(decodeImage)).then(function showCarousel() {
      section.classList.add('is-carousel-ready');
    });
  }

  if ('IntersectionObserver' in window) {
    var sectionLoader = new IntersectionObserver(function startNearViewport(entries) {
      if (!entries.some(function isNearViewport(entry) { return entry.isIntersecting; })) return;
      sectionLoader.disconnect();
      beginCarousel();
    }, {
      rootMargin: '700px 0px',
      threshold: 0
    });

    sectionLoader.observe(section);
  } else {
    beginCarousel();
  }
})();
