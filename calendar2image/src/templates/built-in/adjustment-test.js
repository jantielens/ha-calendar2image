/**
 * Adjustment Test Template
 * 
 * Visually rich template designed to showcase image adjustment effects.
 * Contains various visual elements: colors, gradients, text, shapes, patterns.
 */

module.exports = function render(data) {
  const { config } = data;
  const width = config.width || 400;
  const height = config.height || 300;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: ${width}px;
      height: ${height}px;
      font-family: 'Arial', sans-serif;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 15px;
    }
    
    .header {
      background: linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%);
      padding: 15px;
      border-radius: 10px;
      text-align: center;
    }
    
    .header h1 {
      color: white;
      font-size: 24px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      font-weight: bold;
    }
    
    .content {
      display: flex;
      gap: 15px;
      flex: 1;
    }
    
    .left-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .color-box {
      flex: 1;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.4);
    }
    
    .red { background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%); }
    .green { background: linear-gradient(135deg, #26de81 0%, #20bf6b 100%); }
    .blue { background: linear-gradient(135deg, #45aaf2 0%, #2e86de 100%); }
    
    .right-panel {
      flex: 1;
      background: white;
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .pattern {
      width: 100%;
      height: 60px;
      background: 
        repeating-linear-gradient(45deg,
          #333 0px,
          #333 10px,
          #666 10px,
          #666 20px
        );
      border-radius: 5px;
      margin-bottom: 10px;
    }
    
    .gradient-bar {
      width: 100%;
      height: 40px;
      background: linear-gradient(to right,
        #000 0%,
        #333 12.5%,
        #666 25%,
        #999 37.5%,
        #ccc 50%,
        #999 62.5%,
        #666 75%,
        #333 87.5%,
        #000 100%
      );
      border-radius: 5px;
      margin-bottom: 10px;
    }
    
    .text-samples {
      color: #2c3e50;
    }
    
    .text-samples h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #e74c3c;
    }
    
    .text-samples p {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 5px;
    }
    
    .text-samples .small {
      font-size: 10px;
      color: #7f8c8d;
    }
    
    .footer {
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 8px;
      text-align: center;
      color: white;
      font-size: 12px;
    }
    
    .circles {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 5px;
    }
    
    .circle {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
    }
    
    .circle.red { background: #e74c3c; }
    .circle.yellow { background: #f39c12; }
    .circle.green { background: #27ae60; }
    .circle.blue { background: #3498db; }
    .circle.purple { background: #9b59b6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Adjustment Test Pattern</h1>
    </div>
    
    <div class="content">
      <div class="left-panel">
        <div class="color-box red">RED</div>
        <div class="color-box green">GREEN</div>
        <div class="color-box blue">BLUE</div>
      </div>
      
      <div class="right-panel">
        <div class="pattern"></div>
        <div class="gradient-bar"></div>
        
        <div class="text-samples">
          <h2>Text Rendering</h2>
          <p>Normal text: The quick brown fox jumps over the lazy dog.</p>
          <p><strong>Bold text:</strong> ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p class="small">Small text: 0123456789 !@#$%^&*()</p>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div>Test pattern for image adjustment validation</div>
      <div class="circles">
        <div class="circle red"></div>
        <div class="circle yellow"></div>
        <div class="circle green"></div>
        <div class="circle blue"></div>
        <div class="circle purple"></div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
