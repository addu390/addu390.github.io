
  let sliders = {};

  function showSlide(sliderId, index) {
    const slider = sliders[sliderId];
    const slides = slider.slides;
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    slider.currentSlide = index;
  }

  function plusSlides(n, sliderId) {
    const slider = sliders[sliderId];
    let newIndex = slider.currentSlide + n;
    if (newIndex >= slider.slides.length) {
      newIndex = 0;
    } else if (newIndex < 0) {
      newIndex = slider.slides.length - 1;
    }
    showSlide(sliderId, newIndex);
  }

  function playSlides(sliderId) {
    const slider = sliders[sliderId];
    const controls = slider.element.querySelector('.controls');
    controls.querySelector('.play').hidden = true;
    controls.querySelector('.prev').disabled = true;
    controls.querySelector('.next').disabled = true;
    controls.querySelector('.stop').hidden = false;

    slider.interval = setInterval(() => {
      if (slider.currentSlide === slider.slides.length - 1) {
        clearInterval(slider.interval);
        showSlide(sliderId, 0);
        stopSlides(sliderId);
      } else {
        plusSlides(1, sliderId);
      }
    }, 1200);
  }

  function stopSlides(sliderId) {
    const slider = sliders[sliderId];
    const controls = slider.element.querySelector('.controls');
    controls.querySelector('.play').hidden = false;
    controls.querySelector('.prev').disabled = false;
    controls.querySelector('.next').disabled = false;
    controls.querySelector('.stop').hidden = true;

    clearInterval(slider.interval);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.slider').forEach(sliderElement => {
      const sliderId = sliderElement.id;
      const slides = sliderElement.querySelectorAll('.slide');
      sliders[sliderId] = {
        element: sliderElement,
        slides: slides,
        currentSlide: 0,
        interval: null
      };
      showSlide(sliderId, 0);
    });
  });
