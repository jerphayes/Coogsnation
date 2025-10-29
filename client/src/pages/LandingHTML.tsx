export default function Landing() {
  return (
    <div 
      dangerouslySetInnerHTML={{
        __html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CoogsNation.com</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      background-color: #f5f5f5;
      color: #222;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background-color: #fff;
    }
    .uh-logo {
      width: 80px;
      height: 80px;
    }
    nav {
      display: flex;
      gap: 2rem;
    }
    nav a {
      text-decoration: none;
      color: #333;
      font-weight: 500;
      font-size: 16px;
    }
    .hero {
      text-align: center;
      padding: 3rem 2rem;
      background-color: #f5f5f5;
    }
    .whose-house {
      font-size: 4rem;
      font-weight: bold;
      color: #B91C1C;
      margin: 0 0 2rem 0;
      transform: rotate(-8deg);
      letter-spacing: 0.1em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    .cougar-container {
      margin: 2rem 0;
    }
    .coogs-house {
      font-size: 4rem;
      font-weight: bold;
      color: #B91C1C;
      margin: 2rem 0;
      letter-spacing: 0.1em;
    }
    .welcome-title {
      font-size: 2rem;
      color: #333;
      margin: 2rem 0 1rem 0;
      font-weight: normal;
    }
    .welcome-subtitle {
      font-size: 1.2rem;
      color: #666;
      margin: 0 0 2rem 0;
    }
    .get-started-btn {
      background-color: #B91C1C;
      color: white;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .bottom-section {
      display: flex;
      padding: 2rem;
      background-color: #fff;
      gap: 2rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .section-card {
      flex: 1;
      min-width: 300px;
      max-width: 400px;
    }
    .section-title {
      font-size: 1.3rem;
      color: #333;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .red-icon {
      color: #B91C1C;
    }
    .forum-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.5rem;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .forum-header {
      font-weight: bold;
      color: #333;
    }
    .forum-cell {
      color: #666;
      padding: 0.5rem 0;
    }
    .forum-cell.center {
      text-align: center;
    }
    .member-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #B91C1C;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
    }
    .member-name {
      color: #666;
      font-size: 0.9rem;
    }
    .group-list {
      font-size: 0.9rem;
      color: #666;
      line-height: 1.8;
    }
    .group-item {
      margin-bottom: 0.5rem;
    }
    .events-section {
      padding: 2rem;
      background-color: #f5f5f5;
      text-align: center;
    }
    .events-title {
      font-size: 1.5rem;
      color: #333;
      margin: 0 0 1rem 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .events-content {
      color: #666;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <header>
    <svg class="uh-logo" viewBox="0 0 100 100">
      <rect x="10" y="15" width="15" height="70" fill="#B91C1C"/>
      <rect x="30" y="35" width="15" height="50" fill="#B91C1C"/>
      <rect x="50" y="15" width="15" height="30" fill="#B91C1C"/>
      <rect x="50" y="55" width="15" height="30" fill="#B91C1C"/>
      <rect x="70" y="35" width="15" height="50" fill="#B91C1C"/>
    </svg>
  </header>

  <div class="hero">
    <div class="whose-house">WHOSE HOUSE?</div>
    
    <div class="cougar-container">
      <svg width="400" height="250" viewBox="0 0 400 250">
        <!-- Cougar body in lying position -->
        <ellipse cx="200" cy="180" rx="120" ry="35" fill="#B91C1C" stroke="#000" stroke-width="3"/>
        
        <!-- Cougar chest/front -->
        <ellipse cx="150" cy="160" rx="40" ry="30" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        
        <!-- Cougar head -->
        <ellipse cx="120" cy="120" rx="50" ry="45" fill="#B91C1C" stroke="#000" stroke-width="3"/>
        
        <!-- Ears -->
        <ellipse cx="95" cy="85" rx="12" ry="18" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        <ellipse cx="145" cy="85" rx="12" ry="18" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        <ellipse cx="95" cy="88" rx="6" ry="10" fill="#000"/>
        <ellipse cx="145" cy="88" rx="6" ry="10" fill="#000"/>
        
        <!-- Eyes - half-closed, angry look -->
        <ellipse cx="105" cy="110" rx="8" ry="6" fill="#000"/>
        <ellipse cx="135" cy="110" rx="8" ry="6" fill="#000"/>
        <ellipse cx="105" cy="108" rx="2" ry="2" fill="#fff"/>
        <ellipse cx="135" cy="108" rx="2" ry="2" fill="#fff"/>
        
        <!-- Eyebrows for angry look -->
        <path d="M 95 100 L 115 105" stroke="#000" stroke-width="3" stroke-linecap="round"/>
        <path d="M 145 100 L 125 105" stroke="#000" stroke-width="3" stroke-linecap="round"/>
        
        <!-- Nose -->
        <path d="M 115 125 L 125 125 L 120 135 Z" fill="#000"/>
        
        <!-- Mouth area - white muzzle -->
        <ellipse cx="120" cy="145" rx="20" ry="12" fill="#fff" stroke="#000" stroke-width="2"/>
        
        <!-- Mouth line -->
        <path d="M 105 145 Q 120 150 135 145" stroke="#000" stroke-width="2" fill="none"/>
        
        <!-- Whiskers -->
        <line x1="75" y1="120" x2="95" y2="125" stroke="#000" stroke-width="2"/>
        <line x1="75" y1="130" x2="95" y2="130" stroke="#000" stroke-width="2"/>
        <line x1="145" y1="125" x2="165" y2="120" stroke="#000" stroke-width="2"/>
        <line x1="145" y1="130" x2="165" y2="130" stroke="#000" stroke-width="2"/>
        
        <!-- Front legs/paws -->
        <ellipse cx="160" cy="190" rx="12" ry="20" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        <ellipse cx="180" cy="195" rx="12" ry="18" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        
        <!-- Back legs -->
        <ellipse cx="240" cy="195" rx="15" ry="20" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        <ellipse cx="270" cy="190" rx="12" ry="18" fill="#B91C1C" stroke="#000" stroke-width="2"/>
        
        <!-- Tail -->
        <path d="M 320 170 Q 340 150 350 130 Q 355 120 350 110" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M 320 170 Q 340 150 350 130 Q 355 120 350 110" stroke="#B91C1C" stroke-width="4" fill="none" stroke-linecap="round"/>
        
        <!-- Body details/muscle definition -->
        <path d="M 180 150 Q 200 155 220 150" stroke="#000" stroke-width="2" fill="none"/>
        <path d="M 160 170 Q 180 175 200 170" stroke="#000" stroke-width="2" fill="none"/>
      </svg>
    </div>
    
    <div class="coogs-house">COOGS' HOUSE!</div>
    
    <div class="welcome-title">Welcome to CoogsNation.com</div>
    <div class="welcome-subtitle">The online community for University of Houston fans.</div>
    
    <button class="get-started-btn" onclick="window.location.href='/api/login'">Get Started</button>
  </div>

  <div class="bottom-section">
    <!-- Community Forums -->
    <div class="section-card">
      <div class="section-title">
        <span class="red-icon">💬</span> Community Forums
      </div>
      
      <div class="forum-grid">
        <div class="forum-header">Forum Topics</div>
        <div class="forum-header center">Topics</div>
        <div class="forum-header center">Posts</div>
        
        <div class="forum-cell">Whose Football</div>
        <div class="forum-cell center">10</div>
        <div class="forum-cell center">47</div>
        
        <div class="forum-cell">Whose Basketball</div>
        <div class="forum-cell center">8</div>
        <div class="forum-cell center">32</div>
        
        <div class="forum-cell">Coogs in the Big 12</div>
        <div class="forum-cell center">5</div>
        <div class="forum-cell center">19</div>
      </div>
    </div>

    <!-- Members -->
    <div class="section-card">
      <div class="section-title">
        <span class="red-icon">👥</span> Members
      </div>
      
      <div class="member-item">
        <div class="member-avatar">S</div>
        <div class="member-name">Sarah</div>
      </div>
      
      <div class="member-item">
        <div class="member-avatar">J</div>
        <div class="member-name">Jessica</div>
      </div>
      
      <div class="member-item">
        <div class="member-avatar">E</div>
        <div class="member-name">Emily</div>
      </div>
      
      <div class="member-item">
        <div class="member-avatar">A</div>
        <div class="member-name">Amanda</div>
      </div>
    </div>

    <!-- Groups -->
    <div class="section-card">
      <div class="section-title">
        <span class="red-icon">👥</span> Groups
      </div>
      
      <div class="group-list">
        <div class="group-item">Step by Your Coog</div>
        <div class="group-item">CoogsCourt</div>
        <div class="group-item">CoogsCourt</div>
        <div class="group-item">CoogsLadies</div>
      </div>
    </div>
  </div>

  <!-- Upcoming Events -->
  <div class="events-section">
    <div class="events-title">
      <span class="red-icon">📅</span> Upcoming Events
    </div>
    <div class="events-content">Check back soon for upcoming events!</div>
  </div>
</body>
</html>
        `
      }}
    />
  );
}