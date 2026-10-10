const fs = require('fs');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node repair-wallpaper-project.js <project.json|index.html> <output.json>');
  process.exit(2);
}

const text = fs.readFileSync(inputPath, 'utf8');
let project;
if (/\.html?$/i.test(inputPath)) {
  const match = text.match(/const P=(.*?),cv=document\.getElementById\('c'\)/s);
  if (!match) throw new Error('Embedded NOCTURNE project was not found');
  project = JSON.parse(match[1]);
} else {
  project = JSON.parse(text);
}

project.version = 2;
project.app = 'NOCTURNE / LAB';
project.animation ||= { duration: 8, time: 0, playing: false, loop: true, easing: 'linear', fps: 30, keyframes: [] };
project.animation.playing = false;
project.animation.fps = Math.min(30, Number(project.animation.fps) || 30);

function tuneLayers(layers) {
  (layers || []).forEach(layer => {
    if (layer.type === 'wave') {
      layer.lines = Math.min(120, Number(layer.lines) || 48);
      layer.glow = Math.min(24, Number(layer.glow) || 0);
    }
    if (layer.type === 'grid') layer.glow = Math.min(24, Number(layer.glow) || 0);
    if (layer.type === 'clock') layer.glow = Math.min(24, Number(layer.glow) || 0);
    if (layer.type === 'spectrum') {
      layer.bars = Math.min(48, Number(layer.bars) || 48);
      layer.smoothing = Math.min(.82, Number(layer.smoothing) || .72);
      layer.idleMotion = false;
      layer.autoGain = true;
      layer.audioBoost = Math.max(2.5, Number(layer.audioBoost) || 0);
      layer.noiseGate = .005;
      layer.glow = Math.min(20, Number(layer.glow) || 0);
      if (Number(layer.y) > .88) layer.y = .78;
      if (Number(layer.scale) > 1.2) layer.scale = 1.1;
    }
  });
}

tuneLayers(project.layers);
(project.animation.keyframes || []).forEach(frame => tuneLayers(frame.state?.layers));
fs.writeFileSync(outputPath, JSON.stringify(project, null, 2), 'utf8');
console.log(outputPath);
