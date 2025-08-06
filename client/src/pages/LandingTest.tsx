export default function LandingTest() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#FF0000',
      color: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      fontSize: '2rem',
      fontWeight: 'bold'
    }}>
      <h1>LANDING PAGE TEST</h1>
      <p>This should be clearly visible!</p>
      <p style={{ color: '#FFFF00' }}>University of Houston - CoogsNation</p>
      <button 
        onClick={() => window.location.href = '/api/login'}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '2rem'
        }}
      >
        JOIN NOW
      </button>
    </div>
  );
}