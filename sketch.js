const AGENT_COUNT = 500;
const SIMULATION_PADDING = 50;

let agents = [];
let agentImage;
let mic;
let micLevel = 0;
let smoothedMicLevel = 0;
let audioStarted = false;
let audioError = false;
let visualTime = 0;

function preload() {
  agentImage = loadImage("img/mouse-cursor-symbol-on-transparent-background-free-png.png");
}

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  noStroke();
  angleMode(DEGREES);
  imageMode(CENTER);
  textFont("monospace");

  for (let i = 0; i < AGENT_COUNT; i++) {
    const agent = new Agent(
      createVector(random(0, width), random(0, height)),
      random(0, 360),
      agentImage
    );

    // Tre caratteri: alcuni sono curiosi, altri nervosi, altri lenti e magnetici.
    const temperament = random();
    if (temperament < 0.33) {
      agent.personality = "spark";
      agent.baseSpeed = random(2.6, 4.2);
      agent.baseSeparationRadius = random(18, 42);
      agent.baseAlignmentRadius = random(120, 220);
      agent.baseCohesionRadius = random(120, 260);
      agent.baseSeparationStrength = random(0.10, 0.25);
      agent.baseAlignmentStrength = random(0.04, 0.10);
      agent.baseCohesionStrength = random(0.03, 0.08);
    } else if (temperament < 0.66) {
      agent.personality = "swarm";
      agent.baseSpeed = random(1.8, 3.1);
      agent.baseSeparationRadius = random(28, 58);
      agent.baseAlignmentRadius = random(180, 330);
      agent.baseCohesionRadius = random(220, 390);
      agent.baseSeparationStrength = random(0.05, 0.14);
      agent.baseAlignmentStrength = random(0.08, 0.18);
      agent.baseCohesionStrength = random(0.08, 0.20);
    } else {
      agent.personality = "drift";
      agent.baseSpeed = random(1.1, 2.5);
      agent.baseSeparationRadius = random(45, 80);
      agent.baseAlignmentRadius = random(90, 180);
      agent.baseCohesionRadius = random(90, 210);
      agent.baseSeparationStrength = random(0.16, 0.32);
      agent.baseAlignmentStrength = random(0.02, 0.07);
      agent.baseCohesionStrength = random(0.02, 0.08);
    }

    agent.phase = random(0, 360);
    agent.hueShift = random(0, 360);
    agents.push(agent);
  }

  // Un solo agente mostra i raggi di influenza: utile per vedere cosa cambia.
  agents[0].debug = true;
}

function draw() {
  visualTime += 0.65;

  if (audioStarted && mic) {
    micLevel = mic.getLevel();
  } else {
    // Respiro automatico quando il microfono non è ancora attivo.
    micLevel = map(sin(frameCount * 0.8), -1, 1, 0.015, 0.075);
  }
  smoothedMicLevel = lerp(smoothedMicLevel, micLevel, 0.12);

  drawAtmosphere();

  const audioEnergy = constrain(map(smoothedMicLevel, 0.0, 0.18, 0, 1), 0, 1);

  agents.forEach((agent, index) => {
    agent.modulate(audioEnergy, visualTime, index);
    agent.update();
    agent.display(audioEnergy, visualTime);
  });

  drawHud(audioEnergy);
}

function drawAtmosphere() {
  background(5, 7, 14, 38);

  push();
  colorMode(HSB, 360, 100, 100, 100);
  noFill();
  for (let r = 80; r < max(width, height) * 1.25; r += 90) {
    const pulse = sin(frameCount * 0.35 + r * 0.05) * 16;
    stroke((210 + r * 0.16 + frameCount * 0.08) % 360, 70, 55, 5);
    circle(width / 2, height / 2, r + pulse + smoothedMicLevel * 2600);
  }
  pop();
}

function drawHud(audioEnergy) {
  push();
  noStroke();
  fill(255, 230);
  textSize(13);
  const status = audioStarted
    ? "MIC ON: parla, batti le mani, soffia vicino al laptop"
    : audioError
      ? "microfono non disponibile: modalità respiro automatico"
      : "clicca per attivare il microfono";

  text(status, 18, 28);
  text(`energia: ${nf(audioEnergy, 1, 2)}  |  radius/strength dinamici`, 18, 48);

  noFill();
  stroke(255, 180);
  rect(18, 62, 160, 8, 8);
  noStroke();
  fill(255, 210);
  rect(18, 62, 160 * audioEnergy, 8, 8);
  pop();
}

function mousePressed() {
  startAudio();
}

function touchStarted() {
  startAudio();
  return false;
}

function startAudio() {
  if (audioStarted) return;

  userStartAudio()
    .then(() => {
      mic = new p5.AudioIn();
      mic.start(
        () => {
          audioStarted = true;
          audioError = false;
        },
        () => {
          audioError = true;
        }
      );
    })
    .catch(() => {
      audioError = true;
    });
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}
