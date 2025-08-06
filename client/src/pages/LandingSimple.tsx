export default function Landing() {
  return (
    <div 
      dangerouslySetInnerHTML={{
        __html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CoogsNation.com</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #fff;
      color: #111;
      text-align: center;
    }

    .top-logo {
      margin-top: 20px;
    }

    .top-logo img {
      width: 250px;
    }

    .nav-bar {
      margin-top: 10px;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 2px solid #ccc;
      font-size: 1.1em;
    }

    .nav-bar a {
      margin: 0 15px;
      text-decoration: none;
      font-weight: bold;
      color: #000;
    }

    .hero img {
      width: 200px;
      margin-top: 20px;
    }

    .hero h1 {
      font-size: 2.5em;
      color: #a00000;
      margin: 20px 0 5px;
    }

    .hero h2 {
      font-size: 2.2em;
      color: #a00000;
      margin: 0;
    }

    .hero p {
      font-size: 1.1em;
      margin: 20px auto;
      max-width: 600px;
    }

    .hero button {
      margin-top: 15px;
      padding: 12px 25px;
      font-size: 1em;
      background-color: #a00000;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- UH Logo Centered -->
  <div class="top-logo">
    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" alt="UH Logo">
  </div>

  <!-- Navigation Menu -->
  <div class="nav-bar">
    <a href="/home">Home</a>
    <a href="/forums">Forums</a>
    <a href="/members">Members</a>
    <a href="/api/login">Log In</a>
    <a href="/api/login">Sign Up</a>
  </div>

  <!-- Hero Section -->
  <div class="hero">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Houston_Cougar_logo.png/800px-Houston_Cougar_logo.png" alt="Cougar Mascot">
    <h1>WHOSE HOUSE?</h1>
    <h2>COOGS' HOUSE!</h2>
    <p>Welcome to CoogsNation.com — the online community for University of Houston fans.</p>
    <button onclick="window.location.href='/api/login'">Get Started</button>
  </div>

</body>
</html>
        `
      }}
    />
  );
}