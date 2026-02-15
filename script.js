// Login modal toggle
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const loginMenu = document.getElementById('loginMenu');
  const closeBtn = document.getElementById('closeLogin');

  loginBtn.addEventListener('click', e => {
    e.preventDefault();
    loginMenu.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => loginMenu.style.display = 'none');

  window.addEventListener('click', e => {
    if (e.target === loginMenu) loginMenu.style.display = 'none';
  });
});

// Simple particle effect for hero background
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray = [];
class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
  }
  update() { this.x += this.speedX; this.y += this.speedY; if(this.x>canvas.width)this.x=0;if(this.x<0)this.x=canvas.width;if(this.y>canvas.height)this.y=0;if(this.y<0)this.y=canvas.height;}
  draw() { ctx.fillStyle = 'rgba(0,200,255,0.7)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); }
}

function initParticles(){ for(let i=0;i<150;i++){ particlesArray.push(new Particle()); }}
function animateParticles(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particlesArray.forEach(p=>{p.update();p.draw();});
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });


