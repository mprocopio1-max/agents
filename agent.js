class Agent {
  constructor(POSITION = createVector(0, 0), ANGLE = 45, TEXTURE) {
    this.position = POSITION;
    this.color = color(0, 0, 0);
    this.angle = ANGLE;
    this.smoothAngle = ANGLE;
    this.speed = 3;
    this.baseSpeed = 3;
    this.separationRadius = 30;
    this.alignmentRadius = 250;
    this.cohesionRadius = 250;
    this.baseSeparationRadius = 30;
    this.baseAlignmentRadius = 250;
    this.baseCohesionRadius = 250;
    this.debug = false;
    this.separationStrength = 0.1;
    this.alignmentStrength = 0.1;
    this.cohesionStrength = 0.15;
    this.baseSeparationStrength = 0.1;
    this.baseAlignmentStrength = 0.1;
    this.baseCohesionStrength = 0.15;
    this.mouseRepulsionStrength = 0.5;
    this.mouseRepulsionRadius = 300;
    this.texture = TEXTURE;
    this.personality = "swarm";
    this.phase = random(0, 360);
    this.hueShift = random(0, 360);
    this.spin = random(-0.4, 0.4);
    this.tail = [];
  }

  modulate(audioEnergy, time, index) {
    // Radius e strength cambiano nel tempo: il microfono amplifica il respiro del sistema.
    const breath = map(sin(time + this.phase), -1, 1, 0, 1);
    const ripple = map(sin(time * 1.9 + index * 7 + this.phase), -1, 1, 0, 1);
    const shock = pow(audioEnergy, 1.55);

    this.speed = this.baseSpeed + shock * 5.5 + breath * 0.55;

    this.separationRadius = this.baseSeparationRadius + shock * 115 + ripple * 18;
    this.alignmentRadius = this.baseAlignmentRadius + breath * 70 - shock * 80;
    this.cohesionRadius = this.baseCohesionRadius + shock * 210 + ripple * 45;

    // Suoni forti rendono il branco meno allineato e più esplosivo.
    this.separationStrength = this.baseSeparationStrength + shock * 0.42;
    this.alignmentStrength = max(0.005, this.baseAlignmentStrength - shock * 0.075 + breath * 0.025);
    this.cohesionStrength = this.baseCohesionStrength + shock * 0.18;

    this.mouseRepulsionRadius = 140 + shock * 520;
    this.mouseRepulsionStrength = 0.25 + shock * 1.2;
  }

  update() {
    this.tail.push(this.position.copy());
    if (this.tail.length > 16) this.tail.shift();

    const separationNeighbours = this.findNeighbourAgents(this.separationRadius);
    const alignmentNeighbours = this.findNeighbourAgents(this.alignmentRadius);
    const cohesionNeighbours = this.findNeighbourAgents(this.cohesionRadius);

    this.applySeparation(separationNeighbours);
    this.applyAlignment(alignmentNeighbours);
    this.applyCohesion(cohesionNeighbours);
    this.applyMouseRepulsion();

    // Un piccolo drift organico evita traiettorie troppo perfette.
    this.angle += sin(frameCount * 0.7 + this.phase) * 0.35 + this.spin;
    this.smoothAngle = lerp(this.smoothAngle, this.angle, 0.08);

    const directionalSpeed = createVector(0, this.speed).rotate(this.smoothAngle);
    this.position.add(directionalSpeed);

    this.checkCanvasBorders();
  }

  display(audioEnergy = 0, time = 0) {
    push();
    colorMode(HSB, 360, 100, 100, 100);

    // Scia: lascia memoria visiva del movimento.
    noFill();
    beginShape();
    for (let i = 0; i < this.tail.length; i++) {
      const p = this.tail[i];
      const alpha = map(i, 0, this.tail.length - 1, 0, 45);
      stroke((this.hueShift + time * 0.7 + i * 5) % 360, 75, 95, alpha);
      strokeWeight(map(i, 0, this.tail.length - 1, 1, 5 + audioEnergy * 7));
      vertex(p.x, p.y);
    }
    endShape();

    translate(this.position);
    rotate(this.smoothAngle);

    if (this.debug) {
      noFill();
      stroke(0, 90, 100, 25);
      circle(0, 0, this.separationRadius * 2.0);
      stroke(120, 90, 100, 15);
      circle(0, 0, this.alignmentRadius * 2.0);
      stroke(220, 90, 100, 12);
      circle(0, 0, this.cohesionRadius * 2.0);
    }

    const glowSize = 9 + audioEnergy * 28;
    const hue = (this.hueShift + frameCount * 0.35 + audioEnergy * 100) % 360;

    // Corpo principale: da cursore nero a piccola creatura luminosa.
    noStroke();
    fill(hue, 88, 100, 20 + audioEnergy * 35);
    circle(0, 0, glowSize * 2.2);

    fill(hue, 70, 100, 86);
    triangle(0, -14 - audioEnergy * 8, -7 - audioEnergy * 6, 10, 7 + audioEnergy * 6, 10);

    fill((hue + 165) % 360, 60, 100, 70);
    circle(0, 5, 5 + audioEnergy * 10);

    stroke(hue, 80, 100, 50);
    strokeWeight(1.2 + audioEnergy * 2.2);
    line(0, 12, 0, 20 + audioEnergy * 18);

    pop();
  }

  checkCanvasBorders() {
    if (this.position.x < -SIMULATION_PADDING) {
      this.position.x = width + SIMULATION_PADDING;
      this.tail = [];
    } else if (this.position.x > width + SIMULATION_PADDING) {
      this.position.x = -SIMULATION_PADDING;
      this.tail = [];
    }

    if (this.position.y < -SIMULATION_PADDING) {
      this.position.y = height + SIMULATION_PADDING;
      this.tail = [];
    } else if (this.position.y > height + SIMULATION_PADDING) {
      this.position.y = -SIMULATION_PADDING;
      this.tail = [];
    }
  }

  findNeighbourAgents(radius) {
    const neighbours = [];

    if (radius === undefined) {
      return neighbours;
    }

    agents.forEach((agent) => {
      if (agent != this) {
        const dist = this.position.dist(agent.position);
        if (dist < radius) {
          neighbours.push(agent);
        }
      }
    });

    return neighbours;
  }

  applySeparation(neighbours) {
    if (neighbours.length === 0) {
      return;
    }

    const averagePosition = createVector(0, 0);
    neighbours.forEach((agent) => {
      averagePosition.add(agent.position);
    });
    averagePosition.mult(1 / neighbours.length);

    const awayVector = p5.Vector.sub(this.position, averagePosition);
    const awayAngle = awayVector.heading();

    let angleDifference = awayAngle - this.angle;
    while (angleDifference > 180) angleDifference -= 360;
    while (angleDifference < -180) angleDifference += 360;

    this.angle += angleDifference * this.separationStrength;
  }

  applyAlignment(neighbours) {
    if (neighbours.length === 0) {
      return;
    }

    let averageAngle = 0;
    neighbours.forEach((agent) => {
      averageAngle += agent.angle;
    });
    averageAngle /= neighbours.length;

    let angleDifference = averageAngle - this.angle;
    while (angleDifference > 180) angleDifference -= 360;
    while (angleDifference < -180) angleDifference += 360;

    this.angle += angleDifference * this.alignmentStrength;
  }

  applyCohesion(neighbours) {
    if (neighbours.length === 0) {
      return;
    }

    const averagePosition = createVector(0, 0);
    neighbours.forEach((agent) => {
      averagePosition.add(agent.position);
    });
    averagePosition.mult(1 / neighbours.length);

    const towardVector = p5.Vector.sub(averagePosition, this.position);
    const towardAngle = towardVector.heading();

    let angleDifference = towardAngle - this.angle;
    while (angleDifference > 180) angleDifference -= 360;
    while (angleDifference < -180) angleDifference += 360;

    this.angle += angleDifference * this.cohesionStrength;
  }

  applyMouseRepulsion() {
    const mousePosition = createVector(mouseX, mouseY);
    const distanceToMouse = this.position.dist(mousePosition);

    if (distanceToMouse > this.mouseRepulsionRadius) {
      return;
    }

    const awayVector = p5.Vector.sub(this.position, mousePosition);
    const awayAngle = awayVector.heading();

    const forwardHeading = createVector(0, 1).rotate(this.angle).heading();
    let angleDifference = awayAngle - forwardHeading;
    while (angleDifference > 180) angleDifference -= 360;
    while (angleDifference < -180) angleDifference += 360;

    const proximityFactor = map(distanceToMouse, this.mouseRepulsionRadius, 0, 0, 1, true);
    this.angle += angleDifference * this.mouseRepulsionStrength * proximityFactor;
  }
}
