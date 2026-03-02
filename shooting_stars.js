const nightSky = document.querySelector(".night");
const randomStart = Math.random() * -240;
nightSky.style.setProperty("--sky-delay", `${randomStart}s`);

const STAR_DENSITY = 0.05; // stars per 10,000 square pixels
const T_ACTIVE = 3000; // ms flight time

// Calculate container area and expected visible stars
const width = nightSky.offsetWidth;
const height = nightSky.offsetHeight;
const area = width * height;
const expectedVisible = Math.ceil(STAR_DENSITY * (area / 10000));
console.log("Expected visible", expectedVisible);

// Ensure we always have at least a few stars on tiny screens
const poolSize = Math.max(10, Math.ceil(expectedVisible * 4));

// Calculate the average required dark time using a Poisson Distribution.
const averageDarkTime = T_ACTIVE * (poolSize / expectedVisible - 1);

const activeTimeouts = new Set();

// Helper function to track timeouts so we can cancel them later
function safeTimeout(callback, delay) {
  const id = setTimeout(() => {
    activeTimeouts.delete(id);
    callback();
  }, delay);
  activeTimeouts.add(id);
  return id;
}

function animateStar(star) {
  star.classList.remove("is-shooting");

  star.style.top = `${Math.random() * 100}%`;
  star.style.left = `${Math.random() * 100}%`;

  safeTimeout(() => {
    star.classList.add("is-shooting");
  }, 50);

  // Generate Exponentially distributed dark time for a Poisson process.
  let randomDarkTime = -averageDarkTime * Math.log(Math.random());

  // Cap it at a reasonable maximum so a star doesn't sleep for 5 minutes
  randomDarkTime = Math.min(randomDarkTime, averageDarkTime * 4);

  safeTimeout(() => {
    animateStar(star);
  }, T_ACTIVE + randomDarkTime);
}

const stars = [];
for (let i = 0; i < poolSize; i++) {
  const star = document.createElement("div");
  star.className = "shooting_star";
  nightSky.appendChild(star);
  stars.push(star);

  // Stagger the initial spawns using the same exponential distribution
  const initialDelay = -averageDarkTime * Math.log(Math.random());
  safeTimeout(() => {
    animateStar(star);
  }, initialDelay);
}

// Because we don't want all the stars to fall at once when we return,
// we need to cancel the animation when the user tabs out, and restart
// it when they return.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // User left: Cancel all pending timers and hide active stars
    activeTimeouts.forEach(clearTimeout);
    activeTimeouts.clear();
    stars.forEach((star) => star.classList.remove("is-shooting"));
  } else {
    // User returned: Re-scatter them using the Poisson math!
    stars.forEach((star) => {
      const initialDelay = -averageDarkTime * Math.log(Math.random());
      safeTimeout(() => {
        animateStar(star);
      }, initialDelay);
    });
  }
});
