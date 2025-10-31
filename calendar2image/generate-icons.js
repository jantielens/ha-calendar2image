const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Generate icon (128x128, square)
function generateIcon() {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, '#41BDF5');
  gradient.addColorStop(1, '#03A9F4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  // Draw calendar icon
  ctx.fillStyle = '#FFFFFF';
  
  // Calendar header
  ctx.fillRect(20, 30, 88, 15);
  
  // Calendar body
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 45, 88, 68);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(20, 45, 88, 68);

  // Calendar grid
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + (88 / 3) * i, 45);
    ctx.lineTo(20 + (88 / 3) * i, 113);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(20, 45 + (68 / 3) * i);
    ctx.lineTo(108, 45 + (68 / 3) * i);
    ctx.stroke();
  }

  // Image symbol in corner
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(75, 85, 25, 20);
  ctx.fillStyle = '#03A9F4';
  ctx.beginPath();
  ctx.arc(85, 93, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(78, 102);
  ctx.lineTo(85, 95);
  ctx.lineTo(92, 100);
  ctx.lineTo(97, 102);
  ctx.closePath();
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'icon.png'), buffer);
  console.log('✓ Generated icon.png (128x128)');
}

// Generate logo (250x100)
function generateLogo() {
  const canvas = createCanvas(250, 100);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 250, 100);
  gradient.addColorStop(0, '#41BDF5');
  gradient.addColorStop(1, '#03A9F4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 250, 100);

  // Draw calendar icon (smaller)
  ctx.fillStyle = '#FFFFFF';
  
  // Calendar header
  ctx.fillRect(15, 25, 50, 10);
  
  // Calendar body
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 35, 50, 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(15, 35, 50, 40);

  // Calendar grid
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(15 + (50 / 3) * i, 35);
    ctx.lineTo(15 + (50 / 3) * i, 75);
    ctx.stroke();
  }
  for (let i = 1; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(15, 35 + (40 / 2) * i);
    ctx.lineTo(65, 35 + (40 / 2) * i);
    ctx.stroke();
  }

  // Arrow
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(75, 50);
  ctx.lineTo(95, 50);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(88, 43);
  ctx.lineTo(95, 50);
  ctx.lineTo(88, 57);
  ctx.stroke();

  // Image symbol
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(105, 30, 45, 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(105, 30, 45, 40);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(120, 42, 5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(108, 67);
  ctx.lineTo(118, 55);
  ctx.lineTo(130, 62);
  ctx.lineTo(147, 67);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Calendar', 160, 48);
  ctx.font = 'bold 16px Arial';
  ctx.fillText('2 Image', 160, 68);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'logo.png'), buffer);
  console.log('✓ Generated logo.png (250x100)');
}

// Generate both
generateIcon();
generateLogo();
console.log('\nIcon and logo files created successfully!');
