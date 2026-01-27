/**
 * Vanilla JS Tilt Effect
 * Adds a 3D tilt interaction to elements
 */

export function initTilt() {
    const cards = document.querySelectorAll('.person-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
        card.addEventListener('mouseenter', handleMouseEnter);
    });
}

function handleMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to center of card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (max 15 degrees)
    const rotateX = ((y - centerY) / centerY) * -10; // Invert Y for natural feel
    const rotateY = ((x - centerX) / centerX) * 10;

    // Apply transform
    // perspective(1000px) creates the 3D depth
    // scale3d(1.05, 1.05, 1.05) lifts it up slightly
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
}

function handleMouseLeave(e) {
    const card = e.currentTarget;

    // Reset style on leave
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    card.style.transition = 'transform 0.5s ease'; // Smooth return
}

function handleMouseEnter(e) {
    const card = e.currentTarget;
    // Remove transition during movement for instant response
    card.style.transition = 'none';
}
