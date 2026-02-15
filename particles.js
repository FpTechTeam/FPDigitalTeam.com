tsParticles.load("projectsParticles", {
  particles: {
    number: { value: 80, density: { enable: true, area: 800 } },
    color: { value: ["#00c8ff", "#5fd7ff"] },
    move: { enable: true, speed: 1.5, outModes: "out" },
    links: { enable: true, distance: 120, color: "#00c8ff" }
  },
  interactivity: {
    events: { onHover: { enable: true, mode: "repulse" }},
    modes: { repulse: { distance: 200 } }
  }
});
