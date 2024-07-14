let slideIndex = 0;
let autoSlide = false;
let slideTimeout;
let restartSide = false;

function showSlides() {
    let slides = document.getElementsByClassName("slider-slide");
    for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slideIndex++;
    if (slideIndex > slides.length) {
        slideIndex = 1;
    }
    slides[slideIndex - 1].style.display = "block";
    if (autoSlide) {
        slideTimeout = setTimeout(showSlides, 5000); // Change image every 5 seconds
    }
}

function plusSlides(n) {
    clearTimeout(slideTimeout);
    autoSlide = false;
    slideIndex += n - 1; // Adjust slideIndex for showSlides increment
    if (slideIndex < 0) {
        slideIndex = document.getElementsByClassName("slider-slide").length - 1;
    } else if (slideIndex >= document.getElementsByClassName("slider-slide").length) {
        slideIndex = 0;
    }
    showSlides();
    
    if (restartSide) {
        slideTimeout = setTimeout(() => {
            autoSlide = true;
            showSlides();
        }, 10000);
    }
}

showSlides();