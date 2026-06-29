import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function DetailsRedirect() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Construct the deep link URL scheme
    const deepLink = `mtmovies://details?id=${id}&type=${type}`;
    
    // Attempt to redirect to the app
    window.location.href = deepLink;

    // Show fallback instructions after a short timeout if app didn't open
    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [id, type]);

  if (!id) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Invalid Link</h2>
          <p style={styles.text}>The share link appears to be broken or incomplete.</p>
          <a href="/" style={styles.btn}>Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img
            src="https://res.cloudinary.com/dyop5rdpn/image/upload/v1699352390/MT%20Movies/mt_movies_transparent_dark_x5j2m8.png"
            alt="MTMovies"
            style={styles.logo}
          />
          <h1 style={styles.brand}>MT<span style={{ color: '#ff0f0f' }}>Movies</span></h1>
        </div>

        {!showFallback ? (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.title}>Redirecting to App...</h2>
            <p style={styles.text}>We're opening this movie details in the MTMovies app on your device.</p>
          </>
        ) : (
          <>
            <div style={styles.alertIcon}>📱</div>
            <h2 style={styles.title}>MTMovies App Needed</h2>
            <p style={styles.text}>
              This content can only be watched inside the MTMovies Mobile App.
            </p>
            <a href="/mtmovies.apk" download style={styles.btn}>
              Download MTMovies App
            </a>
            <p style={styles.subText}>
              Already have the app? <a href={`mtmovies://details?id=${id}&type=${type}`} style={styles.link}>Click here to open</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    padding: '20px',
  },
  card: {
    backgroundColor: '#141414',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '40px 30px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
  },
  logo: {
    height: '60px',
    marginBottom: '10px',
  },
  brand: {
    fontSize: '24px',
    margin: 0,
    fontWeight: 'bold',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(229, 9, 20, 0.1)',
    borderTop: '4px solid #E50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  alertIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    marginBottom: '12px',
    fontWeight: '600',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '12px',
    marginTop: '20px',
  },
  btn: {
    display: 'block',
    backgroundColor: '#E50914',
    color: '#fff',
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background-color 0.2s',
  },
  link: {
    color: '#E50914',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

// Add spinner keyframes via a style element
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
