window.addEventListener("DOMContentLoaded", () => {

    const slides =
        document.querySelectorAll(
            ".sponsor-slide"
        );

    const nextButton =
        document.querySelector(
            ".carousel-arrow.right"
        );

    const prevButton =
        document.querySelector(
            ".carousel-arrow.left"
        );

    if (slides.length === 0) {

        return;

    }

    let current = 0;

    function showSlide(index) {

        slides.forEach((slide) => {

            slide.classList.remove(
                "active"
            );

        });

        slides[index].classList.add(
            "active"
        );

    }

    function nextSlide() {

        current =
            (current + 1) %
            slides.length;

        showSlide(current);

    }

    function prevSlide() {

        current =
            (current - 1 + slides.length) %
            slides.length;

        showSlide(current);

    }

    nextButton.addEventListener(
        "click",
        nextSlide
    );

    prevButton.addEventListener(
        "click",
        prevSlide
    );

    setInterval(
        nextSlide,
        5000
    );

});